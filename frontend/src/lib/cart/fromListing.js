/**
 * Build cart line payload from a merged shop listing (see mergeShopListings).
 * Matches product_id rules used on listing detail: optional package suffix.
 *
 * @param {object} listing
 * @param {{ quantity?: number, buyerPackage?: string, heroImage?: string }} [opts]
 * @returns {{ error: string | null, payload: { id: string, name: string, img: string, price: number, description: string, qty: number } | null }}
 */
export function buildCartPayloadFromListing(listing, { quantity = 1, buyerPackage, heroImage } = {}) {
  if (!listing) {
    return { error: 'Listing not available.', payload: null }
  }
  const pkgOpts = listing.sellerPackageOptions ?? []
  const pkg =
    pkgOpts.length > 0
      ? String(buyerPackage ?? '').trim() || String(pkgOpts[0] ?? '').trim()
      : ''
  if (pkgOpts.length > 0 && !pkg) {
    return { error: 'Please select a package.', payload: null }
  }

  const cartProductId =
    pkgOpts.length > 0 && pkg
      ? `${listing.id}::pkg::${encodeURIComponent(pkg)}`
      : String(listing.id)

  const cartName =
    pkgOpts.length > 0 && pkg ? `${listing.name} — ${pkg}` : listing.name

  const urls = Array.isArray(listing.imageUrls) && listing.imageUrls.length
    ? listing.imageUrls
    : listing.imageUrl
      ? [listing.imageUrl]
      : []
  let mainImg = urls[0] || ''
  if (typeof heroImage === 'string' && heroImage.trim()) {
    mainImg = heroImage.trim()
  }

  const provider = listing.provider
  const description = provider
    ? `${provider.name} · ${listing.inclusions?.[0] ?? ''}`
    : listing.inclusions?.[0] ?? ''

  const safeQty = Math.max(1, Number(quantity) || 1)

  return {
    error: null,
    payload: {
      id: cartProductId,
      name: cartName,
      img: mainImg,
      price: listing.price,
      description,
      qty: safeQty,
    },
  }
}
