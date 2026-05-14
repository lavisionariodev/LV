/**
 * @param {import('@supabase/supabase-js').SupabaseClient} supabaseAdmin
 * @param {{
 *   changedBy?: string | null,
 *   scope: 'global' | 'seller_override' | 'order_escrow',
 *   label: string,
 *   fromPercent?: number | null,
 *   toPercent?: number | null,
 *   sellerUserId?: string | null,
 *   orderId?: string | null,
 * }} entry
 */
export async function recordCommissionChangeLog(supabaseAdmin, entry) {
  const { error } = await supabaseAdmin.from('platform_commission_change_log').insert({
    changed_by: entry.changedBy ?? null,
    scope: entry.scope,
    label: entry.label,
    from_percent: entry.fromPercent ?? null,
    to_percent: entry.toPercent ?? null,
    seller_user_id: entry.sellerUserId ?? null,
    order_id: entry.orderId ?? null,
  })

  if (error) {
    return { ok: false, error: error.message || 'Could not write commission change log.' }
  }
  return { ok: true }
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} supabaseAdmin
 * @param {{ limit?: number }} [opts]
 */
export async function listCommissionChangeLog(supabaseAdmin, opts = {}) {
  const limit = Number.isFinite(opts.limit) ? Math.min(50, Math.max(1, opts.limit)) : 20
  const { data, error } = await supabaseAdmin
    .from('platform_commission_change_log')
    .select(
      'id,changed_by,scope,seller_user_id,order_id,label,from_percent,to_percent,created_at',
    )
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    return { entries: [], error: error.message || 'Failed to load commission change log.' }
  }

  return { entries: data ?? [], error: null }
}
