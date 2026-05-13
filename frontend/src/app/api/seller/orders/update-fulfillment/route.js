import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { notifyUser } from '@/lib/notifications/inAppServer'

const ALLOWED = new Set(['pending', 'confirmed', 'in_progress', 'completed', 'cancelled'])

const LEGAL_TRANSITIONS = {
  pending: new Set(['confirmed', 'cancelled']),
  confirmed: new Set(['in_progress', 'cancelled']),
  in_progress: new Set(['completed', 'cancelled']),
  completed: new Set([]),
  cancelled: new Set([]),
}

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
    .select('id,buyer_id,seller_user_id,fulfillment_status,payment_status,status,refund_status,order_number')
    .eq('id', orderId)
    .maybeSingle()

  if (orderErr || !order) {
    return NextResponse.json({ error: 'Order not found.' }, { status: 404 })
  }

  if (order.seller_user_id !== user.id) {
    return NextResponse.json({ error: 'Not allowed.' }, { status: 403 })
  }

  const paid = order.payment_status === 'paid' || order.status === 'paid'
  const currentStatus = String(order.fulfillment_status || 'pending').toLowerCase()
  const refundStatus = String(order.refund_status || '').toLowerCase()

  if (currentStatus === fulfillmentStatus) {
    return NextResponse.json({ ok: true }, { status: 200 })
  }

  if (refundStatus === 'requested' || refundStatus === 'processing' || order.payment_status === 'refund_pending') {
    return NextResponse.json(
      { error: 'This order has an active refund flow and cannot be advanced.' },
      { status: 400 },
    )
  }

  const legalNext = LEGAL_TRANSITIONS[currentStatus] || new Set()
  if (!legalNext.has(fulfillmentStatus)) {
    return NextResponse.json(
      { error: `Cannot change order status from ${currentStatus.replace('_', ' ')} to ${fulfillmentStatus.replace('_', ' ')}.` },
      { status: 400 },
    )
  }

  if (['confirmed', 'in_progress', 'completed'].includes(fulfillmentStatus) && !paid) {
    return NextResponse.json(
      { error: 'Order must be paid before fulfillment can advance.' },
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

