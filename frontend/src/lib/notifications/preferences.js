/**
 * Shared notification preference buckets and in-app notification type constants.
 * Safe for client UI and server routes (no React).
 */

export const SELLER_NOTIFICATION_BUCKETS = ['order', 'payment', 'listing', 'alert', 'system']

export const ADMIN_NOTIFICATION_BUCKETS = ['order', 'approval', 'alert', 'announcement']

export const BUYER_NOTIFICATION_BUCKETS = ['service', 'payment', 'reminder', 'account']

export const NOTIFICATION_CHANNELS = ['push', 'email']

export const NOTIFICATION_PREFERENCE_CHANNELS = Object.freeze([
  { id: 'push', label: 'In-app', hint: 'Notification inbox' },
  { id: 'email', label: 'Email', hint: null },
])

/** @returns {{ push: boolean, email: boolean }} */
export function defaultBucketChannels() {
  return { push: true, email: true }
}

/**
 * @param {unknown} row
 * @returns {{ push: boolean, email: boolean }}
 */
function normalizeBucketChannels(row) {
  const src = row && typeof row === 'object' ? row : {}
  return {
    push: src.push !== false,
    email: src.email !== false,
  }
}

/**
 * @param {readonly string[]} buckets
 * @param {unknown} raw
 * @param {Record<string, unknown> | null | undefined} [incoming]
 */
function mergePreferencesForBuckets(buckets, raw, incoming) {
  const src = raw && typeof raw === 'object' ? raw : {}
  const patch = incoming && typeof incoming === 'object' ? incoming : null
  /** @type {Record<string, { push: boolean, email: boolean }>} */
  const out = {}

  for (const bucket of buckets) {
    const base = normalizeBucketChannels(src[bucket])
    if (!patch || !patch[bucket] || typeof patch[bucket] !== 'object') {
      out[bucket] = base
      continue
    }
    const row = patch[bucket]
    out[bucket] = {
      push: row.push !== false,
      email: row.email !== false,
    }
  }

  return out
}

/** @param {unknown} raw @param {Record<string, unknown> | null | undefined} [incoming] */
export function mergeSellerNotificationPreferences(raw, incoming) {
  return mergePreferencesForBuckets(SELLER_NOTIFICATION_BUCKETS, raw, incoming)
}

/** @param {unknown} raw @param {Record<string, unknown> | null | undefined} [incoming] */
export function mergeAdminNotificationPreferences(raw, incoming) {
  return mergePreferencesForBuckets(ADMIN_NOTIFICATION_BUCKETS, raw, incoming)
}

/** @param {unknown} raw @param {Record<string, unknown> | null | undefined} [incoming] */
export function mergeBuyerNotificationPreferences(raw, incoming) {
  return mergePreferencesForBuckets(BUYER_NOTIFICATION_BUCKETS, raw, incoming)
}

/**
 * Canonical in-app notification `type` values (single string column on user_notifications).
 * Use these from server writers and map in each portal UI (buyer / seller / admin).
 *
 * Admin noise control (PayMongo webhook): set env `ADMIN_NOTIFY_EVERY_PAID_ORDER=true` to fan-out
 * a `system` notification to all admins on each first-time paid order; default is off.
 */
export const IN_APP_NOTIFICATION_TYPES = /** @type {const} */ ([
  'payment_success',
  'payment_failed',
  'payment_refund',
  'service_confirmed',
  'service_inprogress',
  'service_completed',
  'service_alert',
  'alerts',
  'reminder',
  // Legacy bucket id only — not in-app chat; buyer–seller contact uses external channels.
  'message',
  'account',
  'listing_approval',
  'listing_rejected',
  // Admin: seller submitted a new seller_listings row for approval (POST …/submit-for-review).
  'listing_pending_review',
  // Admin: seller saved staged edits on an approved listing (PATCH …/listings/[id]).
  'listing_staged_update',
  'system',
])

/** @param {string} t */
export function isKnownInAppNotificationType(t) {
  return IN_APP_NOTIFICATION_TYPES.includes(/** @type {any} */ (String(t || '')))
}

/**
 * Admin notifications page filter tab ids map to these buckets.
 * @param {string} apiType from user_notifications.type
 */
export function adminNotificationFilterBucket(apiType) {
  const t = String(apiType || '')
  if (t === 'payment_success' || t === 'payment_failed' || t === 'payment_refund') return 'order'
  if (
    t === 'listing_approval' ||
    t === 'listing_rejected' ||
    t === 'listing_pending_review' ||
    t === 'listing_staged_update'
  ) {
    return 'approval'
  }
  if (t === 'alerts' || t === 'service_alert') return 'alert'
  if (t === 'system') return 'announcement'
  if (t.startsWith('service')) return 'order'
  return 'alert'
}

/** Filter tabs for `/admin/notifications` (bucket ids match `adminNotificationFilterBucket`). */
export const ADMIN_NOTIFICATION_FILTER_TABS = [
  { id: 'all', label: 'All' },
  { id: 'unread', label: 'Unread' },
  { id: 'order', label: 'Orders' },
  { id: 'approval', label: 'Approvals' },
  { id: 'alert', label: 'Alerts' },
  { id: 'announcement', label: 'Announcements' },
]

/**
 * Seller notifications page filter buckets.
 * @param {string} apiType from user_notifications.type
 */
export function sellerNotificationFilterBucket(apiType) {
  const t = String(apiType || '')
  if (t === 'payment_success' || t === 'payment_failed' || t === 'payment_refund') return 'payment'
  if (t === 'listing_approval' || t === 'listing_rejected' || t === 'listing_pending_review') return 'listing'
  if (t === 'message') return 'system'
  if (t === 'alerts' || t === 'service_alert' || t === 'reminder') return 'alert'
  if (t.startsWith('service')) return 'order'
  if (t === 'system' || t === 'account') return 'system'
  return 'alert'
}

/** Filter tabs for `/seller/notifications` (bucket ids match `sellerNotificationFilterBucket`). */
export const SELLER_NOTIFICATION_FILTER_TABS = [
  { id: 'all', label: 'All' },
  { id: 'unread', label: 'Unread' },
  { id: 'unresolved', label: 'Unresolved' },
  { id: 'high', label: 'High priority' },
  { id: 'order', label: 'Orders' },
  { id: 'payment', label: 'Payments' },
  { id: 'listing', label: 'Listings' },
  { id: 'alert', label: 'Alerts' },
  { id: 'system', label: 'System' },
]

/**
 * Buyer notifications page filter buckets.
 * @param {string} apiType from user_notifications.type
 */
export function buyerNotificationFilterBucket(apiType) {
  const t = String(apiType || '')
  if (t === 'payment_success' || t === 'payment_failed' || t === 'payment_refund') return 'payment'
  if (t === 'reminder') return 'reminder'
  if (t === 'account' || t === 'account_security' || t === 'account_profile' || t === 'message') {
    return 'account'
  }
  if (t.startsWith('service') || t === 'alerts' || t === 'service_alert') return 'service'
  return 'service'
}
