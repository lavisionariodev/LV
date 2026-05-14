import { createHash } from 'crypto'
import { getAccessTokenSessionId } from '@/lib/auth/accessToken'
import { describeUserAgent } from '@/lib/auth/describeUserAgent'

/**
 * @param {import('@supabase/supabase-js').Session | null | undefined} session
 * @returns {string | null}
 */
export function resolveAuthSessionId(session) {
  if (!session) return null

  const fromJwt = getAccessTokenSessionId(session.access_token)
  if (fromJwt) return fromJwt

  if (typeof session.refresh_token === 'string' && session.refresh_token.trim()) {
    return createHash('sha256').update(session.refresh_token.trim()).digest('hex')
  }

  return null
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} supabaseAdmin
 * @param {string} userId
 * @param {import('@supabase/supabase-js').Session} session
 * @param {string | null | undefined} userAgent
 */
export async function upsertSellerPortalSession(supabaseAdmin, userId, session, userAgent) {
  const authSessionId = resolveAuthSessionId(session)
  if (!authSessionId) return null

  const now = new Date().toISOString()
  const deviceLabel = describeUserAgent(userAgent)
  const { data, error } = await supabaseAdmin
    .from('seller_portal_sessions')
    .upsert(
      {
        user_id: userId,
        auth_session_id: authSessionId,
        device_label: deviceLabel,
        user_agent: userAgent || null,
        last_seen_at: now,
      },
      { onConflict: 'user_id,auth_session_id' },
    )
    .select('id, auth_session_id, device_label, last_seen_at, created_at')
    .single()

  if (error) {
    console.error('[seller/sessions] upsert failed:', error)
    return null
  }

  return data
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} supabaseAdmin
 * @param {string} userId
 * @param {string} currentAuthSessionId
 */
export async function removeOtherSellerPortalSessions(supabaseAdmin, userId, currentAuthSessionId) {
  const { error } = await supabaseAdmin
    .from('seller_portal_sessions')
    .delete()
    .eq('user_id', userId)
    .neq('auth_session_id', currentAuthSessionId)

  if (error) {
    console.error('[seller/sessions] delete others failed:', error)
    return error
  }

  return null
}
