import {
  fetchDailyReleasedCommissionSeries,
  pickOrder,
  utcDateKeysLastN,
} from './adminPortalMetrics.js'
import {
  mapPlatformBillingForAdmin,
  settlementConfiguredSummary,
} from './platformBillingSettlement.js'

const TREASURY_DISCLAIMER =
  'Figures are ledger-based estimates from escrows and withdrawals. Actual cash is in your PayMongo merchant account; settle platform commission via the PayMongo dashboard or your configured settlement account.'

const ALLOWED_RANGES = [7, 30]

/**
 * @param {any[]} rows order_escrows with nested orders
 */
export function summarizeTreasuryFromEscrows(rows) {
  const cutoffMs = Date.now() - 30 * 24 * 60 * 60 * 1000
  let commissionReleasedTotal = 0
  let commissionReleased30d = 0
  let commissionPending = 0
  let sellerOwedEscrow = 0
  let releasedNetTotal = 0

  for (const r of rows ?? []) {
    const ord = pickOrder(r.orders)
    if (!ord || ord.payment_status !== 'paid') continue

    const commission = Number(r.commission_amount) || 0
    const net = Number(r.net_amount) || 0
    const status = String(r.status || '').toLowerCase()

    if (status === 'released') {
      commissionReleasedTotal += commission
      releasedNetTotal += net
      if (r.released_at) {
        const t = new Date(r.released_at).getTime()
        if (Number.isFinite(t) && t >= cutoffMs) {
          commissionReleased30d += commission
        }
      }
    }
    if (status === 'escrowed' || status === 'on_hold') {
      commissionPending += commission
      sellerOwedEscrow += net
    }
  }

  return {
    commissionReleasedTotal,
    commissionReleased30d,
    commissionPending,
    sellerOwedEscrow,
    releasedNetTotal,
  }
}

/**
 * @param {any[]} withdrawals seller_withdrawals rows
 */
export function summarizeWithdrawalsForTreasury(withdrawals) {
  let sellerWithdrawalsSucceeded = 0
  let sellerWithdrawalsInFlight = 0

  for (const w of withdrawals ?? []) {
    const amount = Number(w.amount_php) || 0
    const status = String(w.status || '').toLowerCase()
    if (status === 'succeeded') {
      sellerWithdrawalsSucceeded += amount
    } else if (status === 'pending' || status === 'submitted') {
      sellerWithdrawalsInFlight += amount
    }
  }

  return { sellerWithdrawalsSucceeded, sellerWithdrawalsInFlight }
}

/**
 * @param {{ releasedNetTotal: number, sellerWithdrawalsSucceeded: number }} params
 */
export function computeSellerOwedWalletEstimate(params) {
  const released = Number(params.releasedNetTotal) || 0
  const withdrawn = Number(params.sellerWithdrawalsSucceeded) || 0
  return Math.max(0, released - withdrawn)
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} supabaseAdmin
 * @param {{ rangeDays?: number }} [options]
 */
export async function getPlatformTreasuryPayload(supabaseAdmin, options = {}) {
  const requestedRange = Number(options?.rangeDays)
  const rangeDays = ALLOWED_RANGES.includes(requestedRange) ? requestedRange : 7
  const chartDayKeys = utcDateKeysLastN(rangeDays)

  const escrowSelect = `
    commission_amount,
    net_amount,
    status,
    released_at,
    orders ( payment_status )
  `

  const [escrowsRes, withdrawalsRes, commissionChartSeries, billingRes] = await Promise.all([
    supabaseAdmin.from('order_escrows').select(escrowSelect).limit(5000),
    supabaseAdmin.from('seller_withdrawals').select('amount_php, status'),
    fetchDailyReleasedCommissionSeries(supabaseAdmin, chartDayKeys),
    supabaseAdmin
      .from('platform_billing')
      .select(
        'settlement_method,settlement_account_holder_name,settlement_bank_name,settlement_account_number,settlement_gcash_name,settlement_gcash_number,settlement_notes',
      )
      .eq('id', 1)
      .maybeSingle(),
  ])

  if (escrowsRes.error) {
    throw new Error(escrowsRes.error.message || 'Failed to load escrows.')
  }
  if (withdrawalsRes.error) {
    throw new Error(withdrawalsRes.error.message || 'Failed to load withdrawals.')
  }

  const escrowAgg = summarizeTreasuryFromEscrows(escrowsRes.data ?? [])
  const withdrawAgg = summarizeWithdrawalsForTreasury(withdrawalsRes.data ?? [])
  const sellerOwedWallet = computeSellerOwedWalletEstimate({
    releasedNetTotal: escrowAgg.releasedNetTotal,
    sellerWithdrawalsSucceeded: withdrawAgg.sellerWithdrawalsSucceeded,
  })

  const billingMapped = billingRes.error ? null : mapPlatformBillingForAdmin(billingRes.data)
  const settlement = settlementConfiguredSummary(billingMapped)

  return {
    disclaimer: TREASURY_DISCLAIMER,
    rangeDays,
    summary: {
      commissionReleasedTotal: escrowAgg.commissionReleasedTotal,
      commissionReleased30d: escrowAgg.commissionReleased30d,
      commissionPending: escrowAgg.commissionPending,
      sellerOwedEscrow: escrowAgg.sellerOwedEscrow,
      sellerOwedWallet,
      sellerOwedWalletIsEstimate: true,
      sellerWithdrawalsInFlight: withdrawAgg.sellerWithdrawalsInFlight,
      currency: 'PHP',
    },
    settlement,
    commissionChartSeries,
  }
}

export { TREASURY_DISCLAIMER }
