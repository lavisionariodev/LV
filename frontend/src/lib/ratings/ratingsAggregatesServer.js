const SERVICE_ID_ALLOWED = new Set(['cremation', 'traditional-burial', 'memorial-planning'])

export function toAvgRating(num) {
  if (!Number.isFinite(num)) return null
  return Number(num.toFixed(1))
}

/**
 * @param {Array<{ service_id?: string, rating?: number }>} rows
 * @param {string[]} serviceIds
 */
export function buildAggregatesByServiceId(rows, serviceIds) {
  /** @type {Map<string,{sum:number,count:number}>} */
  const byService = new Map()
  for (const row of rows ?? []) {
    const serviceId = String(row.service_id ?? '').trim()
    if (!SERVICE_ID_ALLOWED.has(serviceId)) continue
    const rating = Number(row.rating)
    if (!Number.isFinite(rating)) continue
    const prev = byService.get(serviceId) || { sum: 0, count: 0 }
    prev.sum += rating
    prev.count += 1
    byService.set(serviceId, prev)
  }

  /** @type {Record<string,{avgRating:number|null,reviewCount:number}>} */
  const aggregatesByServiceId = {}
  for (const serviceId of serviceIds) {
    const group = byService.get(serviceId)
    if (!group || group.count === 0) {
      aggregatesByServiceId[serviceId] = { avgRating: null, reviewCount: 0 }
      continue
    }
    aggregatesByServiceId[serviceId] = {
      avgRating: toAvgRating(group.sum / group.count),
      reviewCount: group.count,
    }
  }

  return aggregatesByServiceId
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} supabaseAdmin
 * @param {string[]} serviceIds
 */
export async function loadAggregatesByServiceId(supabaseAdmin, serviceIds) {
  const normalized = [
    ...new Set(serviceIds.map((id) => String(id ?? '').trim()).filter((id) => SERVICE_ID_ALLOWED.has(id))),
  ]
  if (normalized.length === 0) {
    return { aggregatesByServiceId: {}, error: null }
  }

  const { data: rows, error } = await supabaseAdmin
    .from('order_item_reviews')
    .select('service_id,rating')
    .in('service_id', normalized)

  if (error) {
    return { aggregatesByServiceId: {}, error }
  }

  return {
    aggregatesByServiceId: buildAggregatesByServiceId(rows, normalized),
    error: null,
  }
}
