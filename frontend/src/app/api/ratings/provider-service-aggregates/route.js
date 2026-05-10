import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { apiLog, errorMessage } from '@/lib/observability/apiLog'
import { isUuidLike } from '@/lib/uuidLike'

const SERVICE_ID_ALLOWED = new Set(['cremation', 'traditional-burial', 'memorial-planning'])

function toAvgRating(num) {
  if (!Number.isFinite(num)) return null
  return Number(num.toFixed(1))
}

function buildPairKey(sellerId, serviceId) {
  return `${sellerId}::${serviceId}`
}

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const pairsParam = searchParams.get('pairs') || ''
  const rawPairs = pairsParam
    .split(',')
    .map((s) => String(s ?? '').trim())
    .filter(Boolean)

  /** @type {Array<{sellerId:string,serviceId:string}>} */
  const pairs = []
  for (const raw of rawPairs) {
    const [sellerIdRaw, serviceIdRaw] = raw.split('|')
    const sellerId = String(sellerIdRaw ?? '').trim()
    const serviceId = String(serviceIdRaw ?? '').trim()
    if (!isUuidLike(sellerId)) continue
    if (!SERVICE_ID_ALLOWED.has(serviceId)) continue
    pairs.push({ sellerId, serviceId })
  }

  if (pairs.length === 0) {
    return NextResponse.json({ ok: true, aggregatesByPair: {} }, { status: 200 })
  }

  const sellerIds = [...new Set(pairs.map((p) => p.sellerId))]
  const serviceIds = [...new Set(pairs.map((p) => p.serviceId))]
  const validPairSet = new Set(pairs.map((p) => buildPairKey(p.sellerId, p.serviceId)))

  const supabaseAdmin = getSupabaseAdmin()
  const { data: rows, error: rowsErr } = await supabaseAdmin
    .from('order_item_reviews')
    .select('seller_user_id,service_id,rating')
    .in('seller_user_id', sellerIds)
    .in('service_id', serviceIds)

  if (rowsErr) {
    apiLog('provider_service.aggregates.load_failed', { err: errorMessage(rowsErr) })
    return NextResponse.json({ error: 'Failed to load provider service aggregates.' }, { status: 500 })
  }

  /** @type {Map<string,{sum:number,count:number}>} */
  const byPair = new Map()
  for (const r of rows ?? []) {
    const sellerId = String(r.seller_user_id ?? '').trim()
    const serviceId = String(r.service_id ?? '').trim()
    const key = buildPairKey(sellerId, serviceId)
    if (!validPairSet.has(key)) continue
    const rating = Number(r.rating)
    if (!Number.isFinite(rating)) continue
    const prev = byPair.get(key) || { sum: 0, count: 0 }
    prev.sum += rating
    prev.count += 1
    byPair.set(key, prev)
  }

  /** @type {Record<string,{avgRating:number|null,reviewCount:number}>} */
  const aggregatesByPair = {}
  for (const p of pairs) {
    const key = buildPairKey(p.sellerId, p.serviceId)
    const g = byPair.get(key)
    if (!g || g.count === 0) {
      aggregatesByPair[key] = { avgRating: null, reviewCount: 0 }
      continue
    }
    aggregatesByPair[key] = { avgRating: toAvgRating(g.sum / g.count), reviewCount: g.count }
  }

  return NextResponse.json({ ok: true, aggregatesByPair }, { status: 200 })
}

