import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { requireAdminApiUser } from '@/lib/auth/requireAdminRoute'

const MAX_EVENTS = 100

export async function GET(_request, context) {
  const { responseError } = await requireAdminApiUser()
  if (responseError) return responseError

  const params = await context.params
  const disputeId = String(params?.id ?? '').trim()
  if (!disputeId) {
    return NextResponse.json({ error: 'Missing id.' }, { status: 400 })
  }

  const supabaseAdmin = getSupabaseAdmin()

  const { data: rows, error } = await supabaseAdmin
    .from('dispute_events')
    .select('id,dispute_id,actor_user_id,actor_role,event_type,from_status,to_status,note,created_at')
    .eq('dispute_id', disputeId)
    .order('created_at', { ascending: false })
    .limit(MAX_EVENTS)

  if (error) {
    return NextResponse.json(
      { error: error.message ?? 'Failed to load dispute events.' },
      { status: 500 },
    )
  }

  const actorIds = [...new Set((rows ?? []).map((r) => r.actor_user_id).filter(Boolean))]
  let actorMap = new Map()
  if (actorIds.length > 0) {
    const { data: profiles } = await supabaseAdmin
      .from('profiles')
      .select('id,full_name,email,avatar_url')
      .in('id', actorIds)
    actorMap = new Map((profiles ?? []).map((p) => [p.id, p]))
  }

  const events = (rows ?? []).map((r) => {
    const profile = actorMap.get(r.actor_user_id)
    return {
      id: r.id,
      disputeId: r.dispute_id,
      actorRole: r.actor_role,
      actorUserId: r.actor_user_id,
      actorName: profile?.full_name || profile?.email || null,
      actorEmail: profile?.email || null,
      actorAvatarUrl: profile?.avatar_url || null,
      eventType: r.event_type,
      fromStatus: r.from_status,
      toStatus: r.to_status,
      note: r.note,
      createdAt: r.created_at,
    }
  })

  return NextResponse.json({ events }, { status: 200 })
}

export const dynamic = 'force-dynamic'
