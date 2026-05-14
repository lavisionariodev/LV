import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { requireAdminApiUser } from '@/lib/auth/requireAdminRoute'
import { listSellerListingsForAdminQuery } from '@/lib/admin/listSellerListingsForAdmin'

function parseCsvParam(raw) {
  if (!raw) return null
  const values = String(raw)
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
  return values.length ? values : null
}

/**
 * GET /api/admin/listings
 *
 * Query params:
 * - statusIn: comma-separated listing status values
 * - approvalStatusIn: comma-separated approval_status values
 * - onlyActive: `false` disables default active-only filter when statusIn is omitted
 */
export async function GET(request) {
  const { responseError } = await requireAdminApiUser()
  if (responseError) return responseError

  const { searchParams } = new URL(request.url)
  const statusIn = parseCsvParam(searchParams.get('statusIn'))
  const approvalStatusIn = parseCsvParam(searchParams.get('approvalStatusIn'))
  const onlyActive = searchParams.get('onlyActive') !== 'false'

  const supabaseAdmin = getSupabaseAdmin()
  const { data, error } = await listSellerListingsForAdminQuery(supabaseAdmin, {
    statusIn,
    approvalStatusIn,
    onlyActive,
  })

  if (error) {
    return NextResponse.json({ error }, { status: 500 })
  }

  return NextResponse.json({ listings: data }, { status: 200 })
}

export const dynamic = 'force-dynamic'
