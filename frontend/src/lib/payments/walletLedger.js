/**
 * @param {import('@supabase/supabase-js').SupabaseClient} supabaseAdmin
 * @param {{ sellerUserId?: string | null, escrowIds?: string[] | null }} params
 */
export async function fetchPayoutDisbursementsForSeller(supabaseAdmin, { sellerUserId, escrowIds } = {}) {
  let query = supabaseAdmin
    .from('payout_disbursements')
    .select(
      'id,escrow_id,order_id,seller_user_id,amount_php,currency,status,failure_reason,paymongo_batch_id,paymongo_transfer_id,submitted_at,settled_at,approved_request_id,created_at',
    )
    .order('created_at', { ascending: false })

  if (sellerUserId) query = query.eq('seller_user_id', sellerUserId)
  if (escrowIds?.length) query = query.in('escrow_id', escrowIds)

  const { data, error } = await query
  if (error) throw error
  return data ?? []
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} supabaseAdmin
 * @param {string} sellerUserId
 */
export async function fetchSellerWalletLedgerEntries(supabaseAdmin, sellerUserId) {
  const { data, error } = await supabaseAdmin
    .from('seller_wallet_ledger')
    .select('id,seller_user_id,order_id,escrow_id,disbursement_id,entry_type,amount_php,currency,metadata,created_at')
    .eq('seller_user_id', sellerUserId)
    .order('created_at', { ascending: false })
    .limit(5000)

  if (error) throw error
  return data ?? []
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} supabaseAdmin
 * @param {Record<string, unknown>} entry
 */
export async function insertWalletLedgerEntry(supabaseAdmin, entry) {
  const { data, error } = await supabaseAdmin
    .from('seller_wallet_ledger')
    .insert(entry)
    .select('id')
    .maybeSingle()

  if (error?.code === '23505') {
    return { ok: true, duplicate: true, id: null }
  }
  if (error) {
    return { ok: false, error: error.message || 'Could not write wallet ledger entry.' }
  }
  return { ok: true, duplicate: false, id: data?.id ?? null }
}
