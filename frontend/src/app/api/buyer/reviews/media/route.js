import { isUuidLike } from '@/shared/utils'
import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { requireActiveBuyerApiUser } from '@/lib/auth/requireApiUser'
import { apiLog, errorMessage } from '@/lib/observability/apiLog'
import { getClientIp, takeToken } from '@/lib/rate-limit/memoryRateLimit'
import { assertReviewOrderEligible } from '@/lib/reviews/assertReviewOrderEligible'
import {
  REVIEW_IMAGE_MIME,
  REVIEW_VIDEO_MIME,
  REVIEW_MEDIA_BUCKET,
  maxBytesForReviewMediaKind,
  reviewMediaKindFromMime,
  allowedMimeLabelForKind,
  humanMaxSizeForKind,
} from '@/lib/reviews/reviewMediaLimits'
import {
  buildReviewMediaObjectPath,
  reviewMediaPublicUrl,
} from '@/lib/reviews/reviewMediaStorage'

function safeExt(file) {
  const ext = String(file?.name || '').split('.').pop()?.toLowerCase() || 'bin'
  return ext.replace(/[^a-z0-9]/g, '') || 'bin'
}

export async function POST(request) {
  const ip = getClientIp(request)
  const rl = takeToken(`buyer:reviews:media:${ip}`, { windowMs: 15 * 60_000, max: 40 })
  if (!rl.ok) {
    return NextResponse.json(
      { error: 'Too many upload attempts. Wait a minute and try again.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec ?? 60) } },
    )
  }

  const { user, responseError } = await requireActiveBuyerApiUser()
  if (responseError) return responseError

  const form = await request.formData().catch(() => null)
  const orderItemId = String(form?.get('orderItemId') ?? '').trim()
  const kindRaw = String(form?.get('kind') ?? '').trim().toLowerCase()
  const file = form?.get('file')

  if (!isUuidLike(orderItemId)) {
    return NextResponse.json({ error: 'Invalid orderItemId.' }, { status: 400 })
  }
  if (kindRaw !== 'image' && kindRaw !== 'video') {
    return NextResponse.json({ error: 'Invalid media kind.' }, { status: 400 })
  }
  if (!file || typeof file === 'string') {
    return NextResponse.json({ error: 'Missing file.' }, { status: 400 })
  }

  const detectedKind = reviewMediaKindFromMime(file.type)
  if (detectedKind !== kindRaw) {
    return NextResponse.json(
      { error: `Only ${allowedMimeLabelForKind(kindRaw)} files are allowed.` },
      { status: 400 },
    )
  }

  const allowedSet = kindRaw === 'video' ? REVIEW_VIDEO_MIME : REVIEW_IMAGE_MIME
  if (!allowedSet.has(file.type)) {
    return NextResponse.json(
      { error: `Only ${allowedMimeLabelForKind(kindRaw)} files are allowed.` },
      { status: 400 },
    )
  }

  const maxBytes = maxBytesForReviewMediaKind(kindRaw)
  if (file.size > maxBytes) {
    return NextResponse.json(
      { error: `File must be ${humanMaxSizeForKind(kindRaw)} or less.` },
      { status: 400 },
    )
  }
  if (file.size <= 0) {
    return NextResponse.json({ error: 'File is empty.' }, { status: 400 })
  }

  const supabaseAdmin = getSupabaseAdmin()

  const { data: orderItem, error: itemErr } = await supabaseAdmin
    .from('order_items')
    .select('id,order_id')
    .eq('id', orderItemId)
    .maybeSingle()

  if (itemErr || !orderItem) {
    apiLog('buyer.reviews.media.item_not_found', { err: errorMessage(itemErr) })
    return NextResponse.json({ error: 'Order item not found.' }, { status: 404 })
  }

  const { data: order, error: orderErr } = await supabaseAdmin
    .from('orders')
    .select('id,buyer_id,fulfillment_status,payment_status,status,refund_status')
    .eq('id', orderItem.order_id)
    .maybeSingle()

  if (orderErr || !order) {
    return NextResponse.json({ error: 'Order not found.' }, { status: 404 })
  }
  if (order.buyer_id !== user.id) {
    return NextResponse.json({ error: 'Not allowed.' }, { status: 403 })
  }

  const eligibility = assertReviewOrderEligible(order)
  if (!eligibility.ok) {
    return NextResponse.json({ error: eligibility.error }, { status: eligibility.status })
  }

  const filePath = buildReviewMediaObjectPath(user.id, orderItemId, safeExt(file))
  const bytes = await file.arrayBuffer()

  const { error: uploadErr } = await supabaseAdmin.storage.from(REVIEW_MEDIA_BUCKET).upload(filePath, bytes, {
    contentType: file.type,
    cacheControl: '3600',
    upsert: false,
  })

  if (uploadErr) {
    apiLog('buyer.reviews.media.upload_failed', { err: errorMessage(uploadErr) })
    return NextResponse.json({ error: 'Failed to upload file.' }, { status: 500 })
  }

  const url = reviewMediaPublicUrl(supabaseAdmin, filePath)
  apiLog('buyer.reviews.media.ok', { orderItemId, kind: kindRaw })

  return NextResponse.json({ ok: true, url, path: filePath, kind: kindRaw }, { status: 201 })
}
