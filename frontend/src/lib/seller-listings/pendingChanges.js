/** Columns that can be staged in `seller_listings.pending_changes` (see migration 050). */
export const PENDING_CHANGE_KEYS = [
  'listing_name',
  'category',
  'funeral_category',
  'description',
  'duration',
  'location',
  'listing_kind',
  'base_price',
  'package_options',
  'stock_status',
  'inclusions',
  'who_this_is_for',
  'important_notes',
  'image_urls',
]

/**
 * @param {unknown} row
 * @returns {boolean}
 */
export function hasPendingSellerChanges(row) {
  if (!row || String(row.approval_status || '').toLowerCase() !== 'approved') return false
  const p = row.pending_changes
  if (!p || typeof p !== 'object' || Array.isArray(p)) return false
  return Object.keys(p).length > 0
}

/**
 * Merge staged `pending_changes` onto a listing row for seller UI / edit forms.
 * Public shop reads live columns only (no merge).
 *
 * @param {Record<string, unknown>} row
 * @returns {Record<string, unknown>}
 */
export function mergePendingChangesIntoListingRow(row) {
  if (!row) return row
  if (String(row.approval_status || '').toLowerCase() !== 'approved') return row
  const p = row.pending_changes
  if (!p || typeof p !== 'object' || Array.isArray(p)) return row
  const keys = Object.keys(p)
  if (keys.length === 0) return row
  const out = { ...row }
  for (const key of PENDING_CHANGE_KEYS) {
    if (Object.prototype.hasOwnProperty.call(p, key)) {
      out[key] = p[key]
    }
  }
  return out
}

/**
 * Build the payload fragment to apply when an admin approves staged updates.
 *
 * @param {unknown} pending
 * @returns {Record<string, unknown>}
 */
export function mergePendingChangesPayload(pending) {
  const p = pending && typeof pending === 'object' && !Array.isArray(pending) ? pending : {}
  const out = {}
  for (const key of PENDING_CHANGE_KEYS) {
    if (Object.prototype.hasOwnProperty.call(p, key)) {
      out[key] = p[key]
    }
  }
  return out
}
