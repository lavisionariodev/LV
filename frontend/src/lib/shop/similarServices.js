/**
 * Similar-service recommendations for /shop/[id].
 *
 * Ranking:
 * 1. Prefer other verticals that are commonly paired with the current one (funeral journey).
 * 2. Among those, prefer categories whose lowest listing price is closest to the selected
 *    package price (budget alignment). If price is unknown, fall back to relatedness only.
 *
 * All service data is derived dynamically from available listings only.
 * Services with no listings will not appear.
 */

/** Order of "related" service ids when the user is viewing `currentServiceId` (first = most related). */
export const RELATED_SERVICE_ORDER = {
  cremation: ['memorial-planning', 'traditional-burial'],
  'traditional-burial': ['memorial-planning', 'cremation'],
  'memorial-planning': ['cremation', 'traditional-burial'],
}

/**
 * Derive dynamic service objects from available listings only.
 * Each service gets a name derived from its serviceId, and the image/description come from the first listing.
 * Services with no listings in the database will not be included.
 */
export function getDynamicServicesFromListings(allListings) {
  const serviceMap = new Map()

  allListings.forEach((listing) => {
    if (listing.serviceId && !serviceMap.has(listing.serviceId)) {
      // Create service from the first listing of this type
      serviceMap.set(listing.serviceId, {
        id: listing.serviceId,
        name: listing.serviceId.replace(/-/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
        description: listing.description || `Professional ${listing.serviceId.replace(/-/g, ' ')} services.`,
        image: listing.imageUrl || '/sample/services/default.jpg',
      })
    }
  })

  return Array.from(serviceMap.values())
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
    if (a.prefRank !== b.prefRank) return a.prefRank - b.prefRank
    return a.priceDistance - b.priceDistance
  })

  return scored.slice(0, limit).map((x) => x.service)
}
