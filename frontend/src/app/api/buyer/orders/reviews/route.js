import { isUuidLike } from '@/shared/utils'
import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { requireActiveBuyerApiUser } from '@/lib/auth/requireApiUser'
import { apiLog, errorMessage } from '@/lib/observability/apiLog'
import { getClientIp, takeToken } from '@/lib/rate-limit/memoryRateLimit'
import { assertReviewOrderEligible } from '@/lib/reviews/assertReviewOrderEligible'
import { validateReviewMediaUrlArrays } from '@/lib/reviews/validateReviewMediaUrls'
import { removeOrphanedReviewMedia } from '@/lib/reviews/reviewMediaStorage'
const ALLOWED_RATING_MIN = 1
const ALLOWED_RATING_MAX = 5
const MAX_REVIEW_TEXT_CHARS = 2000

const SERVICE_ID_ALLOWED = new Set(['cremation', 'traditional-burial', 'memorial-planning'])

function normalizeServiceId(raw) {
  if (raw == null) return 'memorial-planning'
  const s = String(raw).trim().toLowerCase().replace(/\s+/g, '-')
  if (SERVICE_ID_ALLOWED.has(s)) return s
  if (s.includes('cremat')) return 'cremation'
  if (s.includes('burial') || s.includes('buried') || s === 'traditional') return 'traditional-burial'
  if (s.includes('memorial') || s.includes('wake')) return 'memorial-planning'
  return 'memorial-planning'
}

function toUpsertCandidateIds(reviewsPayload) {
  return reviewsPayload
    .map((r) => String(r?.orderItemId ?? '').trim())
    .filter((id) => isUuidLike(id))
}

/**
 * POST — upsert buyer reviews per order_item for an order (edit/update later).
 * Body:
 *  {
 *    orderId: string,
 *    reviews: Array<{ orderItemId: string, rating: number, reviewText?: string, imageUrls?: string[], videoUrls?: string[] }>
 *  }
 */
