import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { apiLog, errorMessage } from '@/lib/observability/apiLog'
import { getClientIp, takeToken } from '@/lib/rate-limit/memoryRateLimit'

const MAX_IDS = 50

function isUuidLike(s) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    String(s).trim(),
  )
}

/** POST — batch resolve seller display names for the authenticated buyer only. */
export async function POST(request) {
  const ip = getClientIp(request)
  const rl = takeToken(`seller-names:${ip}`, { windowMs: 15 * 60_000, max: 120 })
  if (!rl.ok) {
    apiLog('profile.seller-names.ratelimited', { retryAfterSec: rl.retryAfterSec })
    return NextResponse.json(
      { error: 'Too many requests.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec ?? 60) } },
    )
  }

  const supabase = await createClient()
  const supabaseAdmin = getSupabaseAdmin()

  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser()

  if (userErr || !user) {
    apiLog('profile.seller-names.unauthorized', {})
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => ({}))
  const raw = body?.sellerUserIds
  if (!Array.isArray(raw)) {
    return NextResponse.json({ error: 'sellerUserIds must be an array.' }, { status: 400 })
  }

  let ids = [...new Set(raw.map((v) => String(v ?? '').trim()).filter(isUuidLike))].slice(0, MAX_IDS)

  if (ids.length === 0) {
    return NextResponse.json({ names: {} })
  }

  const { data: allowedRows, error: allowErr } = await supabaseAdmin
    .from('orders')
    .select('seller_user_id')
    .eq('buyer_id', user.id)
    .in('seller_user_id', ids)

  if (allowErr) {
    apiLog('profile.seller-names.verify_failed', { err: errorMessage(allowErr) })
    return NextResponse.json({ error: 'Failed to verify sellers.' }, { status: 500 })
  }

  const allowedIds = [...new Set((allowedRows ?? []).map((r) => r.seller_user_id).filter(Boolean))]

  if (allowedIds.length === 0) {
    return NextResponse.json({ names: {} })
  }

  const { data: sellers, error: sellersErr } = await supabaseAdmin
    .from('sellers')
    .select('user_id, business_name')
    .in('user_id', allowedIds)

  if (sellersErr) {
    apiLog('profile.seller-names.fetch_failed', { err: errorMessage(sellersErr) })
    return NextResponse.json({ error: 'Failed to load seller names.' }, { status: 500 })
  }

  /** @type {Record<string, string | null>} */
  const names = {}
  for (const row of sellers ?? []) {
    names[row.user_id] = row.business_name ?? null
  }

  apiLog('profile.seller-names.ok', { nameCount: Object.keys(names).length })

  return NextResponse.json({ names })
}
