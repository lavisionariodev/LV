/**
 * Shared seller-side aggregates from `orders` + `order_items` (+ optional `seller_listings`).
 * Used by the seller dashboard and analytics routes.
 */

/** @typedef {{ id: string, buyer_id?: string|null, order_number?: string|null, created_at: string, preferred_date?: string|null, fulfillment_status?: string|null, payment_status?: string|null, status?: string|null, subtotal?: number|null, refund_status?: string|null, refund_requested_at?: string|null, contact_name?: string|null, order_items?: { name?: string|null, quantity?: number|null }[]|null }} SellerOrderRow */

export const SELLER_ANALYTICS_ORDER_SELECT =
  'id,buyer_id,order_number,created_at,preferred_date,fulfillment_status,payment_status,status,subtotal,refund_status,refund_requested_at,contact_name,order_items(name,quantity)'

export const SELLER_CUSTOMER_ORDER_SELECT =
  'id,buyer_id,order_number,created_at,preferred_date,fulfillment_status,contact_name,contact_email,contact_phone,service_location,order_items(name,quantity)'

export const SELLER_ORDER_DETAIL_SELECT =
  'id,buyer_id,order_number,status,fulfillment_status,payment_status,subtotal,created_at,preferred_date,refund_status,refund_requested_at,contact_name,contact_email,contact_phone,notes,service_location,deceased_name,date_of_death,wake_duration_days,order_items(name,quantity)'

/**
 * @param {{ name?: string|null, quantity?: number|null }[] | null | undefined} items
 */
export function sellerServicePackageLabel(items) {
  const rows = Array.isArray(items) ? items : []
  if (rows.length === 1) return rows[0].name || 'Booking'
  if (rows.length > 1) return `${rows.length} items`
  return 'Booking'
}

/**
 * @param {SellerOrderRow} row
 */
export function sellerOrderDisplayId(row) {
  return row?.order_number || String(row?.id || '').slice(0, 8)
}

/**
 * @param {SellerOrderRow} row
 */
export function sellerOrderServiceDate(row) {
  const raw = row?.preferred_date || row?.created_at
  return raw ? String(raw).slice(0, 10) : null
}

/**
 * @param {SellerOrderRow} row
 */
export function sellerOrderStatusForUi(row) {
  const f = fulfillmentStatus(row)
  if (f === 'confirmed') return 'confirmed'
  if (f === 'in_progress') return 'in_progress'
  if (f === 'completed') return 'completed'
  if (f === 'cancelled') return 'cancelled'
  return 'pending'
}

/**
 * @param {SellerOrderRow} row
 */
export function sellerRefundStage(row) {
  const rs = row?.refund_status ? String(row.refund_status).toLowerCase() : ''
  return rs === 'requested' || rs === 'processing' ? rs : null
}

/**
 * @param {SellerOrderRow & Record<string, any>} row
 * @param {{ paymentMethod?: string, helpRequest?: any, helpAttachments?: any[] }} [opts]
 */
export function mapSellerOrderForOrdersPage(row, opts = {}) {
  const items = row.order_items ?? []
  const refundStage = sellerRefundStage(row)
  const refundReason =
    refundStage === 'processing'
      ? 'Refund approved and being processed by the payment provider. Completion is automatic and typically takes a few business days.'
      : refundStage === 'requested'
        ? 'Buyer cancelled this booking before confirmation and has requested a refund. Approve to initiate the refund, or decline to keep the booking active.'
        : null
  const helpRequest = opts.helpRequest ?? null
  const helpAttachments = Array.isArray(opts.helpAttachments) ? opts.helpAttachments : []

  return {
    id: row.id,
    displayId: row.order_number || row.id,
    customerName: row.contact_name || 'Buyer',
    servicePackage: sellerServicePackageLabel(items),
    dateOfService: sellerOrderServiceDate(row) || '',
    location: row.service_location || '-',
    totalPrice: Number(row.subtotal) || 0,
    paymentStatus: resolvePaymentStatus(row),
    orderStatus: sellerOrderStatusForUi(row),
    customerPhone: row.contact_phone || '-',
    customerEmail: row.contact_email || '-',
    deceasedName: row.deceased_name || null,
    dateOfDeath: row.date_of_death ? String(row.date_of_death) : null,
    specialRequests: row.notes || null,
    addOns: items.map((it) => `${it.name} x${it.quantity ?? 1}`),
    wakeDuration:
      typeof row.wake_duration_days === 'number'
        ? `${row.wake_duration_days} day${row.wake_duration_days === 1 ? '' : 's'}`
        : '-',
    burialLocation: row.service_location || '-',
    paymentMethod: opts.paymentMethod || '-',
    refundRequested: Boolean(refundStage),
    refundStage,
    refundRequestedAt: row.refund_requested_at ? String(row.refund_requested_at) : null,
    refundReason,
    refundAttachments: helpAttachments,
    helpRequest: helpRequest
      ? {
          id: helpRequest.id,
          reason: helpRequest.reason,
          description: helpRequest.description || '',
          status: helpRequest.status,
          openedAt: helpRequest.opened_at,
          resolutionNotes: helpRequest.resolution_notes || '',
          attachments: helpAttachments,
        }
      : null,
  }
}

