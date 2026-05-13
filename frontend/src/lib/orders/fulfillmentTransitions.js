export const FULFILLMENT_STATUSES = ['pending', 'confirmed', 'in_progress', 'completed', 'cancelled']

export const ALLOWED_FULFILLMENT_STATUSES = new Set(FULFILLMENT_STATUSES)

export const LEGAL_TRANSITIONS = {
  pending: new Set(['confirmed', 'cancelled']),
  confirmed: new Set(['in_progress', 'cancelled']),
  in_progress: new Set(['completed', 'cancelled']),
  completed: new Set([]),
  cancelled: new Set([]),
}

const ADVANCE_LABELS = {
  confirmed: {
    label: 'Confirm booking',
    description: 'Accept this paid booking and begin preparation.',
    successMessage: 'Order confirmed.',
  },
  in_progress: {
    label: 'Mark in progress',
    description: 'Let the buyer know service work has started.',
    successMessage: 'Order marked in progress.',
  },
  completed: {
    label: 'Mark completed',
    description: 'Close out the booking after service delivery.',
    successMessage: 'Order marked completed.',
  },
}

/**
 * @param {{ orderStatus?: string, fulfillment_status?: string } | null | undefined} order
 */
export function fulfillmentStatusFromOrder(order) {
  const raw = order?.orderStatus ?? order?.fulfillment_status ?? 'pending'
  return String(raw).toLowerCase()
}

/**
 * @param {{ paymentStatus?: string, payment_status?: string, status?: string } | null | undefined} order
 */
export function isPaidFulfillmentOrder(order) {
  const paymentStatus = String(order?.paymentStatus ?? order?.payment_status ?? '').toLowerCase()
  if (paymentStatus === 'paid') return true
  return String(order?.status ?? '').toLowerCase() === 'paid'
}

/**
 * @param {{ refundStage?: string|null, refund_status?: string|null, paymentStatus?: string, payment_status?: string } | null | undefined} order
 */
export function isFulfillmentRefundBlocked(order) {
  const refundStage = String(order?.refundStage ?? order?.refund_status ?? '').toLowerCase()
  if (refundStage === 'requested' || refundStage === 'processing') return true
  const paymentStatus = String(order?.paymentStatus ?? order?.payment_status ?? '').toLowerCase()
  return paymentStatus === 'refund_pending'
}

/**
 * @param {string} currentStatus
 * @param {boolean} paid
 */
export function getForwardTransition(currentStatus, paid) {
  const status = String(currentStatus || 'pending').toLowerCase()
  if (status === 'completed' || status === 'cancelled') return null
  if (status === 'pending') return paid ? 'confirmed' : null
  if (status === 'confirmed') return 'in_progress'
  if (status === 'in_progress') return 'completed'
  return null
}

/**
 * @param {{ orderStatus?: string, fulfillment_status?: string, paymentStatus?: string, payment_status?: string, status?: string, refundStage?: string|null, refund_status?: string|null } | null | undefined} order
 */
export function canAdvanceFulfillment(order) {
  const status = fulfillmentStatusFromOrder(order)
  if (status === 'completed' || status === 'cancelled') return false
  if (isFulfillmentRefundBlocked(order)) return false
  return Boolean(getForwardTransition(status, isPaidFulfillmentOrder(order)))
}

/**
 * @param {{ orderStatus?: string, fulfillment_status?: string, paymentStatus?: string, payment_status?: string, status?: string, refundStage?: string|null, refund_status?: string|null } | null | undefined} order
 */
export function canDeclinePaidBooking(order) {
  return (
    isPaidFulfillmentOrder(order) &&
    fulfillmentStatusFromOrder(order) !== 'completed' &&
    fulfillmentStatusFromOrder(order) !== 'cancelled' &&
    !isFulfillmentRefundBlocked(order)
  )
}

/**
 * @param {{ orderStatus?: string, fulfillment_status?: string, paymentStatus?: string, payment_status?: string, status?: string, refundStage?: string|null, refund_status?: string|null } | null | undefined} order
 */
