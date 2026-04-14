import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

const ALLOWED = new Set(['pending', 'confirmed', 'in_progress', 'completed', 'cancelled'])

export async function POST(request) {
  const supabase = await createClient()
  const supabaseAdmin = getSupabaseAdmin()

  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser()

  if (userErr || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => ({}))
  const orderId = String(body?.orderId ?? '').trim()
  const fulfillmentStatus = String(body?.fulfillment_status ?? '').trim()

  if (!orderId) return NextResponse.json({ error: 'Missing orderId.' }, { status: 400 })
  if (!ALLOWED.has(fulfillmentStatus)) {
    return NextResponse.json({ error: 'Invalid fulfillment status.' }, { status: 400 })
  }

  const { data: order, error: orderErr } = await supabaseAdmin
    .from('orders')
    .select('id,seller_user_id,fulfillment_status')
    .eq('id', orderId)
    .maybeSingle()

  if (orderErr || !order) {
    return NextResponse.json({ error: 'Order not found.' }, { status: 404 })
  }

  if (order.seller_user_id !== user.id) {
    return NextResponse.json({ error: 'Not allowed.' }, { status: 403 })
  }

  const { error: updErr } = await supabaseAdmin
    .from('orders')
    .update({ fulfillment_status: fulfillmentStatus })
    .eq('id', orderId)

  if (updErr) {
    return NextResponse.json({ error: 'Failed to update status.' }, { status: 500 })
  }

  return NextResponse.json({ ok: true }, { status: 200 })
}