/**
 * @param {SellerOrderRow & Record<string, any>} row
 */
export function mapSellerOrderToCustomerBooking(row) {
  return {
    id: row.id,
    displayId: sellerOrderDisplayId(row),
    servicePackage: sellerServicePackageLabel(row.order_items),
    dateOfService: sellerOrderServiceDate(row) || '',
    location: row.service_location?.trim() || '-',
    status: orderStatusLabel(row),
  }
}

/**
 * @param {(SellerOrderRow & Record<string, any>)[]} rows
 */
export function aggregateSellerCustomers(rows) {
  const byBuyer = new Map()

  for (const row of rows) {
    if (!row?.buyer_id) continue
    const buyerId = String(row.buyer_id)
    const list = byBuyer.get(buyerId) || []
    list.push(row)
    byBuyer.set(buyerId, list)
  }

  const out = []
  for (const [buyerId, buyerOrders] of byBuyer) {
    const sortedByCreatedDesc = [...buyerOrders].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    )
    const latest = sortedByCreatedDesc[0]
    const serviceDateStrs = buyerOrders
      .map((order) => sellerOrderServiceDate(order))
      .filter(Boolean)
      .sort()

    out.push({
      id: buyerId,
      name: latest.contact_name?.trim() || latest.contact_email?.trim() || 'Buyer',
      phone: latest.contact_phone?.trim() || '-',
      email: latest.contact_email?.trim() || '-',
      lastServiceDate: serviceDateStrs.length ? serviceDateStrs[serviceDateStrs.length - 1] : null,
      firstServiceDate: serviceDateStrs.length ? serviceDateStrs[0] : null,
      bookings: sortedByCreatedDesc.map(mapSellerOrderToCustomerBooking),
    })
  }

  out.sort((a, b) => {
    const ad = (a.lastServiceDate || '').localeCompare(b.lastServiceDate || '')
    return ad ? -ad : a.name.localeCompare(b.name)
  })

  return out
}

/**
 * @param {SellerOrderRow} row
 * @returns {string}
 */
export function resolvePaymentStatus(row) {
  const ps = row.payment_status
  if (ps) return String(ps).toLowerCase()
  const st = row.status
  if (st === 'paid') return 'paid'
  if (st === 'failed') return 'failed'
  return 'unpaid'
}

/**
 * @param {SellerOrderRow} row
 */
export function orderIsPaid(row) {
  return resolvePaymentStatus(row) === 'paid'
}

/**
 * @param {SellerOrderRow} row
 */
export function orderSubtotal(row) {
  return Number(row.subtotal) || 0
}

/**
 * @param {SellerOrderRow} row
 */
export function fulfillmentStatus(row) {
  return String(row.fulfillment_status || 'pending').toLowerCase()
}

/**
 * Maps to seller orders URL tab segment.
 * @param {SellerOrderRow} row
 */
