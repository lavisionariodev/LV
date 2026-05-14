import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { requireAdminApiUser } from '@/lib/auth/requireAdminRoute'
import { listCommissionChangeLog } from '@/lib/admin/commissionChangeLog'

export async function GET(request) {
  const { responseError } = await requireAdminApiUser()
  if (responseError) return responseError

  const { searchParams } = new URL(request.url)
  const limit = Number.parseInt(String(searchParams.get('limit') || '20'), 10)
  const supabaseAdmin = getSupabaseAdmin()
  const { entries, error } = await listCommissionChangeLog(supabaseAdmin, { limit })

  if (error) {
    return NextResponse.json({ error }, { status: 500 })
  }

  return NextResponse.json({ entries }, { status: 200 })
}

export const dynamic = 'force-dynamic'
