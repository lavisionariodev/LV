import { listingIdFromOrderItemProductId } from '@/lib/orders/listingIdFromProductId'
import { getListingProviderLogoUrl } from '@/lib/shop-listings/client'

/** First segment of cart `description` (`Seller · detail`). */
export function parseProviderNameFromCartDescription(description) {
  const parts = String(description || '').split(' · ')
  return (parts[0] || '').trim() || 'Seller'
}

/** Map listing UUID → seller name + avatar from `get_active_shop_listings` rows. */
export function buildSellerMetaByListingId(dbRows) {
  const map = new Map()
  for (const row of dbRows || []) {
    const id = String(row.listing_id ?? '').trim()
    if (!id) continue
    const avatarRaw = row.seller_avatar_url
    map.set(id, {
      sellerName: (row.business_name || '').trim() || 'Seller',
      sellerAvatarUrl:
        typeof avatarRaw === 'string' && avatarRaw.trim() ? avatarRaw.trim() : '',
    })
  }
  return map
}

/**
 * Attach seller name/avatar to cart lines (DB columns + live listing RPC fallback).
 * @param {Array<{ id: string, description?: string, sellerName?: string, sellerAvatarUrl?: string }>} items
 * @param {Array<object>} [listingRows] raw rows from get_active_shop_listings
 */
/** Map cart line to checkout/cart summary row fields. */
export function mapCartItemToDisplayRow(item) {
  const sellerName =
    (item.sellerName || '').trim() ||
    parseProviderNameFromCartDescription(item.description)
  const desc = String(item.description || '')
  const parts = desc.split(' · ')
  const detailLine =
    parts.length > 1 && (parts[0] || '').trim() === sellerName
      ? parts.slice(1).join(' · ').trim()
      : parts.length > 1
        ? parts.slice(1).join(' · ').trim()
        : desc && (parts[0] || '').trim() !== sellerName
          ? desc
          : ''

  return {
    id: item.id,
    name: item.name,
    description: detailLine,
    price: Number(item.price) || 0,
    qty: item.qty ?? 1,
    img: item.img,
    provider: sellerName,
    sellerName,
    sellerAvatarUrl: (item.sellerAvatarUrl || '').trim(),
    providerInitial: sellerName.charAt(0).toUpperCase(),
  }
}

export function enrichCartItemsWithSellerMeta(items, listingRows) {
  const byListing = buildSellerMetaByListingId(listingRows)
  return (items || []).map((item) => {
    const listingId = listingIdFromOrderItemProductId(item.id)
    const fromListing = listingId ? byListing.get(listingId) : null
    const sellerName =
      (item.sellerName || '').trim() ||
      fromListing?.sellerName ||
      parseProviderNameFromCartDescription(item.description)
    const sellerAvatarUrl =
      (item.sellerAvatarUrl || '').trim() || fromListing?.sellerAvatarUrl || ''
    return { ...item, sellerName, sellerAvatarUrl }
  })
}

/**
 * Build cart line payload from a merged shop listing (see mergeShopListings).
 * Matches product_id rules used on listing detail: optional package suffix.
 *
 * @param {object} listing
 * @param {{ quantity?: number, buyerPackage?: string, heroImage?: string }} [opts]
 * @returns {{ error: string | null, payload: object | null }}
 */
export function buildCartPayloadFromListing(listing, { quantity = 1, buyerPackage, heroImage } = {}) {
  if (!listing) {
    return { error: 'Listing not available.', payload: null }
  }
  if (listing.inStock === false) {
    return { error: 'This listing is out of stock.', payload: null }
  }
  const pkgOpts = listing.sellerPackageOptions ?? []
  const pkg =
    pkgOpts.length > 0
      ? String(buyerPackage ?? '').trim() || String(pkgOpts[0] ?? '').trim()
      : ''
  if (pkgOpts.length > 0 && !pkg) {
    return { error: 'Please select a package.', payload: null }
  }

  const cartProductId =
    pkgOpts.length > 0 && pkg
      ? `${listing.id}::pkg::${encodeURIComponent(pkg)}`
      : String(listing.id)

  const cartName =
    pkgOpts.length > 0 && pkg ? `${listing.name} — ${pkg}` : listing.name

  const urls = Array.isArray(listing.imageUrls) && listing.imageUrls.length
    ? listing.imageUrls
    : listing.imageUrl
      ? [listing.imageUrl]
      : []
  let mainImg = urls[0] || ''
  if (typeof heroImage === 'string' && heroImage.trim()) {
    mainImg = heroImage.trim()
  }

  const provider = listing.provider
  const sellerName = (provider?.name || '').trim() || 'Seller'
  const sellerAvatarUrl = getListingProviderLogoUrl(provider)
  const description = provider
    ? `${sellerName} · ${listing.inclusions?.[0] ?? ''}`
    : listing.inclusions?.[0] ?? ''

  const safeQty = Math.max(1, Number(quantity) || 1)

  return {
    error: null,
    payload: {
      id: cartProductId,
      name: cartName,
      img: mainImg,
      price: listing.price,
      description,
      qty: safeQty,
      sellerName,
      sellerAvatarUrl,
    },
  }
}
