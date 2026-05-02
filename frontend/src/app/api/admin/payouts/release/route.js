import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { requireAdminApiUser } from '@/lib/auth/requireAdminRoute'

export async function POST(request) {
  const { user, responseError } = await requireAdminApiUser()
  if (responseError || !user) return responseError

  const body = await request.json().catch(() => ({}))
  const orderId = String(body?.orderId ?? '').trim()
  const releaseReference = body?.releaseReference != null ? String(body.releaseReference).trim() : ''

  if (!orderId) {
    return NextResponse.json({ error: 'Missing orderId.' }, { status: 400 })
  }

  const supabaseAdmin = getSupabaseAdmin()

  const [{ data: order }, { data: escrow }] = await Promise.all([
    supabaseAdmin
      .from('orders')
      .select('id,payment_status,fulfillment_status')
      .eq('id', orderId)
      .maybeSingle(),
    supabaseAdmin.from('order_escrows').select('*').eq('order_id', orderId).maybeSingle(),
  ])

  if (!order) {
    return NextResponse.json({ error: 'Order not found.' }, { status: 404 })
  }

  if (!escrow) {
    return NextResponse.json({ error: 'No escrow record for this order.' }, { status: 409 })
  }

  if (escrow.status === 'released') {
    return NextResponse.json({ ok: true, alreadyReleased: true })
  }

  if (escrow.status === 'on_hold') {
    return NextResponse.json(
      { error: 'Escrow is on hold. Remove hold before releasing.' },
      { status: 409 },
    )
  }

  if (order.payment_status !== 'paid') {
    return NextResponse.json({ error: 'Order is not paid.' }, { status: 400 })
  }

  if (order.fulfillment_status !== 'completed') {
    return NextResponse.json({ error: 'Order service is not completed.' }, { status: 400 })
  }

  const { data: updated, error: updErr } = await supabaseAdmin
    .from('order_escrows')
    .update({
      status: 'released',
      released_at: new Date().toISOString(),
      released_by: user.id,
      release_reference: releaseReference || null,
    })
    .eq('order_id', orderId)
    .eq('status', 'escrowed')
    .select('id')
    .maybeSingle()

  if (updErr) {
    return NextResponse.json({ error: updErr.message ?? 'Release failed.' }, { status: 500 })
  }

  if (!updated) {
    const { data: again } = await supabaseAdmin
      .from('order_escrows')
      .select('status')
      .eq('order_id', orderId)
      .maybeSingle()
    if (again?.status === 'released') {
      return NextResponse.json({ ok: true, alreadyReleased: true })
    }
    return NextResponse.json({ error: 'Could not release escrow (state changed).' }, { status: 409 })
  }

  return NextResponse.json({ ok: true })
}
