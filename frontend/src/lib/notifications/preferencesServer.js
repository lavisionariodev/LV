/**
 * Server-side helper for honoring per-user notification preferences before sending.
 *
 * Schema assumption:
 *   - `admins.notification_preferences` is `jsonb` shaped as `{ [bucket]: { push: bool, email: bool, sms: bool } }`.
 *   - Buckets follow `adminNotificationFilterBucket` from `@/lib/notifications/types`.
 *
 * Default behaviour: if no preferences row is found or the bucket is missing,
 * we *err on the side of sending* (so existing users don't suddenly stop
 * receiving notifications). Admins can explicitly toggle off in /admin/settings.
 */
import { adminNotificationFilterBucket } from '@/lib/notifications/types'

const ADMIN_BUCKETS = ['order', 'approval', 'alert', 'announcement']

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} supabaseAdmin
 * @param {string} userId
 * @returns {Promise<'admin' | 'user' | 'unknown'>}
 */
async function detectRole(supabaseAdmin, userId) {
  if (!userId) return 'unknown'

  const { data: adminRow } = await supabaseAdmin
    .from('admins')
    .select('id')
    .eq('id', userId)
    .maybeSingle()
  if (adminRow?.id) return 'admin'

  return 'user'
}

/**
 * Resolve the channel preference for a recipient + bucket.
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} supabaseAdmin
 * @param {string} userId
 * @param {string} bucket  one of the admin buckets ('order' | 'approval' | 'alert' | 'announcement') or 'unknown'
 * @param {'push' | 'email' | 'sms'} channel
 * @returns {Promise<boolean>}
 */
export async function shouldSendChannel(supabaseAdmin, userId, bucket, channel) {
  if (!userId || !channel) return true
  if (channel === 'sms') return false

  const role = await detectRole(supabaseAdmin, userId)
  if (role !== 'admin') {
    // Non-admin users currently have no preferences UI; always allow.
    return true
  }

  const safeBucket = ADMIN_BUCKETS.includes(bucket) ? bucket : null

  const { data: row } = await supabaseAdmin
    .from('admins')
    .select('notification_preferences')
    .eq('id', userId)
    .maybeSingle()

  const prefs = row?.notification_preferences
  if (!prefs || typeof prefs !== 'object') return true
  if (!safeBucket) return true

  const bucketPrefs = prefs[safeBucket]
  if (!bucketPrefs || typeof bucketPrefs !== 'object') return true

  if (channel in bucketPrefs) return Boolean(bucketPrefs[channel])
  return true
}

/**
 * Convenience: pick the bucket from a notification type, then resolve the channel.
 */
export async function shouldSendChannelForType(supabaseAdmin, userId, notificationType, channel) {
  const bucket = adminNotificationFilterBucket(notificationType)
  return shouldSendChannel(supabaseAdmin, userId, bucket, channel)
}
