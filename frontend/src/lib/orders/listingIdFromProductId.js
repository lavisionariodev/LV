import { isUuidLike } from '@/shared/utils/uuidLike'

/**
 * `order_items.product_id` stores listing UUID, optionally suffixed with `::pkg::<option>`.
 * Returns the listing id when it looks like a UUID, otherwise ''.
 */
export function listingIdFromOrderItemProductId(productId) {
  const base = String(productId ?? '')
    .split('::pkg::', 1)[0]
    .trim()
  return isUuidLike(base) ? base : ''
}
