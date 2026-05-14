import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireActiveSellerApiUser } from '@/lib/auth/requireApiUser'
import {
  removeOtherSellerPortalSessions,
  resolveAuthSessionId,
  upsertSellerPortalSession,
} from '@/lib/auth/sellerPortalSessionsServer'

async function loadSellerSessionContext() {
  const { user, supabaseAdmin, responseError } = await requireActiveSellerApiUser()
  if (responseError) {
    return { responseError, user: null, supabase: null, supabaseAdmin: null, session: null }
  }

  const supabase = await createClient()
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession()

  if (sessionError || !session) {
    return {
      responseError: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
      user: null,
      supabase: null,
      supabaseAdmin: null,
      session: null,
    }
  }

  return { responseError: null, user, supabase, supabaseAdmin, session }
}

export async function GET(request) {
  const { responseError, user, supabaseAdmin, session } = await loadSellerSessionContext()
  if (responseError) return responseError

  const currentSessionId = resolveAuthSessionId(session)
  const userAgent = request.headers.get('user-agent')

  if (currentSessionId) {
    await upsertSellerPortalSession(supabaseAdmin, user.id, session, userAgent)
  }

  const { data, error } = await supabaseAdmin
    .from('seller_portal_sessions')
    .select('id, auth_session_id, device_label, last_seen_at, created_at')
    .eq('user_id', user.id)
    .order('last_seen_at', { ascending: false })

  if (error) {
    console.error('[seller/sessions] list failed:', error)
    return NextResponse.json({ error: 'Could not load signed-in browsers.' }, { status: 500 })
  }

  return NextResponse.json({
    currentSessionId,
    sessions: (data || []).map((row) => ({
      id: row.id,
      authSessionId: row.auth_session_id,
      deviceLabel: row.device_label,
      lastSeenAt: row.last_seen_at,
      createdAt: row.created_at,
      isCurrent: Boolean(currentSessionId && row.auth_session_id === currentSessionId),
    })),
  })
}

export async function POST(request) {
  const { responseError, user, supabaseAdmin, session } = await loadSellerSessionContext()
  if (responseError) return responseError

  const userAgent = request.headers.get('user-agent')
  const row = await upsertSellerPortalSession(supabaseAdmin, user.id, session, userAgent)
  if (!row) {
    return NextResponse.json({ error: 'Could not update this browser session.' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
