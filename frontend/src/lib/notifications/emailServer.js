import { apiLog, errorMessage } from '@/lib/observability/apiLog'
import { shouldSendChannelForType } from '@/lib/notifications/preferencesServer'

/**
 * Run a transactional email send only when the recipient allows the email channel
 * for the given in-app notification type bucket.
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} supabaseAdmin
 * @param {string} userId
 * @param {string} notificationType
 * @param {() => Promise<{ sent?: boolean, reason?: string } | void>} send
 */
export async function sendEmailIfAllowed(supabaseAdmin, userId, notificationType, send) {
  try {
    const allowed = await shouldSendChannelForType(
      supabaseAdmin,
      userId,
      notificationType,
      'email',
    )
    if (!allowed) {
      apiLog('user_notification.email_skipped_by_preference', { type: notificationType })
      return { sent: false, reason: 'preference_blocked' }
    }
  } catch (prefErr) {
    apiLog('user_notification.email_pref_check_failed', {
      err: errorMessage(prefErr),
      type: notificationType,
    })
  }

  const result = await send()
  if (result && typeof result === 'object') return result
  return { sent: true }
}
