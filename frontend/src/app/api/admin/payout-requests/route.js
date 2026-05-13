import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { requireAdminApiUser } from '@/lib/auth/requireAdminRoute'

const DEFAULT_LIMIT = 50
const MAX_LIMIT = 200
const VALID_STATUSES = new Set(['pending', 'approved', 'rejected', 'all'])

function mapRequestRow(row, sellerById) {
  const seller = sellerById.get(row.seller_user_id) || null
  return {
    id: row.id,
    sellerUserId: row.seller_user_id,
    requestedAmount: row.requested_amount,
    note: row.note,
    status: row.status,
    escrowSnapshot: row.escrow_snapshot,
    createdAt: row.created_at,
    reviewedAt: row.reviewed_at,
    reviewedBy: row.reviewed_by,
    adminNote: row.admin_note,
    sellerBusinessName: seller?.business_name || null,
    sellerContactName: seller?.contact_name || null,
    sellerEmail: seller?.email || null,
  }
}

/**
 * List seller payout release requests for admin review.
 *
 * Query: ?status=pending|approved|rejected|all&limit=&offset=
 */
export async function GET(request) {
  const { responseError } = await requireAdminApiUser()
  if (responseError) return responseError

  const { searchParams } = new URL(request.url)
  const rawStatus = String(searchParams.get('status') || 'pending').toLowerCase()
  const status = VALID_STATUSES.has(rawStatus) ? rawStatus : 'pending'
  const rawLimit = Number.parseInt(searchParams.get('limit') ?? '', 10)
  const rawOffset = Number.parseInt(searchParams.get('offset') ?? '', 10)
  const limit = Math.min(
    Math.max(Number.isFinite(rawLimit) && rawLimit > 0 ? rawLimit : DEFAULT_LIMIT, 1),
    MAX_LIMIT,
  )
  const offset = Math.max(Number.isFinite(rawOffset) && rawOffset >= 0 ? rawOffset : 0, 0)

  const supabaseAdmin = getSupabaseAdmin()
  let query = supabaseAdmin
    .from('seller_payout_requests')
    .select(
      'id,seller_user_id,requested_amount,note,status,escrow_snapshot,created_at,reviewed_at,reviewed_by,admin_note',
      { count: 'exact' },
    )
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (status !== 'all') {
    query = query.eq('status', status)
  }

  const { data: rows, count, error } = await query
  if (error) {
    return NextResponse.json({ error: error.message || 'Failed to load payout requests.' }, { status: 500 })
  }

  const sellerIds = [...new Set((rows || []).map((r) => r.seller_user_id).filter(Boolean))]
  const sellerById = new Map()
  if (sellerIds.length > 0) {
    const { data: sellers } = await supabaseAdmin
      .from('sellers')
      .select('user_id,business_name,contact_name,email')
      .in('user_id', sellerIds)
    for (const s of sellers || []) {
      if (s?.user_id) sellerById.set(s.user_id, s)
    }
  }

  const requests = (rows || []).map((row) => mapRequestRow(row, sellerById))
  const total = typeof count === 'number' ? count : requests.length
  const hasMore = offset + requests.length < total

  return NextResponse.json({ requests, total, hasMore, limit, offset, status }, { status: 200 })
}
