/**
 * Buyer-facing labels: product orders (delivery) vs service/package bookings.
 */

/** @param {string | null | undefined} fulfillment */
export function fulfillmentToBookingDisplayStatus(fulfillment) {
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

/** @param {string | null | undefined} fulfillment */
export function fulfillmentToProductDisplayStatus(fulfillment) {
  const f = fulfillment || 'pending'
  switch (f) {
    case 'completed':
      return 'Delivered'
    case 'in_progress':
      return 'Out for delivery'
    case 'confirmed':
      return 'Confirmed'
    case 'cancelled':
      return 'Cancelled'
    default:
      return 'Awaiting seller'
  }
}

/**
 * @param {string | null | undefined} fulfillment
 * @param {boolean} [isProductOrder]
 */
export function fulfillmentToBuyerDisplayStatus(fulfillment, isProductOrder = false) {
  return isProductOrder
    ? fulfillmentToProductDisplayStatus(fulfillment)
    : fulfillmentToBookingDisplayStatus(fulfillment)
}

/**
 * @param {{ isProductOrder?: boolean, paymongoCheckoutActive?: boolean }} opts
 */
export function buyerCancelPurchaseHint(opts) {
  const isProduct = Boolean(opts?.isProductOrder)
  if (opts?.paymongoCheckoutActive) {
    return isProduct
      ? 'Finish or close secure payment first. You can cancel the order if the seller has not confirmed it yet.'
      : 'Unavailable during checkout payment.'
  }
  return isProduct
    ? 'Cancel anytime before the seller confirms your order.'
    : 'Cancel anytime before your provider confirms the booking.'
}

/**
 * @param {boolean} [isProductOrder]
 */
export function buyerProviderRoleLabel(isProductOrder = false) {
  return isProductOrder ? 'Seller' : 'Provider'
}

/**
 * PayMongo checkout line item label (shown on the hosted payment page).
 * @param {'product' | 'booking'} lane
 */
export function paymongoCheckoutLineItemName(lane) {
  return lane === 'product' ? 'Product order payment' : 'Service booking payment'
}
