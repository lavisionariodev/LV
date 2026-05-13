import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

function normalizePriority(value) {
  const p = String(value || '').trim().toLowerCase()
  if (p === 'high' || p === 'urgent' || p === 'critical') return 'high'
  if (p === 'medium' || p === 'normal') return 'medium'
  return 'low'
}

function mapRow(row) {
  const meta = row.metadata && typeof row.metadata === 'object' ? row.metadata : {}
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    body: row.body,
    readAt: row.read_at,
    resolvedAt: row.resolved_at,
    createdAt: row.created_at,
    priority: normalizePriority(meta.priority),
    metadata: meta,
  }
}

function parseLimit(searchParams) {
  const raw = searchParams.get('limit')
  const n = raw != null ? parseInt(String(raw), 10) : 100
  if (!Number.isFinite(n)) return 100
  return Math.min(100, Math.max(1, n))
}

/**
 * GET — current user's in-app notifications (newest first). Query: `limit` (1–100, default 100).
 * PATCH — body `{ id }` marks one read, `{ resolve: true, id }` resolves one,
 * `{ markAllRead: true }` marks all read, or `{ markAllResolved: true }` resolves all.
 * DELETE — query `?id=<uuid>` deletes one row, or JSON body `{ clearAll: true }` deletes all for the user.
 */
export async function GET(request) {
  const supabase = await createClient()
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser()

  if (userErr || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const limit = parseLimit(new URL(request.url).searchParams)

  const { data, error } = await supabase
    .from('user_notifications')
    .select('id,type,title,body,read_at,resolved_at,created_at,metadata')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(limit)

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
  const markAllResolved = Boolean(body?.markAllResolved)
  const resolve = Boolean(body?.resolve)
  const id = body?.id != null ? String(body.id).trim() : ''
  const resolutionNote =
    body?.resolutionNote != null ? String(body.resolutionNote).trim().slice(0, 2000) : ''

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

  if (markAllResolved) {
    const { error } = await supabase
      .from('user_notifications')
      .update({ read_at: nowIso, resolved_at: nowIso })
      .eq('user_id', user.id)
      .is('resolved_at', null)

    if (error) {
      return NextResponse.json({ error: error.message ?? 'Update failed.' }, { status: 500 })
    }
    return NextResponse.json({ ok: true }, { status: 200 })
  }

  if (!id) {
    return NextResponse.json({ error: 'Missing id or bulk action.' }, { status: 400 })
  }

  let patch = resolve ? { read_at: nowIso, resolved_at: nowIso } : { read_at: nowIso }
  if (resolve && resolutionNote) {
    const { data: row, error: findErr } = await supabase
      .from('user_notifications')
      .select('metadata')
      .eq('user_id', user.id)
      .eq('id', id)
      .maybeSingle()
    if (findErr) {
      return NextResponse.json({ error: findErr.message ?? 'Update failed.' }, { status: 500 })
    }
    const meta = row?.metadata && typeof row.metadata === 'object' ? row.metadata : {}
    patch = {
      ...patch,
      metadata: {
        ...meta,
        resolutionNote,
        resolutionNoteAt: nowIso,
      },
    }
  }
  const { error } = await supabase
    .from('user_notifications')
    .update(patch)
    .eq('user_id', user.id)
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message ?? 'Update failed.' }, { status: 500 })
  }

  return NextResponse.json({ ok: true }, { status: 200 })
}

export async function DELETE(request) {
  const supabase = await createClient()
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser()

  if (userErr || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const url = new URL(request.url)
  let id = url.searchParams.get('id')?.trim() || ''
  let clearAll = url.searchParams.get('clearAll') === '1' || url.searchParams.get('clearAll') === 'true'
  let clearResolved = url.searchParams.get('clearResolved') === '1' || url.searchParams.get('clearResolved') === 'true'

  const body = await request.json().catch(() => ({}))
  if (!id && body?.id != null) id = String(body.id).trim()
  if (!clearAll) clearAll = Boolean(body?.clearAll)
  if (!clearResolved) clearResolved = Boolean(body?.clearResolved)

  if (clearAll) {
    const { error } = await supabase.from('user_notifications').delete().eq('user_id', user.id)
    if (error) {
      return NextResponse.json({ error: error.message ?? 'Delete failed.' }, { status: 500 })
    }
    return NextResponse.json({ ok: true }, { status: 200 })
  }

  if (clearResolved) {
    const { error } = await supabase
      .from('user_notifications')
      .delete()
      .eq('user_id', user.id)
      .not('resolved_at', 'is', null)
    if (error) {
      return NextResponse.json({ error: error.message ?? 'Delete failed.' }, { status: 500 })
    }
    return NextResponse.json({ ok: true }, { status: 200 })
  }

  if (!id) {
    return NextResponse.json({ error: 'Missing id or clear action.' }, { status: 400 })
  }

  const { error } = await supabase.from('user_notifications').delete().eq('user_id', user.id).eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message ?? 'Delete failed.' }, { status: 500 })
  }

  return NextResponse.json({ ok: true }, { status: 200 })
}
