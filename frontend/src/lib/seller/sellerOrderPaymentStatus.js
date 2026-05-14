/**
 * Payment and fulfillment helpers for seller order aggregates (no app path aliases).
 */

/**
 * @param {{ payment_status?: string|null, status?: string|null }} row
 * @returns {string}
 */
export function resolvePaymentStatus(row) {
  const ps = row.payment_status
  if (ps) return String(ps).toLowerCase()
  const st = row.status
  if (st === 'paid') return 'paid'
  if (st === 'failed') return 'failed'
  return 'unpaid'
}

/**
 * @param {{ payment_status?: string|null, status?: string|null }} row
 */
export function orderIsPaid(row) {
  return resolvePaymentStatus(row) === 'paid'
}

/**
 * @param {{ fulfillment_status?: string|null }} row
 */
export function fulfillmentStatus(row) {
  return String(row.fulfillment_status || 'pending').toLowerCase()
}

/**
 * @param {Array<{ payment_status?: string|null, status?: string|null, fulfillment_status?: string|null }>} orders
 */
export function pendingFulfillmentCount(orders) {
  return orders.filter((o) => orderIsPaid(o) && fulfillmentStatus(o) === 'pending').length
}
