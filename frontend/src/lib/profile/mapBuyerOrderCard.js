/**
 * Maps Supabase buyer order + joined order_items rows into Purchases UI card props.
 */

const PHP_SYMBOL = '\u20B1'

/** @type {Record<string, string>} */
const CURRENCY_SYMBOLS = {
  PHP: PHP_SYMBOL,
  USD: '$',
  EUR: '\u20AC',
}

/**
 * Format a numeric amount for display with sensible currency labeling.
 * @param {number} amount
 * @param {string | null | undefined} currencyCode ISO-like code, default PHP
 */
export function formatMoney(amount, currencyCode) {
  const code = String(currencyCode || 'PHP').trim().toUpperCase() || 'PHP'
  const num = Number(amount)
  const safe = Number.isFinite(num) ? num : 0
  const formatted = safe.toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })

  const sym = CURRENCY_SYMBOLS[code]
  if (sym) return `${sym}${formatted}`
  return `${formatted} ${code}`
}

/**
 * Formal amount for receipts embedded with standard PDF fonts (ASCII only — no ₱/€ breakage).
 * Use in PDFs; prefer {@link formatMoney} for HTML/UI where Unicode renders correctly.
 * @param {number} amount
 * @param {string | null | undefined} currencyCode
 */
export function formatMoneyReceiptPdf(amount, currencyCode) {
  const code = String(currencyCode || 'PHP').trim().toUpperCase() || 'PHP'
  const num = Number(amount)
  const safe = Number.isFinite(num) ? num : 0
  const formatted = safe.toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
  return `${code} ${formatted}`
}

/** @param {string | null | undefined} fulfillment */
export function fulfillmentToDisplayStatus(fulfillment) {
  const f = fulfillment || 'pending'
  switch (f) {
    case 'completed':
      return 'Completed'
    case 'in_progress':
      return 'In Progress'
    case 'confirmed':
      return 'Confirmed'
    case 'cancelled':
      return 'Cancelled'
    default:
      return 'Pending'
  }
}

/**
 * Human-readable payment state (separate from fulfillment badge).
 * @param {string | null | undefined} paymentStatus from orders.payment_status
 * @param {string | null | undefined} legacyStatus orders.status
 */
export function resolvePaymentDisplay(paymentStatus, legacyStatus) {
  const ps = paymentStatus || ''
  const ls = legacyStatus || ''

  if (ps === 'refund_pending') {
    return { code: 'refund_pending', label: 'Refund in progress', payChannel: 'PayMongo' }
  }
  if (ps === 'refunded') {
    return { code: 'refunded', label: 'Refunded', payChannel: 'PayMongo' }
  }
  if (ps === 'paid' || ls === 'paid') {
    return { code: 'paid', label: 'Paid', payChannel: 'PayMongo' }
  }
  if (ps === 'failed' || ls === 'failed') {
    return { code: 'failed', label: 'Payment failed', payChannel: 'PayMongo' }
  }
  if (ps === 'pending') {
    return { code: 'pending', label: 'Payment pending', payChannel: 'PayMongo' }
  }
  if (ps === 'expired') {
    return { code: 'expired', label: 'Payment expired', payChannel: '—' }
  }
  const unpaid = ps === 'unpaid' || !ps
  return {
    code: unpaid ? 'unpaid' : ps,
    label: unpaid ? 'Unpaid' : ps.replace(/_/g, ' '),
    payChannel: 'PayMongo',
  }
}

/**
 * Compact single-line summary for collapsed meta row.
 * @param {{ code: string, label: string, payChannel: string }} pd
 */
export function paymentSummaryLine(pd) {
  if (pd.code === 'paid') return `Paid (${pd.payChannel})`
  if (pd.code === 'refund_pending') return `Refund pending (${pd.payChannel})`
  if (pd.code === 'refunded') return `Refunded (${pd.payChannel})`
  return pd.label
}

/**
 * @param {Record<string, unknown>} o orders row from Supabase
 * @param {Array<{ order_id: string; name: string; quantity?: number; price?: number }>} orderItems
 * @param {string} [providerDisplayName] from seller-names API
 */
