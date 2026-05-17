import { NextResponse } from 'next/server'
import { requireActiveSellerApiUser } from '@/lib/auth/requireApiUser'
import { handleSellerWalletGet } from '@/lib/payments/walletWithdrawHandler'

export async function GET() {
  const { user, supabaseAdmin, responseError } = await requireActiveSellerApiUser()
  if (responseError) return responseError

  try {
    return await handleSellerWalletGet(supabaseAdmin, user.id)
  } catch (error) {
    return NextResponse.json(
      { error: error.message || 'Failed to load wallet.' },
      { status: 500 },
    )
  }
}
