import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { requireActiveBuyerApiUser } from '@/lib/auth/requireApiUser'
import { apiLog, errorMessage } from '@/lib/observability/apiLog'
import { getClientIp, takeToken } from '@/lib/rate-limit/memoryRateLimit'
import { createPaymongoCheckoutSession, phpToCentavos } from '@/lib/paymongo/client'
import {
  fetchActivePaymongoCheckoutByOrderId,
  reconcileStaleCheckoutPayments,
} from '@/lib/checkout/reconcileCheckoutPayments'
import { resolveOrderLaneForOrderId } from '@/lib/orders/orderKindFromItems'
import { paymongoCheckoutLineItemName } from '@/lib/orders/orderDisplayCopy'

export async function POST(request) {
  const ip = getClientIp(request)
  const rl = takeToken(`checkout:pay:${ip}`, { windowMs: 15 * 60_000, max: 25 })
  if (!rl.ok) {
    apiLog('checkout.pay.ratelimited', { retryAfterSec: rl.retryAfterSec })
    return NextResponse.json(
      { error: 'Too many checkout attempts. Try again later.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec ?? 60) } },
    )
  }

  const { user, responseError } = await requireActiveBuyerApiUser()
  if (responseError) {
    if (responseError.status === 401) apiLog('checkout.pay.unauthorized', {})
    if (responseError.status === 403) apiLog('checkout.pay.not_buyer', {})
    return responseError
  }

  const supabaseAdmin = getSupabaseAdmin()

  const body = await request.json().catch(() => ({}))
  const orderIdsRaw = Array.isArray(body?.orderIds) ? body.orderIds : null
  const orderIds = orderIdsRaw?.map((v) => String(v).trim()).filter(Boolean) ?? null

  if (!orderIds || orderIds.length === 0) {
    return NextResponse.json({ error: 'Missing orderIds.' }, { status: 400 })
  }

  apiLog('checkout.pay.start', { orderCount: orderIds.length })

  const { data: orders, error: ordersErr } = await supabaseAdmin
    .from('orders')
    .select('id,buyer_id,fulfillment_status,payment_status,status,subtotal,currency')
    .in('id', orderIds)

  if (ordersErr || !orders || orders.length === 0) {
    return NextResponse.json({ error: 'Orders not found.' }, { status: 404 })
  }

  if (orders.length !== orderIds.length) {
    return NextResponse.json({ error: 'One or more orders were not found.' }, { status: 404 })
  }

  const currencies = new Set(
    orders.map((o) => String(o.currency || 'PHP').trim().toUpperCase() || 'PHP'),
  )
  if (currencies.size > 1) {
    return NextResponse.json(
      { error: 'Orders must share the same currency to pay together.' },
      { status: 400 },
    )
  }

  const notOwned = orders.some((o) => o.buyer_id !== user.id)
  if (notOwned) {
    return NextResponse.json({ error: 'Not allowed.' }, { status: 403 })
  }

  // Pay at checkout: fulfillment stays `pending` until the seller confirms post-payment.
  const notPayable = orders.some((o) => {
    const f = o.fulfillment_status || 'pending'
    return f !== 'pending'
  })
  if (notPayable) {
    return NextResponse.json(
      { error: 'One or more orders are not open for payment.' },
      { status: 400 },
    )
  }

  await reconcileStaleCheckoutPayments(supabaseAdmin, user.id, orderIds)

  const activeCheckout = await fetchActivePaymongoCheckoutByOrderId(supabaseAdmin, orderIds)
  if ([...activeCheckout.values()].some(Boolean)) {
    apiLog('checkout.pay.duplicate_session', {})
    const lane = await resolveOrderLaneForOrderId(supabaseAdmin, orderIds[0])
    return NextResponse.json(
      {
        error:
          lane === 'product'
            ? 'Payment is already in progress for this order. Finish or close the PayMongo window, then try again.'
            : 'Payment is already in progress for this booking. Finish or close the PayMongo window, then try Pay again.',
      },
      { status: 409 },
    )
  }

  const alreadyPaid = orders.some(
    (o) => o.payment_status === 'paid' || String(o.status || '') === 'paid',
  )
  if (alreadyPaid) {
    return NextResponse.json({ error: 'Order is already paid.' }, { status: 400 })
  }

  const totalAmountPhp = orders.reduce((sum, o) => sum + (Number(o.subtotal) || 0), 0)
  const currency = orders[0]?.currency || 'PHP'
  const amountCentavos = phpToCentavos(totalAmountPhp)
  if (!amountCentavos || amountCentavos <= 0) {
    return NextResponse.json({ error: 'Invalid total amount.' }, { status: 400 })
  }

  const secretKey = process.env.PAYMONGO_SECRET_KEY
  if (!secretKey) {
    apiLog('checkout.pay.env_missing_paymongo_secret', {})
    return NextResponse.json({ error: 'Missing PAYMONGO_SECRET_KEY on server.' }, { status: 500 })
  }

  const origin = new URL(request.url).origin
  const paymongoReference = `lv_${crypto.randomUUID()}`
  const checkoutLane = await resolveOrderLaneForOrderId(supabaseAdmin, orderIds[0])
  const lineItemName = paymongoCheckoutLineItemName(checkoutLane)

  const { data: paymentRow, error: paymentErr } = await supabaseAdmin
    .from('payments')
    .insert({
      buyer_id: user.id,
      provider: 'paymongo',
      status: 'pending',
      amount: totalAmountPhp,
      currency,
      paymongo_reference: paymongoReference,
      metadata: { order_ids: orderIds, checkout_lane: checkoutLane },
    })
    .select('*')
    .single()

  if (paymentErr) {
    apiLog('checkout.pay.payment_insert_failed', { err: errorMessage(paymentErr) })
    return NextResponse.json(
      { error: paymentErr.message ?? 'Failed to create payment record.' },
      { status: 500 },
    )
  }

  const { error: paymentOrdersErr } = await supabaseAdmin.from('payment_orders').insert(
    orderIds.map((orderId) => ({
      payment_id: paymentRow.id,
      order_id: orderId,
    })),
  )

  if (paymentOrdersErr) {
    apiLog('checkout.pay.payment_orders_insert_failed', { err: errorMessage(paymentOrdersErr) })
    await supabaseAdmin
      .from('payments')
      .update({
        status: 'failed',
        metadata: {
          ...(paymentRow.metadata ?? {}),
          link_error: paymentOrdersErr.message ?? 'Failed to link payment to orders.',
        },
      })
      .eq('id', paymentRow.id)

    return NextResponse.json(
      { error: paymentOrdersErr.message ?? 'Failed to link payment to orders.' },
      { status: 500 },
    )
  }

  const successUrl = `${origin}/checkout/success?payment=${encodeURIComponent(paymentRow.id)}`
  const cancelUrl = `${origin}/checkout?resume=1&payment=${encodeURIComponent(paymentRow.id)}`

  const paymongoResult = await createPaymongoCheckoutSession({
    amountCentavos,
    currency,
    successUrl,
    cancelUrl,
    referenceNumber: paymongoReference,
    lineItemName,
    metadata: {
      payment_id: paymentRow.id,
      order_ids: orderIds,
      checkout_lane: checkoutLane,
    },
  })

  if (!paymongoResult.ok) {
    apiLog('checkout.pay.paymongo_session_failed', { statusCode: paymongoResult.status })
    await supabaseAdmin
      .from('payments')
      .update({
        status: 'failed',
        metadata: {
          ...(paymentRow.metadata ?? {}),
          paymongo_error: paymongoResult.raw,
        },
      })
      .eq('id', paymentRow.id)

    return NextResponse.json({ error: 'Failed to create PayMongo checkout session.' }, { status: 502 })
  }

  const checkoutId = paymongoResult.checkoutId
  const checkoutUrl = paymongoResult.checkoutUrl

  if (!checkoutId || !checkoutUrl) {
    apiLog('checkout.pay.paymongo_bad_response_shape', {})
    return NextResponse.json({ error: 'PayMongo response missing checkout_url.' }, { status: 502 })
  }

  await supabaseAdmin
    .from('payments')
    .update({
      paymongo_checkout_id: checkoutId,
      metadata: { ...(paymentRow.metadata ?? {}), paymongo_checkout_id: checkoutId },
    })
    .eq('id', paymentRow.id)

  apiLog('checkout.pay.checkout_created', {})

  return NextResponse.json(
    { redirect_url: checkoutUrl, payment_id: paymentRow.id },
    { status: 200 },
  )
}