export function orderTabForUrl(row) {
  const f = fulfillmentStatus(row)
  if (f === 'completed') return 'completed'
  if (f === 'cancelled') return 'cancelled'
  if (f === 'confirmed' || f === 'in_progress') return 'confirmed'
  return 'pending'
}

/**
 * @param {SellerOrderRow} row
 */
export function orderStatusLabel(row) {
  const f = fulfillmentStatus(row)
  if (f === 'completed') return 'Completed'
  if (f === 'cancelled') return 'Cancelled'
  if (f === 'confirmed') return 'Confirmed'
  if (f === 'in_progress') return 'In progress'
  return 'Pending'
}

/**
 * @param {Date} d
 */
function toYmdLocal(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/**
 * @param {string} iso
 */
function createdYmd(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return toYmdLocal(d)
}

/**
 * @param {SellerOrderRow[]} orders
 * @param {number} n
 */
export function paidRevenueByLastNDays(orders, n) {
  const keys = []
  for (let i = n - 1; i >= 0; i -= 1) {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    d.setDate(d.getDate() - i)
    keys.push(toYmdLocal(d))
  }
  const totals = Object.fromEntries(keys.map((k) => [k, 0]))
  for (const o of orders) {
    if (!orderIsPaid(o)) continue
    const k = createdYmd(o.created_at)
    if (k && Object.prototype.hasOwnProperty.call(totals, k)) totals[k] += orderSubtotal(o)
  }
  return keys.map((date) => ({ date, total: totals[date] ?? 0 }))
}

/**
 * Rolling weeks: each bucket is 7 days, oldest first (7 weeks total).
 * @param {SellerOrderRow[]} orders
 */
export function paidRevenueByLastNWeeks(orders, nWeeks) {
  const buckets = []
  const now = new Date()
  now.setHours(23, 59, 59, 999)
  for (let w = nWeeks - 1; w >= 0; w -= 1) {
    const end = new Date(now)
    end.setDate(end.getDate() - w * 7)
    const start = new Date(end)
    start.setDate(start.getDate() - 6)
    start.setHours(0, 0, 0, 0)
    const endDay = new Date(end)
    endDay.setHours(23, 59, 59, 999)
    const label = `${start.getMonth() + 1}/${start.getDate()}`
    buckets.push({ start: start.getTime(), end: endDay.getTime(), label })
  }
  return buckets.map(({ start, end, label }) => {
    let total = 0
    for (const o of orders) {
      if (!orderIsPaid(o)) continue
      const t = new Date(o.created_at).getTime()
      if (t >= start && t <= end) total += orderSubtotal(o)
    }
    return { label, total }
  })
}

const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/**
 * @param {SellerOrderRow[]} orders
 * @param {number} nMonths
 */
export function paidRevenueByLastNMonths(orders, nMonths) {
  const buckets = []
  const now = new Date()
  for (let i = nMonths - 1; i >= 0; i -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const y = d.getFullYear()
    const m = d.getMonth()
    const label = MONTH_SHORT[m]
    const start = new Date(y, m, 1).getTime()
    const end = new Date(y, m + 1, 0, 23, 59, 59, 999).getTime()
    buckets.push({ label, start, end })
  }
  return buckets.map(({ label, start, end }) => {
    let total = 0
    for (const o of orders) {
      if (!orderIsPaid(o)) continue
      const t = new Date(o.created_at).getTime()
      if (t >= start && t <= end) total += orderSubtotal(o)
    }
    return { label, total }
  })
}

/**
 * @param {SellerOrderRow[]} orders
 */
export function paidRevenueLast7DaysTotal(orders) {
  const series = paidRevenueByLastNDays(orders, 7)
  return series.reduce((s, x) => s + x.total, 0)
}

/**
 * @param {SellerOrderRow[]} orders
 */
export function paidRevenuePrevious7DaysTotal(orders) {
  const totals = new Map()
  for (let i = 13; i >= 7; i -= 1) {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    d.setDate(d.getDate() - i)
    totals.set(toYmdLocal(d), 0)
  }
  for (const o of orders) {
    if (!orderIsPaid(o)) continue
    const k = createdYmd(o.created_at)
    if (totals.has(k)) totals.set(k, (totals.get(k) || 0) + orderSubtotal(o))
  }
  let sum = 0
  for (const v of totals.values()) sum += v
  return sum
}

/**
 * @param {number} current
 * @param {number} previous
 */
export function percentChange(current, previous) {
  if (previous <= 0) {
    if (current > 0) return { text: 'New', up: true }
    return { text: '—', up: true }
  }
  const pct = ((current - previous) / previous) * 100
  const rounded = pct >= 0 ? `+${pct.toFixed(1)}%` : `${pct.toFixed(1)}%`
  return { text: rounded, up: pct >= 0 }
}

/**
 * @param {SellerOrderRow[]} orders
 */
export function totalPaidRevenueAllTime(orders) {
  let s = 0
  for (const o of orders) {
    if (orderIsPaid(o)) s += orderSubtotal(o)
  }
  return s
}

/**
 * @param {SellerOrderRow[]} orders
 */
export function pendingFulfillmentCount(orders) {
  return orders.filter((o) => fulfillmentStatus(o) === 'pending').length
}

/**
 * Unique buyers (any order).
 * @param {SellerOrderRow[]} orders
 */
export function uniqueBuyerCount(orders) {
  const set = new Set()
  for (const o of orders) {
    if (o.buyer_id) set.add(String(o.buyer_id))
  }
  return set.size
}

/**
 * Buyers whose first order with this seller falls in the current calendar month.
 * @param {SellerOrderRow[]} orders
 */
export function newBuyersThisMonthCount(orders) {
  const sorted = [...orders].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  )
  const firstAt = new Map()
  for (const o of sorted) {
    if (!o.buyer_id) continue
    const id = String(o.buyer_id)
    if (!firstAt.has(id)) firstAt.set(id, o.created_at)
  }
  const now = new Date()
  const y = now.getFullYear()
  const m = now.getMonth()
  const start = new Date(y, m, 1).getTime()
  const end = new Date(y, m + 1, 0, 23, 59, 59, 999).getTime()
  let n = 0
  for (const ts of firstAt.values()) {
    const t = new Date(ts).getTime()
    if (t >= start && t <= end) n += 1
  }
  return n
}

