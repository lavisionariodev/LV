import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { requireActiveBuyerApiUser } from '@/lib/auth/requireApiUser'
import { apiLog, errorMessage } from '@/lib/observability/apiLog'
import { getClientIp, takeToken } from '@/lib/rate-limit/memoryRateLimit'

function phpToCentavos(amount) {
  const num = Number(amount)
  if (!Number.isFinite(num)) return null
  return Math.round(num * 100)
}

function getBasicAuthHeader(secretKey) {
  const token = Buffer.from(`${secretKey}:`).toString('base64')
  return `Basic ${token}`
}

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

  const checkoutAlreadyOpen = orders.some((o) => o.payment_status === 'pending')
  if (checkoutAlreadyOpen) {
    apiLog('checkout.pay.duplicate_session', {})
    return NextResponse.json(
      {
        error:
          'Payment is already in progress for this booking. Finish or close the PayMongo window, wait if it expires, then try Pay again.',
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

  const { data: paymentRow, error: paymentErr } = await supabaseAdmin
    .from('payments')
    .insert({
      buyer_id: user.id,
      provider: 'paymongo',
      status: 'pending',
      amount: totalAmountPhp,
      currency,
      paymongo_reference: paymongoReference,
      metadata: { order_ids: orderIds },
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

  await supabaseAdmin.from('payment_orders').insert(
    orderIds.map((orderId) => ({
      payment_id: paymentRow.id,
      order_id: orderId,
    })),
  )

  // Mark orders as pending payment.
  await supabaseAdmin
    .from('orders')
    .update({ payment_status: 'pending', status: 'pending_payment' })
    .in('id', orderIds)

  const successUrl = `${origin}/checkout/success?payment=${encodeURIComponent(paymentRow.id)}`
  const cancelUrl = `${origin}/checkout/failed?payment=${encodeURIComponent(paymentRow.id)}`

  const paymongoRes = await fetch('https://api.paymongo.com/v1/checkout_sessions', {
    method: 'POST',
    headers: {
      Authorization: getBasicAuthHeader(secretKey),
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      data: {
        attributes: {
          line_items: [
            {
              name: 'Booking payment',
              amount: amountCentavos,
              quantity: 1,
              currency,
            },
          ],
          payment_method_types: ['card', 'gcash'],
          success_url: successUrl,
          cancel_url: cancelUrl,
          reference_number: paymongoReference,
          metadata: {
            payment_id: paymentRow.id,
            order_ids: orderIds,
          },
        },
      },
    }),
  })

  const paymongoBody = await paymongoRes.json().catch(() => null)

  if (!paymongoRes.ok) {
    apiLog('checkout.pay.paymongo_session_failed', { statusCode: paymongoRes.status })
    await supabaseAdmin
      .from('payments')
      .update({
        status: 'failed',
        metadata: {
          ...(paymentRow.metadata ?? {}),
          paymongo_error: paymongoBody,
        },
      })
      .eq('id', paymentRow.id)

    await supabaseAdmin
      .from('orders')
      .update({ payment_status: 'failed', status: 'failed' })
      .in('id', orderIds)

    return NextResponse.json({ error: 'Failed to create PayMongo checkout session.' }, { status: 502 })
  }

  const checkoutId = paymongoBody?.data?.id ?? null
  const checkoutUrl = paymongoBody?.data?.attributes?.checkout_url ?? null

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

  return NextResponse.json({ redirect_url: checkoutUrl }, { status: 200 })
}

