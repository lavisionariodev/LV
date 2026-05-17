import { loadSellerWalletContext } from '@/lib/payments/processSellerWithdrawal'
import {
  buildSellerWalletTransactions,
  paginateWalletTransactions,
} from '@/lib/payments/sellerWalletTransactions'

/**
 * Loads full wallet context for a seller (service role only).
 * @param {import('@supabase/supabase-js').SupabaseClient} supabaseAdmin
 * @param {string} sellerUserId
 */
export async function loadSellerWalletApiContext(supabaseAdmin, sellerUserId) {
  const { escrows, summary, disbursements, withdrawals, ledgerEntries } =
    await loadSellerWalletContext(supabaseAdmin, sellerUserId)
  return { escrows, summary, disbursements, withdrawals, ledgerEntries }
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} supabaseAdmin
 * @param {string[]} orderIds
 */
export async function fetchOrderNumbersById(supabaseAdmin, orderIds) {
  const unique = [...new Set(orderIds.filter(Boolean))]
  if (unique.length === 0) return {}

  const { data, error } = await supabaseAdmin
    .from('orders')
    .select('id, order_number')
    .in('id', unique)

  if (error) throw error
  const map = {}
  for (const row of data ?? []) {
    if (row?.id) {
      map[String(row.id)] = row.order_number ? String(row.order_number) : String(row.id).slice(0, 8)
    }
  }
  return map
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} supabaseAdmin
 * @param {string} sellerUserId
 * @param {{ limit?: number, offset?: number }} [opts]
 */
export async function loadSellerWalletTransactionsPage(supabaseAdmin, sellerUserId, opts = {}) {
  const { escrows, ledgerEntries, withdrawals } = await loadSellerWalletApiContext(
    supabaseAdmin,
    sellerUserId,
  )

  const orderIds = [
    ...(escrows ?? []).map((e) => e.order_id),
    ...(ledgerEntries ?? []).map((e) => e.order_id),
  ].filter(Boolean)

  const orderNumberById = await fetchOrderNumbersById(supabaseAdmin, orderIds.map(String))
  const all = buildSellerWalletTransactions(escrows, ledgerEntries, withdrawals, { orderNumberById })

  const { items: pageItems, page } = paginateWalletTransactions(all, opts)
  const items = pageItems.map((tx) => ({
    id: tx.id,
    date: tx.date,
    type: tx.type,
    description: tx.description,
    amount: tx.amount,
    status: tx.status,
    statusLabel: tx.statusLabel,
    referenceType: tx.referenceType,
    referenceId: tx.referenceId,
    orderId: tx.orderId,
  }))

  return {
    transactions: items,
    page,
  }
}
