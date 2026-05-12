import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { requireAdminApiUser } from '@/lib/auth/requireAdminRoute'
import { getAdminPortalMetrics } from '@/lib/admin/adminPortalMetrics'

/** Aggregated dashboard + analytics metrics (counts, GMV/comission charts, activity). */
export async function GET(request) {
  const { responseError } = await requireAdminApiUser()
  if (responseError) return responseError

  try {
    const supabaseAdmin = getSupabaseAdmin()
    const { searchParams } = new URL(request.url)
    const rangeRaw = searchParams.get('range') || ''
    const rangeDays = rangeRaw.endsWith('d')
      ? Number.parseInt(rangeRaw.slice(0, -1), 10)
      : Number.parseInt(rangeRaw, 10)
    const payload = await getAdminPortalMetrics(supabaseAdmin, {
      rangeDays: Number.isFinite(rangeDays) ? rangeDays : undefined,
    })
    return NextResponse.json(payload)
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to load admin metrics.' },
      { status: 500 },
    )
  }
}

export const dynamic = 'force-dynamic'
