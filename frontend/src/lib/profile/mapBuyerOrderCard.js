/**
 * Maps Supabase buyer order + joined order_items rows into Purchases UI card props.
 */

import {
  buyerCancelPurchaseHint,
  buyerProviderRoleLabel,
  fulfillmentToBuyerDisplayStatus,
} from '@/lib/orders/orderDisplayCopy'

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
  return fulfillmentToBuyerDisplayStatus(fulfillment, false)
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
 * Whether a buyer may leave or edit a review for this order (matches reviews API rules).
 * @param {Record<string, unknown>} order
 */
export function canLeaveBuyerReview(order) {
  if (!order || order.fulfillment_status !== 'completed') return false

  const paymentStatus = String(order.payment_status ?? '').trim().toLowerCase()
  const legacyStatus = String(order.status ?? '').trim().toLowerCase()
  const refundStatus = String(order.refund_status ?? '').trim().toLowerCase()
  const paid = paymentStatus === 'paid' || legacyStatus === 'paid'
  if (!paid) return false
  if (order.fulfillment_status === 'cancelled' || legacyStatus === 'cancelled') return false
  if (
    paymentStatus === 'refund_pending' ||
    paymentStatus === 'refunded' ||
    refundStatus === 'requested' ||
    refundStatus === 'processing' ||
    refundStatus === 'completed'
  ) {
    return false
  }
  return true
}

/**
 * UI lane for copy (booking vs product checkout). One order is usually one kind per seller.
 * @param {Array<{ listing_kind?: string | null }>} orderItems
 * @returns {'product' | 'booking'}
 */
export function resolveOrderDisplayLane(orderItems) {
  const kinds = (orderItems ?? []).map((it) => pickKind(it.listing_kind)).filter(Boolean)
  if (kinds.length > 0 && kinds.every((k) => k === 'product')) return 'product'
  return 'booking'
}

/**
 * @param {Record<string, unknown>} o orders row from Supabase
 * @param {Array<{ id?: string; order_id: string; product_id?: string; name: string; quantity?: number; price?: number; listing_kind?: string | null }>} orderItems
 * @param {string} [providerDisplayName] from seller-names API
 */
