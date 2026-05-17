import { apiLog, errorMessage } from '@/lib/observability/apiLog'
import { shouldSendChannelForType } from '@/lib/notifications/preferencesServer'
import { sendEmailIfAllowed } from '@/lib/notifications/emailServer'
import {
  defaultNotificationInboxPath,
  notificationActionUrlFromMetadata,
  sendNotificationEmail,
} from '@/lib/email/sendNotificationEmail'
import { getAppBaseUrl } from '@/lib/email/appBaseUrl'

const DEDUPE_KEY_MAX = 200

/**
 * Resolve outbound email for a notification recipient.
 * @param {import('@supabase/supabase-js').SupabaseClient} supabaseAdmin
 * @param {string} userId
 */
async function resolveNotificationRecipientEmail(supabaseAdmin, userId) {
  const id = String(userId || '').trim()
  if (!id) return null

  try {
    const { data, error } = await supabaseAdmin.auth.admin.getUserById(id)
    const authEmail = data?.user?.email?.trim()
    if (!error && authEmail) return authEmail
  } catch {
    // fall through to profile/seller tables
  }

  const [{ data: profile }, { data: seller }] = await Promise.all([
    supabaseAdmin.from('profiles').select('email').eq('id', id).maybeSingle(),
    supabaseAdmin.from('sellers').select('email').eq('user_id', id).maybeSingle(),
  ])

  const profileEmail = typeof profile?.email === 'string' ? profile.email.trim() : ''
  if (profileEmail) return profileEmail

  const sellerEmail = typeof seller?.email === 'string' ? seller.email.trim() : ''
  if (sellerEmail) return sellerEmail

  return null
}

function normalizeDedupeKey(key) {
  if (key == null) return null
  const s = String(key).trim()
  if (!s) return null
  return s.length > DEDUPE_KEY_MAX ? s.slice(0, DEDUPE_KEY_MAX) : s
}

async function channelAllowed(supabaseAdmin, userId, type, channel) {
  try {
    return await shouldSendChannelForType(supabaseAdmin, userId, type, channel)
  } catch (prefErr) {
    apiLog(`user_notification.${channel}_pref_check_failed`, {
      err: errorMessage(prefErr),
      type,
    })
    return true
  }
}

async function maybeSendNotificationEmail(supabaseAdmin, p) {
  const userId = String(p.userId || '').trim()
  if (!userId) return

  const allowed = await channelAllowed(supabaseAdmin, userId, p.type, 'email')
  if (!allowed) {
    apiLog('user_notification.email_skipped_by_preference', { type: p.type })
    return
  }

  const metadata = p.metadata && typeof p.metadata === 'object' ? p.metadata : {}
  const actionUrl =
    notificationActionUrlFromMetadata(metadata) ||
    `${getAppBaseUrl()}${defaultNotificationInboxPath(metadata)}`
  const title = String(p.title || 'Notification').trim() || 'Notification'
  const body = String(p.body || '').trim()
  const text = body ? `${title}\n\n${body}` : title

  await sendEmailIfAllowed(supabaseAdmin, userId, p.type, async () => {
    const to = await resolveNotificationRecipientEmail(supabaseAdmin, userId)
    if (!to) {
      apiLog('user_notification.email_skipped', { reason: 'no_recipient', type: p.type })
      return { sent: false, reason: 'no_recipient' }
    }
    return sendNotificationEmail({
      to,
      subject: title,
      text,
      actionUrl,
      actionLabel: 'View notification',
    })
  })
}

/**
 * Insert one in-app notification. When dedupeKey is set, duplicate (user_id, dedupe_key) inserts are ignored (unique partial index).
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} supabaseAdmin
 * @param {{ userId: string, type: string, title: string, body?: string | null, metadata?: Record<string, unknown>, dedupeKey?: string | null }} p
 */
export async function notifyUser(supabaseAdmin, p) {
  const userId = String(p.userId || '').trim()
  if (!userId) return

  const pushAllowed = await channelAllowed(supabaseAdmin, userId, p.type, 'push')

  if (pushAllowed) {
    const dedupeKey = normalizeDedupeKey(p.dedupeKey)
    const row = {
      user_id: userId,
      type: p.type,
      title: p.title,
      body: p.body ?? null,
      metadata: p.metadata && typeof p.metadata === 'object' ? p.metadata : {},
      ...(dedupeKey ? { dedupe_key: dedupeKey } : {}),
    }

    const { error } = await supabaseAdmin.from('user_notifications').insert(row)
    if (error && error.code !== '23505') {
      apiLog('user_notification.insert_failed', { err: errorMessage(error), type: p.type })
    }
  } else {
    apiLog('user_notification.skipped_by_preference', { type: p.type, channel: 'push' })
  }

  await maybeSendNotificationEmail(supabaseAdmin, p)
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} supabaseAdmin
 * @param {string[]} userIds
 * @param {Omit<Parameters<typeof notifyUser>[1], 'userId'>} payload
 */
export async function notifyUsers(supabaseAdmin, userIds, payload) {
  const ids = [...new Set((userIds || []).map((id) => String(id || '').trim()).filter(Boolean))]
  await Promise.all(ids.map((userId) => notifyUser(supabaseAdmin, { ...payload, userId })))
}

/**
 * Fan-out to every row in public.admins (each admin's auth user id).
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} supabaseAdmin
 * @param {Omit<Parameters<typeof notifyUser>[1], 'userId'>} payload
 */
export async function notifyAllAdmins(supabaseAdmin, payload) {
  const { data: admins, error } = await supabaseAdmin.from('admins').select('id')
  if (error) {
    apiLog('user_notification.admins_list_failed', { err: errorMessage(error) })
    return
  }
  const ids = (admins ?? []).map((r) => r.id).filter(Boolean)
  const metadata =
    payload.metadata && typeof payload.metadata === 'object' ? payload.metadata : {}
  await notifyUsers(supabaseAdmin, ids, {
    ...payload,
    metadata: { audience: 'admin', ...metadata },
  })
}

/**
 * Fan-out to one seller auth user id (skips when the user is not in public.sellers).
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} supabaseAdmin
 * @param {string} sellerUserId
 * @param {Omit<Parameters<typeof notifyUser>[1], 'userId'>} payload
 */
export async function notifySeller(supabaseAdmin, sellerUserId, payload) {
  const userId = String(sellerUserId || '').trim()
  if (!userId) return

  const { data: sellerRow, error } = await supabaseAdmin
    .from('sellers')
    .select('user_id')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) {
    apiLog('user_notification.seller_lookup_failed', { err: errorMessage(error), type: payload.type })
    return
  }
  if (!sellerRow?.user_id) {
    apiLog('user_notification.seller_skipped', { type: payload.type })
    return
  }

  const metadata =
    payload.metadata && typeof payload.metadata === 'object' ? payload.metadata : {}
  await notifyUser(supabaseAdmin, {
    ...payload,
    userId,
    metadata: { audience: 'seller', ...metadata },
  })
}

/**
 * Back-compat wrapper used across API routes (delegates to notifyUser).
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} supabaseAdmin
 * @param {{ userId: string, type: string, title: string, body?: string | null, metadata?: Record<string, unknown>, dedupeKey?: string | null }} p
 */
export async function insertUserNotification(supabaseAdmin, p) {
  await notifyUser(supabaseAdmin, {
    userId: p.userId,
    type: p.type,
    title: p.title,
    body: p.body ?? null,
    metadata: p.metadata ?? {},
    dedupeKey: p.dedupeKey ?? null,
  })
}
