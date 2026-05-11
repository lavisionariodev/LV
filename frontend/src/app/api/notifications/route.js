import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

function mapRow(row) {
  const meta = row.metadata && typeof row.metadata === 'object' ? row.metadata : {}
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    body: row.body,
    readAt: row.read_at,
    createdAt: row.created_at,
    metadata: meta,
  }
}

/**
 * GET — current user's in-app notifications (newest first).
 * PATCH — body `{ id }` marks one read, or `{ markAllRead: true }`.
 */
export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser()

  if (userErr || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('user_notifications')
    .select('id,type,title,body,read_at,created_at,metadata')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) {
    return NextResponse.json({ error: error.message ?? 'Failed to load notifications.' }, { status: 500 })
  }

  return NextResponse.json({ notifications: (data ?? []).map(mapRow) }, { status: 200 })
}

export async function PATCH(request) {
  const supabase = await createClient()
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser()

  if (userErr || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => ({}))
  const markAll = Boolean(body?.markAllRead)
  const id = body?.id != null ? String(body.id).trim() : ''

  const nowIso = new Date().toISOString()

  if (markAll) {
    const { error } = await supabase
      .from('user_notifications')
      .update({ read_at: nowIso })
      .eq('user_id', user.id)
      .is('read_at', null)

    if (error) {
      return NextResponse.json({ error: error.message ?? 'Update failed.' }, { status: 500 })
    }
    return NextResponse.json({ ok: true }, { status: 200 })
  }

  if (!id) {
    return NextResponse.json({ error: 'Missing id or markAllRead.' }, { status: 400 })
  }

  const { error } = await supabase
    .from('user_notifications')
    .update({ read_at: nowIso })
    .eq('user_id', user.id)
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message ?? 'Update failed.' }, { status: 500 })
  }

  return NextResponse.json({ ok: true }, { status: 200 })
}
