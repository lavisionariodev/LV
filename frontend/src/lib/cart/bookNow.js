/**
 * Stock, package selection, and buyer session checks before building a cart payload
 * (e.g. service detail page).
 *
 * @param {object | null | undefined} listing
 * @param {string} buyerPackage
 * @param {{ user: unknown, isBuyer: boolean }} session
 * @returns {{ ok: true } | { ok: false, message: string } | { ok: false, needLogin: true }}
 */
export function assertListingReadyForCart(listing, buyerPackage, session) {
  const { user, isBuyer } = session
  if (!listing) {
    return { ok: false, message: 'Listing not available.' }
  }
  if (listing.inStock === false) {
    return { ok: false, message: 'This listing is out of stock.' }
  }
  const pkgOpts = listing.sellerPackageOptions ?? []
  if (pkgOpts.length > 0 && !String(buyerPackage || '').trim()) {
    return { ok: false, message: 'Please select a package.' }
  }
  if (!user || !isBuyer) {
    return { ok: false, needLogin: true }
  }
  return { ok: true }
}

/**
 * Shared cart persistence + optional redirect to checkout (Book Now flow).
 * Call only after auth checks and after buildCartPayloadFromListing returns a payload.
 *
 * @param {(item: object) => Promise<{ error?: Error }>} addItem - from CartContext
 * @param {{ id: string }} payload - from buildCartPayloadFromListing
 * @param {{ router?: { push: (href: string) => void }, next?: 'checkout', fallbackMessage?: string }} [options]
 * @returns {Promise<{ ok: true } | { ok: false, message: string }>}
 */
export async function persistCartPayload(addItem, payload, options = {}) {
  const { router, next, fallbackMessage = 'Could not update cart' } = options
  const { error } = await addItem(payload)
  if (error) {
    return { ok: false, message: error.message || fallbackMessage }
  }
  if (next === 'checkout' && router) {
    router.push(checkoutPathForProductId(payload.id))
  }
  return { ok: true }
}

/** `/checkout?items=` URL for a cart product id (same encoding as cart page Book Now). */
export function checkoutPathForProductId(productId) {
  return `/checkout?items=${encodeURIComponent(String(productId))}`
}