/**
 * @param {SellerOrderRow[]} orders
 */
export function newBuyersPreviousMonthCount(orders) {
  const sorted = [...orders].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  )
  const firstAt = new Map()
  for (const o of sorted) {
    if (!o.buyer_id) continue
    const id = String(o.buyer_id)
    if (!firstAt.has(id)) firstAt.set(id, o.created_at)
  }
  const now = new Date()
  const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const y = prev.getFullYear()
  const m = prev.getMonth()
  const start = new Date(y, m, 1).getTime()
  const end = new Date(y, m + 1, 0, 23, 59, 59, 999).getTime()
  let n = 0
  for (const ts of firstAt.values()) {
    const t = new Date(ts).getTime()
    if (t >= start && t <= end) n += 1
  }
  return n
}

/**
 * @param {SellerOrderRow[]} orders
 */
export function ordersCountLast30Days(orders) {
  const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000
  return orders.filter((o) => new Date(o.created_at).getTime() >= cutoff).length
}

/**
 * @param {SellerOrderRow[]} orders
 */
export function ordersCountPrevious30Days(orders) {
  const end = Date.now() - 30 * 24 * 60 * 60 * 1000
  const start = end - 30 * 24 * 60 * 60 * 1000
  return orders.filter((o) => {
    const t = new Date(o.created_at).getTime()
    return t >= start && t < end
  }).length
}

/**
 * @param {SellerOrderRow[]} orders
 */
export function paidOrdersLast30Days(orders) {
  const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000
  return orders.filter((o) => orderIsPaid(o) && new Date(o.created_at).getTime() >= cutoff)
}

/**
 * @param {SellerOrderRow[]} orders
 */
export function paidOrdersPrevious30Days(orders) {
  const end = Date.now() - 30 * 24 * 60 * 60 * 1000
  const start = end - 30 * 24 * 60 * 60 * 1000
  return orders.filter((o) => {
    if (!orderIsPaid(o)) return false
    const t = new Date(o.created_at).getTime()
    return t >= start && t < end
  })
}

