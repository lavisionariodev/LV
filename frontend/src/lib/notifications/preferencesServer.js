/**
 * Server-side helper for honoring per-user notification preferences before sending.
 */
import {
  ADMIN_NOTIFICATION_BUCKETS,
  BUYER_NOTIFICATION_BUCKETS,
  SELLER_NOTIFICATION_BUCKETS,
} from '@/lib/notifications/preferenceSchema'
import {
  adminNotificationFilterBucket,
  buyerNotificationFilterBucket,
  sellerNotificationFilterBucket,
} from '@/lib/notifications/types'

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} supabaseAdmin
 * @param {string} userId
 * @returns {Promise<'admin' | 'seller' | 'user' | 'unknown'>}
 */
async function detectRole(supabaseAdmin, userId) {
  if (!userId) return 'unknown'

  const { data: adminRow } = await supabaseAdmin
    .from('admins')
    .select('id')
    .eq('id', userId)
    .maybeSingle()
  if (adminRow?.id) return 'admin'

  const { data: sellerRow } = await supabaseAdmin
    .from('sellers')
    .select('user_id')
    .eq('user_id', userId)
    .maybeSingle()
  if (sellerRow?.user_id) return 'seller'

  return 'user'
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} supabaseAdmin
 * @param {string} userId
 * @param {string} bucket
 * @param {'push' | 'email'} channel
 * @param {'admin' | 'seller' | 'user' | 'unknown'} role
 * @returns {Promise<boolean>}
 */
async function resolveChannelPreference(supabaseAdmin, userId, bucket, channel, role) {
  if (role === 'admin') {
    const safeBucket = ADMIN_NOTIFICATION_BUCKETS.includes(bucket) ? bucket : null
    const { data: row } = await supabaseAdmin
      .from('admins')
      .select('notification_preferences')
      .eq('id', userId)
      .maybeSingle()

    const prefs = row?.notification_preferences
    if (!prefs || typeof prefs !== 'object' || !safeBucket) return true

    const bucketPrefs = prefs[safeBucket]
    if (!bucketPrefs || typeof bucketPrefs !== 'object') return true
    if (channel in bucketPrefs) return Boolean(bucketPrefs[channel])
    return true
  }

  if (role === 'seller') {
    const safeBucket = SELLER_NOTIFICATION_BUCKETS.includes(bucket) ? bucket : null
    const { data: row } = await supabaseAdmin
      .from('sellers')
      .select('notification_preferences')
      .eq('user_id', userId)
      .maybeSingle()

    const prefs = row?.notification_preferences
    if (!prefs || typeof prefs !== 'object' || !safeBucket) return true

    const bucketPrefs = prefs[safeBucket]
    if (!bucketPrefs || typeof bucketPrefs !== 'object') return true
    if (channel in bucketPrefs) return Boolean(bucketPrefs[channel])
    return true
  }

  if (role === 'user') {
    const safeBucket = BUYER_NOTIFICATION_BUCKETS.includes(bucket) ? bucket : null
    const { data: row } = await supabaseAdmin
      .from('profiles')
      .select('notification_preferences')
      .eq('id', userId)
      .maybeSingle()

    const prefs = row?.notification_preferences
    if (!prefs || typeof prefs !== 'object' || !safeBucket) return true

    const bucketPrefs = prefs[safeBucket]
    if (!bucketPrefs || typeof bucketPrefs !== 'object') return true
    if (channel in bucketPrefs) return Boolean(bucketPrefs[channel])
    return true
  }

  return true
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} supabaseAdmin
 * @param {string} userId
 * @param {string} bucket
 * @param {'push' | 'email'} channel
 * @returns {Promise<boolean>}
 */
export async function shouldSendChannel(supabaseAdmin, userId, bucket, channel) {
  if (!userId || !channel) return true

  const role = await detectRole(supabaseAdmin, userId)
  return resolveChannelPreference(supabaseAdmin, userId, bucket, channel, role)
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} supabaseAdmin
 * @param {string} userId
 * @param {string} notificationType
 * @param {'push' | 'email'} channel
 * @returns {Promise<boolean>}
 */
export async function shouldSendChannelForType(supabaseAdmin, userId, notificationType, channel) {
  const role = await detectRole(supabaseAdmin, userId)
  if (role === 'seller') {
    return resolveChannelPreference(
      supabaseAdmin,
      userId,
      sellerNotificationFilterBucket(notificationType),
      channel,
      role,
    )
  }
  if (role === 'admin') {
    return resolveChannelPreference(
      supabaseAdmin,
      userId,
      adminNotificationFilterBucket(notificationType),
      channel,
      role,
    )
  }
  return resolveChannelPreference(
    supabaseAdmin,
    userId,
    buyerNotificationFilterBucket(notificationType),
    channel,
    role,
  )
}
