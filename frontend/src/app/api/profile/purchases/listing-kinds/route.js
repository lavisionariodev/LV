import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { requireActiveBuyerApiUser } from '@/lib/auth/requireApiUser'
import { apiLog, errorMessage } from '@/lib/observability/apiLog'
import { getClientIp, takeToken } from '@/lib/rate-limit/memoryRateLimit'
import { isUuidLike } from '@/shared/utils/uuidLike'

const MAX_IDS = 100

/** POST — batch resolve `seller_listings.listing_kind` for the authenticated buyer only.
 *
 * Body: { listingIds: string[] }  // UUIDs derived from order_items.product_id
 * Returns: { kinds: { [listingId: string]: 'service' | 'package' | 'product' | null } }
 *
 * Authorization: a listing's kind is only returned if the caller has at least one
 * `order_items` row referencing that listing (via `product_id` prefix).
 */
export async function POST(request) {
  const ip = getClientIp(request)
  const rl = takeToken(`listing-kinds:${ip}`, { windowMs: 15 * 60_000, max: 120 })
  if (!rl.ok) {
    apiLog('profile.listing-kinds.ratelimited', { retryAfterSec: rl.retryAfterSec })
    return NextResponse.json(
      { error: 'Too many requests.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec ?? 60) } },
    )
  }

  const { user, responseError } = await requireActiveBuyerApiUser()
  if (responseError) {
    if (responseError.status === 401) apiLog('profile.listing-kinds.unauthorized', {})
    return responseError
  }

  const supabaseAdmin = getSupabaseAdmin()

  const body = await request.json().catch(() => ({}))
  const raw = body?.listingIds
  if (!Array.isArray(raw)) {
    return NextResponse.json({ error: 'listingIds must be an array.' }, { status: 400 })
  }

  const requested = [...new Set(raw.map((v) => String(v ?? '').trim()).filter(isUuidLike))].slice(
    0,
    MAX_IDS,
  )

  if (requested.length === 0) {
    return NextResponse.json({ kinds: {} })
  }

  /** Verify these listings actually appear in this buyer's orders. */
  const { data: itemRows, error: itemsErr } = await supabaseAdmin
    .from('order_items')
    .select('product_id, orders!inner(buyer_id)')
    .eq('orders.buyer_id', user.id)

  if (itemsErr) {
    apiLog('profile.listing-kinds.verify_failed', { err: errorMessage(itemsErr) })
    return NextResponse.json({ error: 'Failed to verify purchases.' }, { status: 500 })
  }

  const ownedListingIds = new Set()
  for (const row of itemRows ?? []) {
    const base = String(row?.product_id ?? '').split('::pkg::', 1)[0].trim()
    if (isUuidLike(base)) ownedListingIds.add(base)
  }

  const allowed = requested.filter((id) => ownedListingIds.has(id))
  if (allowed.length === 0) {
    return NextResponse.json({ kinds: {} })
  }

  const { data: listings, error: listingsErr } = await supabaseAdmin
    .from('seller_listings')
    .select('id, listing_kind')
    .in('id', allowed)

  if (listingsErr) {
    apiLog('profile.listing-kinds.fetch_failed', { err: errorMessage(listingsErr) })
    return NextResponse.json({ error: 'Failed to load listing kinds.' }, { status: 500 })
  }

  /** @type {Record<string, string | null>} */
  const kinds = {}
  for (const row of listings ?? []) {
    const k = typeof row.listing_kind === 'string' ? row.listing_kind.trim().toLowerCase() : ''
    kinds[row.id] = k || null
  }

  apiLog('profile.listing-kinds.ok', { resolved: Object.keys(kinds).length })

  return NextResponse.json({ kinds })
}
