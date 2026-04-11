/**
 * Similar-service recommendations for /shop/[id].
 *
 * Ranking:
 * 1. Prefer other verticals that are commonly paired with the current one (funeral journey).
 * 2. Among those, prefer categories whose lowest listing price is closest to the selected
 *    package price (budget alignment). If price is unknown, fall back to relatedness only.
 */

/** Order of "related" service ids when the user is viewing `currentServiceId` (first = most related). */
export const RELATED_SERVICE_ORDER = {
  cremation: ['memorial-planning', 'traditional-burial'],
  'traditional-burial': ['memorial-planning', 'cremation'],
  'memorial-planning': ['cremation', 'traditional-burial'],
}

function minListingPriceForService(serviceId, allListings) {
  const nums = (allListings || [])
    .filter((l) => l.serviceId === serviceId)
    .map((l) => Number(l.price))
    .filter((n) => Number.isFinite(n) && n >= 0)
  if (!nums.length) return null
  return Math.min(...nums)
}

/**
 * @param {object} params
 * @param {string} params.currentServiceId - e.g. 'cremation'
 * @param {object|null} params.selectedListing - merged listing with .price
 * @param {Array} params.allServices - SERVICES
 * @param {Array} params.allListings - merged catalog
 * @param {number} [params.limit=3]
 * @returns {Array} subset of allServices (excluding current), ordered by recommendation
 */
export function getRecommendedSimilarServices({
  currentServiceId,
  selectedListing,
  allServices,
  allListings,
  limit = 3,
}) {
  const services = Array.isArray(allServices) ? allServices : []
  const candidates = services.filter((s) => s.id !== currentServiceId)
  if (candidates.length === 0) return []

  const anchor =
    selectedListing?.price != null && Number.isFinite(Number(selectedListing.price))
      ? Number(selectedListing.price)
      : null

  const prefList = RELATED_SERVICE_ORDER[currentServiceId] || []

  const scored = candidates.map((s) => {
    const minP = minListingPriceForService(s.id, allListings)
    const priceDistance =
      anchor != null && minP != null ? Math.abs(minP - anchor) : Number.POSITIVE_INFINITY
    const prefIdx = prefList.indexOf(s.id)
    const prefRank = prefIdx === -1 ? 100 + prefList.length : prefIdx
    return { service: s, priceDistance, prefRank }
  })

  scored.sort((a, b) => {
    if (a.priceDistance !== b.priceDistance) return a.priceDistance - b.priceDistance
    return a.prefRank - b.prefRank
  })

  return scored.slice(0, limit).map((x) => x.service)
}
