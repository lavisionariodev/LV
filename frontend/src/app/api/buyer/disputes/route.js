import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { requireActiveBuyerApiUser } from '@/lib/auth/requireApiUser'
import { apiLog, errorMessage } from '@/lib/observability/apiLog'
import { notifyUser, notifyAllAdmins, notifySeller } from '@/lib/notifications/inAppServer'

export async function GET(request) {
  const { user, responseError } = await requireActiveBuyerApiUser()
  if (responseError) return responseError

  const supabaseAdmin = getSupabaseAdmin()

  const { searchParams } = new URL(request.url)
  const orderId = String(searchParams.get('orderId') ?? '').trim()

  let query = supabaseAdmin
    .from('disputes')
    .select('id,order_id,reason,description,status,opened_at,updated_at,resolution_notes')
    .eq('buyer_id', user.id)
    .order('opened_at', { ascending: false })

  if (orderId) {
    query = query.eq('order_id', orderId)
  }

  const { data, error } = await query.limit(orderId ? 5 : 100)

  if (error) {
    return NextResponse.json({ error: error.message || 'Failed to load requests.' }, { status: 500 })
  }

  return NextResponse.json({
    disputes: (data ?? []).map((row) => ({
      id: row.id,
      orderId: row.order_id,
      reason: row.reason,
      description: row.description || '',
      status: row.status,
      openedAt: row.opened_at,
      updatedAt: row.updated_at,
      resolutionNotes: row.resolution_notes || '',
    })),
  })
}

/**
 * Buyer opens a dispute when self-serve cancel is not available (e.g. provider already confirmed).
 */
export async function POST(request) {
  const { user, responseError } = await requireActiveBuyerApiUser()
  if (responseError) return responseError

  const supabaseAdmin = getSupabaseAdmin()

  const body = await request.json().catch(() => ({}))
  const orderId = String(body?.orderId ?? '').trim()
  const reason = String(body?.reason ?? '').trim().slice(0, 200)
  const description = body?.description != null ? String(body.description).trim().slice(0, 8000) : ''
  const attachmentPaths = Array.isArray(body?.attachmentPaths)
    ? body.attachmentPaths.map((x) => String(x).trim()).filter(Boolean).slice(0, 10)
    : []

  if (!orderId) {
    return NextResponse.json(
      { error: 'Purchase not found. Please refresh the page and try again.' },
      { status: 400 },
    )
  }
  if (!reason) {
    return NextResponse.json({ error: 'Please select a reason.' }, { status: 400 })
  }

  const { data: order, error: orderErr } = await supabaseAdmin
    .from('orders')
    .select('id,buyer_id,seller_user_id,fulfillment_status,payment_status,status,refund_status')
    .eq('id', orderId)
    .maybeSingle()

  if (orderErr || !order) {
    return NextResponse.json({ error: 'Purchase not found.' }, { status: 404 })
  }

  if (order.buyer_id !== user.id) {
    return NextResponse.json(
      { error: 'You are not authorized to submit a request for this purchase.' },
      { status: 403 },
    )
  }

  const fulfillment = order.fulfillment_status || 'pending'
  const paid = order.payment_status === 'paid' || order.status === 'paid'

  const allowedDispute =
    paid &&
    fulfillment !== 'cancelled' &&
    (['confirmed', 'in_progress', 'completed'].includes(fulfillment) ||
      String(order.refund_status || '') === 'declined')

  if (!allowedDispute) {
    return NextResponse.json(
      {
        error:
          'A request can only be submitted for paid bookings that have been confirmed, are in progress or completed, or had a refund request declined. For pending bookings, please use Cancel purchase.',
      },
      { status: 400 },
    )
  }

  const { data: existing } = await supabaseAdmin
    .from('disputes')
    .select('id')
    .eq('order_id', orderId)
    .in('status', ['open', 'under_review'])
    .limit(1)

  if (existing?.length) {
    return NextResponse.json(
      { error: 'An open request already exists for this purchase.' },
      { status: 409 },
    )
  }

  const { data: inserted, error: insErr } = await supabaseAdmin
    .from('disputes')
    .insert({
      order_id: orderId,
      buyer_id: user.id,
      seller_user_id: order.seller_user_id,
      reason,
      description: description || null,
      attachment_paths: attachmentPaths,
      status: 'open',
    })
    .select('id')
    .maybeSingle()

  if (insErr || !inserted?.id) {
    apiLog('buyer.dispute.insert_failed', { err: errorMessage(insErr) })
    return NextResponse.json(
      { error: 'Unable to submit your request. Please try again.' },
      { status: 500 },
    )
  }

  await supabaseAdmin
    .from('order_escrows')
    .update({
      status: 'on_hold',
      hold_reason: `Buyer request opened (${reason}). Review before releasing payout.`,
    })
    .eq('order_id', orderId)
    .eq('status', 'escrowed')

  if (order.seller_user_id) {
    await notifySeller(supabaseAdmin, order.seller_user_id, {
      type: 'alerts',
      title: 'Buyer request received',
      body: `A buyer has submitted a request for review on order ${orderId.slice(0, 8)}. Reason: ${reason}. Please review and respond.`,
      metadata: { orderId, disputeId: inserted.id },
      dedupeKey: `seller_buyer_dispute:${inserted.id}`,
    })
  }

  await notifyAllAdmins(supabaseAdmin, {
    type: 'alerts',
    title: 'Buyer help request opened',
    body: `Order ${orderId.slice(0, 8)} — ${reason}. Review in Admin disputes.`,
    metadata: { orderId, disputeId: inserted.id },
    dedupeKey: `admin_dispute_opened:${inserted.id}`,
  })

  await notifyUser(supabaseAdmin, {
    userId: user.id,
    type: 'reminder',
    title: 'Request submitted',
    body: 'We notified your provider and the platform team. You will see updates here.',
    metadata: { orderId, disputeId: inserted.id },
    dedupeKey: `buyer_dispute_submitted:${inserted.id}`,
  })

  apiLog('buyer.dispute.created', { disputeId: inserted.id })
  return NextResponse.json({ ok: true, disputeId: inserted.id }, { status: 201 })
}
