import { listingIdFromOrderItemProductId } from '@/lib/orders/listingIdFromProductId'
import {
  fetchActivePaymongoCheckoutByOrderId,
  reconcileStaleCheckoutPayments,
} from '@/lib/checkout/reconcileCheckoutPayments'

export const BUYER_ORDER_LIST_SELECT = [
  'id',
  'order_number',
  'seller_user_id',
  'fulfillment_status',
  'payment_status',
  'status',
  'subtotal',
  'currency',
  'created_at',
  'preferred_date',
  'contact_name',
  'contact_email',
  'contact_phone',
  'notes',
  'service_location',
  'deceased_name',
  'date_of_death',
  'wake_duration_days',
  'refund_status',
  'refund_requested_at',
].join(',')

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} supabaseAdmin
 * @param {string} buyerId
 */
export async function listBuyerOrdersForApi(supabaseAdmin, buyerId) {
  const { data: orders, error: ordersErr } = await supabaseAdmin
    .from('orders')
    .select(BUYER_ORDER_LIST_SELECT)
    .eq('buyer_id', buyerId)
    .order('created_at', { ascending: false })

  if (ordersErr) {
    return { orders: [], items: [], reviewedItemIdsByOrder: {}, error: ordersErr.message || 'Failed to load orders.' }
  }

  const orderIds = (orders ?? []).map((o) => o.id).filter(Boolean)
  if (!orderIds.length) {
    return { orders: orders ?? [], items: [], reviewedItemIdsByOrder: {}, error: null }
  }

  await reconcileStaleCheckoutPayments(supabaseAdmin, buyerId, orderIds)

  const { data: paymentFreshRows } = await supabaseAdmin
    .from('orders')
    .select('id,payment_status,status')
    .in('id', orderIds)
    .eq('buyer_id', buyerId)
  const paymentFreshById = new Map((paymentFreshRows ?? []).map((r) => [r.id, r]))

  const activeCheckoutByOrderId = await fetchActivePaymongoCheckoutByOrderId(supabaseAdmin, orderIds)

  const ordersWithCheckoutFlag = (orders ?? []).map((o) => {
    const fresh = paymentFreshById.get(o.id)
    return {
      ...o,
      payment_status: fresh?.payment_status ?? o.payment_status,
      status: fresh?.status ?? o.status,
      active_paymongo_checkout: activeCheckoutByOrderId.get(o.id) === true,
    }
  })

  const [{ data: items, error: itemsErr }, { data: reviewRows, error: reviewsErr }] = await Promise.all([
    supabaseAdmin
      .from('order_items')
      .select('id,order_id,product_id,name,quantity,price')
      .in('order_id', orderIds),
    supabaseAdmin
      .from('order_item_reviews')
      .select('order_id,order_item_id')
      .eq('buyer_id', buyerId)
      .in('order_id', orderIds),
  ])

  if (itemsErr || reviewsErr) {
    return {
      orders: [],
      items: [],
      reviewedItemIdsByOrder: {},
      error: itemsErr?.message || reviewsErr?.message || 'Failed to load order details.',
    }
  }

  const listingIdSet = new Set()
  for (const item of items ?? []) {
    const listingId = listingIdFromOrderItemProductId(item.product_id)
    if (listingId) listingIdSet.add(listingId)
  }

  let kindByListingId = {}
  if (listingIdSet.size > 0) {
    const { data: listingRows } = await supabaseAdmin
      .from('seller_listings')
      .select('id,listing_kind')
      .in('id', [...listingIdSet])
    for (const row of listingRows ?? []) {
      kindByListingId[String(row.id)] = row.listing_kind ?? null
    }
  }

  const enrichedItems = (items ?? []).map((item) => {
    const listingId = listingIdFromOrderItemProductId(item.product_id)
    return {
      ...item,
      listing_kind: listingId ? kindByListingId[listingId] ?? null : null,
    }
  })

  /** @type {Record<string, string[]>} */
  const reviewedItemIdsByOrder = {}
  for (const row of reviewRows ?? []) {
    const orderId = String(row?.order_id ?? '').trim()
    const itemId = String(row?.order_item_id ?? '').trim()
    if (!orderId || !itemId) continue
    if (!reviewedItemIdsByOrder[orderId]) reviewedItemIdsByOrder[orderId] = []
    reviewedItemIdsByOrder[orderId].push(itemId)
  }

  return {
    orders: ordersWithCheckoutFlag,
    items: enrichedItems,
    reviewedItemIdsByOrder,
    error: null,
  }
}
