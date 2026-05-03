import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { apiLog, errorMessage } from '@/lib/observability/apiLog'
import { getClientIp, takeToken } from '@/lib/rate-limit/memoryRateLimit'

/**
 * Buyer cancels purchase while provider has not confirmed (fulfillment pending).
 * - Unpaid: order is cancelled outright.
 * - Paid: cancellation + refund request (timeline in UI — settlement is staged like marketplaces).
 */
export async function POST(request) {
  const ip = getClientIp(request)
  const rl = takeToken(`buyer:cancel:${ip}`, { windowMs: 15 * 60_000, max: 35 })
  if (!rl.ok) {
    apiLog('buyer.cancel.ratelimited', { retryAfterSec: rl.retryAfterSec })
    return NextResponse.json(
      { error: 'Too many attempts. Wait a minute and try again.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec ?? 60) } },
    )
  }

  const supabase = await createClient()
  const supabaseAdmin = getSupabaseAdmin()

  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser()

  if (userErr || !user) {
    apiLog('buyer.cancel.unauthorized', {})
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => ({}))
  const orderId = String(body?.orderId ?? '').trim()

  if (!orderId) {
    return NextResponse.json({ error: 'Missing orderId.' }, { status: 400 })
  }

  try {
    const { data: order, error: orderErr } = await supabaseAdmin
      .from('orders')
      .select(
        'id,buyer_id,seller_user_id,fulfillment_status,payment_status,status,refund_status',
      )
      .eq('id', orderId)
      .maybeSingle()

    if (orderErr || !order) {
      apiLog('buyer.cancel.not_found', {})
      return NextResponse.json({ error: 'Order not found.' }, { status: 404 })
    }

    if (order.buyer_id !== user.id) {
      apiLog('buyer.cancel.forbidden', {})
      return NextResponse.json({ error: 'Not allowed.' }, { status: 403 })
    }

    const fulfillment = order.fulfillment_status || 'pending'

    if (fulfillment === 'cancelled') {
      return NextResponse.json({ error: 'This order is already cancelled.' }, { status: 400 })
    }

    if (['confirmed', 'in_progress', 'completed'].includes(fulfillment)) {
      return NextResponse.json(
        {
          error:
            'The provider already confirmed this order. You can no longer cancel it from purchases — contact support if you still need changes.',
        },
        { status: 400 },
      )
    }

    if (fulfillment !== 'pending') {
      return NextResponse.json({ error: 'This order cannot be cancelled.' }, { status: 400 })
    }

    const { data: joinRows } = await supabaseAdmin
      .from('payment_orders')
      .select('payment_id')
      .eq('order_id', orderId)

    const paymentIds = (joinRows ?? []).map((r) => r.payment_id).filter(Boolean)

    if (paymentIds.length > 0) {
      const { data: pays } = await supabaseAdmin.from('payments').select('id,status').in('id', paymentIds)

      const hasPendingCheckout = (pays ?? []).some((p) => p.status === 'pending')
      if (hasPendingCheckout) {
        apiLog('buyer.cancel.blocked_pending_checkout', {})
        return NextResponse.json(
          {
            error:
              'Payment checkout is still in progress for this order. Wait for it to finish or expire, then try again.',
          },
          { status: 409 },
        )
      }
    }

    const paid = order.payment_status === 'paid' || order.status === 'paid'
    const rs = order.refund_status ?? null

    if (paid) {
      if (rs === 'requested' || rs === 'processing' || rs === 'completed') {
        return NextResponse.json(
          { error: 'A refund is already in progress for this purchase.' },
          { status: 400 },
        )
      }

      const nowIso = new Date().toISOString()
      const { error: paidUpdErr } = await supabaseAdmin
        .from('orders')
        .update({
          fulfillment_status: 'cancelled',
          payment_status: 'refund_pending',
          refund_status: 'requested',
          refund_requested_at: nowIso,
          status: 'cancelled',
        })
        .eq('id', orderId)

      if (paidUpdErr) {
        apiLog('buyer.cancel.paid_update_failed', { err: errorMessage(paidUpdErr) })
        return NextResponse.json(
          { error: paidUpdErr.message ?? 'Could not cancel this paid order.' },
          { status: 500 },
        )
      }

      await supabaseAdmin
        .from('order_escrows')
        .update({
          status: 'on_hold',
          hold_reason: 'Buyer cancelled before provider confirmation; refund requested.',
        })
        .eq('order_id', orderId)

      apiLog('buyer.cancel.ok_paid_refund_requested', {})

      return NextResponse.json(
        {
          ok: true,
          mode: 'refund_requested',
          message:
            'Purchase cancelled and refund requested. After the provider approves, refunds usually arrive in about 5–15 business days, depending on your bank or e-wallet.',
        },
        { status: 200 },
      )
    }

    const { error: updErr } = await supabaseAdmin
      .from('orders')
      .update({
        fulfillment_status: 'cancelled',
        status: 'cancelled',
      })
      .eq('id', orderId)

    if (updErr) {
      apiLog('buyer.cancel.update_failed', { err: errorMessage(updErr) })
      return NextResponse.json(
        { error: updErr.message ?? 'Failed to cancel order.' },
        { status: 500 },
      )
    }

    apiLog('buyer.cancel.ok', {})

    return NextResponse.json({ ok: true, mode: 'unpaid_cancelled' }, { status: 200 })
  } catch (e) {
    apiLog('buyer.cancel.exception', { err: errorMessage(e) })
    return NextResponse.json({ error: 'Cancellation failed.' }, { status: 500 })
  }
}
