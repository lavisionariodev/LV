import { NextResponse } from 'next/server'
import { requireActiveSellerApiUser } from '@/lib/auth/requireApiUser'
import { loadSellerReviews } from '@/lib/seller/sellerReviews'

export async function GET() {
  const { user, responseError } = await requireActiveSellerApiUser()
  if (responseError) return responseError

  try {
    const payload = await loadSellerReviews(user.id)
    return NextResponse.json({ ok: true, ...payload }, { status: 200 })
  } catch {
    return NextResponse.json({ error: 'Failed to load seller reviews.' }, { status: 500 })
  }
}