export async function POST(request) {
  const ip = getClientIp(request)
  const rl = takeToken(`buyer:reviews:submit:${ip}`, { windowMs: 15 * 60_000, max: 80 })
  if (!rl.ok) {
    apiLog('buyer.reviews.ratelimited', { retryAfterSec: rl.retryAfterSec })
    return NextResponse.json(
      { error: 'Too many attempts. Wait a minute and try again.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec ?? 60) } },
    )
  }

  const { user, responseError } = await requireActiveBuyerApiUser()
  if (responseError) {
    if (responseError.status === 401) apiLog('buyer.reviews.unauthorized', {})
    return responseError
  }

  const supabaseAdmin = getSupabaseAdmin()

  const body = await request.json().catch(() => ({}))
  const orderId = String(body?.orderId ?? '').trim().replace(/^#/, '')
  const reviewsPayload = Array.isArray(body?.reviews) ? body.reviews : null

  let actualOrderId = null

  apiLog('buyer.reviews.post.param', { orderId, isUuid: isUuidLike(orderId) })

  if (orderId) {
    if (isUuidLike(orderId)) {
      const { data: order, error: err1 } = await supabaseAdmin
        .from('orders')
        .select('id')
        .eq('id', orderId)
        .maybeSingle()
      apiLog('buyer.reviews.post.uuid_lookup', { found: !!order, error: errorMessage(err1) })
      if (order) {
        actualOrderId = order.id
      }
    }
  }

  if (!actualOrderId && orderId) {
    const { data: order, error: err2 } = await supabaseAdmin
      .from('orders')
      .select('id')
      .ilike('order_number', orderId)
      .maybeSingle()
    apiLog('buyer.reviews.post.number_lookup', { found: !!order, error: errorMessage(err2) })
    if (order) {
      actualOrderId = order.id
    }
  }

  if (!actualOrderId) {
    apiLog('buyer.reviews.post.invalid_id', { orderId, orderIdLength: orderId?.length })
    return NextResponse.json({ error: 'Invalid orderId.' }, { status: 400 })
  }
  if (!reviewsPayload) {
    return NextResponse.json({ error: 'Missing reviews payload.' }, { status: 400 })
  }

  // Verify order + eligibility.
  const { data: order, error: orderErr } = await supabaseAdmin
    .from('orders')
    .select('id,buyer_id,seller_user_id,fulfillment_status,payment_status,status,refund_status')
    .eq('id', actualOrderId)
    .maybeSingle()

  if (orderErr || !order) {
    apiLog('buyer.reviews.order_not_found', { orderErr: errorMessage(orderErr) })
    return NextResponse.json({ error: 'Order not found.' }, { status: 404 })
  }
  if (order.buyer_id !== user.id) {
    apiLog('buyer.reviews.forbidden', { orderId })
    return NextResponse.json({ error: 'Not allowed.' }, { status: 403 })
  }
  const eligibility = assertReviewOrderEligible(order)
  if (!eligibility.ok) {
    return NextResponse.json({ error: eligibility.error }, { status: eligibility.status })
  }

  const orderItemsIds = reviewsPayload
    .map((r) => String(r?.orderItemId ?? '').trim())
    .filter((id) => isUuidLike(id))

  if (orderItemsIds.length === 0) {
    return NextResponse.json({ error: 'No valid orderItemId values.' }, { status: 400 })
  }

  // Load order items to validate ownership and derive service attribution.
  const { data: orderItems, error: itemsErr } = await supabaseAdmin
    .from('order_items')
    .select('id,product_id,name,seller_user_id')
    .eq('order_id', actualOrderId)
    .in('id', orderItemsIds)

  if (itemsErr || !orderItems || orderItems.length === 0) {
    apiLog('buyer.reviews.order_items_load_failed', { err: errorMessage(itemsErr) })
    return NextResponse.json({ error: 'Order items not found.' }, { status: 404 })
  }

  const itemsById = new Map((orderItems ?? []).map((it) => [it.id, it]))

  // Resolve seller_listings rows for service_id computation (split product_id to listing id).
  const listingIdByOrderItemId = new Map()
  const listingIds = []
  for (const it of orderItems ?? []) {
    const listingIdText = String(it.product_id ?? '').split('::pkg::', 1)[0]
    if (isUuidLike(listingIdText)) {
      listingIdByOrderItemId.set(it.id, listingIdText)
      listingIds.push(listingIdText)
    }
  }

  const uniqueListingIds = [...new Set(listingIds)]
  let listingRowsById = new Map()
  if (uniqueListingIds.length > 0) {
    const { data: listingRows, error: listingsErr } = await supabaseAdmin
      .from('seller_listings')
      .select('id,funeral_category,category')
      .in('id', uniqueListingIds)

    if (listingsErr) {
      apiLog('buyer.reviews.listings_load_failed', { err: errorMessage(listingsErr) })
    } else {
      listingRowsById = new Map((listingRows ?? []).map((r) => [r.id, r]))
    }
  }

  const existingItemIds = toUpsertCandidateIds(reviewsPayload)
  /** @type {Map<string, { image_urls: string[], video_urls: string[] }>} */
  const existingMediaByItemId = new Map()
  if (existingItemIds.length > 0) {
    const { data: existingRows, error: existingErr } = await supabaseAdmin
      .from('order_item_reviews')
      .select('order_item_id,image_urls,video_urls')
      .eq('buyer_id', user.id)
      .in('order_item_id', existingItemIds)

    if (existingErr) {
      apiLog('buyer.reviews.existing_media_load_failed', { err: errorMessage(existingErr) })
    } else {
      for (const row of existingRows ?? []) {
        existingMediaByItemId.set(String(row.order_item_id), {
          image_urls: Array.isArray(row.image_urls) ? row.image_urls : [],
          video_urls: Array.isArray(row.video_urls) ? row.video_urls : [],
        })
      }
    }
  }

  /** @type {Array<any>} */
  const toUpsert = []

  for (const payloadReview of reviewsPayload) {
    const orderItemId = String(payloadReview?.orderItemId ?? '').trim()
    if (!isUuidLike(orderItemId)) continue
    const item = itemsById.get(orderItemId)
    if (!item) continue

    const ratingRaw = payloadReview?.rating
    const ratingNum = Number(ratingRaw)
    if (!Number.isFinite(ratingNum)) {
      return NextResponse.json({ error: 'Invalid rating number.' }, { status: 400 })
    }
    const ratingInt = Math.round(ratingNum)
    if (ratingInt < ALLOWED_RATING_MIN || ratingInt > ALLOWED_RATING_MAX) {
      return NextResponse.json({ error: 'Rating must be between 1 and 5.' }, { status: 400 })
    }

    const reviewTextRaw = payloadReview?.reviewText
    const reviewText =
      reviewTextRaw == null ? null : String(reviewTextRaw).slice(0, MAX_REVIEW_TEXT_CHARS)

    const listingIdText = listingIdByOrderItemId.get(item.id)
    const listingRow = listingIdText ? listingRowsById.get(listingIdText) : null
    const rawService =
      (listingRow?.funeral_category ?? listingRow?.category ?? '').toString() || item?.name

    const serviceId = normalizeServiceId(rawService)

    const mediaCheck = validateReviewMediaUrlArrays(
      payloadReview?.imageUrls,
      payloadReview?.videoUrls,
      user.id,
      orderItemId,
    )
    if (!mediaCheck.ok) {
      return NextResponse.json({ error: mediaCheck.error }, { status: 400 })
    }

    const previous = existingMediaByItemId.get(orderItemId) ?? { image_urls: [], video_urls: [] }
    const previousImageUrls = (previous.image_urls ?? []).map(String)
    const previousVideoUrls = (previous.video_urls ?? []).map(String)

    await removeOrphanedReviewMedia(supabaseAdmin, previousImageUrls, mediaCheck.imageUrls)
    await removeOrphanedReviewMedia(supabaseAdmin, previousVideoUrls, mediaCheck.videoUrls)

    toUpsert.push({
      buyer_id: user.id,
      order_id: actualOrderId,
      order_item_id: item.id,
      seller_user_id: item.seller_user_id ?? order.seller_user_id,
      service_id: serviceId,
      listing_label: String(item.name ?? '').trim() || 'Service',
      rating: ratingInt,
      review_text: reviewText,
      image_urls: mediaCheck.imageUrls,
      video_urls: mediaCheck.videoUrls,
    })
  }

  if (toUpsert.length === 0) {
    return NextResponse.json({ error: 'No valid reviews to submit.' }, { status: 400 })
  }

  const { error: upsertErr } = await supabaseAdmin
    .from('order_item_reviews')
    .upsert(toUpsert, { onConflict: 'buyer_id,order_item_id' })

  if (upsertErr) {
    apiLog('buyer.reviews.upsert_failed', { err: errorMessage(upsertErr) })
    return NextResponse.json({ error: 'Failed to save reviews.' }, { status: 500 })
  }

  apiLog('buyer.reviews.ok', { orderId: actualOrderId, reviewCount: toUpsert.length })
  return NextResponse.json({ ok: true }, { status: 200 })
}

