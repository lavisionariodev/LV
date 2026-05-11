import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { requireAdminApiUser } from '@/lib/auth/requireAdminRoute'

/**
 * GET — singleton `platform_billing` row (id=1): default commission %, legal fields, updated_at.
 */
export async function GET() {
  const { responseError } = await requireAdminApiUser()
  if (responseError) return responseError

  const supabaseAdmin = getSupabaseAdmin()
  const { data, error } = await supabaseAdmin
    .from('platform_billing')
    .select(
      'id,legal_name,address,tax_id,billing_email,settlement_notes,default_commission_percent,updated_at',
    )
    .eq('id', 1)
    .maybeSingle()

  if (error) {
    return NextResponse.json({ error: error.message ?? 'Failed to load platform billing.' }, { status: 500 })
  }

  const defaultCommissionPercent =
    data?.default_commission_percent != null ? Number(data.default_commission_percent) : 10

  return NextResponse.json(
    {
      row: data,
      defaultCommissionPercent: Number.isFinite(defaultCommissionPercent) ? defaultCommissionPercent : 10,
    },
    { status: 200 },
  )
}
