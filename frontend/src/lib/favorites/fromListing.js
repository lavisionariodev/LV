/**
 * Map a shop listing + metadata to a favorite_items insert row (columns only).
 *
 * @param {object} listing — mergeShopListings shape
 * @param {{ serviceId: string, serviceLabel?: string, packageOption?: string }} meta
 */
export function buildFavoriteInsertFromListing(listing, meta) {
  const pkg = String(meta.packageOption ?? '').trim()
  const provider = listing.provider
  const urls = Array.isArray(listing.imageUrls) && listing.imageUrls.length
    ? listing.imageUrls
    : listing.imageUrl
      ? [listing.imageUrl]
      : []
  const imageUrl = urls[0] ?? null

  return {
    listing_id: listing.id,
    package_option: pkg,
    listing_name: listing.name,
    base_price: listing.price != null ? Number(listing.price) : null,
    image_url: imageUrl,
    service_id: meta.serviceId,
    service_label: meta.serviceLabel ?? null,
    business_name: provider?.name ?? null,
    business_location: provider?.location ?? null,
    seller_rating: provider?.rating != null ? Number(provider.rating) : null,
    seller_reviews: provider?.reviews != null ? Number(provider.reviews) : null,
    seller_badge: provider?.badge ?? null,
    popular: Boolean(listing.popular),
  }
}
