import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { computeCommissionSnapshot } from '@/shared/utils/commissionSnapshot'
import { apiLog } from '@/lib/observability/apiLog'
import { reconcilePaymongoRefundEvent } from '@/lib/payments/refundReconcile'
import { reconcilePaymongoDisbursementEvent } from '@/lib/payments/disbursementReconcile'
import { notifyUser, notifyAllAdmins, notifySeller } from '@/lib/notifications/inAppServer'
import {
  fetchPlatformDefaultCommissionPercent,
  fetchSellerOverridesByUserId,
  resolveCommissionRate,
} from '@/lib/admin/commissionRate'
import { recordEscrowFundingLedgerEntries } from '@/lib/payments/walletLedgerEvents'

function parseSignatureHeader(headerValue) {
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

function extractTransferFromPayload(payload) {
  const resource = getResource(payload)
  if (!resource) return null
  if (resource.type === 'transfer') {
    return {
      transferId: resource.id ? String(resource.id) : '',
      batchId: resource.attributes?.batch_transfer_id
        ? String(resource.attributes.batch_transfer_id)
        : '',
      status: resource.attributes?.status != null ? String(resource.attributes.status) : '',
      failureReason:
        resource.attributes?.failure_reason != null
          ? String(resource.attributes.failure_reason)
          : resource.attributes?.provider_error != null
            ? String(resource.attributes.provider_error)
            : null,
    }
  }
  if (resource.type === 'batch_transfer' && Array.isArray(resource.attributes?.transfers)) {
    const transfer = resource.attributes.transfers[0]
    if (!transfer) return null
    return {
      transferId: transfer.id ? String(transfer.id) : '',
      batchId: resource.id ? String(resource.id) : '',
      status: transfer.status != null ? String(transfer.status) : '',
      failureReason: transfer.failure_reason != null ? String(transfer.failure_reason) : null,
    }
  }
  return null
}

async function handleDisbursementWebhookEvent(supabaseAdmin, payload, eventType) {
  const transfer = extractTransferFromPayload(payload)
  if (!transfer?.transferId && !transfer?.batchId) return false

  const normalizedType = String(eventType || '').toLowerCase()
  let status = String(transfer.status || '').toLowerCase()
  if (!status) {
    if (normalizedType.includes('failed') || normalizedType.includes('cancelled')) {
      status = normalizedType.includes('cancelled') ? 'cancelled' : 'failed'
    } else if (normalizedType.includes('succeeded') || normalizedType.includes('paid')) {
      status = 'succeeded'
    }
  }

  await reconcilePaymongoDisbursementEvent(supabaseAdmin, {
    transferId: transfer.transferId,
    batchId: transfer.batchId,
    status,
    failureReason: transfer.failureReason,
  })
  return true
}

function extractPaymongoPaymentIdFromResource(payload) {
  const resource = getResource(payload)
  if (resource?.type === 'payment' && resource?.id) return String(resource.id)
  return null
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} supabaseAdmin
 * @param {{ checkoutSessionId?: string | null, referenceNumber?: string | null, paymongoPaymentId?: string | null }}
 */
async function resolveInternalPaymentRow(supabaseAdmin, { checkoutSessionId, referenceNumber, paymongoPaymentId }) {
  const orParts = [
    checkoutSessionId ? `paymongo_checkout_id.eq.${checkoutSessionId}` : null,
    referenceNumber ? `paymongo_reference.eq.${referenceNumber}` : null,
    paymongoPaymentId ? `paymongo_payment_id.eq.${paymongoPaymentId}` : null,
  ].filter(Boolean)

  if (orParts.length === 0) return null

  const { data, error } = await supabaseAdmin
    .from('payments')
    .select('id,status,amount')
    .or(orParts.join(','))
    .order('created_at', { ascending: false })
    .maybeSingle()

  if (error || !data) return null
  return data
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

  const sellerIds = paidOrders.map((o) => o.seller_user_id).filter(Boolean)
  const [defaultPercent, sellerOverrides] = await Promise.all([
    fetchPlatformDefaultCommissionPercent(supabaseAdmin),
    fetchSellerOverridesByUserId(supabaseAdmin, sellerIds),
  ])

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
    const ratePercent = resolveCommissionRate({
      defaultPercent,
      sellerOverride: sellerOverrides.get(o.seller_user_id) ?? null,
    })
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
    const { data: insertedRows } = await supabaseAdmin.from('order_escrows').insert(inserts).select('*')
    for (const escrow of insertedRows || []) {
      await recordEscrowFundingLedgerEntries(supabaseAdmin, escrow)
    }
  }
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} supabaseAdmin
 * @param {unknown} payload
 */
