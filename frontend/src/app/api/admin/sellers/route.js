import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { requireAdminApiUser } from '@/lib/auth/requireAdminRoute'

function normalizeAvatarUrl(raw) {
  if (typeof raw !== 'string') return null
  const trimmed = raw.trim()
  return trimmed || null
}

/**
 * GET /api/admin/sellers
 *
 * Admin seller directory with profile avatars and listing counts.
 */
export async function GET() {
  const { responseError } = await requireAdminApiUser()
  if (responseError) return responseError

  const supabaseAdmin = getSupabaseAdmin()
  const { data, error } = await supabaseAdmin
    .from('sellers')
    .select('*')
    .order('registered_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message ?? 'Failed to load sellers.' }, { status: 500 })
  }

  const rows = (data ?? []).filter(Boolean)
  const ids = [...new Set(rows.map((r) => r.user_id).filter(Boolean))]
  if (ids.length === 0) {
    return NextResponse.json({ sellers: rows.map((r) => ({ ...r, avatarUrl: null, listing_count: 0 })) })
  }

  const listingCountBySeller = new Map()
  for (const id of ids) listingCountBySeller.set(id, 0)

  const [{ data: listingRows }, { data: profiles }] = await Promise.all([
    supabaseAdmin.from('seller_listings').select('seller_user_id').in('seller_user_id', ids),
    supabaseAdmin.from('profiles').select('id, avatar_url').in('id', ids),
  ])

  for (const row of listingRows ?? []) {
    const sid = row.seller_user_id
    if (!sid) continue
    listingCountBySeller.set(sid, (listingCountBySeller.get(sid) ?? 0) + 1)
  }

  const avatarByUserId = new Map(
    (profiles ?? []).map((p) => [p.id, normalizeAvatarUrl(p.avatar_url)]),
  )

  const sellers = rows.map((r) => ({
    ...r,
    avatarUrl: avatarByUserId.get(r.user_id) ?? null,
    listing_count: listingCountBySeller.get(r.user_id) ?? 0,
  }))

  return NextResponse.json({ sellers }, { status: 200 })
}

export const dynamic = 'force-dynamic'
