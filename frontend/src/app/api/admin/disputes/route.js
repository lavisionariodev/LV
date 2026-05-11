import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { requireAdminApiUser } from '@/lib/auth/requireAdminRoute'

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
    .limit(500)

  if (error) {
    return NextResponse.json({ error: error.message ?? 'Failed to load disputes.' }, { status: 500 })
  }

  const list = rows ?? []
  const orderIds = [...new Set(list.map((r) => r.order_id).filter(Boolean))]
  const userIds = [...new Set([...list.map((r) => r.buyer_id), ...list.map((r) => r.seller_user_id)].filter(Boolean))]

  const { data: orders } =
    orderIds.length > 0
      ? await supabaseAdmin.from('orders').select('id,order_number,contact_name').in('id', orderIds)
      : { data: [] }

  const { data: profiles } =
    userIds.length > 0
      ? await supabaseAdmin.from('profiles').select('id,full_name,email').in('id', userIds)
      : { data: [] }

  const orderMap = Object.fromEntries((orders ?? []).map((o) => [o.id, o]))
  const profileMap = Object.fromEntries((profiles ?? []).map((p) => [p.id, p]))

  const mapped = list.map((d) => {
    const ord = orderMap[d.order_id]
    const buyer = profileMap[d.buyer_id]
    const seller = profileMap[d.seller_user_id]
    const orderRef = ord?.order_number || String(d.order_id).slice(0, 8)
    const complainantName = buyer?.full_name || buyer?.email || 'Buyer'
    const respondentName = seller?.full_name || seller?.email || 'Seller'
    return {
      id: d.id,
      orderRef,
      orderId: d.order_id,
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

  return NextResponse.json({ disputes: mapped }, { status: 200 })
}
