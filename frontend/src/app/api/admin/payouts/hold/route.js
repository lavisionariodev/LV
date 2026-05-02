import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { requireAdminApiUser } from '@/lib/auth/requireAdminRoute'

export async function POST(request) {
  const { responseError } = await requireAdminApiUser()
  if (responseError) return responseError

  const body = await request.json().catch(() => ({}))
  const orderId = String(body?.orderId ?? '').trim()
  const reason = String(body?.reason ?? '').trim()

  if (!orderId) {
    return NextResponse.json({ error: 'Missing orderId.' }, { status: 400 })
  }
  if (!reason) {
    return NextResponse.json({ error: 'Missing hold reason.' }, { status: 400 })
  }

  const supabaseAdmin = getSupabaseAdmin()

  const { data: escrow, error: escErr } = await supabaseAdmin
    .from('order_escrows')
    .select('id,status')
    .eq('order_id', orderId)
    .maybeSingle()

  if (escErr || !escrow) {
    return NextResponse.json({ error: escErr?.message ?? 'No escrow for this order.' }, { status: 404 })
  }

  if (escrow.status === 'released') {
    return NextResponse.json({ error: 'Cannot hold a released escrow.' }, { status: 409 })
  }

  if (escrow.status === 'on_hold') {
    return NextResponse.json({ ok: true, alreadyOnHold: true })
  }

  const { error: updErr } = await supabaseAdmin
    .from('order_escrows')
    .update({
      status: 'on_hold',
      hold_reason: reason,
    })
    .eq('order_id', orderId)
    .eq('status', 'escrowed')

  if (updErr) {
    return NextResponse.json({ error: updErr.message ?? 'Hold failed.' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
