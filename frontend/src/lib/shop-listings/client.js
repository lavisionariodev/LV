import { supabase } from '@/lib/supabase/client'
import { LISTINGS as SAMPLE_LISTINGS, PROVIDERS } from '@/app/(main)/shop/data'

const ALLOWED_SERVICE_IDS = new Set(['cremation', 'traditional-burial', 'memorial-planning'])

/**
 * Map funeral category from DB (column or dynamic_values.funeral_category) to shop service slugs.
 */
export function normalizeServiceId(raw) {
  if (raw == null) return 'memorial-planning'
  const s = String(raw).trim().toLowerCase().replace(/\s+/g, '-')
  if (ALLOWED_SERVICE_IDS.has(s)) return s
  if (s.includes('cremat')) return 'cremation'
  if (s.includes('burial') || s.includes('buried') || s === 'traditional') return 'traditional-burial'
  if (s.includes('memorial') || s.includes('wake')) return 'memorial-planning'
  return 'memorial-planning'
}

function parseInclusions(description, dynamicValues) {
  const dv = dynamicValues && typeof dynamicValues === 'object' ? dynamicValues : {}
  if (Array.isArray(dv.inclusions) && dv.inclusions.length) {
    return dv.inclusions.map((x) => String(x).trim()).filter(Boolean).slice(0, 12)
  }
  const text = typeof description === 'string' ? description : typeof dv.description === 'string' ? dv.description : ''
  if (text.trim()) {
    const parts = text
      .split(/\n|•|;/)
      .map((x) => x.trim())
      .filter(Boolean)
    if (parts.length > 1) return parts.slice(0, 12)
    return [parts[0] || 'See listing details']
  }
  return ['See listing details']
}

export function enrichStaticListing(listing) {
  const provider = PROVIDERS.find((p) => p.id === listing.providerId) ?? null
  return {
    ...listing,
    provider,
    createdAt: listing.createdAt ?? '2019-01-01T00:00:00.000Z',
    source: 'sample',
  }
}

export function mapRpcRowToListing(row) {
  if (!row) return null
  const dv = row.dynamic_values && typeof row.dynamic_values === 'object' ? row.dynamic_values : {}
  const serviceId = normalizeServiceId(row.public_category_slug)
  const price = row.base_price != null ? Number(row.base_price) : 0
  const sellerId = row.seller_user_id
  const loc = (row.business_location || row.listing_location || '').trim() || 'Philippines'

  return {
    id: String(row.listing_id),
    serviceId,
    providerId: String(sellerId),
    name: row.listing_name || 'Service listing',
    price: Number.isFinite(price) ? price : 0,
    popular: Boolean(dv.featured || dv.popular),
    inclusions: parseInclusions(dv.description, dv),
    imageUrl: Array.isArray(row.image_urls) && row.image_urls[0] ? row.image_urls[0] : undefined,
    provider: {
      id: String(sellerId),
      name: row.business_name || 'Verified seller',
      location: loc,
      rating: 4.8,
      reviews: 0,
      badge: 'Verified',
    },
    createdAt: row.created_at || new Date().toISOString(),
    source: 'database',
  }
}

/**
 * Database rows first (newer marketplace items), then sample catalog.
 */
export function mergeShopListings(dbRows, sampleListings = SAMPLE_LISTINGS) {
  const dbMapped = (dbRows || []).map(mapRpcRowToListing).filter(Boolean)
  const sampleMapped = (sampleListings || []).map(enrichStaticListing)
  return [...dbMapped, ...sampleMapped]
}

let cache = null
let cacheAt = 0
const CACHE_MS = 45_000

export async function fetchActiveShopListings({ bustCache = false } = {}) {
  if (!bustCache && cache && Date.now() - cacheAt < CACHE_MS) {
    return cache
  }

  const { data, error } = await supabase.rpc('get_active_shop_listings')

  if (error) {
    console.warn('[shop] get_active_shop_listings:', error.message)
    cache = []
    cacheAt = Date.now()
    return []
  }

  const rows = Array.isArray(data) ? data : []
  cache = rows
  cacheAt = Date.now()
  return rows
}
