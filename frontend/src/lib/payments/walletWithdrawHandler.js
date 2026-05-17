import { NextResponse } from 'next/server'
import { processSellerWithdrawal } from '@/lib/payments/processSellerWithdrawal'
import { getSellerWithdrawReadiness } from '@/lib/payments/disbursementConfig'
import { loadSellerWalletApiContext } from '@/lib/payments/walletApiHelpers'
import { mapWalletSummaryForApi, mapWithdrawalForApi } from '@/lib/payments/sellerWalletTransactions'

/**
 * GET wallet summary + recent withdrawals (shared by /api/seller/wallet and legacy /withdraw).
 */
export async function handleSellerWalletGet(supabaseAdmin, sellerUserId) {
  const [{ summary, withdrawals }, payoutSettingsResult] = await Promise.all([
    loadSellerWalletApiContext(supabaseAdmin, sellerUserId),
    supabaseAdmin.from('seller_payout_settings').select('*').eq('seller_user_id', sellerUserId).maybeSingle(),
  ])

  if (payoutSettingsResult.error) {
    return NextResponse.json(
      { error: payoutSettingsResult.error.message || 'Failed to load payout settings.' },
      { status: 500 },
    )
  }

  const payoutSettings = payoutSettingsResult.data ?? null
  const withdrawConfig = getSellerWithdrawReadiness(payoutSettings)

  return NextResponse.json({
    summary: mapWalletSummaryForApi(summary),
    /** @deprecated legacy snake_case fields for analytics withdraw panel */
    summaryLegacy: summary,
    withdrawConfig,
    withdrawals: (withdrawals ?? []).slice(0, 50).map(mapWithdrawalForApi),
  })
}

/**
 * POST withdrawal (shared by /api/seller/wallet/withdraw and legacy /withdraw).
 */
export async function handleSellerWalletWithdrawPost(supabaseAdmin, sellerUserId, body) {
  const amountPhp = Number(body?.amountPhp)
  const idempotencyKey =
    body?.idempotencyKey != null
      ? String(body.idempotencyKey).trim()
      : `client-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`

  const result = await processSellerWithdrawal(supabaseAdmin, {
    sellerUserId,
    amountPhp,
    idempotencyKey,
  })

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status || 400 })
  }

  const withdrawal = result.withdrawal
  return NextResponse.json(
    {
      ok: true,
      pending: Boolean(result.pending),
      alreadyProcessed: Boolean(result.alreadyProcessed),
      withdrawal: withdrawal ? mapWithdrawalForApi(withdrawal) : null,
    },
    { status: result.alreadyProcessed || result.pending ? 200 : 201 },
  )
}