export function canCancelUnpaidBooking(order) {
  if (isPaidFulfillmentOrder(order)) return false
  if (isFulfillmentRefundBlocked(order)) return false
  const status = fulfillmentStatusFromOrder(order)
  const legalNext = LEGAL_TRANSITIONS[status] || new Set()
  return legalNext.has('cancelled')
}

/**
 * @param {{ orderStatus?: string, fulfillment_status?: string, paymentStatus?: string, payment_status?: string, status?: string, refundStage?: string|null, refund_status?: string|null } | null | undefined} order
 */
export function hasSellerFulfillmentActions(order) {
  return canAdvanceFulfillment(order) || canCancelUnpaidBooking(order)
}

/**
 * @param {{ orderStatus?: string, fulfillment_status?: string, paymentStatus?: string, payment_status?: string, status?: string, refundStage?: string|null, refund_status?: string|null } | null | undefined} order
 */
export function getSellerAdvanceAction(order) {
  if (!canAdvanceFulfillment(order)) return null
  const status = fulfillmentStatusFromOrder(order)
  const nextStatus = getForwardTransition(status, isPaidFulfillmentOrder(order))
  if (!nextStatus) return null
  const copy = ADVANCE_LABELS[nextStatus]
  if (!copy) return null
  return {
    status: nextStatus,
    label: copy.label,
    description: copy.description,
    successMessage: copy.successMessage,
    handlerKind: nextStatus === 'confirmed' ? 'confirm' : 'updateFulfillment',
  }
}

/**
 * @param {{ orderStatus?: string, fulfillment_status?: string, paymentStatus?: string, payment_status?: string, status?: string, refundStage?: string|null, refund_status?: string|null } | null | undefined} order
 */
export function getSellerCancellationAction(order) {
  if (canDeclinePaidBooking(order)) {
    return {
      kind: 'declinePaid',
      label: 'Decline and refund',
      description:
        'Cancel the booking, refund the buyer to the original payment method, and prevent seller payout.',
    }
  }
  if (canCancelUnpaidBooking(order)) {
    return {
      kind: 'cancelUnpaid',
      label: 'Cancel booking',
      description: 'Cancel this unpaid booking. No refund is required because payment has not been completed.',
    }
  }
  return null
}

/**
 * @param {{ orderStatus?: string, fulfillment_status?: string, paymentStatus?: string, payment_status?: string, status?: string, refundStage?: string|null, refund_status?: string|null } | null | undefined} order
 */
export function getFulfillmentBlockedReason(order) {
  const status = fulfillmentStatusFromOrder(order)
  if (status === 'completed') return 'This order is completed and cannot be advanced further.'
  if (status === 'cancelled') return 'This order is cancelled.'
  if (isFulfillmentRefundBlocked(order)) {
    return 'This order has an active refund flow and cannot be advanced right now.'
  }
  if (status === 'pending' && !isPaidFulfillmentOrder(order)) {
    return 'Awaiting buyer payment before you can confirm this booking.'
  }
  return null
}

/**
 * @param {string} status
 */
export function getTimelineProgressForStatus(status) {
  const normalized = String(status || 'pending').toLowerCase()
  const confirmedOrLater = ['confirmed', 'in_progress', 'completed'].includes(normalized)
  const inProgressOrLater = ['in_progress', 'completed'].includes(normalized)
  return {
    received: true,
    confirmed: confirmedOrLater,
    preparation: confirmedOrLater,
    ongoing: inProgressOrLater,
    completed: normalized === 'completed',
  }
}

/**
 * @param {string} status
 */
export function fulfillmentStatusLabel(status) {
  const normalized = String(status || 'pending').toLowerCase()
  if (normalized === 'in_progress') return 'In progress'
  if (normalized === 'completed') return 'Completed'
  if (normalized === 'cancelled') return 'Cancelled'
  if (normalized === 'confirmed') return 'Confirmed'
  return 'Pending'
}
