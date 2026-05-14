import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { apiLog, errorMessage } from '@/lib/observability/apiLog'
import { listingIdFromOrderItemProductId } from '@/lib/orders/listingIdFromProductId'
import { resolveStoredAvatar } from '@/shared/utils/avatarImage'

function computeInitials(fullName) {
  const s = String(fullName ?? '').trim()
  if (!s) return ''
  const parts = s.split(/\s+/).filter(Boolean)
  return parts
    .slice(0, 2)
    .map((p) => p[0] || '')
    .join('')
    .toUpperCase()
}

function formatMonthYear(dateIso) {
  const d = new Date(dateIso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

function formatServiceLabel(serviceId) {
  switch (String(serviceId ?? '').trim()) {
    case 'cremation':
      return 'Cremation'
    case 'traditional-burial':
      return 'Traditional burial'
    case 'memorial-planning':
      return 'Memorial planning'
    default:
      return 'Service'
  }
}

function buildShopHref(serviceId, listingId) {
  const service = String(serviceId ?? '').trim()
  if (!service) return ''
  const listing = String(listingId ?? '').trim()
  if (listing) {
    return `/shop/${encodeURIComponent(service)}?listing=${encodeURIComponent(listing)}`
  }
  return `/shop/${encodeURIComponent(service)}`
}

function listingAggregateKey(review) {
  const listingId = String(review.listingId ?? '').trim()
  if (listingId) return listingId
  const serviceId = String(review.serviceId ?? '').trim()
  const label = String(review.service ?? '').trim().toLowerCase()
  return `${serviceId}::${label}`
}

function pickTopRatedListing(entries) {
  return entries.reduce((best, current) => {
    if (!best) return current
    const avgDiff = (current.avgRating ?? 0) - (best.avgRating ?? 0)
    if (avgDiff !== 0) return avgDiff > 0 ? current : best
    if (current.reviewCount !== best.reviewCount) {
      return current.reviewCount > best.reviewCount ? current : best
    }
    return current.label.localeCompare(best.label) < 0 ? current : best
  }, null)
}

function buildListingReviewStats(reviews) {
  /** @type {Map<string, { label: string, listingId: string, serviceId: string, shopHref: string, totalRating: number, reviewCount: number }>} */
  const byKey = new Map()

  for (const review of reviews) {
    const key = listingAggregateKey(review)
    if (!key) continue

    let row = byKey.get(key)
    if (!row) {
      row = {
        label: String(review.service ?? review.serviceLabel ?? 'Listing').trim() || 'Listing',
        listingId: String(review.listingId ?? '').trim(),
        serviceId: String(review.serviceId ?? '').trim(),
        shopHref: String(review.shopHref ?? '').trim(),
        totalRating: 0,
        reviewCount: 0,
      }
      byKey.set(key, row)
    }

    row.totalRating += Number(review.rating) || 0
    row.reviewCount += 1

    const listingLabel = String(review.service ?? '').trim()
    if (listingLabel) row.label = listingLabel
    if (review.listingId) row.listingId = String(review.listingId)
    if (review.serviceId) row.serviceId = String(review.serviceId)
    if (review.shopHref) row.shopHref = String(review.shopHref)
  }

  const entries = [...byKey.values()].map((row) => ({
    label: row.label,
    listingId: row.listingId,
    serviceId: row.serviceId,
    shopHref: row.shopHref,
    reviewCount: row.reviewCount,
    avgRating:
      row.reviewCount > 0 ? Number((row.totalRating / row.reviewCount).toFixed(1)) : null,
  }))

  return pickTopRatedListing(entries)
}

function countReviewsThisMonth(reviewRows) {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()
  return reviewRows.filter((row) => {
    const createdAt = new Date(row.created_at)
    if (Number.isNaN(createdAt.getTime())) return false
    return createdAt.getFullYear() === year && createdAt.getMonth() === month
  }).length
}

async function loadListingIdsByOrderItemId(supabaseAdmin, orderItemIds) {
  /** @type {Map<string, string>} */
  const listingByOrderItem = new Map()
  const ids = [...new Set(orderItemIds.filter(Boolean))]
  const chunkSize = 120
  for (let i = 0; i < ids.length; i += chunkSize) {
    const slice = ids.slice(i, i + chunkSize)
    const { data: items, error: itemsErr } = await supabaseAdmin
      .from('order_items')
      .select('id,product_id')
      .in('id', slice)
    if (itemsErr) {
      apiLog('seller.reviews.order_items_failed', { err: errorMessage(itemsErr) })
      continue
    }
    for (const row of items ?? []) {
      const listingId = listingIdFromOrderItemProductId(row.product_id)
      if (listingId) listingByOrderItem.set(String(row.id), listingId)
    }
  }
  return listingByOrderItem
}

async function loadOrderNumbersById(supabaseAdmin, orderIds) {
  /** @type {Map<string, string>} */
  const orderNumberById = new Map()
  const ids = [...new Set(orderIds.filter(Boolean))]
  const chunkSize = 120
  for (let i = 0; i < ids.length; i += chunkSize) {
    const slice = ids.slice(i, i + chunkSize)
    const { data: orders, error: ordersErr } = await supabaseAdmin
      .from('orders')
      .select('id,order_number')
      .in('id', slice)
    if (ordersErr) {
      apiLog('seller.reviews.orders_failed', { err: errorMessage(ordersErr) })
      continue
    }
    for (const row of orders ?? []) {
      const label = String(row.order_number ?? '').trim()
      if (label) orderNumberById.set(String(row.id), label)
    }
  }
  return orderNumberById
}

export async function loadSellerReviews(sellerId) {
  const supabaseAdmin = getSupabaseAdmin()

  const { data: reviewRows, error: reviewsErr } = await supabaseAdmin
    .from('order_item_reviews')
    .select(
      'order_item_id,order_id,buyer_id,service_id,rating,review_text,listing_label,created_at,updated_at',
    )
    .eq('seller_user_id', sellerId)
    .order('created_at', { ascending: false })

  if (reviewsErr) {
    apiLog('seller.reviews.list.failed', { err: errorMessage(reviewsErr) })
    throw new Error('Failed to load seller reviews.')
  }

  const reviews = reviewRows ?? []
  const reviewCount = reviews.length
  const avgRating =
    reviewCount > 0
      ? Number(
          (
            reviews.reduce((sum, r) => sum + (Number(r.rating) || 0), 0) / reviewCount
          ).toFixed(1),
        )
      : null

  const buyerIds = [...new Set(reviews.map((r) => r.buyer_id).filter(Boolean))]
  const { data: profileRows, error: profilesErr } = buyerIds.length
    ? await supabaseAdmin.from('profiles').select('id,full_name,avatar_url').in('id', buyerIds)
    : { data: [], error: null }

  if (profilesErr) {
    apiLog('seller.reviews.profiles_load_failed', { err: errorMessage(profilesErr) })
  }

  const initialsByBuyerId = new Map(
    (profileRows ?? []).map((p) => [p.id, computeInitials(p.full_name)]),
  )
  const nameByBuyerId = new Map((profileRows ?? []).map((p) => [p.id, p.full_name]))
  const avatarByBuyerId = new Map(
    (profileRows ?? []).map((p) => {
      const { avatarUrl } = resolveStoredAvatar(supabaseAdmin, p.avatar_url)
      return [p.id, avatarUrl || '']
    }),
  )

  const listingByOrderItemId = await loadListingIdsByOrderItemId(
    supabaseAdmin,
    reviews.map((r) => r.order_item_id),
  )
  const orderNumberById = await loadOrderNumbersById(
    supabaseAdmin,
    reviews.map((r) => r.order_id),
  )

  const mapped = reviews.map((r) => {
    const reviewerName = nameByBuyerId.get(r.buyer_id) || 'Buyer'
    const orderItemId = String(r.order_item_id)
    const orderId = String(r.order_id ?? '')
    const serviceId = String(r.service_id ?? '')
    const listingId = listingByOrderItemId.get(orderItemId) || ''
    const createdAt = r.created_at
    const updatedAt = r.updated_at
    const edited =
      createdAt &&
      updatedAt &&
      new Date(updatedAt).getTime() > new Date(createdAt).getTime() + 1000
    return {
      id: orderItemId,
      orderId,
      orderDisplayId: orderNumberById.get(orderId) || '',
      serviceId,
      serviceLabel: formatServiceLabel(serviceId),
      listingId,
      shopHref: buildShopHref(serviceId, listingId),
      orderHref: orderId ? `/seller/orders?orderId=${encodeURIComponent(orderId)}` : '',
      reviewerName,
      reviewerInitials: initialsByBuyerId.get(r.buyer_id) || '',
      reviewerAvatarUrl: avatarByBuyerId.get(r.buyer_id) || '',
      rating: Number(r.rating) || 0,
      date: formatMonthYear(createdAt),
      createdAt: createdAt || null,
      updatedAt: updatedAt || null,
      edited,
      service: String(r.listing_label ?? ''),
      text: String(r.review_text ?? ''),
    }
  })

  const listingStats = buildListingReviewStats(mapped)
  const reviewsThisMonth = countReviewsThisMonth(reviews)

  return {
    sellerId,
    aggregates: {
      avgRating,
      reviewCount,
      reviewsThisMonth,
      topRatedListing: listingStats,
    },
    reviews: mapped,
  }
}
