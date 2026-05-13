/**
 * RFC 4122-style UUID syntax check (does not validate variant/version semantics).
 */
export function isUuidLike(value) {
  const s = String(value ?? '').trim()
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s)
}
