import { NextResponse } from 'next/server'
import { requireActiveSellerApiUser } from '@/lib/auth/requireApiUser'
import {
  handleSellerWalletGet,
  handleSellerWalletWithdrawPost,
} from '@/lib/payments/walletWithdrawHandler'

/** @deprecated Prefer /api/seller/wallet — kept for backward compatibility. */
export async function GET() {
  const { user, supabaseAdmin, responseError } = await requireActiveSellerApiUser()
  if (responseError) return responseError

  try {
    const response = await handleSellerWalletGet(supabaseAdmin, user.id)
    const data = await response.json()
    return NextResponse.json({
      summary: data.summaryLegacy ?? data.summary,
      withdrawConfig: data.withdrawConfig,
      withdrawals: data.withdrawals,
    })
  } catch (error) {
    return NextResponse.json(
      { error: error.message || 'Failed to load withdrawal summary.' },
      { status: 500 },
    )
  }
}

/** @deprecated Prefer POST /api/seller/wallet/withdraw */
export async function POST(request) {
  const { user, supabaseAdmin, responseError } = await requireActiveSellerApiUser()
  if (responseError) return responseError

  const body = await request.json().catch(() => ({}))
  try {
    return await handleSellerWalletWithdrawPost(supabaseAdmin, user.id, body)
  } catch (error) {
    return NextResponse.json(
      { error: error.message || 'Withdrawal failed.' },
      { status: 500 },
    )
  }
}
