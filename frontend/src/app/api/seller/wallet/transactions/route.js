import { NextResponse } from 'next/server'
import { requireActiveSellerApiUser } from '@/lib/auth/requireApiUser'
import { loadSellerWalletTransactionsPage } from '@/lib/payments/wallet'

function parsePositiveInt(value, fallback, max) {
  const n = parseInt(String(value ?? ''), 10)
  if (!Number.isFinite(n) || n < 1) return fallback
  return Math.min(n, max)
}

export async function GET(request) {
  const { user, supabaseAdmin, responseError } = await requireActiveSellerApiUser()
  if (responseError) return responseError

  const { searchParams } = new URL(request.url)
  const limit = parsePositiveInt(searchParams.get('limit'), 50, 100)
  const offset = Math.max(0, parseInt(String(searchParams.get('offset') || '0'), 10) || 0)

  try {
    const result = await loadSellerWalletTransactionsPage(supabaseAdmin, user.id, {
      limit,
      offset,
    })
    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json(
      { error: error.message || 'Failed to load wallet transactions.' },
      { status: 500 },
    )
  }
}
