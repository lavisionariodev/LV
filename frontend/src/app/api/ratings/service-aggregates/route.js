import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { apiLog, errorMessage } from '@/lib/observability/apiLog'

const SERVICE_ID_ALLOWED = new Set(['cremation', 'traditional-burial', 'memorial-planning'])

function toAvgRating(num) {
  if (!Number.isFinite(num)) return null
  return Number(num.toFixed(1))
}

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const idsParam = searchParams.get('ids') || ''
  const serviceIds = [
    ...new Set(
      idsParam
        .split(',')
        .map((s) => String(s ?? '').trim())
        .filter((id) => SERVICE_ID_ALLOWED.has(id)),
    ),
  ]

  if (serviceIds.length === 0) {
    return NextResponse.json({ ok: true, aggregatesByServiceId: {} }, { status: 200 })
  }

  const supabaseAdmin = getSupabaseAdmin()
  const { data: rows, error: rowsErr } = await supabaseAdmin
    .from('order_item_reviews')
    .select('service_id,rating')
    .in('service_id', serviceIds)

  if (rowsErr) {
    apiLog('service.aggregates.load_failed', { err: errorMessage(rowsErr) })
    return NextResponse.json({ error: 'Failed to load service aggregates.' }, { status: 500 })
  }

  /** @type {Map<string,{sum:number,count:number}>} */
  const byService = new Map()
  for (const r of rows ?? []) {
    const serviceId = String(r.service_id ?? '').trim()
    if (!SERVICE_ID_ALLOWED.has(serviceId)) continue
    const rating = Number(r.rating)
    if (!Number.isFinite(rating)) continue
    const prev = byService.get(serviceId) || { sum: 0, count: 0 }
    prev.sum += rating
    prev.count += 1
    byService.set(serviceId, prev)
  }

  /** @type {Record<string,{avgRating:number|null,reviewCount:number}>} */
  const aggregatesByServiceId = {}
  for (const serviceId of serviceIds) {
    const g = byService.get(serviceId)
    if (!g || g.count === 0) {
      aggregatesByServiceId[serviceId] = { avgRating: null, reviewCount: 0 }
      continue
    }
    aggregatesByServiceId[serviceId] = { avgRating: toAvgRating(g.sum / g.count), reviewCount: g.count }
  }

  return NextResponse.json({ ok: true, aggregatesByServiceId }, { status: 200 })
}

