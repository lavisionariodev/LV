import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { loadSellerReviews } from '@/lib/seller/sellerReviews'

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser()
  if (userErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const payload = await loadSellerReviews(user.id)
    return NextResponse.json({ ok: true, ...payload }, { status: 200 })
  } catch {
    return NextResponse.json({ error: 'Failed to load seller reviews.' }, { status: 500 })
  }
}
