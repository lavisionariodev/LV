import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { requireAdminApiUser } from '@/lib/auth/requireAdminRoute'
import { countOpenOrReviewDisputes } from '@/lib/admin/adminPortalMetrics'

/** GET — count of disputes with status `open` or `under_review` (admin sidebar / badges). */
export async function GET() {
  const { responseError } = await requireAdminApiUser()
  if (responseError) return responseError

  const supabaseAdmin = getSupabaseAdmin()
  const count = await countOpenOrReviewDisputes(supabaseAdmin)
  return NextResponse.json({ count }, { status: 200 })
}
