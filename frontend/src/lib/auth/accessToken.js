/**
 * @param {string | null | undefined} accessToken
 * @returns {string | null}
 */
export function getAccessTokenSessionId(accessToken) {
  if (!accessToken || typeof accessToken !== 'string') return null

  const parts = accessToken.split('.')
  if (parts.length < 2) return null

  try {
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=')
    const payload = JSON.parse(atob(padded))
    return typeof payload.session_id === 'string' && payload.session_id.trim()
      ? payload.session_id.trim()
      : null
  } catch {
    return null
  }
}
