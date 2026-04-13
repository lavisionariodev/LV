import { supabase } from '@/lib/supabase/client'
import { roundPhpAmount } from '@/lib/cart/formatPhp'

const ALLOWED_SERVICE_IDS = new Set(['cremation', 'traditional-burial', 'memorial-planning'])

/** Placeholders until reviews/aggregates exist in the database. */
const PLACEHOLDER_PROVIDER_RATING = 4.8
const PLACEHOLDER_REVIEW_COUNT = 0

function normalizeServiceId(raw) {
  if (raw == null) return 'memorial-planning'
  const s = String(raw).trim().toLowerCase().replace(/\s+/g, '-')
  if (ALLOWED_SERVICE_IDS.has(s)) return s
  if (s.includes('cremat')) return 'cremation'
  if (s.includes('burial') || s.includes('buried') || s === 'traditional') return 'traditional-burial'
  if (s.includes('memorial') || s.includes('wake')) return 'memorial-planning'
  return 'memorial-planning'
}

/**
 * Shop detail URL for a raw `seller_listings` row (admin deep links).
 */
export function getShopHrefForSellerListingRow(row) {
  if (!row?.id) return '/shop'
  const raw = row.funeral_category ?? row.category ?? ''
  const serviceId = normalizeServiceId(raw)
  return `/shop/${serviceId}?listing=${encodeURIComponent(String(row.id))}`
}

function parseInclusions(description, inclusionsText) {
  if (typeof inclusionsText === 'string' && inclusionsText.trim()) {
    return inclusionsText
      .split(/\n|•|;/)
      .map((x) => x.trim())
      .filter(Boolean)
      .slice(0, 12)
  }
  const text =
    typeof description === 'string'
      ? description
      : ''
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

/**
 * Stock from `seller_listings.stock_status` ("In Stock" | "Out of Stock") or legacy numeric hints.
 */
export function parseInStockFromStockStatus(raw) {
  if (raw == null || raw === '') return true
  const t = String(raw).trim().toLowerCase()
  if (t === 'out of stock' || t === 'out_of_stock') return false
  if (t === 'in stock' || t === 'in_stock') return true
  return true
}

export function stockAvailabilityLabel(inStock) {
  const ok = inStock !== false
  return {
    text: ok ? 'In Stock' : 'Out of Stock',
    inStock: ok,
  }
}

/**
 * Normalize to "In Stock" | "Out of Stock" for the `stock_status` column.
 * Accepts an object with stock_status (legacy) or a plain string.
 */
export function normalizeStockStatusValue(input) {
  if (input == null || input === '') return null
  if (typeof input === 'object' && !Array.isArray(input)) {
    const o = input
    if (Object.prototype.hasOwnProperty.call(o, 'stock_quantity')) {
      const n = Number(o.stock_quantity)
      if (Number.isFinite(n)) return n > 0 ? 'In Stock' : 'Out of Stock'
    }
    return normalizeStockStatusValue(o.stock_status)
  }
  const t = String(input).trim().toLowerCase().replace(/\s+/g, ' ')
  if (t === 'out of stock' || t === 'out_of_stock') return 'Out of Stock'
  if (t === 'in stock' || t === 'in_stock' || t === '') return 'In Stock'
  return 'In Stock'
}

function mapRpcRowToListing(row) {
  if (!row) return null
  const serviceId = normalizeServiceId(row.public_category_slug)
  const price = row.base_price != null ? roundPhpAmount(row.base_price) : 0
  const sellerId = row.seller_user_id
  const loc = (row.business_location || row.listing_location || '').trim() || 'Philippines'

  const rawUrls = Array.isArray(row.image_urls) ? row.image_urls : []
  const imageUrls = rawUrls
    .filter((u) => typeof u === 'string' && u.trim() && !u.startsWith('blob:'))
    .map((u) => u.trim())
  const firstImage = imageUrls[0] ?? null

  const sellerRegisteredAt = row.seller_registered_at ?? row.sellerRegisteredAt ?? null
  const businessStartedAt = row.seller_business_started_at ?? row.sellerBusinessStartedAt ?? null

  const description = typeof row.description === 'string' ? row.description.trim() : ''
  const whoThisIsFor = typeof row.who_this_is_for === 'string' ? row.who_this_is_for.trim() : ''
  const importantNotes = typeof row.important_notes === 'string' ? row.important_notes.trim() : ''
  const sellerPackageOptions = parseSellerPackageOptions(row.seller_package_options)

  const duration = typeof row.duration === 'string' ? row.duration.trim() : ''
  const categoryLabel =
    typeof row.listing_category === 'string' ? row.listing_category.trim() : ''
  const listingKindLabel = formatListingKindLabel(
    typeof row.listing_kind === 'string' ? row.listing_kind : '',
  )
  const coverage =
    (typeof row.listing_location === 'string' && row.listing_location.trim()) || ''

  return {
    id: String(row.listing_id),
    serviceId,
    providerId: String(sellerId),
    name: row.listing_name || 'Service listing',
    price: Number.isFinite(price) ? price : 0,
    inStock: parseInStockFromStockStatus(row.stock_status),
    inclusions: parseInclusions(description, row.inclusions),
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
      badge: null,
      joinedDate: sellerRegisteredAt ?? null,
      businessStartedAt: businessStartedAt ?? null,
    },
    createdAt: row.created_at || new Date().toISOString(),
    source: 'database',
  }
}

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
    console.warn('[shop] get_active_shop_listings:', error.message, error)
    return []
  }

  const rows = Array.isArray(data) ? data : []
  cache = rows
  cacheAt = Date.now()
  return rows
}
