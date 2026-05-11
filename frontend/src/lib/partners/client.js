import { supabase } from '@/lib/supabase/client'

function mapPartnersRpcRow(row) {
  if (!row || typeof row !== 'object') return null
  const sellerUserId =
    row.seller_user_id ??
    row.sellerUserId ??
    row.user_id ??
    row.userId
  if (!sellerUserId) return null

  const specialtiesRaw = row.specialties
  const specialties =
    Array.isArray(specialtiesRaw)
      ? specialtiesRaw.map((x) => String(x).trim()).filter(Boolean)
      : []

  let avgRating = null
  if (row.avg_rating != null) {
    const n = Number(row.avg_rating)
    avgRating = Number.isFinite(n) ? n : null
  }

  let reviewCount = null
  if (row.review_count != null) {
    const n = Number(row.review_count)
    reviewCount = Number.isFinite(n) ? Math.round(n) : null
  }

  const coverPhotoUrl =
    typeof row.cover_photo_url === 'string' && row.cover_photo_url.trim()
      ? row.cover_photo_url.trim()
      : ''
  const address =
    typeof row.address === 'string' && row.address.trim() ? row.address.trim() : ''
  const businessStartedAt =
    row.business_started_at != null ? String(row.business_started_at) : ''
  const registeredAt = row.registered_at != null ? String(row.registered_at) : ''

  return {
    sellerUserId: String(sellerUserId),
    businessName:
      typeof row.business_name === 'string' && row.business_name.trim()
        ? row.business_name.trim()
        : 'Verified seller',
    tagline:
      typeof row.tagline === 'string' && row.tagline.trim() ? row.tagline.trim() : '',
    businessTypeLabel:
      typeof row.business_type_label === 'string' && row.business_type_label.trim()
        ? row.business_type_label.trim()
        : '',
    avatarUrl:
      typeof row.avatar_url === 'string' && row.avatar_url.trim()
        ? row.avatar_url.trim()
        : '',
    coverPhotoUrl,
    specialties,
    address,
    businessStartedAt,
    registeredAt,
    avgRating,
    reviewCount,
  }
}

let cache = null
let cacheAt = 0
const CACHE_MS = 45_000

const MS_PER_DAY = 24 * 60 * 60 * 1000
const MS_PER_WEEK = 7 * MS_PER_DAY
/** Average month length (matches ~365.25-day year). */
const MS_PER_AVG_MONTH = (365.25 / 12) * MS_PER_DAY
const MS_PER_YEAR = 365.25 * MS_PER_DAY

/**
 * Rows for Verified Network / All Partners (active sellers with ≥1 approved active listing).
 */
export async function fetchActivePartnersDirectory({ bustCache = false } = {}) {
  if (!bustCache && cache && Date.now() - cacheAt < CACHE_MS) {
    return cache
  }

  const { data, error } = await supabase.rpc('get_active_partners_directory')

  if (error) {
    console.warn('[partners] get_active_partners_directory:', error.message, error)
    throw new Error(
      error.message ||
        'Could not load the partners directory (check that migrations 075–077, 090, and 091 are applied).',
    )
  }

  const rawList = Array.isArray(data)
    ? data
    : data != null && typeof data === 'object'
      ? [data]
      : []

  const rows = rawList.map(mapPartnersRpcRow).filter(Boolean)
  if (!rows.length && rawList.length > 0) {
    console.warn('[partners] Unexpected RPC shape; rows not mapped:', rawList.slice(0, 1))
  }

  cache = rows
  cacheAt = Date.now()
  return rows
}

/** @param {string|undefined|null} iso */
function formatTenureLabel(iso) {
  if (iso == null || typeof iso !== 'string' || !iso.trim()) return ''
  const d = new Date(iso.trim())
  if (Number.isNaN(d.getTime())) return ''
  const ms = Date.now() - d.getTime()
  if (ms < 0) return ''
  if (ms === 0) return ''

  const years = Math.floor(ms / MS_PER_YEAR)
  if (years >= 1) return `${years} year${years === 1 ? '' : 's'} in service`

  const months = Math.floor(ms / MS_PER_AVG_MONTH)
  if (months >= 1) return `${months} month${months === 1 ? '' : 's'} in service`

  const weeks = Math.floor(ms / MS_PER_WEEK)
  if (weeks >= 1) return `${weeks} week${weeks === 1 ? '' : 's'} in service`

  return 'Less than a week in service'
}