/**
 * @param {SellerOrderRow[]} orders
 * @param {{ start: number, end: number }} range
 */
export function paidRevenueInRange(orders, range) {
  let s = 0
  for (const o of orders) {
    if (!orderIsPaid(o)) continue
    const t = new Date(o.created_at).getTime()
    if (t >= range.start && t <= range.end) s += orderSubtotal(o)
  }
  return s
}

/**
 * @param {SellerOrderRow[]} orders
 */
export function revenueThisCalendarMonth(orders) {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), 1).getTime()
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999).getTime()
  return paidRevenueInRange(orders, { start, end })
}

/**
 * @param {SellerOrderRow[]} orders
 */
export function revenuePreviousCalendarMonth(orders) {
  const now = new Date()
  const ref = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const start = new Date(ref.getFullYear(), ref.getMonth(), 1).getTime()
  const end = new Date(ref.getFullYear(), ref.getMonth() + 1, 0, 23, 59, 59, 999).getTime()
  return paidRevenueInRange(orders, { start, end })
}

/**
 * @param {SellerOrderRow[]} orders
 * @param {number} monthsBack 1 = previous month only
 */
export function bestMonthLabelLastNMonths(orders, nMonths) {
  const now = new Date()
  let bestLabel = '—'
  let bestAmt = -1
  for (let i = 0; i < nMonths; i += 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const y = d.getFullYear()
    const m = d.getMonth()
    const start = new Date(y, m, 1).getTime()
    const end = new Date(y, m + 1, 0, 23, 59, 59, 999).getTime()
    const amt = paidRevenueInRange(orders, { start, end })
    if (amt > bestAmt) {
      bestAmt = amt
      bestLabel = `${MONTH_SHORT[m]} ${y}`
    }
  }
  return { label: bestAmt > 0 ? bestLabel : '—', amount: Math.max(bestAmt, 0) }
}

/**
 * Outstanding paid value awaiting seller confirmation (actionable).
 * @param {SellerOrderRow[]} orders
 */
export function outstandingPaidPendingConfirmation(orders) {
  let s = 0
  for (const o of orders) {
    if (!orderIsPaid(o)) continue
    if (fulfillmentStatus(o) !== 'pending') continue
    s += orderSubtotal(o)
  }
  return s
}

/**
 * @param {SellerOrderRow[]} orders
 * @param {number} highValueThreshold
 */
export function highValuePaidPendingOrders(orders, highValueThreshold = 150_000) {
  return orders.filter(
    (o) =>
      orderIsPaid(o) &&
      fulfillmentStatus(o) === 'pending' &&
      orderSubtotal(o) >= highValueThreshold,
  )
}

/**
 * @param {SellerOrderRow[]} orders
 */
export function refundAttentionOrders(orders) {
  return orders.filter((o) => {
    const rs = String(o.refund_status || '').toLowerCase()
    return rs === 'requested' || rs === 'processing'
  })
}

/**
 * @param {{ approval_status?: string|null }[]} listingRows
 */
export function listingsPendingReviewCount(listingRows) {
  return listingRows.filter((r) => {
    const s = String(r.approval_status || '').toLowerCase()
    return s === 'pending' || s === 'pending_review' || s === 'in_review'
  }).length
}

/**
 * @param {{ approval_status?: string|null }[]} listingRows
 */
export function listingsApprovedCount(listingRows) {
  return listingRows.filter((r) => String(r.approval_status || '').toLowerCase() === 'approved')
    .length
}

/**
 * Top line items by allocated paid revenue (pro‑rata by quantity).
 * @param {SellerOrderRow[]} orders
 * @param {number} limit
 */
