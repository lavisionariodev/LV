const ACTIVE_DISPUTE_STATUSES = new Set(['open', 'under_review'])
const REFUND_IN_FLIGHT_STATUSES = new Set(['requested', 'processing'])

export function normalizeOrderMoneyFields(order) {
  if (!order) {
    return {
      paymentStatus: '',
      legacyStatus: '',
      refundStatus: '',
      fulfillmentStatus: '',
    }
  }
  return {
    paymentStatus: String(order.payment_status ?? '').trim().toLowerCase(),
    legacyStatus: String(order.status ?? '').trim().toLowerCase(),
    refundStatus: String(order.refund_status ?? '').trim().toLowerCase(),
    fulfillmentStatus: String(order.fulfillment_status ?? 'pending').trim().toLowerCase(),
  }
}

export function isOrderPaid(order) {
  const { paymentStatus, legacyStatus } = normalizeOrderMoneyFields(order)
  return paymentStatus === 'paid' || legacyStatus === 'paid'
}

export function isRefundInFlight(order) {
  const { paymentStatus, refundStatus } = normalizeOrderMoneyFields(order)
  if (REFUND_IN_FLIGHT_STATUSES.has(refundStatus)) return true
  return paymentStatus === 'refund_pending'
}

export function isRefundTerminal(order) {
  const { paymentStatus, refundStatus, legacyStatus } = normalizeOrderMoneyFields(order)
  return (
    paymentStatus === 'refunded' ||
    legacyStatus === 'refunded' ||
    refundStatus === 'completed'
  )
}

export function hasActiveDispute(disputeRow) {
  if (!disputeRow?.status) return false
  return ACTIVE_DISPUTE_STATUSES.has(String(disputeRow.status).toLowerCase())
}

export function canReleaseEscrow({ order, escrow, activeDispute }) {
  if (!order?.id) {
    return { ok: false, error: 'Order not found.', status: 404 }
  }
  if (!escrow) {
    return { ok: false, error: 'No escrow record for this order.', status: 409 }
  }
  if (String(escrow.status || '').toLowerCase() === 'released') {
    return { ok: true, alreadyReleased: true }
  }
  if (String(escrow.status || '').toLowerCase() === 'on_hold') {
    return {
      ok: false,
      error: 'Escrow is on hold. Remove hold before releasing.',
      status: 409,
    }
  }
  if (hasActiveDispute(activeDispute)) {
    return {
      ok: false,
      error: 'This order has an open buyer request. Resolve or close it before releasing payout.',
      status: 409,
    }
  }
  if (!isOrderPaid(order)) {
    return { ok: false, error: 'Order is not paid.', status: 400 }
  }
  if (isRefundInFlight(order) || isRefundTerminal(order)) {
    return {
      ok: false,
      error: 'Order has an open or completed refund. Payout cannot be released.',
      status: 409,
    }
  }
  const { fulfillmentStatus } = normalizeOrderMoneyFields(order)
  if (fulfillmentStatus !== 'completed') {
    return { ok: false, error: 'Order service is not completed.', status: 400 }
  }
  return { ok: true }
}

export function isDisputeEscrowHoldReason(holdReason) {
  const reason = String(holdReason || '')
  return reason.startsWith('Buyer request opened') || reason.startsWith('Admin dispute refund')
}
