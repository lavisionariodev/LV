import { createHash } from 'crypto'
import { getClientIp } from '@/lib/rate-limit/memoryRateLimit'

/**
 * @param {string | null | undefined} accessToken
 * @returns {string | null}
 */
function getAccessTokenSessionId(accessToken) {
  if (!accessToken || typeof accessToken !== 'string') return null

  const parts = accessToken.split('.')
  if (parts.length < 2) return null

  try {
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=')
    const payload = JSON.parse(atob(padded))
    return typeof payload.session_id === 'string' && payload.session_id.trim()
      ? payload.session_id.trim()
      : null
  } catch {
    return null
  }
}

/**
 * @param {string | null | undefined} userAgent
 * @returns {string}
 */
function describeUserAgent(userAgent) {
  const ua = String(userAgent || '').trim()
  if (!ua) return 'Unknown browser'

  const isMobile = /Mobile|Android|iPhone|iPad|iPod/i.test(ua)
  const platform = /iPhone|iPad|iPod/i.test(ua)
    ? 'iOS'
    : /Android/i.test(ua)
      ? 'Android'
      : /Windows/i.test(ua)
        ? 'Windows'
        : /Mac OS X|Macintosh/i.test(ua)
          ? 'macOS'
          : /Linux/i.test(ua)
            ? 'Linux'
            : 'Unknown platform'

  const browser = /Edg\//i.test(ua)
    ? 'Edge'
    : /Chrome\//i.test(ua) && !/Edg\//i.test(ua)
      ? 'Chrome'
      : /Firefox\//i.test(ua)
        ? 'Firefox'
        : /Safari\//i.test(ua) && !/Chrome\//i.test(ua)
          ? 'Safari'
          : 'Browser'

  return isMobile ? `${browser} on ${platform} (mobile)` : `${browser} on ${platform}`
}

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
 * One stable key per user and client IP so repeat logins on the same device stay one row.
 * @param {string} userId
 * @param {string | null | undefined} clientIp
 * @returns {string}
 */
export function resolveSellerPortalDeviceKey(userId, clientIp) {
  const ip = String(clientIp || 'unknown').trim() || 'unknown'
  return createHash('sha256').update(`${userId}:${ip}`).digest('hex')
}

/**
 * @param {Request} request
 * @param {string} userId
 * @returns {string}
 */
export function resolveSellerPortalDeviceKeyFromRequest(request, userId) {
  return resolveSellerPortalDeviceKey(userId, getClientIp(request))
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} supabaseAdmin
 * @param {string} userId
 * @param {import('@supabase/supabase-js').Session} session
 * @param {string | null | undefined} userAgent
 * @param {string} clientIp
 */
export async function upsertSellerPortalSession(
  supabaseAdmin,
  userId,
  session,
  userAgent,
  clientIp,
) {
  const authSessionId = resolveAuthSessionId(session)
  if (!authSessionId) return null

  const deviceKey = resolveSellerPortalDeviceKey(userId, clientIp)
  const now = new Date().toISOString()
  const deviceLabel = describeUserAgent(userAgent)
  const { data, error } = await supabaseAdmin
    .from('seller_portal_sessions')
    .upsert(
      {
        user_id: userId,
        device_key: deviceKey,
        auth_session_id: authSessionId,
        device_label: deviceLabel,
        user_agent: userAgent || null,
        last_seen_at: now,
      },
      { onConflict: 'user_id,device_key' },
    )
    .select('id, device_key, auth_session_id, device_label, last_seen_at, created_at')
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
 * @param {string} currentDeviceKey
 */
export async function removeOtherSellerPortalSessions(supabaseAdmin, userId, currentDeviceKey) {
  const { error } = await supabaseAdmin
    .from('seller_portal_sessions')
    .delete()
    .eq('user_id', userId)
    .neq('device_key', currentDeviceKey)

  if (error) {
    console.error('[seller/sessions] delete others failed:', error)
    return error
  }

  return null
}
