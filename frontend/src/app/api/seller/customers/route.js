import { NextResponse } from 'next/server'
import { requireActiveSellerApiUser } from '@/lib/auth/requireApiUser'
import {
  aggregateSellerCustomers,
  SELLER_CUSTOMER_ORDER_SELECT,
} from '@/lib/seller/sellerOrderAnalytics'

export async function GET() {
  const { user, supabaseAdmin, responseError } = await requireActiveSellerApiUser()
  if (responseError) return responseError

  const { data, error } = await supabaseAdmin
    .from('orders')
    .select(SELLER_CUSTOMER_ORDER_SELECT)
    .eq('seller_user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message || 'Failed to load customers.' }, { status: 500 })
  }

  return NextResponse.json({ customers: aggregateSellerCustomers(data ?? []) }, { status: 200 })
}

export const dynamic = 'force-dynamic'
