import { NextResponse } from 'next/server'
import { isUuidLike } from '@/shared/utils/uuidLike'
import { loadSellerReviews } from '@/lib/seller/sellerReviews'

export async function GET(request, { params }) {
  const resolvedParams = await params
  const sellerIdRaw = resolvedParams?.sellerId
  const sellerId = String(sellerIdRaw ?? '').trim()
  if (!isUuidLike(sellerId)) {
    return NextResponse.json({ error: 'Invalid sellerId.' }, { status: 400 })
  }

  try {
    const payload = await loadSellerReviews(sellerId)
    return NextResponse.json({ ok: true, ...payload }, { status: 200 })
  } catch {
    return NextResponse.json({ error: 'Failed to load seller reviews.' }, { status: 500 })
  }
}
