import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { requireAdminApiUser } from '@/lib/auth/requireAdminRoute'
import { recordCommissionChangeLog } from '@/lib/admin/commissionChangeLog'

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

/**
 * PATCH — update the singleton `platform_billing` row (id=1).
 * Accepts any combination of: defaultCommissionPercent, legalName, address, taxId, billingEmail, settlementNotes.
 */
export async function PATCH(request) {
  const { user, responseError } = await requireAdminApiUser()
  if (responseError) return responseError

  const body = await request.json().catch(() => ({}))
  const patch = { updated_at: new Date().toISOString() }

  if (body?.defaultCommissionPercent !== undefined) {
    const raw = body.defaultCommissionPercent
    const n =
      typeof raw === 'number'
        ? raw
        : typeof raw === 'string'
          ? Number.parseFloat(raw.replace(',', '.'))
          : NaN
    if (!Number.isFinite(n) || n < 0 || n > 100) {
      return NextResponse.json(
        { error: 'defaultCommissionPercent must be a number from 0 through 100.' },
        { status: 400 },
      )
    }
    patch.default_commission_percent = Math.round(n * 100) / 100
  }

  const camelToSnake = {
    legalName: 'legal_name',
    address: 'address',
    taxId: 'tax_id',
    billingEmail: 'billing_email',
    settlementNotes: 'settlement_notes',
  }

  for (const [camel, snake] of Object.entries(camelToSnake)) {
    if (body?.[camel] === undefined) continue
    const v = body[camel]
    if (v == null || v === '') {
      patch[snake] = null
      continue
    }
    if (typeof v !== 'string') {
      return NextResponse.json({ error: `${camel} must be a string.` }, { status: 400 })
    }
    if (snake === 'billing_email') {
      const trimmed = v.trim()
      if (trimmed && !/^\S+@\S+\.\S+$/.test(trimmed)) {
        return NextResponse.json({ error: 'billingEmail must be a valid email.' }, { status: 400 })
      }
      patch[snake] = trimmed || null
    } else {
      patch[snake] = v.trim().slice(0, 4000) || null
    }
  }

  const fieldKeys = Object.keys(patch).filter((k) => k !== 'updated_at')
  if (fieldKeys.length === 0) {
    return NextResponse.json({ error: 'No fields to update.' }, { status: 400 })
  }

  const supabaseAdmin = getSupabaseAdmin()

  let previousDefaultPercent = null
  if (body?.defaultCommissionPercent !== undefined) {
    const { data: beforeRow } = await supabaseAdmin
      .from('platform_billing')
      .select('default_commission_percent')
      .eq('id', 1)
      .maybeSingle()
    previousDefaultPercent =
      beforeRow?.default_commission_percent != null
        ? Number(beforeRow.default_commission_percent)
        : 10
  }

  const { data, error } = await supabaseAdmin
    .from('platform_billing')
    .update(patch)
    .eq('id', 1)
    .select('id,legal_name,address,tax_id,billing_email,settlement_notes,default_commission_percent,updated_at')
    .maybeSingle()

  if (error) {
    return NextResponse.json({ error: error.message ?? 'Update failed.' }, { status: 500 })
  }

  const defaultCommissionPercent =
    data?.default_commission_percent != null ? Number(data.default_commission_percent) : 10

  if (body?.defaultCommissionPercent !== undefined) {
    await recordCommissionChangeLog(supabaseAdmin, {
      changedBy: user.id,
      scope: 'global',
      label: 'Global rate',
      fromPercent: previousDefaultPercent,
      toPercent: Number.isFinite(defaultCommissionPercent) ? defaultCommissionPercent : 10,
    })
  }

  return NextResponse.json(
    {
      ok: true,
      row: data,
      defaultCommissionPercent: Number.isFinite(defaultCommissionPercent) ? defaultCommissionPercent : 10,
    },
    { status: 200 },
  )
}

export const dynamic = 'force-dynamic'
