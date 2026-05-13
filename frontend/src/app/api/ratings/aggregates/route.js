import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { apiLog, errorMessage } from '@/lib/observability/apiLog'
import { isUuidLike } from '@/shared/utils/uuidLike'
import { listingIdFromOrderItemProductId } from '@/lib/orders/listingIdFromProductId'

const SERVICE_ID_ALLOWED = new Set(['cremation', 'traditional-burial', 'memorial-planning'])

function toAvgRating(num) {
  if (!Number.isFinite(num)) return null
  return Number(num.toFixed(1))
}

function buildPairKey(sellerId, serviceId, listingId) {
  if (listingId) return `${sellerId}::${serviceId}::${listingId}`
  return `${sellerId}::${serviceId}`
}

/**
 * GET — unified review aggregates.
 * Query params (both optional; at least one should be non-empty for useful data):
 * - `ids`: comma-separated seller UUIDs → `aggregatesBySellerId` (all reviews per seller)
 * - `pairs`: comma-separated `sellerId|serviceId` or `sellerId|serviceId|listingId` → `aggregatesByPair`
 */
export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const supabaseAdmin = getSupabaseAdmin()

  const idsParam = searchParams.get('ids') || ''
  const sellerIdsForWide = [
    ...new Set(
      idsParam
        .split(',')
        .map((s) => String(s ?? '').trim())
        .filter(Boolean)
        .filter((id) => isUuidLike(id)),
    ),
  ]

  const pairsParam = searchParams.get('pairs') || ''
  const rawPairs = pairsParam
    .split(',')
    .map((s) => String(s ?? '').trim())
    .filter(Boolean)

  /** @type {Array<{sellerId:string,serviceId:string,listingId:string}>} */
  const parsedPairs = []
  for (const raw of rawPairs) {
    const parts = raw.split('|').map((s) => String(s ?? '').trim())
    const sellerId = parts[0] ?? ''
    const serviceId = parts[1] ?? ''
    const listingId = parts[2] ?? ''
    if (!isUuidLike(sellerId)) continue
    if (!SERVICE_ID_ALLOWED.has(serviceId)) continue
    const listingIdNorm = listingId && isUuidLike(listingId) ? listingId : ''
    parsedPairs.push({ sellerId, serviceId, listingId: listingIdNorm })
  }

  let pairs = parsedPairs
  const triples = parsedPairs.filter((p) => p.listingId)
  if (triples.length > 0) {
    const listingIds = [...new Set(triples.map((p) => p.listingId))]
    const { data: listingRows, error: listingErr } = await supabaseAdmin
      .from('seller_listings')
      .select('id,seller_user_id')
      .in('id', listingIds)

    if (listingErr) {
      apiLog('ratings.aggregates.listing_lookup_failed', { err: errorMessage(listingErr) })
      return NextResponse.json({ error: 'Failed to load ratings aggregates.' }, { status: 500 })
    }

    const allowedSellerListing = new Set(
      (listingRows ?? []).map((r) => `${String(r.seller_user_id ?? '').trim()}|${String(r.id ?? '').trim()}`),
    )
    const before = pairs.length
    pairs = pairs.filter(
      (p) => !p.listingId || allowedSellerListing.has(`${p.sellerId}|${p.listingId}`),
    )
    if (pairs.length < before) {
      apiLog('ratings.aggregates.pairs_filtered_invalid_listing', {
        dropped: before - pairs.length,
      })
    }
  }

  /** @type {Record<string,{avgRating:number|null,reviewCount:number}>} */
  let aggregatesBySellerId = {}

  if (sellerIdsForWide.length > 0) {
    const { data: rows, error: rowsErr } = await supabaseAdmin
      .from('order_item_reviews')
      .select('seller_user_id,rating')
      .in('seller_user_id', sellerIdsForWide)

    if (rowsErr) {
      apiLog('ratings.aggregates.seller_wide_failed', { err: errorMessage(rowsErr) })
      return NextResponse.json({ error: 'Failed to load ratings aggregates.' }, { status: 500 })
    }

    /** @type {Map<string,{sum:number,count:number}>} */
    const bySeller = new Map()
    for (const r of rows ?? []) {
      const sid = r.seller_user_id
      if (!sid) continue
      const rating = Number(r.rating)
      if (!Number.isFinite(rating)) continue
      const prev = bySeller.get(sid) || { sum: 0, count: 0 }
      prev.sum += rating
      prev.count += 1
      bySeller.set(sid, prev)
    }

    aggregatesBySellerId = {}
    for (const id of sellerIdsForWide) {
      const g = bySeller.get(id)
      if (!g || g.count === 0) {
        aggregatesBySellerId[id] = { avgRating: null, reviewCount: 0 }
        continue
      }
      aggregatesBySellerId[id] = { avgRating: toAvgRating(g.sum / g.count), reviewCount: g.count }
    }
  }

  /** @type {Record<string,{avgRating:number|null,reviewCount:number}>} */
  let aggregatesByPair = {}

  if (pairs.length > 0) {
    const pairSellerIds = [...new Set(pairs.map((p) => p.sellerId))]
    const pairServiceIds = [...new Set(pairs.map((p) => p.serviceId))]
    const validPairSet = new Set(pairs.map((p) => buildPairKey(p.sellerId, p.serviceId, p.listingId)))

    const { data: rows, error: rowsErr } = await supabaseAdmin
      .from('order_item_reviews')
      .select('seller_user_id,service_id,rating,order_item_id')
      .in('seller_user_id', pairSellerIds)
      .in('service_id', pairServiceIds)

    if (rowsErr) {
      apiLog('ratings.aggregates.pairs_failed', { err: errorMessage(rowsErr) })
      return NextResponse.json({ error: 'Failed to load ratings aggregates.' }, { status: 500 })
    }

    const needsListing = pairs.some((p) => p.listingId)
    /** @type {Map<string, string>} */
    const listingByOrderItem = new Map()
    if (needsListing && (rows ?? []).length > 0) {
      const itemIds = [...new Set((rows ?? []).map((r) => r.order_item_id).filter(Boolean))]
      const chunkSize = 120
      for (let i = 0; i < itemIds.length; i += chunkSize) {
        const slice = itemIds.slice(i, i + chunkSize)
        const { data: items, error: itemsErr } = await supabaseAdmin
          .from('order_items')
          .select('id,product_id')
          .in('id', slice)
        if (itemsErr) {
          apiLog('ratings.aggregates.order_items_failed', { err: errorMessage(itemsErr) })
          return NextResponse.json({ error: 'Failed to load ratings aggregates.' }, { status: 500 })
        }
        for (const row of items ?? []) {
          const lid = listingIdFromOrderItemProductId(row.product_id)
          if (lid) listingByOrderItem.set(String(row.id), lid)
        }
      }
    }

    /** @type {Map<string,{sum:number,count:number}>} */
    const byPair = new Map()
    for (const r of rows ?? []) {
      const sellerId = String(r.seller_user_id ?? '').trim()
      const serviceId = String(r.service_id ?? '').trim()
      const rating = Number(r.rating)
      if (!Number.isFinite(rating)) continue
      const rowListingId = listingByOrderItem.get(String(r.order_item_id)) ?? ''

      for (const p of pairs) {
        if (p.sellerId !== sellerId || p.serviceId !== serviceId) continue
        if (p.listingId) {
          if (rowListingId !== p.listingId) continue
          const key = buildPairKey(p.sellerId, p.serviceId, p.listingId)
          if (!validPairSet.has(key)) continue
          const prev = byPair.get(key) || { sum: 0, count: 0 }
          prev.sum += rating
          prev.count += 1
          byPair.set(key, prev)
        } else {
          const key = buildPairKey(p.sellerId, p.serviceId, '')
          if (!validPairSet.has(key)) continue
          const prev = byPair.get(key) || { sum: 0, count: 0 }
          prev.sum += rating
          prev.count += 1
          byPair.set(key, prev)
        }
      }
    }

    aggregatesByPair = {}
    for (const p of pairs) {
      const key = buildPairKey(p.sellerId, p.serviceId, p.listingId)
      const g = byPair.get(key)
      if (!g || g.count === 0) {
        aggregatesByPair[key] = { avgRating: null, reviewCount: 0 }
        continue
      }
      aggregatesByPair[key] = { avgRating: toAvgRating(g.sum / g.count), reviewCount: g.count }
    }
  }

  if (sellerIdsForWide.length === 0 && pairs.length === 0) {
    return NextResponse.json(
      { ok: true, aggregatesBySellerId: {}, aggregatesByPair: {} },
      { status: 200 },
    )
  }

  return NextResponse.json(
    {
      ok: true,
      aggregatesBySellerId,
      aggregatesByPair,
    },
    { status: 200 },
  )
}
