import { providerServiceAggPairSegments } from '@/lib/ratings/providerServiceAggPairSegments'

/**
 * @param {Array<{ id?: string, providerId?: string, serviceId?: string, provider?: { id?: string } }>} listings
 */
export function buildAggregatesQueryFromListings(listings) {
  const sellerIds = new Set()
  const pairSegments = new Set()

  for (const listing of listings ?? []) {
    const sellerId = String(listing?.providerId ?? listing?.provider?.id ?? '').trim()
    if (sellerId) sellerIds.add(sellerId)
    const pair = providerServiceAggPairSegments(listing)
    if (pair?.api) pairSegments.add(pair.api)
  }

  return {
    sellerIds: [...sellerIds],
    pairSegments: [...pairSegments],
  }
}

/**
 * @param {{ sellerIds?: string[], pairSegments?: string[] }} query
 */
export async function fetchListingRatingAggregates(query = {}) {
  const sellerIds = Array.isArray(query.sellerIds) ? query.sellerIds.filter(Boolean) : []
  const pairSegments = Array.isArray(query.pairSegments) ? query.pairSegments.filter(Boolean) : []

  if (sellerIds.length === 0 && pairSegments.length === 0) {
    return { aggregatesBySellerId: {}, aggregatesByPair: {} }
  }

  const qs = new URLSearchParams()
  if (sellerIds.length > 0) qs.set('ids', sellerIds.join(','))
  if (pairSegments.length > 0) qs.set('pairs', pairSegments.join(','))

  try {
    const res = await fetch(`/api/ratings/aggregates?${qs.toString()}`, { cache: 'no-store' })
    const body = await res.json().catch(() => null)
    return {
      aggregatesBySellerId:
        body?.aggregatesBySellerId && typeof body.aggregatesBySellerId === 'object'
          ? body.aggregatesBySellerId
          : {},
      aggregatesByPair:
        body?.aggregatesByPair && typeof body.aggregatesByPair === 'object' ? body.aggregatesByPair : {},
    }
  } catch {
    return { aggregatesBySellerId: {}, aggregatesByPair: {} }
  }
}

/**
 * @param {{ id?: string, providerId?: string, serviceId?: string, provider?: { id?: string } }} listing
 * @param {{ aggregatesBySellerId?: Record<string, { avgRating?: number | null, reviewCount?: number }>, aggregatesByPair?: Record<string, { avgRating?: number | null, reviewCount?: number }> }} aggregates
 */
export function resolveListingRatingAggregate(listing, aggregates = {}) {
  const pair = providerServiceAggPairSegments(listing)
  const pairAgg = pair?.lookup ? aggregates.aggregatesByPair?.[pair.lookup] : null
  const sellerId = String(listing?.providerId ?? listing?.provider?.id ?? '').trim()
  const sellerAgg = sellerId ? aggregates.aggregatesBySellerId?.[sellerId] : null
  const agg = pairAgg ?? sellerAgg

  const avgRatingRaw = agg?.avgRating
  const avgRating =
    avgRatingRaw != null && Number.isFinite(Number(avgRatingRaw)) ? Number(avgRatingRaw) : null
  const reviewCountRaw = agg?.reviewCount
  const reviewCount =
    reviewCountRaw != null && Number.isFinite(Number(reviewCountRaw)) ? Number(reviewCountRaw) : 0

  return { avgRating, reviewCount }
}

/**
 * @param {{ id?: string, providerId?: string, serviceId?: string, provider?: Record<string, unknown> }} listing
 * @param {{ aggregatesBySellerId?: Record<string, unknown>, aggregatesByPair?: Record<string, unknown> }} aggregates
 */
export function applyListingRatingAggregate(listing, aggregates) {
  if (!listing?.provider) return listing
  const { avgRating, reviewCount } = resolveListingRatingAggregate(listing, aggregates)
  return {
    ...listing,
    provider: {
      ...listing.provider,
      rating: avgRating,
      reviews: reviewCount,
    },
  }
}
