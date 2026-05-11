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

export async function GET(_request, context) {
  const { responseError } = await requireAdminApiUser()
  if (responseError) return responseError

  const params = await context.params
  const id = String(params?.id ?? '').trim()
  if (!id) {
    return NextResponse.json({ error: 'Missing id.' }, { status: 400 })
  }

  const supabaseAdmin = getSupabaseAdmin()

  const { data: d, error } = await supabaseAdmin
    .from('disputes')
    .select(
      'id,order_id,buyer_id,seller_user_id,reason,description,status,opened_at,updated_at,resolution_notes,attachment_paths',
    )
    .eq('id', id)
    .maybeSingle()

  if (error || !d) {
    return NextResponse.json({ error: 'Dispute not found.' }, { status: 404 })
  }

  const { data: ord } = await supabaseAdmin
    .from('orders')
    .select('id,order_number,contact_name,subtotal,payment_status,fulfillment_status')
    .eq('id', d.order_id)
    .maybeSingle()

  const { data: buyer } = await supabaseAdmin
    .from('profiles')
    .select('id,full_name,email')
    .eq('id', d.buyer_id)
    .maybeSingle()

  const { data: seller } = await supabaseAdmin
    .from('profiles')
    .select('id,full_name,email')
    .eq('id', d.seller_user_id)
    .maybeSingle()

  return NextResponse.json(
    {
      dispute: {
        id: d.id,
        orderId: d.order_id,
        orderRef: ord?.order_number || String(d.order_id).slice(0, 8),
        orderSubtotal: ord?.subtotal,
        orderPaymentStatus: ord?.payment_status,
        orderFulfillment: ord?.fulfillment_status,
        orderContactName: ord?.contact_name,
        complainantName: buyer?.full_name || buyer?.email || 'Buyer',
        complainantEmail: buyer?.email || '',
        respondentName: seller?.full_name || seller?.email || 'Seller',
        respondentEmail: seller?.email || '',
        reason: d.reason,
        description: d.description || '',
        status: d.status,
        openedAt: formatOpenedAt(d.opened_at),
        openedAtIso: d.opened_at,
        resolutionNotes: d.resolution_notes,
        attachmentPaths: d.attachment_paths ?? [],
      },
    },
    { status: 200 },
  )
}

export async function PATCH(request, context) {
  const { responseError } = await requireAdminApiUser()
  if (responseError) return responseError

  const params = await context.params
  const id = String(params?.id ?? '').trim()
  if (!id) {
    return NextResponse.json({ error: 'Missing id.' }, { status: 400 })
  }

  const body = await request.json().catch(() => ({}))
  const status = body?.status != null ? String(body.status).trim().toLowerCase() : ''
  const resolutionNotes =
    body?.resolutionNotes != null ? String(body.resolutionNotes).trim().slice(0, 8000) : undefined

  if (!['open', 'under_review', 'resolved', 'closed'].includes(status)) {
    return NextResponse.json({ error: 'Invalid status.' }, { status: 400 })
  }

  const patch = { status }
  if (resolutionNotes !== undefined) patch.resolution_notes = resolutionNotes || null

  const supabaseAdmin = getSupabaseAdmin()
  const { error } = await supabaseAdmin.from('disputes').update(patch).eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message ?? 'Update failed.' }, { status: 500 })
  }

  return NextResponse.json({ ok: true }, { status: 200 })
}
