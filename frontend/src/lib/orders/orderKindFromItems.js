import { buildListingKindById, resolveCartItemKind } from '@/lib/listings/kind'
import { listingIdFromOrderItemProductId } from '@/lib/orders/listingIdFromProductId'
import { resolveOrderDisplayLane } from '@/lib/profile/mapBuyerOrderCard'

/**
 * Resolve product vs booking lane for many seller orders (one listing-kind lookup).
 * @param {import('@supabase/supabase-js').SupabaseClient} supabaseAdmin
 * @param {Array<{ id?: string, order_items?: Array<{ product_id?: string|null }>|null }>} orders
 * @returns {Promise<Map<string, 'product' | 'booking'>>}
 */
export async function buildOrderLaneByOrderId(supabaseAdmin, orders) {
  const listingIdSet = new Set()
  for (const order of orders ?? []) {
    for (const item of order.order_items ?? []) {
      const lid = listingIdFromOrderItemProductId(item.product_id)
      if (lid) listingIdSet.add(lid)
    }
  }

  /** @type {Map<string, import('@/lib/listings/kind').ListingKind>} */
  let kindByListingId = new Map()
  if (listingIdSet.size > 0) {
    const { data: listingRows } = await supabaseAdmin
      .from('seller_listings')
      .select('id,listing_kind')
      .in('id', [...listingIdSet])

    kindByListingId = buildListingKindById(
      (listingRows ?? []).map((row) => ({
        listing_id: row.id,
        listing_kind: row.listing_kind,
      })),
    )
  }

  const laneByOrderId = new Map()
  for (const order of orders ?? []) {
    if (!order?.id) continue
    const orderItems = (order.order_items ?? []).map((item) => ({
      listing_kind: resolveCartItemKind(String(item.product_id), kindByListingId),
    }))
    laneByOrderId.set(order.id, resolveOrderDisplayLane(orderItems))
  }
  return laneByOrderId
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} supabaseAdmin
 * @param {string} orderId
 * @returns {Promise<'product' | 'booking'>}
 */
export async function resolveOrderLaneForOrderId(supabaseAdmin, orderId) {
  const { data: items } = await supabaseAdmin
    .from('order_items')
    .select('product_id')
    .eq('order_id', orderId)

  if (!items?.length) return 'booking'

  const listingIdSet = new Set()
  for (const item of items) {
    const lid = listingIdFromOrderItemProductId(item.product_id)
    if (lid) listingIdSet.add(lid)
  }

  let kindByListingId = {}
  if (listingIdSet.size > 0) {
    const { data: listingRows } = await supabaseAdmin
      .from('seller_listings')
      .select('id,listing_kind')
      .in('id', [...listingIdSet])
    kindByListingId = buildListingKindById(
      (listingRows ?? []).map((row) => ({
        listing_id: row.id,
        listing_kind: row.listing_kind,
      })),
    )
  }

  const orderItems = items.map((item) => ({
    listing_kind: resolveCartItemKind(String(item.product_id), kindByListingId),
  }))

  return resolveOrderDisplayLane(orderItems)
}
