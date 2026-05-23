/** sessionStorage flag while an admin previewed the public shop from the admin portal. */
export const ADMIN_SHOP_RETURN_STORAGE_KEY = 'lv_admin_shop_return'

const DEFAULT_ADMIN_RETURN_PATH = '/admin/listings/browse'

/**
 * @param {string | null | undefined} path
 * @returns {string}
 */
export function sanitizeAdminReturnPath(path) {
  const p = String(path || '').trim()
  if (!p.startsWith('/admin') || p.startsWith('//')) return DEFAULT_ADMIN_RETURN_PATH
  return p
}

/**
 * Append query params so the public site can show a return-to-admin overlay.
 *
 * @param {string} href
 * @param {string} [returnTo]
 * @returns {string}
 */
export function withAdminPortalShopContext(href, returnTo = DEFAULT_ADMIN_RETURN_PATH) {
  const base = String(href || '/shop').trim() || '/shop'
  const safeReturn = sanitizeAdminReturnPath(returnTo)

  try {
    const url = new URL(base, 'http://lv.local')
    url.searchParams.set('from', 'admin')
    url.searchParams.set('returnTo', safeReturn)
    return `${url.pathname}${url.search}${url.hash}`
  } catch {
    const sep = base.includes('?') ? '&' : '?'
    return `${base}${sep}from=admin&returnTo=${encodeURIComponent(safeReturn)}`
  }
}

/**
 * @param {string} returnTo
 */
export function persistAdminShopReturn(returnTo) {
  if (typeof window === 'undefined') return
  const safeReturn = sanitizeAdminReturnPath(returnTo)
  try {
    window.sessionStorage.setItem(
      ADMIN_SHOP_RETURN_STORAGE_KEY,
      JSON.stringify({ active: true, returnTo: safeReturn }),
    )
  } catch {
    // ignore quota / private mode
  }
}

/**
 * @returns {string | null}
 */
export function readPersistedAdminShopReturn() {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.sessionStorage.getItem(ADMIN_SHOP_RETURN_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed?.active) return null
    return sanitizeAdminReturnPath(parsed.returnTo)
  } catch {
    return null
  }
}

/**
 * @returns {void}
 */
export function clearPersistedAdminShopReturn() {
  if (typeof window === 'undefined') return
  try {
    window.sessionStorage.removeItem(ADMIN_SHOP_RETURN_STORAGE_KEY)
  } catch {
    // ignore
  }
}
