import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { requireAdminApiUser } from '@/lib/auth/requireAdminRoute'
import { canReleaseEscrow } from '@/lib/payments/orderMoneyState'

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

  const [{ data: order }, { data: escrow }, { data: activeDispute }] = await Promise.all([
    supabaseAdmin
      .from('orders')
      .select('id,payment_status,status,refund_status,fulfillment_status')
      .eq('id', orderId)
      .maybeSingle(),
    supabaseAdmin.from('order_escrows').select('*').eq('order_id', orderId).maybeSingle(),
    supabaseAdmin
      .from('disputes')
      .select('id,status')
      .eq('order_id', orderId)
      .in('status', ['open', 'under_review'])
      .limit(1)
      .maybeSingle(),
  ])

  const gate = canReleaseEscrow({ order, escrow, activeDispute })
  if (!gate.ok) {
    if (gate.alreadyReleased) {
      return NextResponse.json({ ok: true, alreadyReleased: true })
    }
    return NextResponse.json({ error: gate.error }, { status: gate.status || 400 })
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
