import { supabase } from '@/lib/supabase/client'

function mapPartnersRpcRow(row) {
  if (!row || typeof row !== 'object') return null
  const sellerUserId =
    row.seller_user_id ??
    row.sellerUserId ??
    row.user_id ??
    row.userId
  if (!sellerUserId) return null
  return {
    sellerUserId: String(sellerUserId),
    businessName:
      typeof row.business_name === 'string' && row.business_name.trim()
        ? row.business_name.trim()
        : 'Verified seller',
    tagline:
      typeof row.tagline === 'string' && row.tagline.trim() ? row.tagline.trim() : '',
    businessTypeLabel:
      typeof row.business_type_label === 'string' && row.business_type_label.trim()
        ? row.business_type_label.trim()
        : '',
    avatarUrl:
      typeof row.avatar_url === 'string' && row.avatar_url.trim()
        ? row.avatar_url.trim()
        : '',
  }
}

let cache = null
let cacheAt = 0
const CACHE_MS = 45_000

/**
 * Rows for Verified Network / All Partners (DB: all sellers except suspended).
 */
export async function fetchActivePartnersDirectory({ bustCache = false } = {}) {
  if (!bustCache && cache && Date.now() - cacheAt < CACHE_MS) {
    return cache
  }

  const { data, error } = await supabase.rpc('get_active_partners_directory')

  if (error) {
    console.warn('[partners] get_active_partners_directory:', error.message, error)
    throw new Error(
      error.message ||
        'Could not load the partners directory (check that migrations 075–077 are applied).',
    )
  }

  const rawList = Array.isArray(data)
    ? data
    : data != null && typeof data === 'object'
      ? [data]
      : []

  const rows = rawList.map(mapPartnersRpcRow).filter(Boolean)
  if (!rows.length && rawList.length > 0) {
    console.warn('[partners] Unexpected RPC shape; rows not mapped:', rawList.slice(0, 1))
  }

  cache = rows
  cacheAt = Date.now()
  return rows
}
