import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { requireAdminApiUser } from '@/lib/auth/requireAdminRoute'

const DEFAULT_LIMIT = 50
const MAX_LIMIT = 200

/**
 * Orders with refund_status requested or processing (stuck / attention queue).
 *
 * Query: ?limit=50&offset=0
 * Response: { orders, total, hasMore, limit, offset }
 */
export async function GET(request) {
  const { responseError } = await requireAdminApiUser()
  if (responseError) return responseError

  const { searchParams } = new URL(request.url)
  const rawLimit = Number.parseInt(searchParams.get('limit') ?? '', 10)
  const rawOffset = Number.parseInt(searchParams.get('offset') ?? '', 10)
  const limit = Math.min(
    Math.max(Number.isFinite(rawLimit) && rawLimit > 0 ? rawLimit : DEFAULT_LIMIT, 1),
    MAX_LIMIT,
  )
  const offset = Math.max(Number.isFinite(rawOffset) && rawOffset >= 0 ? rawOffset : 0, 0)

  const supabaseAdmin = getSupabaseAdmin()

  const { data: rows, count, error } = await supabaseAdmin
    .from('orders')
    .select(
      'id,order_number,buyer_id,seller_user_id,refund_status,refund_requested_at,payment_status,subtotal,fulfillment_status,paymongo_refund_id',
      { count: 'exact' },
    )
    .in('refund_status', ['requested', 'processing'])
    .order('refund_requested_at', { ascending: false, nullsFirst: false })
    .range(offset, offset + limit - 1)

  if (error) {
    return NextResponse.json({ error: error.message ?? 'Failed to load.' }, { status: 500 })
  }

  const total = typeof count === 'number' ? count : (rows?.length ?? 0)
  const hasMore = offset + (rows?.length ?? 0) < total

  return NextResponse.json(
    {
      orders: rows ?? [],
      total,
      hasMore,
      limit,
      offset,
    },
    { status: 200 },
  )
}

export const dynamic = 'force-dynamic'
