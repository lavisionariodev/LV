import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { requireAdminApiUser } from '@/lib/auth/requireAdminRoute'
import { getPlatformTreasuryPayload } from '@/lib/admin/platformTreasury'
import { getPaymongoOpsHealth } from '@/lib/payments/disbursement'

export async function GET(request) {
  const { responseError } = await requireAdminApiUser()
  if (responseError) return responseError

  try {
    const { searchParams } = new URL(request.url)
    const rangeRaw = searchParams.get('range') || '7d'
    const rangeDays = rangeRaw.endsWith('d') ? Number.parseInt(rangeRaw.slice(0, -1), 10) : 7

    const supabaseAdmin = getSupabaseAdmin()
    const payload = await getPlatformTreasuryPayload(supabaseAdmin, { rangeDays })

    return NextResponse.json({
      ...payload,
      opsHealth: getPaymongoOpsHealth(),
    })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to load treasury.' },
      { status: 500 },
    )
  }
}

export const dynamic = 'force-dynamic'
