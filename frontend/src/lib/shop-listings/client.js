import { supabase } from '@/lib/supabase/client'

const ALLOWED_SERVICE_IDS = new Set(['cremation', 'traditional-burial', 'memorial-planning'])

/** Placeholders until reviews/aggregates exist in the database. */
const PLACEHOLDER_PROVIDER_RATING = 4.8
const PLACEHOLDER_REVIEW_COUNT = 0
const PLACEHOLDER_PROVIDER_BADGE = 'Verified'

/**
 * Map funeral category from DB (column or dynamic_values.funeral_category) to shop service slugs.
 */
function normalizeServiceId(raw) {
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
  if (typeof dv.inclusions === 'string' && dv.inclusions.trim()) {
    return dv.inclusions
      .split(/\n|•|;/)
      .map((x) => x.trim())
      .filter(Boolean)
      .slice(0, 12)
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

function parseDynamicValues(raw) {
  if (raw == null) return {}
  if (typeof raw === 'object' && !Array.isArray(raw)) return raw
  if (typeof raw === 'string') {
    try {
      const o = JSON.parse(raw)
      return o && typeof o === 'object' && !Array.isArray(o) ? o : {}
    } catch {
      return {}
    }
  }
  return {}
}

/**
 * Labels for the buyer-facing Package dropdown on shop detail/cart.
 * RPC `get_active_shop_listings` returns non-empty `dynamic_values.package_options` from the listing
 * when present, otherwise `sellers.package_options` (see migration 036).
 */
function parseSellerPackageOptions(raw) {
  if (raw == null) return []
  let list = []
  if (Array.isArray(raw)) {
    list = raw.map((x) => String(x).trim()).filter(Boolean)
  } else if (typeof raw === 'string') {
    try {
      const p = JSON.parse(raw)
      if (Array.isArray(p)) list = p.map((x) => String(x).trim()).filter(Boolean)
    } catch {
      list = raw
        .split(/\n/)
        .map((s) => s.trim())
        .filter(Boolean)
    }
  }
  return [...new Set(list)]
}

function formatListingKindLabel(kind) {
  if (kind == null || typeof kind !== 'string') return ''
  const k = kind.trim().toLowerCase()
  if (k === 'service') return 'Service'
  if (k === 'package') return 'Package'
  const t = kind.trim()
  return t ? t.charAt(0).toUpperCase() + t.slice(1) : ''
}

function mapRpcRowToListing(row) {
  if (!row) return null
  const dv = parseDynamicValues(row.dynamic_values)
  const serviceId = normalizeServiceId(row.public_category_slug)
  const price = row.base_price != null ? Number(row.base_price) : 0
  const sellerId = row.seller_user_id
  const loc = (row.business_location || row.listing_location || '').trim() || 'Philippines'

  const rawUrls = Array.isArray(row.image_urls) ? row.image_urls : []
  const imageUrls = rawUrls
    .filter((u) => typeof u === 'string' && u.trim() && !u.startsWith('blob:'))
    .map((u) => u.trim())
  const firstImage = imageUrls[0] ?? null

  /** Website signup — `sellers.registered_at` (no listing fallback; see migration 028). */
  const sellerRegisteredAt =
    row.seller_registered_at ?? row.sellerRegisteredAt ?? null
  /** Business operations start — `sellers.business_started_at` (onboarding). */
  const businessStartedAt =
    row.seller_business_started_at ?? row.sellerBusinessStartedAt ?? null

  const description = typeof dv.description === 'string' ? dv.description.trim() : ''
  const whoThisIsFor = typeof dv.who_this_is_for === 'string' ? dv.who_this_is_for.trim() : ''
  const importantNotes = typeof dv.important_notes === 'string' ? dv.important_notes.trim() : ''
  const sellerPackageOptions = parseSellerPackageOptions(row.seller_package_options)

  const duration =
    typeof dv.duration === 'string' ? dv.duration.trim() : ''
  const categoryLabel =
    typeof dv.category === 'string' ? dv.category.trim() : ''
  const listingKindLabel = formatListingKindLabel(
    typeof dv.kind === 'string' ? dv.kind : '',
  )
  const coverage =
    (typeof dv.coverage === 'string' && dv.coverage.trim()) ||
    (typeof dv.location === 'string' && dv.location.trim()) ||
    (typeof row.listing_location === 'string' && row.listing_location.trim()) ||
    ''

  return {
    id: String(row.listing_id),
    serviceId,
    providerId: String(sellerId),
    name: row.listing_name || 'Service listing',
    price: Number.isFinite(price) ? price : 0,
    popular: Boolean(dv.featured || dv.popular),
    inclusions: parseInclusions(dv.description, dv),
    description,
    whoThisIsFor,
    importantNotes,
    duration,
    categoryLabel,
    listingKindLabel,
    coverage,
    sellerPackageOptions,
    imageUrls,
    imageUrl: firstImage,
    provider: {
      id: String(sellerId),
      name: row.business_name || 'Verified seller',
      location: loc,
      rating: PLACEHOLDER_PROVIDER_RATING,
      reviews: PLACEHOLDER_REVIEW_COUNT,
      badge: PLACEHOLDER_PROVIDER_BADGE,
      joinedDate: sellerRegisteredAt ?? null,
      businessStartedAt: businessStartedAt ?? null,
    },
    createdAt: row.created_at || new Date().toISOString(),
    source: 'database',
  }
}

/** Maps RPC rows from `get_active_shop_listings` to the shop listing shape (database-only). */
export function mergeShopListings(dbRows) {
  return (dbRows || []).map(mapRpcRowToListing).filter(Boolean)
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
    /* Do not cache failures — previously [] was cached 45s and hid transient RPC/permission issues. */
    console.warn('[shop] get_active_shop_listings:', error.message, error)
    return []
  }

  const rows = Array.isArray(data) ? data : []
  cache = rows
  cacheAt = Date.now()
  return rows
}
