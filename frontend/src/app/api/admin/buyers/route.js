import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { requireAdminApiUser } from '@/lib/auth/requireAdminRoute'

/**
 * GET /api/admin/buyers
 *
 * Returns all buyer accounts with profile + status, joined with order counts.
 * Used by /admin/buyers list page.
 */
export async function GET() {
  const { responseError } = await requireAdminApiUser()
  if (responseError) return responseError

  const supabaseAdmin = getSupabaseAdmin()

  const { data: rows, error } = await supabaseAdmin
    .from('users')
    .select('id,email,role,status,created_at')
    .eq('role', 'buyer')
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json(
      { error: error.message ?? 'Failed to load buyers.' },
      { status: 500 },
    )
  }

  const ids = (rows ?? []).map((r) => r.id)

  const [profilesRes, ordersRes] = await Promise.all([
    ids.length
      ? supabaseAdmin
          .from('profiles')
          .select('id,full_name,avatar_url,phone')
          .in('id', ids)
      : Promise.resolve({ data: [] }),
    ids.length
      ? supabaseAdmin
          .from('orders')
          .select('buyer_id')
          .in('buyer_id', ids)
      : Promise.resolve({ data: [] }),
  ])

  const profileById = new Map((profilesRes.data ?? []).map((p) => [p.id, p]))
  const orderCountById = new Map()
  for (const o of ordersRes.data ?? []) {
    orderCountById.set(o.buyer_id, (orderCountById.get(o.buyer_id) ?? 0) + 1)
  }

  const buyers = (rows ?? []).map((r) => {
    const p = profileById.get(r.id)
    return {
      id: r.id,
      email: r.email,
      fullName: p?.full_name || r.email || 'Buyer',
      avatarUrl: p?.avatar_url || null,
      phone: p?.phone || null,
      status: r.status || 'active',
      createdAt: r.created_at,
      orderCount: orderCountById.get(r.id) ?? 0,
    }
  })

  return NextResponse.json({ buyers }, { status: 200 })
}

export const dynamic = 'force-dynamic'