export function topPackagesByPaidRevenue(orders, limit = 6) {
  const paid = orders.filter((o) => orderIsPaid(o))
  const byName = new Map()
  for (const o of paid) {
    const items = Array.isArray(o.order_items) ? o.order_items : []
    const qtySum = items.reduce((s, it) => s + Math.max(1, Number(it.quantity) || 1), 0)
    const total = orderSubtotal(o)
    if (items.length === 0) {
      const key = 'Booking'
      const prev = byName.get(key) || { units: 0, revenue: 0 }
      byName.set(key, { units: prev.units + 1, revenue: prev.revenue + total })
      continue
    }
    for (const it of items) {
      const name = (it.name && String(it.name).trim()) || 'Item'
      const q = Math.max(1, Number(it.quantity) || 1)
      const share = (q / qtySum) * total
      const prev = byName.get(name) || { units: 0, revenue: 0 }
      byName.set(name, { units: prev.units + q, revenue: prev.revenue + share })
    }
  }
  return [...byName.entries()]
    .map(([name, v]) => ({ name, units: Math.round(v.units), revenue: v.revenue }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, limit)
}

/**
 * Confirmed vs pending booking counts by primary line item (last N months by `created_at`).
 * @param {SellerOrderRow[]} orders
 * @param {number} nMonths
 */
export function packageBookingCountsLastNMonths(orders, nMonths) {
  const now = new Date()
  const windowStart = new Date(now.getFullYear(), now.getMonth() - (nMonths - 1), 1).getTime()
  const filtered = orders.filter((o) => new Date(o.created_at).getTime() >= windowStart)
  const byLabel = new Map()
  for (const o of filtered) {
    const items = Array.isArray(o.order_items) ? o.order_items : []
    const label =
      items.length === 1
        ? String(items[0].name || 'Booking').trim() || 'Booking'
        : items.length > 1
          ? `${items.length} items`
          : 'Booking'
    const row = byLabel.get(label) || { confirmed: 0, pending: 0 }
    const f = fulfillmentStatus(o)
    if (f === 'completed' || f === 'confirmed' || f === 'in_progress') row.confirmed += 1
    else if (f !== 'cancelled') row.pending += 1
    byLabel.set(label, row)
  }
  return [...byLabel.entries()]
    .map(([label, v]) => ({ label, confirmed: v.confirmed, pending: v.pending }))
    .sort((a, b) => b.confirmed + b.pending - (a.confirmed + a.pending))
    .slice(0, 8)
}

/**
 * Revenue by listing category is not on orders — group by top line-item names (top 4 + Other).
 * @param {SellerOrderRow[]} orders
 * @param {number} nDays
 */
export function revenueByLineItemTopN(orders, nDays, topN = 4) {
  const keys = []
  for (let i = nDays - 1; i >= 0; i -= 1) {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    d.setDate(d.getDate() - i)
    keys.push(toYmdLocal(d))
  }
  const inWindow = orders.filter((o) => {
    if (!orderIsPaid(o)) return false
    const k = createdYmd(o.created_at)
    return keys.includes(k)
  })
  const byName = new Map()
  for (const o of inWindow) {
    const items = Array.isArray(o.order_items) ? o.order_items : []
    const qtySum = items.reduce((s, it) => s + Math.max(1, Number(it.quantity) || 1), 0)
    const total = orderSubtotal(o)
    if (items.length === 0) {
      const key = 'Other services'
      byName.set(key, (byName.get(key) || 0) + total)
      continue
    }
    for (const it of items) {
      const name = (it.name && String(it.name).trim()) || 'Item'
      const q = Math.max(1, Number(it.quantity) || 1)
      const share = (q / qtySum) * total
      byName.set(name, (byName.get(name) || 0) + share)
    }
  }
  const sorted = [...byName.entries()].sort((a, b) => b[1] - a[1])
  const head = sorted.slice(0, topN)
  let other = 0
  for (let i = topN; i < sorted.length; i += 1) other += sorted[i][1]
  const out = head.map(([name, value]) => ({ name, value }))
  if (other > 0) out.push({ name: 'Other', value: other })
  return out.length ? out : [{ name: 'No paid bookings yet', value: 0 }]
}

/**
 * Monthly bars: height % vs max (for CSS charts).
 * @param {SellerOrderRow[]} orders
 */
export function monthlyRevenueBarsLastNMonths(orders, nMonths) {
  const series = paidRevenueByLastNMonths(orders, nMonths)
  const maxAmt = Math.max(...series.map((x) => x.total), 1)
  return series.map((x) => ({
    label: x.label,
    amount: x.total,
    value: `${Math.round((x.total / maxAmt) * 100)}%`,
  }))
}

/**
 * Monthly paid revenue as CSS bar height % (single series; payout series not available client-side).
 * @param {SellerOrderRow[]} orders
 */
export function monthlyPaidRevenueBarPercents(orders, nMonths) {
  const series = paidRevenueByLastNMonths(orders, nMonths)
  const maxAmt = Math.max(...series.map((x) => x.total), 1)
  return series.map((x) => ({
    label: x.label,
    heightPct: `${Math.round((x.total / maxAmt) * 100)}%`,
    amount: x.total,
  }))
}

/**
 * @param {SellerOrderRow[]} orders
 */
export function averagePaidBookingValue(orders) {
  const paid = orders.filter(orderIsPaid)
  if (!paid.length) return 0
  const sum = paid.reduce((s, o) => s + orderSubtotal(o), 0)
  return sum / paid.length
}

/**
 * @param {SellerOrderRow[]} orders
 */
export function averagePaidBookingValueLastNMonths(orders, nMonths) {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth() - (nMonths - 1), 1).getTime()
  const paid = orders.filter(
    (o) => orderIsPaid(o) && new Date(o.created_at).getTime() >= start,
  )
  if (!paid.length) return 0
  return paid.reduce((s, o) => s + orderSubtotal(o), 0) / paid.length
}

