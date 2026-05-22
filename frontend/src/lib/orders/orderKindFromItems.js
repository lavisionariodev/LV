import { buildListingKindById, resolveCartItemKind } from '@/lib/listings/kind'
import { listingIdFromOrderItemProductId } from '@/lib/orders/listingIdFromProductId'
import { resolveOrderDisplayLane } from '@/lib/profile/mapBuyerOrderCard'

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
