import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { requireAdminApiUser } from '@/lib/auth/requireAdminRoute'

export async function POST(request) {
  const { responseError } = await requireAdminApiUser()
  if (responseError) return responseError

  const body = await request.json().catch(() => ({}))
  const orderId = String(body?.orderId ?? '').trim()

  if (!orderId) {
    return NextResponse.json({ error: 'Missing orderId.' }, { status: 400 })
  }

  const supabaseAdmin = getSupabaseAdmin()

  const { error: updErr } = await supabaseAdmin
    .from('order_escrows')
    .update({
      status: 'escrowed',
      hold_reason: null,
    })
    .eq('order_id', orderId)
    .eq('status', 'on_hold')

  if (updErr) {
    return NextResponse.json({ error: updErr.message ?? 'Unhold failed.' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
