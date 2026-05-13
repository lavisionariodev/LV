import { isUuidLike } from '@/shared/utils/uuidLike'

/** API `pairs` segment and `aggregatesByPair` lookup key for listing-scoped ratings. */
export function providerServiceAggPairSegments(listing) {
  const sellerId = String(listing?.providerId ?? '').trim()
  const serviceId = String(listing?.serviceId ?? '').trim()
  const lid = String(listing?.id ?? '').trim()
  if (!sellerId || !serviceId) return null
  if (isUuidLike(lid)) return { api: `${sellerId}|${serviceId}|${lid}`, lookup: `${sellerId}::${serviceId}::${lid}` }
  return { api: `${sellerId}|${serviceId}`, lookup: `${sellerId}::${serviceId}` }
}
