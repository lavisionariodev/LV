/**
 * Supabase favorites (favorite_items) for authenticated buyers.
 */

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