export function mapBuyerOrderCard(o, orderItems, providerDisplayName, disputeStatus) {
  const displayLane = resolveOrderDisplayLane(orderItems)
  const isProductOrder = displayLane === 'product'
  const fulfillment = o.fulfillment_status || 'pending'
  const refundRsRaw = o.refund_status == null ? null : String(o.refund_status)

  const pd = resolvePaymentDisplay(o.payment_status, o.status)
  const paid = o.payment_status === 'paid' || o.status === 'paid'
  const ps = o.payment_status ? String(o.payment_status) : ''

  /** @type {string | null} */
  let statusDetail = null
  let status
  if (fulfillment === 'pending' && refundRsRaw === 'declined') {
    status = isProductOrder ? 'Active order' : 'Active booking'
    statusDetail = isProductOrder
      ? 'Refund request declined. Order remains paid and awaiting seller confirmation.'
      : 'Refund request declined. Booking remains paid and awaiting provider confirmation.'
  } else if (fulfillment === 'cancelled') {
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
        statusDetail = 'Refund in progress'
      }
    }
  } else {
    status = fulfillmentToBuyerDisplayStatus(fulfillment, isProductOrder)
  }

  const service =
    orderItems.length === 1
      ? orderItems[0].name
      : orderItems.length > 1
        ? `${orderItems.length} items`
        : isProductOrder
          ? 'Product order'
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

  const orderItemsForReview = orderItems.map((it) => ({
    orderItemId: it.id ?? null,
    label: it.name,
    kind: pickKind(it.listing_kind),
  }))

  /**
   * Live PayMongo hosted checkout (payments.status pending, not stale).
   * Prefer `active_paymongo_checkout` from listBuyerOrdersForApi; fall back for legacy rows.
   */
  const paymongoCheckoutActive =
    o.active_paymongo_checkout === true ||
    (o.active_paymongo_checkout !== false && o.payment_status === 'pending')

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

  /** After confirmation (or if a refund request was declined), buyer can open a support dispute. */
  const showOpenDispute =
    paid &&
    fulfillment !== 'cancelled' &&
    (['confirmed', 'in_progress', 'completed'].includes(fulfillment) || refundRsRaw === 'declined')

  /** Show refund timeline copy in confirm modal after payment, before confirmation. */
  const cancelShowsRefundDisclaimer = Boolean(eligibleCancelPurchase && paid)

  const showCancelPurchase = Boolean(eligibleCancelPurchase)
  const canSubmitCancelPurchase = Boolean(eligibleCancelPurchase && !paymongoCheckoutActive)
  const cancelPurchaseHint = eligibleCancelPurchase
    ? buyerCancelPurchaseHint({ isProductOrder, paymongoCheckoutActive })
    : undefined

  const paymentMethodLine = paymongoCheckoutActive
    ? `${paymentSummaryLine(pd)} · finishing checkout`
    : paymentSummaryLine(pd)

  const canRetryPayment =
    fulfillment === 'pending' &&
    !blockingRefundLifecycle &&
    !paid &&
    !paymongoCheckoutActive &&
    (pd.code === 'unpaid' || pd.code === 'failed' || pd.code === 'expired')

  return {
    id: o.order_number || o.id,
    rawOrderId: o.id,
    sellerUserId: o.seller_user_id,
    displayLane,
    isProductOrder,
    service,
    provider: providerDisplayName?.trim()
      ? providerDisplayName.trim()
      : buyerProviderRoleLabel(isProductOrder),
    providerRoleLabel: buyerProviderRoleLabel(isProductOrder),
    bookedDate: o.created_at,
    scheduledDate: o.preferred_date || o.created_at,
    status,
    statusDetail,
    paymentSummary: pd,
    paymentMethodLine,
    canRetryPayment,
    currency,
    price,
    formattedTotal: formatMoney(price, currency),
    itemsDetailed,
    orderItemsForReview,
    canDownloadReceipt,
    showCancelPurchase,
    canSubmitCancelPurchase,
    cancelPurchaseHint,
    cancelShowsRefundDisclaimer,
    showOpenDispute: showOpenDispute && !disputeStatus,
    disputeStatus: disputeStatus ? String(disputeStatus) : null,
    canLeaveReview: canLeaveBuyerReview(o),
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

/**
 * One UI row per order line item (listing), while preserving shared checkout / order metadata.
 * @param {Record<string, unknown>} baseCard from {@link mapBuyerOrderCard}
 * @param {Array<{ id?: string; name?: string; quantity?: number; price?: number }>} orderItems
 * @param {Set<string>} reviewedItemIds `order_item_id` values that already have a buyer review
 * @returns {Array<Record<string, unknown>>}
 */
export function expandPurchaseCardsByLineItem(baseCard, orderItems, reviewedItemIds) {
  const reviewed = reviewedItemIds instanceof Set ? reviewedItemIds : new Set()
  const items = Array.isArray(orderItems) ? orderItems.filter((it) => it && it.id) : []
  if (items.length === 0) {
    return [
      {
        ...baseCard,
        listRowKey: String(baseCard.rawOrderId),
        isMultiItemCheckout: false,
        checkoutSiblingCount: 0,
        hasExistingReview: false,
      },
    ]
  }

  const multi = items.length > 1
  const siblings = items.length - 1

  return items.map((it) => {
    const qty = Number(it.quantity) || 1
    const unit = Number(it.price)
    const lineTotal = Number.isFinite(unit) && unit > 0 ? unit * qty : 0
    const itemId = String(it.id).trim()
    const itemKind = pickKind(it.listing_kind)
    const lineLane = itemKind === 'product' ? 'product' : baseCard.displayLane
    const name = String(it.name || (lineLane === 'product' ? 'Product' : 'Service')).trim()
      || (lineLane === 'product' ? 'Product' : 'Service')
    return {
      ...baseCard,
      listRowKey: `${baseCard.rawOrderId}:${itemId}`,
      displayLane: lineLane,
      isProductOrder: lineLane === 'product',
      service: name,
      price: lineTotal,
      formattedTotal: formatMoney(lineTotal, baseCard.currency),
      itemsDetailed: [
        {
          line: `${name} ×${qty}`,
          subtotal: formatMoney(lineTotal, baseCard.currency),
        },
      ],
      orderItemsForReview: [{ orderItemId: it.id, label: name, kind: pickKind(it.listing_kind) }],
      hasExistingReview: reviewed.has(itemId),
      isMultiItemCheckout: multi,
      checkoutSiblingCount: siblings,
    }
  })
}

/** @param {unknown} v */
function pickStr(v) {
  if (v == null) return ''
  const s = String(v).trim()
  return s
}

/**
 * Normalize the `listing_kind` to one of 'service' | 'package' | 'product', else null.
 * Used to label the review modal as "Service Name" vs "Product Name".
 * @param {unknown} v
 * @returns {'service' | 'package' | 'product' | null}
 */
function pickKind(v) {
  if (typeof v !== 'string') return null
  const k = v.trim().toLowerCase()
  if (k === 'service' || k === 'package' || k === 'product') return k
  return null
}
