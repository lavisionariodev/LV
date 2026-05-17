import { isUuidLike } from '@/shared/utils'
import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { requireActiveBuyerApiUser } from '@/lib/auth/requireApiUser'
import { apiLog, errorMessage } from '@/lib/observability/apiLog'
import { getClientIp, takeToken } from '@/lib/rate-limit/memoryRateLimit'
export async function GET(request, { params }) {
  const ip = getClientIp(request)
  const rl = takeToken(`buyer:reviews:get:${ip}`, { windowMs: 15 * 60_000, max: 80 })
  if (!rl.ok) {
    apiLog('buyer.reviews.get.ratelimited', { retryAfterSec: rl.retryAfterSec })
    return NextResponse.json(
      { error: 'Too many attempts. Wait a minute and try again.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec ?? 60) } },
    )
  }

  const resolvedParams = await params
  const orderIdParam = resolvedParams?.orderId
  const orderId = String(orderIdParam ?? '').trim().replace(/^#/, '')
  const { user, responseError } = await requireActiveBuyerApiUser()
  if (responseError) {
    if (responseError.status === 401) apiLog('buyer.reviews.get.unauthorized', {})
    return responseError
  }

  const supabaseAdmin = getSupabaseAdmin()
  let actualOrderId = null

  apiLog('buyer.reviews.get.param', { orderId, isUuid: isUuidLike(orderId) })

  if (orderId) {
    if (isUuidLike(orderId)) {
      try {
        const { data: order, error: err1 } = await supabaseAdmin
          .from('orders')
          .select('id')
          .eq('id', orderId)
          .maybeSingle()
        apiLog('buyer.reviews.get.uuid_lookup', { found: !!order, orderId, error: errorMessage(err1) })
        if (order) {
          actualOrderId = order.id
        }
      } catch (e) {
        apiLog('buyer.reviews.get.uuid_lookup_exception', { error: String(e) })
      }
    }
  }

  if (!actualOrderId && orderId) {
    try {
      const { data: order, error: err2 } = await supabaseAdmin
        .from('orders')
        .select('id')
        .ilike('order_number', orderId)
        .maybeSingle()
      apiLog('buyer.reviews.get.number_lookup', { found: !!order, orderId, error: errorMessage(err2) })
      if (order) {
        actualOrderId = order.id
      }
    } catch (e) {
      apiLog('buyer.reviews.get.number_lookup_exception', { error: String(e) })
    }
  }

  if (!actualOrderId) {
    apiLog('buyer.reviews.get.invalid_id', { orderId, orderIdLength: orderId?.length })
    return NextResponse.json({ error: 'Invalid orderId.' }, { status: 400 })
  }

  // Verify order belongs to buyer.
  const { data: order, error: orderErr } = await supabaseAdmin
    .from('orders')
    .select('id,buyer_id,fulfillment_status')
    .eq('id', actualOrderId)
    .maybeSingle()

  if (orderErr || !order) {
    apiLog('buyer.reviews.get.order_not_found', { err: errorMessage(orderErr) })
    return NextResponse.json({ error: 'Order not found.' }, { status: 404 })
  }
  if (order.buyer_id !== user.id) {
    apiLog('buyer.reviews.get.forbidden', { orderId })
    return NextResponse.json({ error: 'Not allowed.' }, { status: 403 })
  }

  const { data: rows, error: reviewsErr } = await supabaseAdmin
    .from('order_item_reviews')
    .select('order_item_id,rating,review_text,updated_at,created_at')
    .eq('order_id', actualOrderId)
    .eq('buyer_id', user.id)

  if (reviewsErr) {
    apiLog('buyer.reviews.get.failed', { err: errorMessage(reviewsErr) })
    return NextResponse.json({ error: 'Failed to load reviews.' }, { status: 500 })
  }

  return NextResponse.json(
    {
      ok: true,
      orderId,
      fulfillmentStatus: order.fulfillment_status,
      reviews: (rows ?? []).map((r) => ({
        orderItemId: r.order_item_id,
        rating: r.rating,
        reviewText: r.review_text,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      })),
    },
    { status: 200 },
  )
}

