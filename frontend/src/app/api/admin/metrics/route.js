import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { requireAdminApiUser } from '@/lib/auth/requireAdminRoute'
import { getAdminPortalMetrics } from '@/lib/admin/adminPortalMetrics'

/** Aggregated dashboard + analytics metrics (counts, GMV/comission charts, activity). */
export async function GET() {
  const { responseError } = await requireAdminApiUser()
  if (responseError) return responseError

  try {
    const supabaseAdmin = getSupabaseAdmin()
    const payload = await getAdminPortalMetrics(supabaseAdmin)
    return NextResponse.json(payload)
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to load admin metrics.' },
      { status: 500 },
    )
  }
}
