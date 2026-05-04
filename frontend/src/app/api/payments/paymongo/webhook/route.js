import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { computeCommissionSnapshot } from '@/utils/commissionSnapshot'
import { apiLog } from '@/lib/observability/apiLog'

function parseSignatureHeader(headerValue) {
  // Example: t=1496734173,te=...,li=...
  const out = {}
  for (const part of String(headerValue || '').split(',')) {
    const [k, v] = part.split('=').map((s) => s.trim())
    if (k) out[k] = v ?? ''
  }
  return out
}

function timingSafeEqualHex(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false
  const aa = Buffer.from(a, 'hex')
  const bb = Buffer.from(b, 'hex')
  if (aa.length !== bb.length) return false
  return crypto.timingSafeEqual(aa, bb)
}

function verifyPaymongoSignature({ rawBody, signatureHeader, webhookSecret }) {
  if (!signatureHeader) return { ok: false, error: 'Missing Paymongo-Signature header.' }
  if (!webhookSecret) return { ok: false, error: 'Missing PAYMONGO_WEBHOOK_SECRET on server.' }

  const parsed = parseSignatureHeader(signatureHeader)
  const t = parsed.t
  const te = parsed.te
  const li = parsed.li

  if (!t) return { ok: false, error: 'Invalid Paymongo-Signature header.' }

  const signedPayload = `${t}.${rawBody}`
  const computed = crypto
    .createHmac('sha256', webhookSecret)
    .update(signedPayload, 'utf8')
    .digest('hex')

  // Prefer matching either test or live signature to avoid coupling to env mode here.
  const matchesTest = te ? timingSafeEqualHex(computed, te) : false
  const matchesLive = li ? timingSafeEqualHex(computed, li) : false

  if (!matchesTest && !matchesLive) {
    return { ok: false, error: 'Signature verification failed.' }
  }

  return { ok: true }
}

function getEventType(payload) {
  return (
    payload?.data?.attributes?.type ??
    payload?.data?.attributes?.event_type ??
    payload?.data?.attributes?.event?.type ??
    null
  )
}

function getResource(payload) {
  return payload?.data?.attributes?.data ?? payload?.data?.attributes?.resource ?? null
}

function extractCheckoutSessionId(payload) {
  const resource = getResource(payload)
  if (resource?.type === 'checkout_session') return resource?.id ?? null
  if (resource?.type === 'payment') {
    return resource?.attributes?.checkout_session?.id ?? null
  }
  return null
}

function extractReferenceNumber(payload) {
  const resource = getResource(payload)
  return resource?.attributes?.reference_number ?? null
}

/**
 * Create order_escrows for paid orders tied to this payment (idempotent; skips existing rows).
 */
async function ensureOrderEscrowsForPayment({ supabaseAdmin, paymentId, orderIds }) {
  if (!orderIds?.length) return

  const { data: ordersRows, error: ordersErr } = await supabaseAdmin
    .from('orders')
    .select('id,seller_user_id,subtotal,currency,payment_status')
    .in('id', orderIds)

  if (ordersErr || !ordersRows?.length) return

  const paidOrders = ordersRows.filter((o) => o.payment_status === 'paid')
  if (!paidOrders.length) return

  const { data: billing } = await supabaseAdmin
    .from('platform_billing')
    .select('default_commission_percent')
    .eq('id', 1)
    .maybeSingle()

  const ratePercent =
    billing?.default_commission_percent != null ? Number(billing.default_commission_percent) : 10

  const { data: existingRows } = await supabaseAdmin
    .from('order_escrows')
    .select('order_id')
    .in(
      'order_id',
      paidOrders.map((o) => o.id),
    )

  const existingIds = new Set((existingRows ?? []).map((r) => r.order_id))

  const inserts = []
  for (const o of paidOrders) {
    if (existingIds.has(o.id)) continue
    const snap = computeCommissionSnapshot(Number(o.subtotal), ratePercent)
    inserts.push({
      order_id: o.id,
      seller_user_id: o.seller_user_id,
      payment_id: paymentId,
      gross_amount: snap.grossAmountPhp,
      commission_rate_percent: snap.commissionRatePercent,
      commission_amount: snap.commissionAmountPhp,
      net_amount: snap.netAmountPhp,
      currency: o.currency?.trim?.() ? o.currency.trim() : 'PHP',
      status: 'escrowed',
    })
  }

  if (inserts.length > 0) {
    await supabaseAdmin.from('order_escrows').insert(inserts)
  }
}

