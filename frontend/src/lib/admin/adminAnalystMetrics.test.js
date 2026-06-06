import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buildAnalystInsights,
  buildAnalystSummary,
  buildMonthlySeriesFromOrders,
  buildRevenueMixFromItems,
  computeFirstPaidOrderAtByBuyer,
  percentChange,
  utcMonthBuckets,
} from './adminAnalystMetrics.js'

test('percentChange handles zero previous and growth', () => {
  assert.deepEqual(percentChange(10, 0), { text: 'New', up: true })
  assert.deepEqual(percentChange(0, 0), { text: '—', up: true })
  assert.deepEqual(percentChange(11, 10), { text: '+10.0%', up: true })
  assert.deepEqual(percentChange(9, 10), { text: '-10.0%', up: false })
})

test('utcMonthBuckets returns 12 months oldest first', () => {
  const now = new Date('2026-06-15T12:00:00Z')
  const buckets = utcMonthBuckets(12, now)
  assert.equal(buckets.length, 12)
  assert.equal(buckets[0].monthKey, '2025-07')
  assert.equal(buckets[11].monthKey, '2026-06')
  assert.equal(buckets[11].label, 'Jun')
})

test('buildMonthlySeriesFromOrders buckets paid orders by UTC month', () => {
  const orders = [
    {
      id: '1',
      buyer_id: 'b1',
      subtotal: 1000,
      payment_status: 'paid',
      created_at: '2026-06-10T08:00:00Z',
    },
    {
      id: '2',
      buyer_id: 'b2',
      subtotal: 2000,
      payment_status: 'paid',
      created_at: '2026-05-20T08:00:00Z',
    },
    {
      id: '3',
      buyer_id: 'b3',
      subtotal: 500,
      payment_status: 'unpaid',
      created_at: '2026-06-01T08:00:00Z',
    },
  ]
  const now = new Date('2026-06-15T12:00:00Z')
  const paid = orders.filter((o) => o.payment_status === 'paid')
  const { monthlyBookings, monthlyRevenue } = buildMonthlySeriesFromOrders(paid, 2, now)
  assert.equal(monthlyBookings.length, 2)
  assert.equal(monthlyBookings[1].count, 1)
  assert.equal(monthlyBookings[0].count, 1)
  assert.equal(monthlyRevenue[1].amount, 1000)
  assert.equal(monthlyRevenue[0].amount, 2000)
})

test('computeFirstPaidOrderAtByBuyer uses earliest paid order per buyer', () => {
  const orders = [
    {
      id: '1',
      buyer_id: 'b1',
      payment_status: 'paid',
      created_at: '2026-04-01T00:00:00Z',
    },
    {
      id: '2',
      buyer_id: 'b1',
      payment_status: 'paid',
      created_at: '2026-06-01T00:00:00Z',
    },
  ]
  const first = computeFirstPaidOrderAtByBuyer(orders)
  assert.equal(first.get('b1'), '2026-04-01T00:00:00Z')
})

test('buildAnalystSummary computes new customers and growth', () => {
  const orders = [
    {
      id: '1',
      buyer_id: 'b1',
      subtotal: 100,
      payment_status: 'paid',
      created_at: '2026-06-05T00:00:00Z',
    },
    {
      id: '2',
      buyer_id: 'b2',
      subtotal: 200,
      payment_status: 'paid',
      created_at: '2026-06-12T00:00:00Z',
    },
    {
      id: '3',
      buyer_id: 'b3',
      subtotal: 150,
      payment_status: 'paid',
      created_at: '2026-05-08T00:00:00Z',
    },
  ]
  const now = new Date('2026-06-15T12:00:00Z')
  const summary = buildAnalystSummary(orders, now)
  assert.equal(summary.totalPaidOrders, 3)
  assert.equal(summary.bookingsThisMonth, 2)
  assert.equal(summary.bookingsPrevMonth, 1)
  assert.equal(summary.newCustomersThisMonth, 2)
  assert.equal(summary.newCustomersPrevMonth, 1)
  assert.equal(summary.bookingGrowthRate.text, '+100.0%')
})

test('buildRevenueMixFromItems groups top N plus Other', () => {
  const items = [
    { name: 'Package A', price: 100, quantity: 1 },
    { name: 'Package B', price: 50, quantity: 2 },
    { name: 'Package C', price: 30, quantity: 1 },
    { name: 'Package D', price: 20, quantity: 1 },
    { name: 'Package E', price: 10, quantity: 1 },
  ]
  const mix = buildRevenueMixFromItems(items, 2)
  assert.equal(mix.length, 3)
  assert.equal(mix[0].name, 'Package A')
  assert.equal(mix[2].name, 'Other')
})

test('buildAnalystInsights returns up to three sentences', () => {
  const summary = buildAnalystSummary(
    [
      {
        id: '1',
        buyer_id: 'b1',
        subtotal: 1000,
        payment_status: 'paid',
        created_at: '2026-06-05T00:00:00Z',
      },
    ],
    new Date('2026-06-15T12:00:00Z'),
  )
  const insights = buildAnalystInsights(summary, [{ label: 'Jun', count: 1 }], [
    { name: 'Package A', value: 1000 },
  ])
  assert.ok(insights.length >= 2)
  assert.ok(insights.length <= 3)
  assert.match(insights[0], /Paid bookings this month/)
})
