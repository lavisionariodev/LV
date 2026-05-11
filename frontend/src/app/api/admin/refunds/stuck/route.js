import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { requireAdminApiUser } from '@/lib/auth/requireAdminRoute'

/**
 * Orders with refund_status requested or processing (stuck / attention queue).
 */
export async function GET() {
  const { responseError } = await requireAdminApiUser()
  if (responseError) return responseError

  const supabaseAdmin = getSupabaseAdmin()

  const { data: rows, error } = await supabaseAdmin
    .from('orders')
    .select(
      'id,order_number,buyer_id,seller_user_id,refund_status,refund_requested_at,payment_status,subtotal,fulfillment_status,paymongo_refund_id',
    )
    .in('refund_status', ['requested', 'processing'])
    .order('refund_requested_at', { ascending: false, nullsFirst: false })
    .limit(100)

  if (error) {
    return NextResponse.json({ error: error.message ?? 'Failed to load.' }, { status: 500 })
  }

  return NextResponse.json({ orders: rows ?? [] }, { status: 200 })
}
