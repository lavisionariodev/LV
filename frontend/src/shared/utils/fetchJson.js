/**
 * Parse JSON from a fetch Response; returns null when the body is empty or invalid.
 * @param {Response} res
 */
async function parseJsonResponse(res) {
  return res.json().catch(() => null)
}

/**
 * @param {string} url
 * @param {RequestInit} [init]
 * @param {{ fallbackError?: string }} [opts]
 */
export async function fetchJson(url, init, opts = {}) {
  const { fallbackError = 'Request failed.' } = opts
  const res = await fetch(url, init)
  const body = await parseJsonResponse(res)
  if (!res.ok) {
    throw new Error(body?.error || fallbackError)
  }
  return body
}
