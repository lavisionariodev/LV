import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { notifyUser } from '@/lib/notifications/inAppServer'

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
    .select('id,buyer_id,seller_user_id,fulfillment_status,payment_status,status,order_number')
    .eq('id', orderId)
    .maybeSingle()

  if (orderErr || !order) {
    return NextResponse.json({ error: 'Order not found.' }, { status: 404 })
  }

  if (order.seller_user_id !== user.id) {
    return NextResponse.json({ error: 'Not allowed.' }, { status: 403 })
  }

  const paid = order.payment_status === 'paid' || order.status === 'paid'

  if (fulfillmentStatus === 'confirmed' && !paid) {
    return NextResponse.json(
      { error: 'Order must be paid before it can be confirmed.' },
      { status: 400 },
    )
  }
  if (fulfillmentStatus === 'completed' && !paid) {
    return NextResponse.json(
      { error: 'Order must be paid before it can be marked as completed.' },
      { status: 400 },
    )
  }

  if (fulfillmentStatus === 'cancelled' && paid) {
    return NextResponse.json(
      { error: 'Paid orders cannot be cancelled here. Handle refunds separately.' },
      { status: 400 },
    )
  }

  const { error: updErr } = await supabaseAdmin
    .from('orders')
    .update({ fulfillment_status: fulfillmentStatus })
    .eq('id', orderId)

  if (updErr) {
    return NextResponse.json({ error: 'Failed to update status.' }, { status: 500 })
  }

  if (order.buyer_id && ['confirmed', 'in_progress', 'completed'].includes(fulfillmentStatus)) {
    const ref = order.order_number || String(orderId).slice(0, 8)
    if (fulfillmentStatus === 'in_progress') {
      await notifyUser(supabaseAdmin, {
        userId: order.buyer_id,
        type: 'service_inprogress',
        title: 'Service in progress',
        body: `Your provider has started work on booking ${ref}.`,
        metadata: { orderId },
        dedupeKey: `order_inprogress:${orderId}`,
      })
    } else if (fulfillmentStatus === 'completed') {
      await notifyUser(supabaseAdmin, {
        userId: order.buyer_id,
        type: 'service_completed',
        title: 'Service completed',
        body: `Your provider marked booking ${ref} as completed. Thank you for using our platform.`,
        metadata: { orderId },
        dedupeKey: `order_completed:${orderId}`,
      })
    } else if (fulfillmentStatus === 'confirmed') {
      await notifyUser(supabaseAdmin, {
        userId: order.buyer_id,
        type: 'service_confirmed',
        title: 'Booking confirmed',
        body: `Your booking ${ref} is confirmed.`,
        metadata: { orderId },
        dedupeKey: `order_confirmed:${orderId}`,
      })
    }
  }

  return NextResponse.json({ ok: true }, { status: 200 })
}

