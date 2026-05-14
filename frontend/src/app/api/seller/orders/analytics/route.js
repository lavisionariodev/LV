import { NextResponse } from 'next/server'
import { requireActiveSellerApiUser } from '@/lib/auth/requireApiUser'
import { SELLER_ANALYTICS_ORDER_SELECT } from '@/lib/seller/sellerOrderAnalytics'

export async function GET() {
  const { user, supabaseAdmin, responseError } = await requireActiveSellerApiUser()
  if (responseError) return responseError
  const [ordersRes, listingsRes] = await Promise.all([
    supabaseAdmin
      .from('orders')
      .select(SELLER_ANALYTICS_ORDER_SELECT)
      .eq('seller_user_id', user.id)
      .order('created_at', { ascending: false }),
    supabaseAdmin
      .from('seller_listings')
      .select('id,approval_status')
      .eq('seller_user_id', user.id),
  ])

  if (ordersRes.error) {
    return NextResponse.json(
      { error: ordersRes.error.message || 'Could not load orders.' },
      { status: 500 },
    )
  }

  return NextResponse.json(
    {
      orders: ordersRes.data || [],
      listings: listingsRes.error ? [] : listingsRes.data || [],
      listingError: listingsRes.error?.message || '',
    },
    { status: 200 },
  )
}