/**
 * @param {SellerOrderRow[]} orders
 */
export function returningBuyerRate(orders) {
  const byBuyer = new Map()
  for (const o of orders) {
    if (!o.buyer_id) continue
    const id = String(o.buyer_id)
    if (!byBuyer.has(id)) byBuyer.set(id, [])
    byBuyer.get(id).push(o)
  }
  let returning = 0
  let total = 0
  for (const [, list] of byBuyer) {
    total += 1
    if (list.length > 1) returning += 1
  }
  if (!total) return 0
  return Math.round((returning / total) * 1000) / 10
}

/**
 * Average months between first and last order for buyers with 2+ orders.
 * @param {SellerOrderRow[]} orders
 */
export function averageMonthsBetweenRepeatBookings(orders) {
  const byBuyer = new Map()
  for (const o of orders) {
    if (!o.buyer_id) continue
    const id = String(o.buyer_id)
    if (!byBuyer.has(id)) byBuyer.set(id, [])
    byBuyer.get(id).push(new Date(o.created_at).getTime())
  }
  const gaps = []
  for (const times of byBuyer.values()) {
    if (times.length < 2) continue
    times.sort((a, b) => a - b)
    const spanMs = times[times.length - 1] - times[0]
    const months = spanMs / (30.44 * 24 * 60 * 60 * 1000)
    gaps.push(months / (times.length - 1))
  }
  if (!gaps.length) return null
  const avg = gaps.reduce((a, b) => a + b, 0) / gaps.length
  return Math.round(avg * 10) / 10
}

/**
 * Per calendar month: unique buyers with an order in month — new vs returning.
 * @param {SellerOrderRow[]} orders
 * @param {number} nMonths
 */
export function newVsReturningByMonth(orders, nMonths) {
  const sorted = [...orders].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  )
  const firstOrderAt = new Map()
  for (const o of sorted) {
    if (!o.buyer_id) continue
    const id = String(o.buyer_id)
    if (!firstOrderAt.has(id)) firstOrderAt.set(id, new Date(o.created_at).getTime())
  }

  const now = new Date()
  const out = []
  for (let i = nMonths - 1; i >= 0; i -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const y = d.getFullYear()
    const m = d.getMonth()
    const start = new Date(y, m, 1).getTime()
    const end = new Date(y, m + 1, 0, 23, 59, 59, 999).getTime()
    const label = MONTH_SHORT[m]
    const buyersInMonth = new Set()
    for (const o of orders) {
      if (!o.buyer_id) continue
      const t = new Date(o.created_at).getTime()
      if (t >= start && t <= end) buyersInMonth.add(String(o.buyer_id))
    }
    let fresh = 0
    let returning = 0
    for (const bid of buyersInMonth) {
      const first = firstOrderAt.get(bid)
      if (first == null) continue
      if (first >= start && first <= end) fresh += 1
      else returning += 1
    }
    out.push({ label, fresh, returning })
  }
  return out
}

