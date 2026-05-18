import {
  REVIEW_MAX_IMAGES,
  REVIEW_MAX_VIDEOS,
  REVIEW_MEDIA_BUCKET,
} from '@/lib/reviews/reviewMediaLimits'

/**
 * Build expected storage object path prefix for a buyer review item.
 * @param {string} buyerId
 * @param {string} orderItemId
 */
export function reviewMediaPathPrefix(buyerId, orderItemId) {
  return `${String(buyerId).trim()}/reviews/${String(orderItemId).trim()}/`
}

/**
 * Extract storage object path from a review-media public URL, or null if invalid.
 * @param {string} url
 */
export function reviewMediaPathFromPublicUrl(url) {
  const raw = String(url ?? '').trim()
  if (!raw) return null

  try {
    const parsed = new URL(raw)
    const marker = `/storage/v1/object/public/${REVIEW_MEDIA_BUCKET}/`
    const idx = parsed.pathname.indexOf(marker)
    if (idx === -1) return null
    const path = decodeURIComponent(parsed.pathname.slice(idx + marker.length))
    return path || null
  } catch {
    return null
  }
}

/**
 * @param {string} buyerId
 * @param {string} orderItemId
 * @param {string} url
 */
export function isReviewMediaUrlForItem(buyerId, orderItemId, url) {
  const path = reviewMediaPathFromPublicUrl(url)
  if (!path) return false
  const prefix = reviewMediaPathPrefix(buyerId, orderItemId)
  return path.startsWith(prefix)
}

/**
 * Normalize and validate review media URL arrays for submit.
 * @param {unknown} imageUrlsRaw
 * @param {unknown} videoUrlsRaw
 * @param {string} buyerId
 * @param {string} orderItemId
 * @returns {{ ok: true, imageUrls: string[], videoUrls: string[] } | { ok: false, error: string }}
 */
export function validateReviewMediaUrlArrays(imageUrlsRaw, videoUrlsRaw, buyerId, orderItemId) {
  const imageUrls = normalizeUrlArray(imageUrlsRaw)
  const videoUrls = normalizeUrlArray(videoUrlsRaw)

  if (imageUrls.length > REVIEW_MAX_IMAGES) {
    return { ok: false, error: `Maximum ${REVIEW_MAX_IMAGES} images per review.` }
  }
  if (videoUrls.length > REVIEW_MAX_VIDEOS) {
    return { ok: false, error: `Maximum ${REVIEW_MAX_VIDEOS} video per review.` }
  }

  for (const url of imageUrls) {
    if (!isReviewMediaUrlForItem(buyerId, orderItemId, url)) {
      return { ok: false, error: 'One or more image URLs are invalid for this review.' }
    }
  }
  for (const url of videoUrls) {
    if (!isReviewMediaUrlForItem(buyerId, orderItemId, url)) {
      return { ok: false, error: 'One or more video URLs are invalid for this review.' }
    }
  }

  return { ok: true, imageUrls, videoUrls }
}

/**
 * @param {string[]} urls
 * @param {string} buyerId
 * @param {string} orderItemId
 */
export function reviewMediaPathsFromUrls(urls, buyerId, orderItemId) {
  const prefix = reviewMediaPathPrefix(buyerId, orderItemId)
  return (urls ?? [])
    .map((url) => reviewMediaPathFromPublicUrl(url))
    .filter((path) => path && path.startsWith(prefix))
}

/**
 * @param {unknown} raw
 * @returns {string[]}
 */
function normalizeUrlArray(raw) {
  if (!Array.isArray(raw)) return []
  const seen = new Set()
  const out = []
  for (const item of raw) {
    const url = String(item ?? '').trim()
    if (!url || seen.has(url)) continue
    seen.add(url)
    out.push(url)
  }
  return out
}
