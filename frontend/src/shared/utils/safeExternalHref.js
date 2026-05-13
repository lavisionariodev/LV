/**
 * Return a safe external href for rendering into <a href>.
 * Blocks javascript: and other unexpected schemes.
 *
 * Allowed:
 * - https://
 * - http:// (kept for compatibility, but prefer https)
 * - mailto:
 * - tel:
 */
export function safeExternalHref(raw) {
  if (raw == null) return ''
  const t = String(raw).trim()
  if (!t) return ''

  const lower = t.toLowerCase()
  if (lower.startsWith('javascript:') || lower.startsWith('data:') || lower.startsWith('vbscript:')) {
    return ''
  }

  if (lower.startsWith('https://') || lower.startsWith('http://')) return t
  if (lower.startsWith('mailto:') || lower.startsWith('tel:')) return t

  return ''
}
