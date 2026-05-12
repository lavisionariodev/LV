import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { requireAdminApiUser } from '@/lib/auth/requireAdminRoute'
import { apiLog } from '@/lib/observability/apiLog'
import { createPaymongoRefund, phpToCentavos } from '@/lib/paymongo/client'
import { insertOrderRefundEvent } from '@/lib/payments/refundReconcile'
import { insertUserNotification } from '@/lib/notifications/inAppServer'

/**
 * Admin refund actions: stuck queue visibility uses GET /api/admin/refunds/stuck.
 * POST body: { orderId, action }
 * - action `force_complete_manual`: mark order refunded without PayMongo (break-glass).
 * - action `retry_paymongo_refund`: if order is processing and has paymongo_payment_id on payment, attempt createPaymongoRefund again.
 */
export async function POST(request) {
  const { user, responseError } = await requireAdminApiUser()
  if (responseError || !user) return responseError

  const body = await request.json().catch(() => ({}))
  const orderId = String(body?.orderId ?? '').trim()
  const action = String(body?.action ?? '').trim().toLowerCase()

  if (!orderId) {
    return NextResponse.json({ error: 'Missing orderId.' }, { status: 400 })
  }

  const supabaseAdmin = getSupabaseAdmin()

  if (action === 'force_complete_manual') {
    const { data: order, error: oErr } = await supabaseAdmin
      .from('orders')
      .select('id,buyer_id,payment_status,refund_status')
      .eq('id', orderId)
      .maybeSingle()

    if (oErr || !order) {
      return NextResponse.json({ error: 'Order not found.' }, { status: 404 })
    }

    const { data: escrowRows, error: escrowErr } = await supabaseAdmin
      .from('order_escrows')
      .select('id,status')
      .eq('order_id', orderId)

    if (escrowErr) {
      return NextResponse.json(
        { error: escrowErr.message ?? 'Could not verify escrow status.' },
        { status: 500 },
      )
    }

    const releasedEscrow = (escrowRows ?? []).find(
      (e) => String(e?.status || '').toLowerCase() === 'released',
    )
    if (releasedEscrow) {
      return NextResponse.json(
        {
          error:
            'This escrow has already been released to the seller. Manual refund completion would silently undo a payout. Recover funds from the seller via a separate flow before retrying.',
          escrowStatus: 'released',
        },
        { status: 409 },
      )
    }

    const nowIso = new Date().toISOString()
    const { error: updErr } = await supabaseAdmin
      .from('orders')
      .update({
        refund_status: 'completed',
        payment_status: 'refunded',
        status: 'cancelled',
        fulfillment_status: 'cancelled',
        refund_completed_at: nowIso,
      })
      .eq('id', orderId)

    if (updErr) {
      return NextResponse.json({ error: updErr.message ?? 'Update failed.' }, { status: 500 })
    }

    await supabaseAdmin
      .from('order_escrows')
      .update({
        status: 'refunded',
        hold_reason: 'Admin manually marked refund complete (break-glass).',
      })
      .eq('order_id', orderId)
      .neq('status', 'released')

    await insertOrderRefundEvent(supabaseAdmin, {
      orderId,
      actor: 'admin',
      action: 'force_complete_manual',
      payload: { adminUserId: user.id },
    })

    if (order.buyer_id) {
      await insertUserNotification(supabaseAdmin, {
        userId: order.buyer_id,
        type: 'payment_refund',
        title: 'Refund completed',
        body: 'Your refund has been marked complete by platform support. If you do not see funds after a few business days, contact your bank or e-wallet provider.',
        metadata: { orderId },
        dedupeKey: `admin_refund_force_complete:${orderId}`,
      })
    }

    apiLog('admin.refund.force_complete', { orderId })
    return NextResponse.json({ ok: true }, { status: 200 })
  }

  if (action === 'retry_paymongo_refund') {
    const { data: order, error: oErr } = await supabaseAdmin
      .from('orders')
      .select('id,subtotal,refund_status,seller_user_id')
      .eq('id', orderId)
      .maybeSingle()

    if (oErr || !order) {
      return NextResponse.json({ error: 'Order not found.' }, { status: 404 })
    }

    if (order.refund_status !== 'processing' && order.refund_status !== 'requested') {
      return NextResponse.json({ error: 'Order is not in a refundable processing state.' }, { status: 400 })
    }

    const { data: joinRows } = await supabaseAdmin
      .from('payment_orders')
      .select('payment_id')
      .eq('order_id', orderId)
      .limit(1)

    const paymentId = joinRows?.[0]?.payment_id ? String(joinRows[0].payment_id) : ''
    if (!paymentId) {
      return NextResponse.json({ error: 'No payment linked.' }, { status: 409 })
    }

    const { data: payRow } = await supabaseAdmin
      .from('payments')
      .select('id,paymongo_payment_id,amount,refunded_amount_php')
      .eq('id', paymentId)
      .maybeSingle()

    const paymongoPid = String(payRow?.paymongo_payment_id || '').trim()
    if (!payRow || !paymongoPid) {
      return NextResponse.json({ error: 'PayMongo payment id missing.' }, { status: 409 })
    }

    const paymentTotal = Number(payRow.amount) || 0
    const alreadyRefunded = Number(payRow.refunded_amount_php) || 0
    const orderSubtotal = Number(order.subtotal) || 0
    const remaining = Math.max(0, paymentTotal - alreadyRefunded)
    const refundPhp = Math.min(orderSubtotal, remaining)
    const centavos = phpToCentavos(refundPhp)
    if (!centavos || centavos <= 0) {
      return NextResponse.json({ error: 'Invalid refund amount.' }, { status: 400 })
    }

    const pm = await createPaymongoRefund({
      paymentId: paymongoPid,
      amountCentavos: centavos,
      notes: `Admin retry order ${orderId}`,
      reason: 'requested_by_customer',
    })

    if (!pm.ok) {
      return NextResponse.json({ error: pm.error || 'PayMongo error' }, { status: 502 })
    }

    await supabaseAdmin
      .from('orders')
      .update({ refund_status: 'processing', paymongo_refund_id: pm.refundId })
      .eq('id', orderId)

    await insertOrderRefundEvent(supabaseAdmin, {
      orderId,
      paymentId,
      actor: 'admin',
      action: 'retry_paymongo_refund',
      paymongoRefundId: pm.refundId,
      payload: { adminUserId: user.id },
    })

    apiLog('admin.refund.retry_paymongo', { orderId })
    return NextResponse.json({ ok: true, paymongoRefundId: pm.refundId }, { status: 200 })
  }

  return NextResponse.json({ error: 'Invalid action.' }, { status: 400 })
}
