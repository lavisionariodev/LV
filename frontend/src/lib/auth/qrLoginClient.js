/**
 * @typedef {{
 *   challengeId: string,
 *   pollSecret: string,
 *   approveUrl: string,
 *   expiresAt: string,
 * }} SellerQrChallenge
 */

/**
 * @param {string} pathname
 * @returns {boolean}
 */
function isSellerQrConfirmPathname(pathname) {
  if (!pathname) return false
  const normalized = pathname.replace(/\/+$/, '') || '/'
  return normalized === '/seller/login/qr/confirm'
}

/**
 * @param {string} value
 * @returns {string | null}
 */
export function parseSellerQrConfirmPath(value) {
  const credentials = parseSellerQrConfirmCredentials(value)
  if (!credentials) return null

  const next = new URL('/seller/login/qr/confirm', window.location.origin)
  next.searchParams.set('challenge', credentials.challengeId)
  next.searchParams.set('token', credentials.approveToken)
  return `${next.pathname}${next.search}`
}

/**
 * @param {string} value
 * @returns {{ challengeId: string, approveToken: string } | null}
 */
export function parseSellerQrConfirmCredentials(value) {
  if (!value || typeof window === 'undefined') return null

  const trimmed = String(value).trim().replace(/\u0000/g, '')
  if (!trimmed) return null

  try {
    const parsed = trimmed.startsWith('/')
      ? new URL(trimmed, window.location.origin)
      : new URL(trimmed)

    if (!isSellerQrConfirmPathname(parsed.pathname)) return null

    const challengeId = parsed.searchParams.get('challenge')?.trim() || ''
    const approveToken = parsed.searchParams.get('token')?.trim() || ''
    if (!challengeId || !approveToken) return null

    return { challengeId, approveToken }
  } catch {
    return null
  }
}

/**
 * @param {string} confirmPath
 * @param {Record<string, string>} [extraParams]
 * @returns {string}
 */
export function appendSellerQrConfirmParams(confirmPath, extraParams = {}) {
  const url = new URL(confirmPath, window.location.origin)
  Object.entries(extraParams).forEach(([key, value]) => {
    if (value) url.searchParams.set(key, value)
  })
  return `${url.pathname}${url.search}`
}

/**
 * @typedef {{
 *   status: 'pending' | 'approved' | 'consumed' | 'expired' | 'denied',
 *   email?: string,
 *   tokenHash?: string,
 *   redirectPath?: string | null,
 * }} SellerQrPollResult
 */

/**
 * @param {{ redirectPath?: string | null }} [options]
 * @returns {Promise<{ data: SellerQrChallenge | null, error: string | null }>}
 */
export async function createSellerQrChallenge({ redirectPath } = {}) {
  try {
    const response = await fetch('/api/auth/qr/challenge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        portal: 'seller',
        redirectPath: redirectPath ?? null,
      }),
    })

    const payload = await response.json().catch(() => ({}))
    if (!response.ok) {
      return {
        data: null,
        error: payload?.error || 'Could not start QR login. Please try again.',
      }
    }

    return { data: payload, error: null }
  } catch {
    return { data: null, error: 'Could not start QR login. Please try again.' }
  }
}

/**
 * @param {{ challengeId: string, pollSecret: string }} params
 * @returns {Promise<{ data: SellerQrPollResult | null, error: string | null }>}
 */
export async function pollSellerQrChallenge({ challengeId, pollSecret }) {
  try {
    const url = new URL(`/api/auth/qr/challenge/${encodeURIComponent(challengeId)}`, window.location.origin)
    url.searchParams.set('pollSecret', pollSecret)

    const response = await fetch(url.toString(), { method: 'GET', cache: 'no-store' })
    const payload = await response.json().catch(() => ({}))
    if (!response.ok) {
      return {
        data: null,
        error: payload?.error || 'Could not check QR login status.',
      }
    }

    return { data: payload, error: null }
  } catch {
    return { data: null, error: 'Could not check QR login status.' }
  }
}

/**
 * @param {{ challengeId: string, approveToken: string }} params
 * @returns {Promise<{ error: string | null }>}
 */
export async function approveSellerQrChallenge({ challengeId, approveToken }) {
  try {
    const response = await fetch('/api/auth/qr/approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ challengeId, approveToken }),
    })

    const payload = await response.json().catch(() => ({}))
    if (!response.ok) {
      return { error: payload?.error || 'Could not approve this login request.' }
    }

    return { error: null }
  } catch {
    return { error: 'Could not approve this login request.' }
  }
}

/**
 * @param {{ challengeId: string, approveToken: string }} params
 * @returns {Promise<{ error: string | null }>}
 */
export async function denySellerQrChallenge({ challengeId, approveToken }) {
  try {
    const response = await fetch('/api/auth/qr/deny', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ challengeId, approveToken }),
    })

    const payload = await response.json().catch(() => ({}))
    if (!response.ok) {
      return { error: payload?.error || 'Could not deny this login request.' }
    }

    return { error: null }
  } catch {
    return { error: 'Could not deny this login request.' }
  }
}
