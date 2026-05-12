import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { apiLog, errorMessage } from '@/lib/observability/apiLog'
import { createPaymongoRefund, phpToCentavos } from '@/lib/paymongo/client'
import { insertOrderRefundEvent, insertUserNotification } from '@/lib/payments/refundReconcile'

function paidOrder(order) {
  return order?.payment_status === 'paid' || order?.status === 'paid'
}

export async function POST(request) {
  const supabase = await createClient()
  const supabaseAdmin = getSupabaseAdmin()

  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser()

  if (userErr || !user) {
    return NextResponse.json({ error: 'You must be signed in to decline orders.' }, { status: 401 })
  }

  const body = await request.json().catch(() => ({}))
  const orderId = String(body?.orderId ?? '').trim()
  const reason = String(body?.reason ?? '').trim().slice(0, 1000)

  if (!orderId) {
    return NextResponse.json({ error: 'Missing order id.' }, { status: 400 })
  }

  const { data: order, error: orderErr } = await supabaseAdmin
    .from('orders')
    .select('id,order_number,buyer_id,seller_user_id,fulfillment_status,payment_status,status,refund_status,subtotal')
    .eq('id', orderId)
    .maybeSingle()

  if (orderErr || !order) {
    return NextResponse.json({ error: 'Order not found.' }, { status: 404 })
  }

  if (order.seller_user_id !== user.id) {
    return NextResponse.json({ error: 'You are not authorized to decline this order.' }, { status: 403 })
  }

  if (order.fulfillment_status === 'completed') {
    return NextResponse.json({ error: 'Completed orders cannot be declined.' }, { status: 400 })
  }

  if (order.refund_status === 'processing' || order.refund_status === 'requested') {
    return NextResponse.json({ error: 'A refund is already in progress for this order.' }, { status: 400 })
  }

  if (order.refund_status === 'completed' || order.payment_status === 'refunded') {
    return NextResponse.json({ error: 'This order has already been refunded.' }, { status: 400 })
  }

  if (!paidOrder(order)) {
    return NextResponse.json({ error: 'Only paid orders can be declined through automatic refund.' }, { status: 400 })
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

  const paymongoPaymentId = String(payRow.paymongo_payment_id || '').trim()
  if (!paymongoPaymentId) {
    return NextResponse.json(
      { error: 'The payment is still being finalized. Please wait a moment and try again.' },
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
    return NextResponse.json({ error: 'Unable to calculate a refundable amount for this order.' }, { status: 400 })
  }

  const ref = order.order_number || String(orderId).slice(0, 8)
  const pm = await createPaymongoRefund({
    paymentId: paymongoPaymentId,
    amountCentavos: centavos,
    notes: `Seller declined order ${ref}`,
    reason: 'requested_by_customer',
  })

  if (!pm.ok) {
    apiLog('seller.decline_refund.paymongo_failed', { err: pm.error })
    return NextResponse.json(
      { error: 'The payment provider was unable to process this refund. Please try again later.' },
      { status: pm.status && pm.status >= 400 && pm.status < 600 ? pm.status : 502 },
    )
  }

  const nowIso = new Date().toISOString()
  const refundReason = reason || 'Seller declined the order.'
  const { error: updErr } = await supabaseAdmin
    .from('orders')
    .update({
      refund_status: 'processing',
      refund_requested_at: nowIso,
      payment_status: 'refund_pending',
      status: 'cancelled',
      fulfillment_status: 'cancelled',
      paymongo_refund_id: pm.refundId,
      refund_reason: refundReason,
    })
    .eq('id', orderId)

  if (updErr) {
    apiLog('seller.decline_refund.order_update_failed', { err: errorMessage(updErr), orderId })
    return NextResponse.json(
      { error: 'The refund was started, but the order could not be updated. Please contact support.' },
      { status: 500 },
    )
  }

  await supabaseAdmin
    .from('order_escrows')
    .update({
      status: 'on_hold',
      hold_reason: 'Seller declined order; buyer refund initiated.',
    })
    .eq('order_id', orderId)

  await insertOrderRefundEvent(supabaseAdmin, {
    orderId,
    paymentId,
    actor: 'seller',
    action: 'seller_decline_refund_initiated',
    paymongoRefundId: pm.refundId,
    payload: {
      amount_centavos: centavos,
      reason: refundReason,
    },
  })

  if (order.buyer_id) {
    await insertUserNotification(supabaseAdmin, {
      userId: order.buyer_id,
      type: 'payment_refund',
      title: 'Order declined and refund started',
      body: `Your provider declined booking ${ref}. Your refund has been initiated and will return to your original payment method once processed by the payment provider.`,
      metadata: { orderId, paymongoRefundId: pm.refundId },
      dedupeKey: `seller_decline_refund_buyer:${orderId}:${pm.refundId}`,
    })
  }

  await insertUserNotification(supabaseAdmin, {
    userId: user.id,
    type: 'payment_refund',
    title: 'Refund initiated for declined order',
    body: `Order ${ref} was declined. The buyer refund is now processing and this order will not receive a payout.`,
    metadata: { orderId, paymongoRefundId: pm.refundId },
    dedupeKey: `seller_decline_refund_seller:${orderId}:${pm.refundId}`,
  })

  apiLog('seller.decline_refund.ok', { orderId })
  return NextResponse.json({ ok: true, paymongoRefundId: pm.refundId }, { status: 200 })
}
