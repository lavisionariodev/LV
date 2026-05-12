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
  'message',
  'account',
  'listing_approval',
  'listing_rejected',
  // Admin: seller submitted seller_listings for approval (POST …/submit-for-review).
  'listing_pending_review',
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
  if (t === 'listing_approval' || t === 'listing_rejected' || t === 'listing_pending_review') return 'approval'
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
  if (t === 'message') return 'message'
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
  { id: 'order', label: 'Orders' },
  { id: 'payment', label: 'Payments' },
  { id: 'listing', label: 'Listings' },
  { id: 'message', label: 'Messages' },
  { id: 'alert', label: 'Alerts' },
  { id: 'system', label: 'System' },
]
