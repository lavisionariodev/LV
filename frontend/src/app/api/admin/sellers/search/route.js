import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { requireAdminApiUser } from '@/lib/auth/requireAdminRoute'

function normalizeAvatarUrl(raw) {
  if (typeof raw !== 'string') return null
  const trimmed = raw.trim()
  return trimmed || null
}

/**
 * GET /api/admin/sellers/search?q=&limit=
 */
export async function GET(request) {
  const { responseError } = await requireAdminApiUser()
  if (responseError) return responseError

  const { searchParams } = new URL(request.url)
  const q = String(searchParams.get('q') || '').trim()
  const limitRaw = Number.parseInt(String(searchParams.get('limit') || '6'), 10)
  const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 25) : 6

  if (!q) {
    return NextResponse.json({ sellers: [] }, { status: 200 })
  }

  const like = `%${q}%`
  const supabaseAdmin = getSupabaseAdmin()
  const { data, error } = await supabaseAdmin
    .from('sellers')
    .select('user_id, business_name, contact_name, email, status, registered_at')
    .or(`business_name.ilike.${like},contact_name.ilike.${like},email.ilike.${like}`)
    .order('registered_at', { ascending: false })
    .limit(limit)

  if (error) {
    return NextResponse.json({ error: error.message ?? 'Failed to search sellers.' }, { status: 500 })
  }

  const rows = (data ?? []).filter(Boolean)
  const ids = [...new Set(rows.map((r) => r.user_id).filter(Boolean))]
  if (ids.length === 0) {
    return NextResponse.json({ sellers: rows.map((r) => ({ ...r, avatarUrl: null })) }, { status: 200 })
  }

  const { data: profiles } = await supabaseAdmin
    .from('profiles')
    .select('id, avatar_url')
    .in('id', ids)

  const avatarByUserId = new Map(
    (profiles ?? []).map((p) => [p.id, normalizeAvatarUrl(p.avatar_url)]),
  )

  const sellers = rows.map((r) => ({
    ...r,
    avatarUrl: avatarByUserId.get(r.user_id) ?? null,
  }))

  return NextResponse.json({ sellers }, { status: 200 })
}

export const dynamic = 'force-dynamic'
