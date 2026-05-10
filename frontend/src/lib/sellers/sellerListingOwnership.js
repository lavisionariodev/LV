import { isUuidLike } from '@/lib/uuidLike'

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} supabaseAdmin
 * @param {string} sellerUserId
 * @param {string} listingId
 * @returns {Promise<boolean>}
 */
export async function sellerOwnsListing(supabaseAdmin, sellerUserId, listingId) {
  const sid = String(sellerUserId ?? '').trim()
  const lid = String(listingId ?? '').trim()
  if (!isUuidLike(sid) || !isUuidLike(lid)) return false
  const { data, error } = await supabaseAdmin
    .from('seller_listings')
    .select('id')
    .eq('id', lid)
    .eq('seller_user_id', sid)
    .maybeSingle()
  if (error || !data) return false
  return true
}
