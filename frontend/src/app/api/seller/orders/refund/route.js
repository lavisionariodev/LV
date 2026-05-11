import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { apiLog, errorMessage } from '@/lib/observability/apiLog'
import { createPaymongoRefund, phpToCentavos } from '@/lib/paymongo/client'
import { insertOrderRefundEvent, insertUserNotification } from '@/lib/payments/refundReconcile'

/**
 * Seller responds to buyer pre-confirmation cancellation (refund pipeline).
 * - approve: creates PayMongo refund; sets processing + paymongo_refund_id (terminal completion via webhook).
 * - decline: restores paid booking.
 * - complete: deprecated — refund completion is automatic when PayMongo sends payment.refunded / payment.refund.updated (succeeded).
 */
export async function POST(request) {
  const supabase = await createClient()
  const supabaseAdmin = getSupabaseAdmin()

  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser()

  if (userErr || !user) {
    return NextResponse.json(
      { error: 'You must be signed in to manage refund requests.' },
      { status: 401 },
    )
  }

  const body = await request.json().catch(() => ({}))
  const orderId = String(body?.orderId ?? '').trim()
  const decision = String(body?.decision ?? '').trim().toLowerCase()
  const declineReason =
    body?.declineReason != null ? String(body.declineReason).trim().slice(0, 2000) : ''

  if (!orderId) {
    return NextResponse.json(
      { error: 'Order not found. Please refresh and try again.' },
      { status: 400 },
    )
  }
  if (!['approve', 'decline', 'complete'].includes(decision)) {
    return NextResponse.json({ error: 'Invalid action.' }, { status: 400 })
  }

  if (decision === 'complete') {
    return NextResponse.json(
      {
        error:
          'Refunds are completed automatically once confirmed by the payment provider. If a refund appears stuck, please contact support.',
      },
      { status: 410 },
    )
  }

  const { data: order, error: orderErr } = await supabaseAdmin
    .from('orders')
    .select(
      'id,seller_user_id,fulfillment_status,payment_status,status,refund_status,subtotal,buyer_id',
    )
    .eq('id', orderId)
    .maybeSingle()

  if (orderErr || !order) {
    return NextResponse.json({ error: 'Order not found.' }, { status: 404 })
  }

  if (order.seller_user_id !== user.id) {
    return NextResponse.json(
      { error: 'You are not authorized to update this order.' },
      { status: 403 },
    )
  }

  /** @type {Record<string, unknown>} */
  let patch = {}

  if (decision === 'decline') {
    if (order.refund_status !== 'requested' && order.refund_status !== 'processing') {
      return NextResponse.json(
        { error: 'There is no pending refund request to decline for this order.' },
        { status: 400 },
      )
    }
    patch = {
      refund_status: 'declined',
      fulfillment_status: 'pending',
      payment_status: 'paid',
      status: 'paid',
      refund_decline_reason: declineReason || null,
    }
  } else if (decision === 'approve') {
    if (order.refund_status !== 'requested') {
      return NextResponse.json(
        { error: 'This refund request is not awaiting approval.' },
        { status: 400 },
      )
    }

    const { data: joinRows } = await supabaseAdmin
      .from('payment_orders')
      .select('payment_id')
      .eq('order_id', orderId)
      .limit(1)

    const paymentId = joinRows?.[0]?.payment_id ? String(joinRows[0].payment_id) : ''
    if (!paymentId) {
      return NextResponse.json(
        { error: 'No payment record was found for this order. Please contact support.' },
        { status: 409 },
      )
    }

    const { data: payRow, error: payErr } = await supabaseAdmin
      .from('payments')
      .select('id,paymongo_payment_id,amount,refunded_amount_php,status')
      .eq('id', paymentId)
      .maybeSingle()

    if (payErr || !payRow) {
      return NextResponse.json(
        { error: 'Payment details for this order are unavailable. Please contact support.' },
        { status: 404 },
      )
    }

    const paymongoPid = String(payRow.paymongo_payment_id || '').trim()
    if (!paymongoPid) {
      return NextResponse.json(
        {
          error:
            'The payment is still being finalized. Please wait a moment and try again.',
        },
        { status: 409 },
      )
    }

    const paymentTotal = Number(payRow.amount) || 0
    const alreadyRefunded = Number(payRow.refunded_amount_php) || 0
    const orderSubtotal = Number(order.subtotal) || 0
    const remaining = Math.max(0, paymentTotal - alreadyRefunded)
    const refundPhp = Math.min(orderSubtotal, remaining)
    const centavos = phpToCentavos(refundPhp)
    if (!centavos || centavos <= 0) {
      return NextResponse.json(
        { error: 'Unable to calculate a refund amount for this order.' },
        { status: 400 },
      )
    }

    const pm = await createPaymongoRefund({
      paymentId: paymongoPid,
      amountCentavos: centavos,
      notes: `Order ${orderId}`,
      reason: 'requested_by_customer',
    })

    if (!pm.ok) {
      apiLog('seller.refund.paymongo_failed', { err: pm.error })
      return NextResponse.json(
        {
          error:
            'The payment provider was unable to process this refund. Please try again later.',
        },
        { status: pm.status && pm.status >= 400 && pm.status < 600 ? pm.status : 502 },
      )
    }

    patch = {
      refund_status: 'processing',
      paymongo_refund_id: pm.refundId,
    }

    const { error: upd0 } = await supabaseAdmin.from('orders').update(patch).eq('id', orderId)
    if (upd0) {
      apiLog('seller.refund.update_failed', { err: errorMessage(upd0) })
      return NextResponse.json(
        { error: 'Unable to update the refund. Please try again.' },
        { status: 500 },
      )
    }

    await supabaseAdmin
      .from('order_escrows')
      .update({
        status: 'on_hold',
        hold_reason:
          'Buyer cancelled before provider confirmation; refund approved. PayMongo refund initiated.',
      })
      .eq('order_id', orderId)

    await insertOrderRefundEvent(supabaseAdmin, {
      orderId,
      paymentId,
      actor: 'seller',
      action: 'refund_approve_paymongo',
      paymongoRefundId: pm.refundId,
      payload: { amount_centavos: centavos },
    })

    if (order.buyer_id) {
      await insertUserNotification(supabaseAdmin, {
        userId: order.buyer_id,
        type: 'payment_refund',
        title: 'Refund approved',
        body: 'Your provider has approved your cancellation and your refund has been initiated. Funds typically arrive within 5 to 15 business days, depending on your bank or e-wallet.',
        metadata: { orderId, paymongoRefundId: pm.refundId },
      })
    }

    apiLog('seller.refund.ok', { decision: 'approve' })
    return NextResponse.json({ ok: true, paymongoRefundId: pm.refundId }, { status: 200 })
  }

  const { error: updErr } = await supabaseAdmin.from('orders').update(patch).eq('id', orderId)

  if (updErr) {
    apiLog('seller.refund.update_failed', { err: errorMessage(updErr) })
    return NextResponse.json(
      { error: 'Unable to update the refund. Please try again.' },
      { status: 500 },
    )
  }

  if (decision === 'decline') {
    await supabaseAdmin
      .from('order_escrows')
      .update({ status: 'escrowed', hold_reason: null })
      .eq('order_id', orderId)

    await insertOrderRefundEvent(supabaseAdmin, {
      orderId,
      actor: 'seller',
      action: 'refund_declined',
      payload: { reason: declineReason || null },
    })

    if (order.buyer_id) {
      const declineDetail = declineReason ? ` Provider note: ${declineReason}` : ''
      await insertUserNotification(supabaseAdmin, {
        userId: order.buyer_id,
        type: 'service_alert',
        title: 'Refund request declined',
        body: `Your refund request has been declined by the provider. Your booking remains active and awaiting confirmation.${declineDetail} If you require further assistance, please use Request help to escalate this concern.`,
        metadata: { orderId },
      })
    }
  }

  apiLog('seller.refund.ok', { decision })

  return NextResponse.json({ ok: true }, { status: 200 })
}
