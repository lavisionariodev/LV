/** @typedef {'service' | 'package' | 'product'} ListingKind */
/** @typedef {'booking' | 'product'} CheckoutLane */

/**
 * @param {unknown} kind
 * @returns {ListingKind}
 */
export function normalizeListingKind(kind) {
  const k = String(kind ?? '')
    .trim()
    .toLowerCase()
  if (k === 'package') return 'package'
  if (k === 'product') return 'product'
  return 'service'
}

/**
 * @param {unknown} kind
 * @returns {CheckoutLane}
 */
export function checkoutLaneFromKind(kind) {
  return normalizeListingKind(kind) === 'product' ? 'product' : 'booking'
}

/**
 * @param {unknown} row
 * @returns {ListingKind}
 */
export function listingKindFromRpcRow(row) {
  return normalizeListingKind(row?.listing_kind ?? row?.listingKind)
}

/**
 * @param {Array<{ listing_id?: string, listing_kind?: string }>} listingRows
 * @returns {Map<string, ListingKind>}
 */
export function buildListingKindById(listingRows) {
  const map = new Map()
  for (const row of listingRows || []) {
    const id = String(row?.listing_id ?? '').trim()
    if (!id) continue
    map.set(id, listingKindFromRpcRow(row))
  }
  return map
}

/**
 * @param {string} productId
 * @param {Map<string, ListingKind>} kindByListingId
 * @returns {ListingKind}
 */
export function resolveCartItemKind(productId, kindByListingId) {
  const listingId = String(productId ?? '')
    .split('::pkg::', 1)[0]
    .trim()
  if (listingId && kindByListingId?.has(listingId)) {
    return kindByListingId.get(listingId)
  }
  return 'service'
}

/**
 * @param {CheckoutLane | ListingKind} a
 * @param {CheckoutLane | ListingKind} b
 * @returns {boolean}
 */
export function lanesCompatible(a, b) {
  const laneA = a === 'booking' || a === 'product' ? a : checkoutLaneFromKind(a)
  const laneB = b === 'booking' || b === 'product' ? b : checkoutLaneFromKind(b)
  return laneA === laneB
}

/**
 * @param {Array<{ listingKind?: string, id?: string }>} items
 * @param {Map<string, ListingKind>} [kindByListingId]
 * @returns {CheckoutLane}
 */
export function checkoutLaneFromCartItems(items, kindByListingId) {
  const list = Array.isArray(items) ? items : []
  if (list.length === 0) return 'booking'

  const lanes = new Set(
    list.map((item) => {
      const kind =
        item?.listingKind != null
          ? normalizeListingKind(item.listingKind)
          : resolveCartItemKind(item?.id, kindByListingId)
      return checkoutLaneFromKind(kind)
    }),
  )

  if (lanes.size > 1) return 'mixed'
  return lanes.has('product') ? 'product' : 'booking'
}

/**
 * @param {CheckoutLane | 'mixed'} lane
 */
export function getCheckoutCopy(lane) {
  if (lane === 'product') {
    return {
      pageTitle: 'Checkout',
      breadcrumbActive: 'Checkout',
      emptyTitle: 'Nothing to checkout',
      emptyText: 'Your cart is empty or the selected items are no longer available.',
      sectionHint:
        'Review your order on the right, then use Checkout & pay. Payment happens on the next secure PayMongo screen. Your provider confirms the order afterward.',
      noteText:
        'Completing Checkout & pay places your paid order. Provider confirmation completes the arrangement; contact them or support for refunds if plans change.',
      payButton: 'Checkout & pay',
      payButtonLoading: 'Opening secure payment…',
      browseLink: 'Browse shop',
    }
  }

  return {
    pageTitle: 'Complete booking',
    breadcrumbActive: 'Book & pay',
    emptyTitle: 'Nothing to book',
    emptyText: 'Your cart is empty or the selected items are no longer available.',
    sectionHint:
      'Review your booking on the right, then use Book & pay. Payment happens on the next secure PayMongo screen. Your provider confirms the booking afterward.',
    noteText:
      'Completing Book & pay places your paid booking. Provider confirmation completes the arrangement; contact them or support for refunds if plans change.',
    payButton: 'Book & pay',
    payButtonLoading: 'Opening secure payment…',
    browseLink: 'Browse services',
  }
}

/**
 * @param {ListingKind} kind
 * @returns {string}
 */
export function formatListingKindLabel(kind) {
  const k = normalizeListingKind(kind)
  if (k === 'package') return 'Package'
  if (k === 'product') return 'Product'
  return 'Service'
}