/**
 * @param {SellerOrderRow[]} orders
 */
export function paidOrderCountLast12Months(orders) {
  const start = Date.now() - 365 * 24 * 60 * 60 * 1000
  let n = 0
  for (const o of orders) {
    if (!orderIsPaid(o)) continue
    if (new Date(o.created_at).getTime() >= start) n += 1
  }
  return n
}

/**
 * Unique families with any order in last 12 months.
 * @param {SellerOrderRow[]} orders
 */
export function familiesSupportedLast12Months(orders) {
  const start = Date.now() - 365 * 24 * 60 * 60 * 1000
  const buyers = new Set()
  for (const o of orders) {
    if (!o.buyer_id) continue
    if (new Date(o.created_at).getTime() >= start) buyers.add(String(o.buyer_id))
  }
  return buyers.size
}

/**
 * @param {SellerOrderRow[]} orders
 */
export function familiesNewThisMonth(orders) {
  return newBuyersThisMonthCount(orders)
}

/**
 * @param {SellerOrderRow[]} orders
 */
export function topPackageThisMonth(orders) {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), 1).getTime()
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999).getTime()
  const monthOrders = orders.filter((o) => {
    const t = new Date(o.created_at).getTime()
    return t >= start && t <= end
  })
  const counts = new Map()
  for (const o of monthOrders) {
    const items = Array.isArray(o.order_items) ? o.order_items : []
    const label =
      items.length === 1
        ? String(items[0].name || 'Booking').trim() || 'Booking'
        : items.length > 1
          ? `${items.length} items`
          : 'Booking'
    counts.set(label, (counts.get(label) || 0) + 1)
  }
  let best = '—'
  let bestN = 0
  for (const [k, v] of counts) {
    if (v > bestN) {
      best = k
      bestN = v
    }
  }
  return { name: best, count: bestN }
}

/**
 * @param {SellerOrderRow[]} orders
 */
export function packagesNeedingAttentionCount(orders) {
  const rows = packageBookingCountsLastNMonths(orders, 6)
  return rows.filter((r) => r.confirmed + r.pending < 2).length
}

/**
 * @param {SellerOrderRow[]} orders
 * @param {{ id: string, approval_status?: string|null }[]} listings
 */
export function buildSmartAlerts(orders, listings) {
  /** @type {{ id: string, type: string, message: string, priority?: string, orderId?: string, listingId?: string, href?: string }[]} */
  const alerts = []
  const refunds = refundAttentionOrders(orders)
  for (const o of refunds) {
    const id = String(o.id)
    alerts.push({
      id: `refund-${id}`,
      type: 'Refund',
      message: `Refund activity on order ${o.order_number || id.slice(0, 8)} — review in Orders.`,
      priority: 'high',
      orderId: id,
      href: `/seller/orders?orderId=${encodeURIComponent(id)}&action=view`,
    })
  }
  for (const o of highValuePaidPendingOrders(orders)) {
    const id = String(o.id)
    const tab = orderTabForUrl(o)
    alerts.push({
      id: `hv-${id}`,
      type: 'High-value booking',
      message: `Paid order ${o.order_number || id.slice(0, 8)} (${formatPhp(orderSubtotal(o))}) is awaiting your confirmation.`,
      priority: 'high',
      orderId: id,
      href: `/seller/orders?tab=${encodeURIComponent(tab)}&orderId=${encodeURIComponent(id)}&action=view`,
    })
  }
  const pendingListings = listingsPendingReviewCount(listings)
  if (pendingListings > 0) {
    alerts.push({
      id: 'listings-pending',
      type: 'Listings',
      message: `${pendingListings} listing${pendingListings === 1 ? '' : 's'} pending review. Submit or update them in Products.`,
      priority: 'medium',
      href: '/seller/products/catalog',
    })
  }
  return alerts
}

function formatPhp(n) {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n)
}
