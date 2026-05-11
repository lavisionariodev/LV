import { apiLog, errorMessage } from '@/lib/observability/apiLog'

const DEDUPE_KEY_MAX = 200

function normalizeDedupeKey(key) {
  if (key == null) return null
  const s = String(key).trim()
  if (!s) return null
  return s.length > DEDUPE_KEY_MAX ? s.slice(0, DEDUPE_KEY_MAX) : s
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
  if (!error) return

  if (error.code === '23505') {
    return
  }
  apiLog('user_notification.insert_failed', { err: errorMessage(error), type: p.type })
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
  await notifyUsers(supabaseAdmin, ids, payload)
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
