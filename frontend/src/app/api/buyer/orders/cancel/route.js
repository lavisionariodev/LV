import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { requireActiveBuyerApiUser } from '@/lib/auth/requireApiUser'
import { apiLog, errorMessage } from '@/lib/observability/apiLog'
import { getClientIp, takeToken } from '@/lib/rate-limit/memoryRateLimit'
import { insertOrderRefundEvent, insertUserNotification } from '@/lib/payments/refundReconcile'
import { notifySeller } from '@/lib/notifications/inAppServer'
import { resolveOrderLaneForOrderId } from '@/lib/orders/orderKindFromItems'

/**
 * Buyer cancels purchase while provider/seller has not confirmed (fulfillment pending).
 * - Unpaid: order is cancelled outright.
 * - Paid: cancellation + refund request (timeline in UI — settlement is staged like marketplaces).
 */
export async function POST(request) {
  const ip = getClientIp(request)
  const rl = takeToken(`buyer:cancel:${ip}`, { windowMs: 15 * 60_000, max: 35 })
  if (!rl.ok) {
    apiLog('buyer.cancel.ratelimited', { retryAfterSec: rl.retryAfterSec })
    return NextResponse.json(
      { error: 'Too many requests. Please wait a moment and try again.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec ?? 60) } },
    )
  }

  const { user, responseError } = await requireActiveBuyerApiUser()
  if (responseError) {
    if (responseError.status === 401) apiLog('buyer.cancel.unauthorized', {})
    return responseError
  }

  const supabaseAdmin = getSupabaseAdmin()

  const body = await request.json().catch(() => ({}))
  const orderId = String(body?.orderId ?? '').trim()
  const refundReason =
    body?.refundReason != null ? String(body.refundReason).trim().slice(0, 2000) : ''

  if (!orderId) {
    return NextResponse.json(
      { error: 'Purchase not found. Please refresh the page and try again.' },
      { status: 400 },
    )
  }

  try {
    const { data: order, error: orderErr } = await supabaseAdmin
      .from('orders')
      .select(
        'id,buyer_id,seller_user_id,fulfillment_status,payment_status,status,refund_status,subtotal',
      )
      .eq('id', orderId)
      .maybeSingle()

    if (orderErr || !order) {
      apiLog('buyer.cancel.not_found', {})
      return NextResponse.json(
        { error: 'Purchase not found.' },
        { status: 404 },
      )
    }

    if (order.buyer_id !== user.id) {
      apiLog('buyer.cancel.forbidden', {})
      return NextResponse.json(
        { error: 'You are not authorized to cancel this purchase.' },
        { status: 403 },
      )
    }

    const fulfillment = order.fulfillment_status || 'pending'

    if (fulfillment === 'cancelled') {
      return NextResponse.json(
        { error: 'This purchase has already been cancelled.' },
        { status: 400 },
      )
    }

    const orderLane = await resolveOrderLaneForOrderId(supabaseAdmin, orderId)
    const isProductOrder = orderLane === 'product'

    if (['confirmed', 'in_progress', 'completed'].includes(fulfillment)) {
      return NextResponse.json(
        {
          error: isProductOrder
            ? 'This order has already been confirmed by the seller and can no longer be cancelled. Use Request help if you need support.'
            : 'This booking has already been confirmed and can no longer be cancelled. Please use Request help to escalate this concern.',
        },
        { status: 400 },
      )
    }

    if (fulfillment !== 'pending') {
      return NextResponse.json(
        { error: 'This purchase can no longer be cancelled.' },
        { status: 400 },
      )
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
              'Payment is still being processed. Please wait for it to complete, then try again.',
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
          refund_reason: refundReason || null,
        })
        .eq('id', orderId)

      if (paidUpdErr) {
        apiLog('buyer.cancel.paid_update_failed', { err: errorMessage(paidUpdErr) })
        return NextResponse.json(
          { error: 'Unable to cancel this purchase. Please try again.' },
          { status: 500 },
        )
      }

      await supabaseAdmin
        .from('order_escrows')
        .update({
          status: 'on_hold',
          hold_reason: isProductOrder
            ? 'Buyer cancelled before seller confirmation; refund requested.'
            : 'Buyer cancelled before provider confirmation; refund requested.',
        })
        .eq('order_id', orderId)

      const { data: joinPay } = await supabaseAdmin
        .from('payment_orders')
        .select('payment_id')
        .eq('order_id', orderId)
        .limit(1)
      const pid = joinPay?.[0]?.payment_id ?? null

      await insertOrderRefundEvent(supabaseAdmin, {
        orderId,
        paymentId: pid,
        actor: 'buyer',
        action: 'cancel_paid_refund_requested',
        payload: { refund_reason: refundReason || null },
      })

      if (order.seller_user_id) {
        await notifySeller(supabaseAdmin, order.seller_user_id, {
          type: 'alerts',
          title: 'Refund request received',
          body: isProductOrder
            ? `A buyer cancelled their product order before you confirmed it and has requested a refund. Please review and approve or decline.${refundReason ? ` Buyer note: ${refundReason}` : ''}`
            : `A buyer cancelled their booking before confirmation and has requested a refund. Please review and approve or decline.${refundReason ? ` Buyer note: ${refundReason}` : ''}`,
          metadata: { orderId },
          dedupeKey: `seller_refund_requested:${orderId}`,
        })
      }

      apiLog('buyer.cancel.ok_paid_refund_requested', {})

      return NextResponse.json(
        {
          ok: true,
          mode: 'refund_requested',
          message: isProductOrder
            ? 'Your order has been cancelled and a refund request has been submitted. Once approved by the seller, refunds typically arrive within 5 to 15 business days, depending on your bank or e-wallet.'
            : 'Your purchase has been cancelled and a refund request has been submitted. Once approved by the provider, refunds typically arrive within 5 to 15 business days, depending on your bank or e-wallet.',
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
        { error: 'Unable to cancel this purchase. Please try again.' },
        { status: 500 },
      )
    }

    apiLog('buyer.cancel.ok', {})

    return NextResponse.json({ ok: true, mode: 'unpaid_cancelled' }, { status: 200 })
  } catch (e) {
    apiLog('buyer.cancel.exception', { err: errorMessage(e) })
    return NextResponse.json(
      { error: 'Unable to cancel this purchase. Please try again.' },
      { status: 500 },
    )
  }
}
