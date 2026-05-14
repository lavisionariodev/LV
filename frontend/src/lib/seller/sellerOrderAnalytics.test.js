import test from 'node:test'
import assert from 'node:assert/strict'
import { pendingFulfillmentCount } from './sellerOrderPaymentStatus.js'

test('pendingFulfillmentCount counts only paid orders awaiting confirmation', () => {
  const orders = [
    { payment_status: 'paid', fulfillment_status: 'pending' },
    { payment_status: 'unpaid', fulfillment_status: 'pending' },
    { payment_status: 'paid', fulfillment_status: 'confirmed' },
    { status: 'paid', fulfillment_status: 'pending' },
  ]

  assert.equal(pendingFulfillmentCount(orders), 2)
})
