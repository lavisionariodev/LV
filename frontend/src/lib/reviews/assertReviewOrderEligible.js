/**
 * @param {Record<string, unknown> | null | undefined} order
 * @returns {{ ok: true } | { ok: false, error: string, status: number }}
 */
export function assertReviewOrderEligible(order) {
  if (!order) {
    return { ok: false, error: 'Order not found.', status: 404 }
  }
  if (order.fulfillment_status !== 'completed') {
    return { ok: false, error: 'Order is not completed yet.', status: 400 }
  }
  const paymentStatus = String(order.payment_status ?? '').trim().toLowerCase()
  const legacyStatus = String(order.status ?? '').trim().toLowerCase()
  const refundStatus = String(order.refund_status ?? '').trim().toLowerCase()
  const paid = paymentStatus === 'paid' || legacyStatus === 'paid'
  if (!paid) {
    return { ok: false, error: 'Order must be paid before you can leave a review.', status: 400 }
  }
  if (order.fulfillment_status === 'cancelled' || legacyStatus === 'cancelled') {
    return { ok: false, error: 'Cancelled orders cannot be reviewed.', status: 400 }
  }
  if (
    paymentStatus === 'refund_pending' ||
    paymentStatus === 'refunded' ||
    refundStatus === 'requested' ||
    refundStatus === 'processing' ||
    refundStatus === 'completed'
  ) {
    return { ok: false, error: 'Refunded orders cannot be reviewed.', status: 400 }
  }
  return { ok: true }
}
