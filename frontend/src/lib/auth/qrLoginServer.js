import { createHash, randomBytes } from 'crypto'

export const QR_LOGIN_PORTAL_SELLER = 'seller'
export const QR_LOGIN_CHALLENGE_TTL_MS = 5 * 60 * 1000
export const QR_LOGIN_POLL_INTERVAL_MS = 2000

export const QR_LOGIN_STATUS = Object.freeze({
  PENDING: 'pending',
  APPROVED: 'approved',
  CONSUMED: 'consumed',
  EXPIRED: 'expired',
  DENIED: 'denied',
})

export function generateQrLoginToken() {
  return randomBytes(32).toString('base64url')
}

export function hashQrLoginToken(token) {
  return createHash('sha256').update(String(token)).digest('hex')
}

export function getQrLoginExpiryDate(now = Date.now()) {
  return new Date(now + QR_LOGIN_CHALLENGE_TTL_MS).toISOString()
}

export function isQrLoginExpired(expiresAt, now = Date.now()) {
  if (!expiresAt) return true
  return new Date(expiresAt).getTime() <= now
}

/**
 * @param {string | null | undefined} redirectPath
 * @returns {string | null}
 */
export function sanitizeQrLoginRedirectPath(redirectPath) {
  if (typeof redirectPath !== 'string') return null
  const trimmed = redirectPath.trim()
  if (!trimmed || trimmed === '/') return null
  if (!trimmed.startsWith('/') || trimmed.startsWith('//')) return null
  return trimmed
}

/**
 * @param {string} origin
 * @param {string} challengeId
 * @param {string} approveToken
 * @returns {string}
 */
export function buildSellerQrApproveUrl(origin, challengeId, approveToken) {
  const url = new URL('/seller/login/qr/confirm', origin)
  url.searchParams.set('challenge', challengeId)
  url.searchParams.set('token', approveToken)
  return url.toString()
}

/**
 * @param {string} origin
 * @param {string} challengeId
 * @param {string} approveToken
 * @returns {string}
 */
export function buildSellerQrLoginRedirectPath(origin, challengeId, approveToken) {
  const url = new URL('/seller/login/qr/confirm', origin)
  url.searchParams.set('challenge', challengeId)
  url.searchParams.set('token', approveToken)
  return `${url.pathname}${url.search}`
}
