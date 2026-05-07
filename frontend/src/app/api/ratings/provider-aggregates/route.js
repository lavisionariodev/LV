import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { apiLog, errorMessage } from '@/lib/observability/apiLog'
import { isUuidLike } from '@/lib/uuidLike'

function toAvgRating(num) {
  if (!Number.isFinite(num)) return null
  return Number(num.toFixed(1))
}

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const idsParam = searchParams.get('ids') || ''
  const ids = idsParam
    .split(',')
    .map((s) => String(s ?? '').trim())
    .filter(Boolean)
    .filter((id) => isUuidLike(id))

  if (ids.length === 0) {
    return NextResponse.json({ ok: true, aggregatesBySellerId: {} }, { status: 200 })
  }

  const supabaseAdmin = getSupabaseAdmin()

  const { data: rows, error: rowsErr } = await supabaseAdmin
    .from('order_item_reviews')
    .select('seller_user_id,rating')
    .in('seller_user_id', ids)

  if (rowsErr) {
    apiLog('provider.aggregates.load_failed', { err: errorMessage(rowsErr) })
    return NextResponse.json({ error: 'Failed to load provider aggregates.' }, { status: 500 })
  }

  /** @type {Map<string,{sum:number,count:number}>} */
  const by = new Map()
  for (const r of rows ?? []) {
    const sid = r.seller_user_id
    if (!sid) continue
    const rating = Number(r.rating)
    if (!Number.isFinite(rating)) continue
    const prev = by.get(sid) || { sum: 0, count: 0 }
    prev.sum += rating
    prev.count += 1
    by.set(sid, prev)
  }

  /** @type {Record<string,{avgRating:number|null,reviewCount:number}>} */
  const aggregatesBySellerId = {}
  for (const id of ids) {
    const g = by.get(id)
    if (!g || g.count === 0) {
      aggregatesBySellerId[id] = { avgRating: null, reviewCount: 0 }
      continue
    }
    aggregatesBySellerId[id] = { avgRating: toAvgRating(g.sum / g.count), reviewCount: g.count }
  }

  return NextResponse.json({ ok: true, aggregatesBySellerId }, { status: 200 })
}

