/**
 * Supabase cart helpers for authenticated users.
 * Item shape in app: { id, name, img, price, description, qty }
 * DB columns: product_id, name, image_url, price, description, quantity
 */

function rowToItem(row) {
  return {
    id: row.product_id,
    name: row.name,
    img: row.image_url ?? '',
    price: row.price ?? 0,
    description: row.description ?? '',
    qty: row.quantity ?? 1,
    sellerName: row.seller_name ?? '',
    sellerAvatarUrl: row.seller_avatar_url ?? '',
  }
}

/**
 * Fetch all cart items for the given user.
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {string} userId
 * @returns {Promise<{ items: Array<{ id, name, img, price, description, qty }>, error: Error | null }>}
 */
const CART_SELECT_WITH_SELLER =
  'product_id, name, image_url, price, description, quantity, seller_name, seller_avatar_url'
const CART_SELECT_LEGACY = 'product_id, name, image_url, price, description, quantity'

function isMissingSellerColumnError(error) {
  const msg = String(error?.message || '').toLowerCase()
  return msg.includes('seller_name') || msg.includes('seller_avatar_url')
}

export async function fetchCart(supabase, userId) {
  let result = await supabase
    .from('cart_items')
    .select(CART_SELECT_WITH_SELLER)
    .eq('user_id', userId)
    .order('created_at', { ascending: true })

  if (result.error && isMissingSellerColumnError(result.error)) {
    result = await supabase
      .from('cart_items')
      .select(CART_SELECT_LEGACY)
      .eq('user_id', userId)
      .order('created_at', { ascending: true })
  }

  if (result.error) return { items: [], error: result.error }
  return { items: (result.data ?? []).map(rowToItem), error: null }
}

/**
 * Add or merge an item into the cart (upsert by user_id + product_id).
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {string} userId
 * @param {{ id: string, name: string, img?: string, price?: number, description?: string, qty: number }} item
 */
export async function addItem(supabase, userId, item) {
  const { data: existing } = await supabase
    .from('cart_items')
    .select('id, quantity')
    .eq('user_id', userId)
    .eq('product_id', item.id)
    .maybeSingle()

  const newQty = (existing?.quantity ?? 0) + (item.qty ?? 1)

  if (existing) {
    const { error } = await supabase
      .from('cart_items')
      .update({
        quantity: newQty,
        updated_at: new Date().toISOString(),
        seller_name: item.sellerName ?? null,
        seller_avatar_url: item.sellerAvatarUrl ?? null,
      })
      .eq('id', existing.id)
    return { error }
  }

  const { error } = await supabase.from('cart_items').insert({
    user_id: userId,
    product_id: item.id,
    name: item.name,
    image_url: item.img ?? null,
    price: item.price ?? null,
    description: item.description ?? null,
    quantity: newQty,
    seller_name: item.sellerName ?? null,
    seller_avatar_url: item.sellerAvatarUrl ?? null,
  })
  return { error }
}

/**
 * Update quantity for a product. If qty < 1, remove the row.
 */
export async function updateQty(supabase, userId, productId, qty) {
  if (qty < 1) {
    const { error } = await supabase
      .from('cart_items')
      .delete()
      .eq('user_id', userId)
      .eq('product_id', productId)
    return { error }
  }
  const { error } = await supabase
    .from('cart_items')
    .update({ quantity: qty, updated_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('product_id', productId)
  return { error }
}

/**
 * Remove one product from the cart.
 */
export async function removeItem(supabase, userId, productId) {
  const { error } = await supabase
    .from('cart_items')
    .delete()
    .eq('user_id', userId)
    .eq('product_id', productId)
  return { error }
}