export function mapBuyerOrderCard(o, orderItems, providerDisplayName) {
  const fulfillment = o.fulfillment_status || 'pending'
  const refundRsRaw = o.refund_status == null ? null : String(o.refund_status)

  const pd = resolvePaymentDisplay(o.payment_status, o.status)
  const paid = o.payment_status === 'paid' || o.status === 'paid'
  const ps = o.payment_status ? String(o.payment_status) : ''

  /** @type {string | null} */
  let statusDetail = null
  let status
  if (fulfillment === 'cancelled') {
    const refundComplete =
      refundRsRaw === 'completed' || ps === 'refunded'
    if (refundComplete) {
      status = 'Refunded'
    } else {
      status = 'Cancelled'
      if (
        refundRsRaw === 'requested' ||
        refundRsRaw === 'processing' ||
        ps === 'refund_pending'
      ) {
        statusDetail = 'Waiting for refund'
      }
    }
  } else {
    status = fulfillmentToDisplayStatus(fulfillment)
  }

  const service =
    orderItems.length === 1
      ? orderItems[0].name
      : orderItems.length > 1
        ? `${orderItems.length} items`
        : 'Booking'

  const currency = o.currency || 'PHP'
  const price = Number(o.subtotal) || 0

  let itemsDetailed = orderItems.map((it) => {
    const qty = Number(it.quantity) || 1
    const line = `${it.name} \u00d7${qty}`
    const unit = Number(it.price)
    if (Number.isFinite(unit) && unit > 0) {
      const sub = unit * qty
      return { line, subtotal: formatMoney(sub, currency) }
    }
    return { line, subtotal: null }
  })

  if (itemsDetailed.length === 0) {
    itemsDetailed = [{ line: 'No items recorded', subtotal: null }]
  }

  /** PayMongo checkout session opened (`payment_status` set to pending by `/api/checkout/pay`). Not the same as legacy `status: pending_payment` on new unpaid orders. */
  const paymongoCheckoutActive = o.payment_status === 'pending'

  const blockingRefundLifecycle =
    refundRsRaw === 'requested' ||
    refundRsRaw === 'processing' ||
    refundRsRaw === 'completed'

  const receiptBlockedRefund =
    o.payment_status === 'refund_pending' ||
    o.payment_status === 'refunded' ||
    blockingRefundLifecycle

  const canDownloadReceipt = Boolean(paid && !receiptBlockedRefund)

  /** Cancel anytime before seller confirms fulfillment (paid or unpaid); not mid–PayMongo checkout. */
  const eligibleCancelPurchase =
    fulfillment === 'pending' && !blockingRefundLifecycle && !paymongoCheckoutActive

  /** Show refund timeline copy in confirm modal after payment, before confirmation. */
  const cancelShowsRefundDisclaimer = Boolean(eligibleCancelPurchase && paid)

  const showCancelPurchase = Boolean(eligibleCancelPurchase)
  const canSubmitCancelPurchase = Boolean(eligibleCancelPurchase && !paymongoCheckoutActive)
  const cancelPurchaseHint =
    eligibleCancelPurchase && paymongoCheckoutActive
      ? 'Unavailable during checkout payment.'
      : undefined

  const paymentMethodLine = paymongoCheckoutActive
    ? `${paymentSummaryLine(pd)} · finishing checkout`
    : paymentSummaryLine(pd)

  return {
    id: o.order_number || o.id,
    rawOrderId: o.id,
    sellerUserId: o.seller_user_id,
    service,
    provider: providerDisplayName?.trim()
      ? providerDisplayName.trim()
      : 'Provider',
    bookedDate: o.created_at,
    scheduledDate: o.preferred_date || o.created_at,
    status,
    statusDetail,
    paymentSummary: pd,
    paymentMethodLine,
    currency,
    price,
    formattedTotal: formatMoney(price, currency),
    itemsDetailed,
    canDownloadReceipt,
    showCancelPurchase,
    canSubmitCancelPurchase,
    cancelPurchaseHint,
    cancelShowsRefundDisclaimer,
    detail: {
      serviceLocation: pickStr(o.service_location),
      contactName: pickStr(o.contact_name),
      contactEmail: pickStr(o.contact_email),
      contactPhone: pickStr(o.contact_phone),
      notes: pickStr(o.notes),
      deceasedName: pickStr(o.deceased_name),
      dateOfDeath: o.date_of_death,
      wakeDurationDays: o.wake_duration_days,
    },
  }
}

/** @param {unknown} v */
function pickStr(v) {
  if (v == null) return ''
  const s = String(v).trim()
  return s
}
