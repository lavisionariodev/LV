import { NextResponse } from 'next/server'
import { requireActiveSellerApiUser } from '@/lib/auth/requireApiUser'
import { handleSellerWalletWithdrawPost } from '@/lib/payments/walletWithdrawHandler'

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