async function handlePaymentRefundedPayload(supabaseAdmin, payload) {
  const resource = getResource(payload)
  if (resource?.type !== 'payment' || !resource?.id) return

  const payId = String(resource.id)
  const refunds = Array.isArray(resource?.attributes?.refunds) ? resource.attributes.refunds : []

  for (const ref of refunds) {
    const rid = ref?.id ? String(ref.id) : ''
    const attrs = ref?.attributes ?? {}
    const st = attrs.status != null ? String(attrs.status) : ''
    const amt = attrs.amount != null ? Number(attrs.amount) : null
    const terminal = String(st).toLowerCase() === 'succeeded'
    if (!rid || !terminal) continue
    await reconcilePaymongoRefundEvent(supabaseAdmin, {
      paymongoPaymentId: payId,
      refundId: rid,
      amountCentavos: Number.isFinite(amt) ? amt : null,
      status: st,
    })
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

  const normalizedEventType = String(eventType || '').toLowerCase()
  if (
    normalizedEventType.includes('transfer') ||
    normalizedEventType.includes('batch_transfer') ||
    normalizedEventType.includes('disbursement')
  ) {
    const handled = await handleDisbursementWebhookEvent(supabaseAdmin, payload, normalizedEventType)
    if (handled) {
      apiLog('paymongo.webhook.disbursement', {})
      return NextResponse.json({ received: true }, { status: 200 })
    }
  }

  const checkoutSessionId = extractCheckoutSessionId(payload)
  const referenceNumber = extractReferenceNumber(payload)
  const paymongoPaymentIdEarly = extractPaymongoPaymentIdFromResource(payload)

  const markPaid =
    eventType === 'checkout_session.payment.paid' ||
    eventType === 'payment.paid'

  const markFailed =
    eventType === 'checkout_session.payment.failed' ||
    eventType === 'payment.failed'

  const markRefundUpdated = eventType === 'payment.refund.updated'
  const markPaymentRefunded = eventType === 'payment.refunded'

  /** Refund events: resolve payment by PayMongo payment id first. */
  if (markRefundUpdated || markPaymentRefunded) {
    const resource = getResource(payload)
    let paymongoPaymentId = paymongoPaymentIdEarly
    if (resource?.type === 'refund' && resource?.attributes?.payment_id) {
      paymongoPaymentId = String(resource.attributes.payment_id)
    }
    if (markRefundUpdated && resource?.type === 'refund') {
      const refundId = resource?.id ? String(resource.id) : ''
      const st = resource?.attributes?.status != null ? String(resource.attributes.status) : ''
      const amt =
        resource?.attributes?.amount != null ? Number(resource.attributes.amount) : null
      const pid = String(paymongoPaymentId || '').trim()
      if (pid && refundId) {
        await reconcilePaymongoRefundEvent(supabaseAdmin, {
          paymongoPaymentId: pid,
          refundId,
          amountCentavos: Number.isFinite(amt) ? amt : null,
          status: st,
        })
      }
      apiLog('paymongo.webhook.refund_updated', {})
      return NextResponse.json({ received: true }, { status: 200 })
    }
    if (markPaymentRefunded) {
      await handlePaymentRefundedPayload(supabaseAdmin, payload)
      apiLog('paymongo.webhook.payment_refunded', {})
      return NextResponse.json({ received: true }, { status: 200 })
    }
  }

  const paymentRow = await resolveInternalPaymentRow(supabaseAdmin, {
    checkoutSessionId,
    referenceNumber,
    paymongoPaymentId: paymongoPaymentIdEarly,
  })

  if (!paymentRow) {
    return NextResponse.json({ received: true }, { status: 200 })
  }

  if (markPaid) {
    const wasAlreadyPaid = paymentRow.status === 'paid'
    const resource = getResource(payload)
    const payId = resource?.type === 'payment' && resource?.id ? String(resource.id) : null

    if (paymentRow.status !== 'paid') {
      const payPatch = { status: 'paid' }
      if (payId) {
        payPatch.paymongo_payment_id = payId
      }
      await supabaseAdmin.from('payments').update(payPatch).eq('id', paymentRow.id)
    } else if (payId) {
      await supabaseAdmin.from('payments').update({ paymongo_payment_id: payId }).eq('id', paymentRow.id)
    }

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

    if (!wasAlreadyPaid && orderIdsPaid.length > 0) {
      const { data: ordRows } = await supabaseAdmin
        .from('orders')
        .select('id,buyer_id,seller_user_id,order_number')
        .in('id', orderIdsPaid)

      for (const o of ordRows ?? []) {
        const ref = o.order_number || String(o.id).slice(0, 8)
        if (o.buyer_id) {
          await notifyUser(supabaseAdmin, {
            userId: o.buyer_id,
            type: 'payment_success',
            title: 'Payment received',
            body: `Your payment for booking ${ref} was successful. Your provider will confirm your schedule soon.`,
            metadata: { orderId: o.id, paymentId: paymentRow.id },
            dedupeKey: `payment_success:${o.id}`,
          })
        }
        if (o.seller_user_id) {
          await notifySeller(supabaseAdmin, o.seller_user_id, {
            type: 'alerts',
            title: 'New paid booking',
            body: `Order ${ref} is paid and awaiting your confirmation.`,
            metadata: { orderId: o.id, paymentId: paymentRow.id },
            dedupeKey: `seller_new_paid_order:${o.id}`,
          })
        }
        if (process.env.ADMIN_NOTIFY_EVERY_PAID_ORDER === 'true') {
          await notifyAllAdmins(supabaseAdmin, {
            type: 'system',
            title: 'Order paid',
            body: `Order ${ref} was marked paid.`,
            metadata: { orderId: o.id, paymentId: paymentRow.id },
            dedupeKey: `admin_order_paid:${o.id}`,
          })
        }
      }
    }

    apiLog('paymongo.webhook.mark_paid', {})
  } else if (markFailed) {
    if (paymentRow.status === 'pending') {
      await supabaseAdmin.from('payments').update({ status: 'failed' }).eq('id', paymentRow.id)

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

        const { data: failedOrders } = await supabaseAdmin
          .from('orders')
          .select('id,buyer_id,order_number')
          .in('id', orderIds)

        for (const o of failedOrders ?? []) {
          if (!o.buyer_id) continue
          const ref = o.order_number || String(o.id).slice(0, 8)
          await notifyUser(supabaseAdmin, {
            userId: o.buyer_id,
            type: 'payment_failed',
            title: 'Payment did not go through',
            body: `We could not complete payment for booking ${ref}. You can try again from your cart or checkout.`,
            metadata: { orderId: o.id, paymentId: paymentRow.id },
            dedupeKey: `payment_failed:${paymentRow.id}:${o.id}`,
          })
        }
      }
      apiLog('paymongo.webhook.mark_failed_applied', {})
    }
  }

  return NextResponse.json({ received: true }, { status: 200 })
}
