/**
 * Supabase favorites (favorite_items) for authenticated buyers.
 */

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
    popular: false,
  }
}

function rowToItem(row) {
  return {
    id: row.id,
    listingId: String(row.listing_id),
    packageOption: row.package_option ?? '',
    name: row.listing_name,
    price: row.base_price != null ? Number(row.base_price) : 0,
    image: row.image_url ?? '',
    serviceId: row.service_id,
    serviceLabel: row.service_label ?? '',
    savedAt: row.created_at,
    popular: Boolean(row.popular),
    provider: {
      name: row.business_name ?? 'Seller',
      location: row.business_location ?? '',
      rating: row.seller_rating != null ? Number(row.seller_rating) : null,
      reviews: row.seller_reviews != null ? Number(row.seller_reviews) : 0,
      badge: row.seller_badge ?? null,
      initial: (row.business_name || 'S').charAt(0).toUpperCase(),
    },
  }
}

export async function fetchFavorites(supabase, userId) {
  const { data, error } = await supabase
    .from('favorite_items')
    .select(
      'id, listing_id, package_option, listing_name, base_price, image_url, service_id, service_label, business_name, business_location, seller_rating, seller_reviews, seller_badge, popular, created_at',
    )
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) return { items: [], error }
  return { items: (data ?? []).map(rowToItem), error: null }
}

/**
 * @param {object} row — same shape as buildFavoriteInsertFromListing output, plus user_id
 */
export async function insertFavorite(supabase, userId, row) {
  const { error } = await supabase.from('favorite_items').insert({
    user_id: userId,
    ...row,
  })
  return { error }
}

export async function deleteFavorite(supabase, userId, favoriteId) {
  const { error } = await supabase
    .from('favorite_items')
    .delete()
    .eq('user_id', userId)
    .eq('id', favoriteId)
  return { error }
}

/**
 * Remove by listing + package (for toggle-off without row id).
 */
export async function deleteFavoriteByListing(supabase, userId, listingId, packageOption = '') {
  const pkg = String(packageOption ?? '')
  const { error } = await supabase
    .from('favorite_items')
    .delete()
    .eq('user_id', userId)
    .eq('listing_id', listingId)
    .eq('package_option', pkg)
  return { error }
}
