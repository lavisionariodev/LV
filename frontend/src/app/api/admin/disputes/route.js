import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { requireAdminApiUser } from '@/lib/auth/requireAdminRoute'

const MAX_ROWS = 500

function formatOpenedAt(iso) {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' })
  } catch {
    return String(iso)
  }
}

/**
 * Admin disputes list (Supabase-backed).
 */
export async function GET() {
  const { responseError } = await requireAdminApiUser()
  if (responseError) return responseError

  const supabaseAdmin = getSupabaseAdmin()

  const { data: rows, error } = await supabaseAdmin
    .from('disputes')
    .select(
      'id,order_id,buyer_id,seller_user_id,reason,description,status,opened_at,updated_at,resolution_notes,attachment_paths',
    )
    .order('opened_at', { ascending: false })
    .limit(MAX_ROWS + 1)

  if (error) {
    return NextResponse.json({ error: error.message ?? 'Failed to load disputes.' }, { status: 500 })
  }

  const fetched = rows ?? []
  const truncated = fetched.length > MAX_ROWS
  const list = truncated ? fetched.slice(0, MAX_ROWS) : fetched
  const orderIds = [...new Set(list.map((r) => r.order_id).filter(Boolean))]
  const userIds = [...new Set([...list.map((r) => r.buyer_id), ...list.map((r) => r.seller_user_id)].filter(Boolean))]
  const sellerUserIds = [...new Set(list.map((r) => r.seller_user_id).filter(Boolean))]

  const { data: orders } =
    orderIds.length > 0
      ? await supabaseAdmin.from('orders').select('id,order_number,contact_name').in('id', orderIds)
      : { data: [] }

  const [{ data: profiles }, { data: sellerRows }] = await Promise.all([
    userIds.length
      ? supabaseAdmin.from('profiles').select('id,full_name,email').in('id', userIds)
      : Promise.resolve({ data: [] }),
    sellerUserIds.length
      ? supabaseAdmin.from('sellers').select('user_id,business_name,email').in('user_id', sellerUserIds)
      : Promise.resolve({ data: [] }),
  ])

  const orderMap = Object.fromEntries((orders ?? []).map((o) => [o.id, o]))
  const profileMap = Object.fromEntries((profiles ?? []).map((p) => [p.id, p]))
  const sellerShopByUserId = Object.fromEntries(
    (sellerRows ?? []).map((s) => [s.user_id, s]),
  )

  const mapped = list.map((d) => {
    const ord = orderMap[d.order_id]
    const buyer = profileMap[d.buyer_id]
    const sellerPerson = profileMap[d.seller_user_id]
    const shop = sellerShopByUserId[d.seller_user_id]
    const shopName = String(shop?.business_name || '').trim()
    const shopEmail = String(shop?.email || '').trim()
    const orderRef = ord?.order_number || String(d.order_id).slice(0, 8)
    const complainantName = buyer?.full_name || buyer?.email || 'Buyer'
    const respondentName =
      shopName ||
      shopEmail ||
      sellerPerson?.full_name ||
      sellerPerson?.email ||
      'Seller'
    return {
      id: d.id,
      orderRef,
      orderId: d.order_id,
      buyerId: d.buyer_id,
      sellerUserId: d.seller_user_id,
      complainantName,
      respondentName,
      reason: d.reason,
      description: d.description || '',
      status: d.status,
      openedAt: formatOpenedAt(d.opened_at),
      openedAtIso: d.opened_at,
      resolutionNotes: d.resolution_notes,
      attachmentPaths: d.attachment_paths ?? [],
    }
  })

  return NextResponse.json({ disputes: mapped, truncated, maxRows: MAX_ROWS }, { status: 200 })
}
