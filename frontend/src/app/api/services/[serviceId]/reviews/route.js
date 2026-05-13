import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { apiLog, errorMessage } from '@/lib/observability/apiLog'
import { isUuidLike } from '@/shared/utils/uuidLike'
import { listingIdFromOrderItemProductId } from '@/lib/orders/listingIdFromProductId'
import { sellerOwnsListing } from '@/lib/sellers/sellerListingOwnership'

const SERVICE_ID_ALLOWED = new Set(['cremation', 'traditional-burial', 'memorial-planning'])

function formatISODate(dateIso) {
  const d = new Date(dateIso)
  if (Number.isNaN(d.getTime())) return new Date().toISOString()
  return d.toISOString()
}

export async function GET(request, { params }) {
  const { searchParams } = new URL(request.url)
  const { serviceId: serviceIdRaw } = await params
  const serviceId = String(serviceIdRaw ?? '').trim()
  const sellerIdParam = String(searchParams.get('sellerId') ?? '').trim()
  const sellerId = sellerIdParam && isUuidLike(sellerIdParam) ? sellerIdParam : ''
  const listingIdParam = String(searchParams.get('listingId') ?? '').trim()
  const listingIdFilter = listingIdParam && isUuidLike(listingIdParam) ? listingIdParam : ''
  if (!SERVICE_ID_ALLOWED.has(serviceId)) {
    return NextResponse.json({ error: 'Invalid serviceId.' }, { status: 400 })
  }
  if (listingIdFilter && !sellerId) {
    return NextResponse.json(
      { error: 'sellerId is required when listingId is provided.' },
      { status: 400 },
    )
  }

  const supabaseAdmin = getSupabaseAdmin()

  if (listingIdFilter && sellerId) {
    const ok = await sellerOwnsListing(supabaseAdmin, sellerId, listingIdFilter)
    if (!ok) {
      apiLog('service.reviews.listing_seller_mismatch', { serviceId, sellerId, listingId: listingIdFilter })
      return NextResponse.json(
        { error: 'Listing does not belong to this seller, or listing was not found.' },
        { status: 400 },
      )
    }
  }

  let reviewsQuery = supabaseAdmin
    .from('order_item_reviews')
    .select('order_item_id,buyer_id,rating,review_text,listing_label,created_at')
    .eq('service_id', serviceId)
  if (sellerId) reviewsQuery = reviewsQuery.eq('seller_user_id', sellerId)
  const { data: reviewRows, error: reviewsErr } = await reviewsQuery.order('created_at', { ascending: false })

  if (reviewsErr) {
    apiLog('service.reviews.list.failed', { err: errorMessage(reviewsErr), serviceId, sellerId })
    return NextResponse.json({ error: 'Failed to load service reviews.' }, { status: 500 })
  }

  let reviews = reviewRows ?? []

  if (listingIdFilter && reviews.length > 0) {
    const itemIds = [...new Set(reviews.map((r) => r.order_item_id).filter(Boolean))]
    /** @type {Map<string, string>} */
    const listingByOrderItem = new Map()
    const chunkSize = 120
    for (let i = 0; i < itemIds.length; i += chunkSize) {
      const slice = itemIds.slice(i, i + chunkSize)
      const { data: items, error: itemsErr } = await supabaseAdmin
        .from('order_items')
        .select('id,product_id')
        .in('id', slice)
      if (itemsErr) {
        apiLog('service.reviews.order_items_failed', { err: errorMessage(itemsErr), serviceId, sellerId })
        return NextResponse.json({ error: 'Failed to load service reviews.' }, { status: 500 })
      }
      for (const row of items ?? []) {
        const lid = listingIdFromOrderItemProductId(row.product_id)
        if (lid) listingByOrderItem.set(String(row.id), lid)
      }
    }
    reviews = reviews.filter((r) => listingByOrderItem.get(String(r.order_item_id)) === listingIdFilter)
  }
  const reviewCount = reviews.length
  const avgRating =
    reviewCount > 0
      ? Number((reviews.reduce((sum, r) => sum + (Number(r.rating) || 0), 0) / reviewCount).toFixed(1))
      : null

  const buyerIds = [...new Set(reviews.map((r) => r.buyer_id).filter(Boolean))]
  const { data: profileRows, error: profilesErr } = buyerIds.length
    ? await supabaseAdmin.from('profiles').select('id,full_name,avatar_url').in('id', buyerIds)
    : { data: [], error: null }

  if (profilesErr) {
    apiLog('service.reviews.profiles_load_failed', { err: errorMessage(profilesErr), serviceId, sellerId })
  }

  const nameByBuyerId = new Map((profileRows ?? []).map((p) => [p.id, p.full_name]))
  const avatarByBuyerId = new Map((profileRows ?? []).map((p) => [p.id, p.avatar_url]))

  const mapped = reviews.map((r) => ({
    id: String(r.order_item_id),
    author: nameByBuyerId.get(r.buyer_id) || 'Buyer',
    avatarUrl: avatarByBuyerId.get(r.buyer_id) || '',
    rating: Number(r.rating) || 0,
    date: formatISODate(r.created_at),
    title: String(r.listing_label ?? ''),
    body: String(r.review_text ?? ''),
    images: [],
    videos: [],
  }))

  return NextResponse.json(
    {
      ok: true,
      serviceId,
      sellerId: sellerId || null,
      listingId: listingIdFilter || null,
      aggregates: { avgRating, reviewCount },
      reviews: mapped,
    },
    { status: 200 },
  )
}

