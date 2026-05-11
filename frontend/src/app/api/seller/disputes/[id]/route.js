import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

export async function PATCH(request, context) {
  const supabase = await createClient()
  const supabaseAdmin = getSupabaseAdmin()

  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser()

  if (userErr || !user) {
    return NextResponse.json({ error: 'You must be signed in to manage requests.' }, { status: 401 })
  }

  const params = await context.params
  const id = String(params?.id ?? '').trim()
  if (!id) {
    return NextResponse.json({ error: 'Missing request id.' }, { status: 400 })
  }

  const body = await request.json().catch(() => ({}))
  const status = String(body?.status ?? '').trim().toLowerCase()
  const sellerNote =
    body?.sellerNote != null ? String(body.sellerNote).trim().slice(0, 2000) : ''

  if (!['under_review', 'resolved'].includes(status)) {
    return NextResponse.json({ error: 'Invalid request action.' }, { status: 400 })
  }

  const { data: dispute, error: disputeErr } = await supabaseAdmin
    .from('disputes')
    .select('id,order_id,seller_user_id,status,resolution_notes')
    .eq('id', id)
    .maybeSingle()

  if (disputeErr || !dispute) {
    return NextResponse.json({ error: 'Request not found.' }, { status: 404 })
  }

  if (dispute.seller_user_id !== user.id) {
    return NextResponse.json({ error: 'You are not authorized to update this request.' }, { status: 403 })
  }

  if (!['open', 'under_review'].includes(String(dispute.status || ''))) {
    return NextResponse.json({ error: 'This request is already closed.' }, { status: 400 })
  }

  const existingNotes = String(dispute.resolution_notes || '').trim()
  const nextNotes = sellerNote
    ? [existingNotes, `Seller note: ${sellerNote}`].filter(Boolean).join('\n\n')
    : existingNotes || null

  const { error: updateErr } = await supabaseAdmin
    .from('disputes')
    .update({
      status,
      resolution_notes: nextNotes,
    })
    .eq('id', id)

  if (updateErr) {
    return NextResponse.json({ error: 'Unable to update this request.' }, { status: 500 })
  }

  if (status === 'resolved') {
    await supabaseAdmin
      .from('order_escrows')
      .update({
        status: 'escrowed',
        hold_reason: null,
      })
      .eq('order_id', dispute.order_id)
      .eq('status', 'on_hold')
      .like('hold_reason', 'Buyer request opened%')
  }

  return NextResponse.json({ ok: true }, { status: 200 })
}
