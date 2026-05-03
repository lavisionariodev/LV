/**
 * In-process sliding-window rate limiting. Works for single Node instances (typical dev
 * & single-worker deploys). For multi-instance production, swap for Redis / Upstash.
 */

/** @typedef {{ count: number, windowStart: number }} Bucket */

/** @type {Map<string, Bucket>} */
const buckets = new Map()

const CLEAN_EVERY_MS = 60_000
let lastClean = Date.now()

function prune(now) {
  if (now - lastClean < CLEAN_EVERY_MS) return
  lastClean = now
  const cutoff = now - 3600_000
  for (const [k, b] of buckets) {
    if (b.windowStart < cutoff) buckets.delete(k)
  }
}

/**
 * @param {string} key
 * @param {{ windowMs: number, max: number }} opts
 * @returns {{ ok: boolean, remaining: number, retryAfterSec?: number }}
 */
export function takeToken(key, opts) {
  const now = Date.now()
  prune(now)

  const { windowMs, max } = opts
  let b = buckets.get(key)
  if (!b || now - b.windowStart >= windowMs) {
    b = { count: 0, windowStart: now }
    buckets.set(key, b)
  }

  if (b.count >= max) {
    const retryAfterMs = Math.max(0, windowMs - (now - b.windowStart))
    return {
      ok: false,
      remaining: 0,
      retryAfterSec: Math.ceil(retryAfterMs / 1000) || 1,
    }
  }

  b.count += 1
  return { ok: true, remaining: max - b.count }
}

/**
 * Prefer proxy headers when present (Vercel / nginx).
 * @param {Request} request
 */
export function getClientIp(request) {
  const xf = request.headers.get('x-forwarded-for')
  if (xf) {
    const first = xf.split(',')[0]?.trim()
    if (first) return first
  }
  const real = request.headers.get('x-real-ip')?.trim()
  if (real) return real
  return 'unknown'
}
