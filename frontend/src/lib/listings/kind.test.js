import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  normalizeListingKind,
  checkoutLaneFromKind,
  buildListingKindById,
  resolveCartItemKind,
  lanesCompatible,
  checkoutLaneFromCartItems,
  getCheckoutCopy,
  formatListingKindLabel,
} from './kind.js'

describe('normalizeListingKind', () => {
  it('defaults to service', () => {
    assert.equal(normalizeListingKind(null), 'service')
    assert.equal(normalizeListingKind(''), 'service')
  })

  it('normalizes package and product', () => {
    assert.equal(normalizeListingKind('Package'), 'package')
    assert.equal(normalizeListingKind('PRODUCT'), 'product')
  })
})

describe('checkoutLaneFromKind', () => {
  it('maps product to product lane', () => {
    assert.equal(checkoutLaneFromKind('product'), 'product')
  })

  it('maps service and package to booking', () => {
    assert.equal(checkoutLaneFromKind('service'), 'booking')
    assert.equal(checkoutLaneFromKind('package'), 'booking')
  })
})

describe('lanesCompatible', () => {
  it('allows service and package together', () => {
    assert.equal(lanesCompatible('service', 'package'), true)
  })

  it('rejects product with booking', () => {
    assert.equal(lanesCompatible('product', 'service'), false)
    assert.equal(lanesCompatible('product', 'booking'), false)
  })
})

describe('checkoutLaneFromCartItems', () => {
  const kindMap = buildListingKindById([
    { listing_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', listing_kind: 'product' },
    { listing_id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', listing_kind: 'service' },
  ])

  it('detects mixed lanes', () => {
    const lane = checkoutLaneFromCartItems(
      [
        { id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' },
        { id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb' },
      ],
      kindMap,
    )
    assert.equal(lane, 'mixed')
  })

  it('resolves product-only cart', () => {
    assert.equal(
      checkoutLaneFromCartItems([{ id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' }], kindMap),
      'product',
    )
  })
})

describe('getCheckoutCopy', () => {
  it('returns booking copy by default', () => {
    assert.match(getCheckoutCopy('booking').payButton, /Book/)
  })

  it('returns product copy', () => {
    assert.match(getCheckoutCopy('product').payButton, /Checkout/)
  })
})

describe('formatListingKindLabel', () => {
  it('labels product', () => {
    assert.equal(formatListingKindLabel('product'), 'Product')
  })
})

describe('resolveCartItemKind', () => {
  it('reads kind from map with pkg suffix', () => {
    const map = buildListingKindById([
      { listing_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', listing_kind: 'package' },
    ])
    assert.equal(
      resolveCartItemKind('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa::pkg::Gold', map),
      'package',
    )
  })
})