/**
 * Compact tenure for cards (e.g. homepage carousel): years, else months, else weeks.
 * @param {string|undefined|null} iso
 */
export function formatTenureYearsShort(iso) {
  if (iso == null || typeof iso !== 'string' || !iso.trim()) return ''
  const d = new Date(iso.trim())
  if (Number.isNaN(d.getTime())) return ''
  const ms = Date.now() - d.getTime()
  if (ms < 0) return ''
  if (ms === 0) return ''

  const years = Math.floor(ms / MS_PER_YEAR)
  if (years >= 1) return `${years} yr${years === 1 ? '' : 's'}`

  const months = Math.floor(ms / MS_PER_AVG_MONTH)
  if (months >= 1) return `${months} mo${months === 1 ? '' : 's'}`

  const weeks = Math.floor(ms / MS_PER_WEEK)
  if (weeks >= 1) return `${weeks} wk${weeks === 1 ? '' : 's'}`

  return '<1 wk'
}

/**
 * @param {Record<string, unknown>} row
 * @param {{ avgRating?: number | null, reviewCount?: number | null }} [extra]
 */
function mapSpotlightCardRow(row, extra = {}) {
  if (!row || typeof row !== 'object') return null
  const sellerUserId =
    row.seller_user_id ?? row.sellerUserId ?? row.user_id ?? row.userId
  if (!sellerUserId) return null

  const businessName =
    typeof row.business_name === 'string' && row.business_name.trim()
      ? row.business_name.trim()
      : 'Verified seller'
  const tagline =
    typeof row.tagline === 'string' && row.tagline.trim() ? row.tagline.trim() : ''
  const businessTypeLabel =
    typeof row.business_type_label === 'string' && row.business_type_label.trim()
      ? row.business_type_label.trim()
      : ''
  const avatarUrl =
    typeof row.avatar_url === 'string' && row.avatar_url.trim()
      ? row.avatar_url.trim()
      : ''
  const rawInfo =
    typeof row.business_info === 'string' && row.business_info.trim()
      ? row.business_info.trim()
      : ''
  const description =
    rawInfo || (tagline ? tagline : 'A verified partner on La Visionario.')

  const started =
    row.business_started_at != null ? String(row.business_started_at) : ''
  const registered = row.registered_at != null ? String(row.registered_at) : ''
  const yearsLabel = formatTenureLabel(started) || formatTenureLabel(registered) || ''

  let avgRating = extra.avgRating
  if (avgRating === undefined && row.avg_rating != null) {
    const n = Number(row.avg_rating)
    avgRating = Number.isFinite(n) ? n : null
  } else if (avgRating === undefined) {
    avgRating = null
  }

  let reviewCount = extra.reviewCount
  if (reviewCount === undefined && row.review_count != null) {
    const n = Number(row.review_count)
    reviewCount = Number.isFinite(n) ? Math.round(n) : null
  } else if (reviewCount === undefined) {
    reviewCount = null
  }

  return {
    sellerUserId: String(sellerUserId),
    businessName,
    tagline,
    businessTypeLabel,
    avatarUrl,
    description,
    yearsLabel,
    avgRating,
    reviewCount,
  }
}

/**
 * Spotlight payload for /partners (RPC `get_partners_spotlight`).
 * Top-rated cards first, then all admin-featured sellers (featured include avg_rating from migration 089).
 */
export async function fetchPartnersSpotlight() {
  const { data, error } = await supabase.rpc('get_partners_spotlight')

  if (error) {
    console.warn('[partners] get_partners_spotlight:', error.message, error)
    throw new Error(
      error.message ||
        'Could not load partners spotlight (apply migrations 087–089 and 091 for get_partners_spotlight).',
    )
  }

  const root = data != null && typeof data === 'object' ? data : {}

  const featuredRaw = root.featured
  /** @type {unknown[]} */
  let featuredList = []
  if (Array.isArray(featuredRaw)) {
    featuredList = featuredRaw
  } else if (
    featuredRaw != null &&
    typeof featuredRaw === 'object' &&
    (featuredRaw.seller_user_id != null || featuredRaw.sellerUserId != null)
  ) {
    featuredList = [featuredRaw]
  }

  const featured = featuredList.map((row) => mapSpotlightCardRow(row)).filter(Boolean)

  const topList = Array.isArray(root.top_rated) ? root.top_rated : []
  const topRated = topList
    .map((row) => mapSpotlightCardRow(row))
    .filter(Boolean)

  return { featured, topRated }
}
