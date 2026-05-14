import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { requireAdminApiUser } from '@/lib/auth/requireAdminRoute'
import { recordCommissionChangeLog } from '@/lib/admin/commissionChangeLog'

/**
 * PATCH — set or clear `sellers.commission_percent_override` for one seller.
 *
 * Body: { commissionPercentOverride: number | null }
 *  - `null` (or omitted) clears the override (seller falls back to platform default at escrow creation).
 *  - Numbers must be 0 through 100.
 *
 * Note: this only changes future escrows. Use `/api/admin/payouts/commission` to retro-edit an existing escrow.
 */
export async function PATCH(request, context) {
  const { user, responseError } = await requireAdminApiUser()
  if (responseError) return responseError

  const params = await context.params
  const sellerUserId = String(params?.userId ?? '').trim()
  if (!sellerUserId) {
    return NextResponse.json({ error: 'Missing seller id.' }, { status: 400 })
  }

  const body = await request.json().catch(() => ({}))
  const raw = body?.commissionPercentOverride

  let nextValue = null
  if (raw !== null && raw !== undefined && raw !== '') {
    const n =
      typeof raw === 'number'
        ? raw
        : typeof raw === 'string'
          ? Number.parseFloat(raw.replace(',', '.'))
          : NaN
    if (!Number.isFinite(n) || n < 0 || n > 100) {
      return NextResponse.json(
        { error: 'commissionPercentOverride must be a number from 0 through 100, or null to clear.' },
        { status: 400 },
      )
    }
    nextValue = Math.round(n * 100) / 100
  }

  const supabaseAdmin = getSupabaseAdmin()

  const { data: before, error: beforeErr } = await supabaseAdmin
    .from('sellers')
    .select('user_id,commission_percent_override,business_name')
    .eq('user_id', sellerUserId)
    .maybeSingle()

  if (beforeErr) {
    return NextResponse.json(
      { error: beforeErr.message ?? 'Failed to load seller.' },
      { status: 500 },
    )
  }
  if (!before) {
    return NextResponse.json({ error: 'Seller not found.' }, { status: 404 })
  }

  const { data, error } = await supabaseAdmin
    .from('sellers')
    .update({ commission_percent_override: nextValue })
    .eq('user_id', sellerUserId)
    .select('user_id,commission_percent_override')
    .maybeSingle()

  if (error) {
    return NextResponse.json(
      { error: error.message ?? 'Commission override update failed.' },
      { status: 500 },
    )
  }

  await recordCommissionChangeLog(supabaseAdmin, {
    changedBy: user.id,
    scope: 'seller_override',
    sellerUserId,
    label: before?.business_name || sellerUserId,
    fromPercent:
      before?.commission_percent_override != null ? Number(before.commission_percent_override) : null,
    toPercent: nextValue,
  })

  return NextResponse.json(
    {
      ok: true,
      seller: {
        userId: data?.user_id,
        commissionPercentOverride:
          data?.commission_percent_override != null
            ? Number(data.commission_percent_override)
            : null,
      },
    },
    { status: 200 },
  )
}

export const dynamic = 'force-dynamic'
