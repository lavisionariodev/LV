/**
 * @typedef {{
 *   id: string,
 *   deviceLabel: string,
 *   lastSeenAt: string,
 *   createdAt: string,
 *   isCurrent: boolean,
 * }} SellerPortalSession
 */

/**
 * @returns {Promise<{ sessions: SellerPortalSession[], error: string | null }>}
 */
export async function fetchSellerPortalSessions() {
  try {
    const response = await fetch('/api/seller/sessions', { method: 'GET', cache: 'no-store' })
    const payload = await response.json().catch(() => ({}))
    if (!response.ok) {
      return {
        sessions: [],
        error: payload?.error || 'Could not load signed-in browsers.',
      }
    }

    return {
      sessions: Array.isArray(payload?.sessions) ? payload.sessions : [],
      error: null,
    }
  } catch {
    return {
      sessions: [],
      error: 'Could not load signed-in browsers.',
    }
  }
}

/**
 * @returns {Promise<{ error: string | null }>}
 */
export async function registerSellerPortalSession() {
  try {
    const response = await fetch('/api/seller/sessions', { method: 'POST' })
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}))
      return { error: payload?.error || 'Could not update this browser session.' }
    }
    return { error: null }
  } catch {
    return { error: 'Could not update this browser session.' }
  }
}

/**
 * @returns {Promise<{ error: string | null, warning: string | null }>}
 */
export async function signOutOtherSellerPortalSessions() {
  try {
    const response = await fetch('/api/seller/sessions/others', { method: 'POST' })
    const payload = await response.json().catch(() => ({}))
    if (!response.ok) {
      return {
        error: payload?.error || 'Could not sign out other browsers.',
        warning: null,
      }
    }

    return {
      error: null,
      warning: typeof payload?.warning === 'string' ? payload.warning : null,
    }
  } catch {
    return {
      error: 'Could not sign out other browsers.',
      warning: null,
    }
  }
}
