import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { apiLog, errorMessage } from '@/lib/observability/apiLog'

/**
 * Seller responds to buyer pre-confirmation cancellation (refund pipeline).
 * Funds return to the buyer is modeled in stages (marketplace-style timeline in UI copy).
 */
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
  const decision = String(body?.decision ?? '').trim().toLowerCase()

  if (!orderId) return NextResponse.json({ error: 'Missing orderId.' }, { status: 400 })
  if (!['approve', 'decline', 'complete'].includes(decision)) {
    return NextResponse.json({ error: 'Invalid decision.' }, { status: 400 })
  }

  const { data: order, error: orderErr } = await supabaseAdmin
    .from('orders')
    .select('id,seller_user_id,fulfillment_status,payment_status,status,refund_status')
    .eq('id', orderId)
    .maybeSingle()

  if (orderErr || !order) {
    return NextResponse.json({ error: 'Order not found.' }, { status: 404 })
  }

  if (order.seller_user_id !== user.id) {
    return NextResponse.json({ error: 'Not allowed.' }, { status: 403 })
  }

  /** @type {Record<string, unknown>} */
  let patch = {}

  if (decision === 'decline') {
    if (order.refund_status !== 'requested' && order.refund_status !== 'processing') {
      return NextResponse.json({ error: 'No open refund request to decline.' }, { status: 400 })
    }
    // Restore paid booking so fulfilment can continue (buyer may contact support separately).
    patch = {
      refund_status: 'declined',
      fulfillment_status: 'pending',
      payment_status: 'paid',
      status: 'paid',
    }
  } else if (decision === 'approve') {
    if (order.refund_status !== 'requested') {
      return NextResponse.json({ error: 'Refund is not awaiting approval.' }, { status: 400 })
    }
    patch = { refund_status: 'processing' }
  } else {
    // complete — after PayMongo/manual refund is finalized
    if (order.refund_status !== 'processing') {
      return NextResponse.json({ error: 'Refund is not in processing state.' }, { status: 400 })
    }
    patch = {
      refund_status: 'completed',
      payment_status: 'refunded',
      status: 'cancelled',
    }
  }

  const { error: updErr } = await supabaseAdmin.from('orders').update(patch).eq('id', orderId)

  if (updErr) {
    apiLog('seller.refund.update_failed', { err: errorMessage(updErr) })
    return NextResponse.json({ error: 'Failed to update refund status.' }, { status: 500 })
  }

  if (decision === 'decline') {
    await supabaseAdmin
      .from('order_escrows')
      .update({ status: 'escrowed', hold_reason: null })
      .eq('order_id', orderId)
  }

  if (decision === 'approve') {
    await supabaseAdmin
      .from('order_escrows')
      .update({
        status: 'on_hold',
        hold_reason:
          'Buyer cancelled before provider confirmation; refund approved. Process return to buyer (typically 5–15 business days).',
      })
      .eq('order_id', orderId)
  }

  if (decision === 'complete') {
    await supabaseAdmin
      .from('order_escrows')
      .update({
        status: 'on_hold',
        hold_reason: 'Refund completed to buyer; do not release payout for this order.',
      })
      .eq('order_id', orderId)
  }

  apiLog('seller.refund.ok', { decision })

  return NextResponse.json({ ok: true }, { status: 200 })
}