export async function POST(request) {
  const supabaseAdmin = getSupabaseAdmin()
  const rawBody = await request.text()
  const signatureHeader = request.headers.get('paymongo-signature')
  const webhookSecret = process.env.PAYMONGO_WEBHOOK_SECRET

  const verified = verifyPaymongoSignature({ rawBody, signatureHeader, webhookSecret })
  if (!verified.ok) {
    apiLog('paymongo.webhook.signature_failed', {})
    return NextResponse.json({ error: verified.error }, { status: 400 })
  }

  const payload = JSON.parse(rawBody || '{}')
  const eventType = getEventType(payload)
  apiLog('paymongo.webhook.received', { eventKind: typeof eventType === 'string' ? eventType : 'unknown' })

  const checkoutSessionId = extractCheckoutSessionId(payload)
  const referenceNumber = extractReferenceNumber(payload)

  if (!checkoutSessionId && !referenceNumber) {
    return NextResponse.json({ received: true }, { status: 200 })
  }

  const { data: paymentRow, error: paymentLookupErr } = await supabaseAdmin
    .from('payments')
    .select('id,status')
    .or(
      [
        checkoutSessionId ? `paymongo_checkout_id.eq.${checkoutSessionId}` : null,
        referenceNumber ? `paymongo_reference.eq.${referenceNumber}` : null,
      ]
        .filter(Boolean)
        .join(','),
    )
    .order('created_at', { ascending: false })
    .maybeSingle()

  if (paymentLookupErr || !paymentRow) {
    return NextResponse.json({ received: true }, { status: 200 })
  }

  const markPaid =
    eventType === 'checkout_session.payment.paid' ||
    eventType === 'payment.paid'

  const markFailed =
    eventType === 'checkout_session.payment.failed' ||
    eventType === 'payment.failed'

  if (markPaid) {
    if (paymentRow.status !== 'paid') {
      await supabaseAdmin
        .from('payments')
        .update({ status: 'paid' })
        .eq('id', paymentRow.id)

      // Update related orders atomically from join table.
      const { data: joinRows } = await supabaseAdmin
        .from('payment_orders')
        .select('order_id')
        .eq('payment_id', paymentRow.id)

      const orderIds = (joinRows ?? []).map((r) => r.order_id)
      if (orderIds.length > 0) {
        await supabaseAdmin
          .from('orders')
          .update({ payment_status: 'paid', status: 'paid' })
          .in('id', orderIds)
      }
    }

    const { data: joinRowsPaid } = await supabaseAdmin
      .from('payment_orders')
      .select('order_id')
      .eq('payment_id', paymentRow.id)

    const orderIdsPaid = (joinRowsPaid ?? []).map((r) => r.order_id)
    await ensureOrderEscrowsForPayment({
      supabaseAdmin,
      paymentId: paymentRow.id,
      orderIds: orderIdsPaid,
    })
    apiLog('paymongo.webhook.mark_paid', {})
  } else if (markFailed) {
    if (paymentRow.status === 'pending') {
      await supabaseAdmin
        .from('payments')
        .update({ status: 'failed' })
        .eq('id', paymentRow.id)

      const { data: joinRows } = await supabaseAdmin
        .from('payment_orders')
        .select('order_id')
        .eq('payment_id', paymentRow.id)

      const orderIds = (joinRows ?? []).map((r) => r.order_id)
      if (orderIds.length > 0) {
        await supabaseAdmin
          .from('orders')
          .update({ payment_status: 'failed', status: 'failed' })
          .in('id', orderIds)
      }
      apiLog('paymongo.webhook.mark_failed_applied', {})
    }
  }

  return NextResponse.json({ received: true }, { status: 200 })
}

