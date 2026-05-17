import { NextResponse } from 'next/server'
import { requireActiveSellerApiUser } from '@/lib/auth/requireApiUser'
import { fetchSellerWithdrawalsForSeller } from '@/lib/payments/walletLedger'
import { mapWithdrawalForApi } from '@/lib/payments/sellerWalletTransactions'

function parsePositiveInt(value, fallback, max) {
  const n = parseInt(String(value ?? ''), 10)
  if (!Number.isFinite(n) || n < 1) return fallback
  return Math.min(n, max)
}

export async function GET(request) {
  const { user, supabaseAdmin, responseError } = await requireActiveSellerApiUser()
  if (responseError) return responseError

  const { searchParams } = new URL(request.url)
  const limit = parsePositiveInt(searchParams.get('limit'), 20, 100)

  try {
    const rows = await fetchSellerWithdrawalsForSeller(supabaseAdmin, user.id)
    const withdrawals = rows.slice(0, limit).map(mapWithdrawalForApi)
    return NextResponse.json({ withdrawals, total: rows.length })
  } catch (error) {
    return NextResponse.json(
      { error: error.message || 'Failed to load withdrawals.' },
      { status: 500 },
    )
  }
}
