/**
 * Server-side helpers for resolving the commission rate to snapshot onto an escrow.
 *
 * Order of precedence:
 *   1. `sellers.commission_percent_override` (per-seller, set via /api/admin/sellers/[id]/commission)
 *   2. `platform_billing.default_commission_percent` (singleton id=1)
 *   3. Fallback constant DEFAULT_FALLBACK_PERCENT (10)
 */

export const DEFAULT_FALLBACK_PERCENT = 10

function toFinitePercent(value) {
  if (value == null) return null
  const n = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(n) || n < 0 || n > 100) return null
  return n
}

/**
 * Pure picker. Useful when caller already has both values in hand.
 */
export function resolveCommissionRate({ defaultPercent, sellerOverride } = {}) {
  const override = toFinitePercent(sellerOverride)
  if (override !== null) return override
  const def = toFinitePercent(defaultPercent)
  if (def !== null) return def
  return DEFAULT_FALLBACK_PERCENT
}

/**
 * Read the platform default once. Returns a finite number in [0, 100].
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} supabaseAdmin
 * @returns {Promise<number>}
 */
export async function fetchPlatformDefaultCommissionPercent(supabaseAdmin) {
  const { data } = await supabaseAdmin
    .from('platform_billing')
    .select('default_commission_percent')
    .eq('id', 1)
    .maybeSingle()
  return toFinitePercent(data?.default_commission_percent) ?? DEFAULT_FALLBACK_PERCENT
}

/**
 * Batch-fetch per-seller overrides for the given seller user ids.
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} supabaseAdmin
 * @param {string[]} sellerUserIds
 * @returns {Promise<Map<string, number | null>>}
 */
export async function fetchSellerOverridesByUserId(supabaseAdmin, sellerUserIds) {
  const map = new Map()
  const ids = [...new Set((sellerUserIds || []).filter(Boolean))]
  if (ids.length === 0) return map

  const { data } = await supabaseAdmin
    .from('sellers')
    .select('user_id,commission_percent_override')
    .in('user_id', ids)

  for (const row of data ?? []) {
    map.set(row.user_id, toFinitePercent(row.commission_percent_override))
  }
  return map
}

/**
 * Convenience: resolve the rate for a single seller user id.
 */
export async function resolveRateForSeller(supabaseAdmin, sellerUserId) {
  const [defaultPercent, overrides] = await Promise.all([
    fetchPlatformDefaultCommissionPercent(supabaseAdmin),
    fetchSellerOverridesByUserId(supabaseAdmin, [sellerUserId]),
  ])
  return resolveCommissionRate({
    defaultPercent,
    sellerOverride: overrides.get(sellerUserId) ?? null,
  })
}
