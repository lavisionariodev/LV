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

/** @typedef {{ id: string, label: string, description: string }} SellerTimelineStep */

/** @type {SellerTimelineStep[]} */
export const SELLER_BOOKING_TIMELINE_STEPS = [
  {
    id: 'received',
    label: 'Order received',
    description: 'Buyer placed the booking and completed payment.',
  },
  {
    id: 'confirmed',
    label: 'Booking confirmed',
    description: 'You confirmed the booking. Preparation can begin.',
  },
  {
    id: 'preparation',
    label: 'Preparation',
    description: 'Service is being prepared according to the buyer request.',
  },
  {
    id: 'ongoing',
    label: 'Service ongoing',
    description: 'Service is in progress.',
  },
  {
    id: 'completed',
    label: 'Completed',
    description: 'Service has been completed.',
  },
]

/** @type {SellerTimelineStep[]} */
export const SELLER_PRODUCT_TIMELINE_STEPS = [
  {
    id: 'received',
    label: 'Order received',
    description: 'Buyer placed the product order and completed payment.',
  },
  {
    id: 'confirmed',
    label: 'Order confirmed',
    description: 'You confirmed the order and can begin fulfillment.',
  },
  {
    id: 'preparation',
    label: 'Processing',
    description: 'Items are being prepared for shipment or hand-off.',
  },
  {
    id: 'ongoing',
    label: 'Out for delivery',
    description: 'Order is on the way to the delivery address.',
  },
  {
    id: 'completed',
    label: 'Delivered',
    description: 'Buyer received the order.',
  },
]

/**
 * @param {boolean} [isProductOrder]
 * @returns {SellerTimelineStep[]}
 */
export function sellerTimelineSteps(isProductOrder = false) {
  return isProductOrder ? SELLER_PRODUCT_TIMELINE_STEPS : SELLER_BOOKING_TIMELINE_STEPS
}

/**
 * @param {string | null | undefined} fulfillment
 * @param {boolean} [isProductOrder]
 */
export function sellerFulfillmentStatusLabel(fulfillment, isProductOrder = false) {
  return fulfillmentToBuyerDisplayStatus(fulfillment, isProductOrder)
}

/**
 * @param {{ orderStatus?: string, isProductOrder?: boolean }} order
 */
export function sellerOrderStatusForDisplay(order) {
  const status = String(order?.orderStatus ?? 'pending').toLowerCase()
  return sellerFulfillmentStatusLabel(status, Boolean(order?.isProductOrder))
}

/**
 * @param {{ isProductOrder?: boolean, orderLane?: string }} order
 */
export function sellerOrderKindLabel(order) {
  return order?.isProductOrder || order?.orderLane === 'product' ? 'Product delivery' : 'Service booking'
}
