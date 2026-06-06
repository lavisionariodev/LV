/**
 * Platform-wide analyst metrics for admin analytics dashboard and exports.
 * All KPIs use paid orders (`payment_status = 'paid'`) unless noted.
 */

const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** @typedef {{ id: string, buyer_id?: string|null, subtotal?: number|null, payment_status?: string|null, created_at: string }} AnalystOrderRow */

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
 * @param {AnalystOrderRow} row
 */
export function orderIsPaid(row) {
  return String(row?.payment_status || '').toLowerCase() === 'paid'
}

/**
 * UTC calendar month buckets, oldest first.
 * @param {number} nMonths
 * @param {Date} [now]
 */
export function utcMonthBuckets(nMonths, now = new Date()) {
  const ref = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
  /** @type {{ label: string, monthKey: string, startMs: number, endMs: number }[]} */
  const out = []
  for (let i = nMonths - 1; i >= 0; i -= 1) {
    const d = new Date(Date.UTC(ref.getUTCFullYear(), ref.getUTCMonth() - i, 1))
    const y = d.getUTCFullYear()
    const m = d.getUTCMonth()
    const startMs = Date.UTC(y, m, 1)
    const endMs = Date.UTC(y, m + 1, 0, 23, 59, 59, 999)
    out.push({
      label: MONTH_SHORT[m],
      monthKey: `${y}-${String(m + 1).padStart(2, '0')}`,
      startMs,
      endMs,
    })
  }
  return out
}

/**
 * @param {string} iso
 */
function createdMsUtc(iso) {
  const t = new Date(iso).getTime()
  return Number.isFinite(t) ? t : NaN
}

/**
 * @param {AnalystOrderRow[]} paidOrders
 * @param {number} nMonths
 * @param {Date} [now]
 */
export function buildMonthlySeriesFromOrders(paidOrders, nMonths = 12, now = new Date()) {
  const buckets = utcMonthBuckets(nMonths, now)
  const firstPaidAt = computeFirstPaidOrderAtByBuyer(paidOrders)

  const monthlyBookings = buckets.map(({ label, monthKey, startMs, endMs }) => {
    let count = 0
    let amount = 0
    for (const o of paidOrders) {
      const t = createdMsUtc(o.created_at)
      if (!Number.isFinite(t) || t < startMs || t > endMs) continue
      count += 1
      amount += Number(o.subtotal) || 0
    }
    let newCustomers = 0
    for (const ts of firstPaidAt.values()) {
      const t = createdMsUtc(ts)
      if (Number.isFinite(t) && t >= startMs && t <= endMs) newCustomers += 1
    }
    return { label, monthKey, count, amount, newCustomers }
  })

  return {
    monthlyBookings: monthlyBookings.map(({ label, monthKey, count }) => ({ label, monthKey, count })),
    monthlyRevenue: monthlyBookings.map(({ label, monthKey, amount }) => ({ label, monthKey, amount })),
    monthlyNewCustomers: monthlyBookings.map(({ label, monthKey, newCustomers }) => ({
      label,
      monthKey,
      count: newCustomers,
    })),
  }
}

/**
 * @param {AnalystOrderRow[]} paidOrders
 */
export function computeFirstPaidOrderAtByBuyer(paidOrders) {
  const sorted = [...paidOrders].sort(
    (a, b) => createdMsUtc(a.created_at) - createdMsUtc(b.created_at),
  )
  /** @type {Map<string, string>} */
  const firstAt = new Map()
  for (const o of sorted) {
    if (!o.buyer_id) continue
    const id = String(o.buyer_id)
    if (!firstAt.has(id)) firstAt.set(id, o.created_at)
  }
  return firstAt
}

/**
 * @param {AnalystOrderRow[]} paidOrders
 * @param {number} startMs
 * @param {number} endMs
 */
export function countOrdersInRange(paidOrders, startMs, endMs) {
  let n = 0
  for (const o of paidOrders) {
    const t = createdMsUtc(o.created_at)
    if (Number.isFinite(t) && t >= startMs && t <= endMs) n += 1
  }
  return n
}

/**
 * @param {AnalystOrderRow[]} paidOrders
 * @param {number} startMs
 * @param {number} endMs
 */
export function sumRevenueInRange(paidOrders, startMs, endMs) {
  let s = 0
  for (const o of paidOrders) {
    const t = createdMsUtc(o.created_at)
    if (!Number.isFinite(t) || t < startMs || t > endMs) continue
    s += Number(o.subtotal) || 0
  }
  return s
}

/**
 * @param {Map<string, string>} firstPaidAt
 * @param {number} startMs
 * @param {number} endMs
 */
export function countNewCustomersInRange(firstPaidAt, startMs, endMs) {
  let n = 0
  for (const ts of firstPaidAt.values()) {
    const t = createdMsUtc(ts)
    if (Number.isFinite(t) && t >= startMs && t <= endMs) n += 1
  }
  return n
}

/**
 * @param {AnalystOrderRow[]} paidOrders
 * @param {Date} [now]
 */
export function buildAnalystSummary(paidOrders, now = new Date()) {
  const buckets = utcMonthBuckets(2, now)
  const thisMonth = buckets[1] ?? buckets[0]
  const prevMonth = buckets[0]

  const firstPaidAt = computeFirstPaidOrderAtByBuyer(paidOrders)

  const bookingsThisMonth = countOrdersInRange(
    paidOrders,
    thisMonth.startMs,
    thisMonth.endMs,
  )
  const bookingsPrevMonth = prevMonth
    ? countOrdersInRange(paidOrders, prevMonth.startMs, prevMonth.endMs)
    : 0

  const revenueThisMonth = sumRevenueInRange(
    paidOrders,
    thisMonth.startMs,
    thisMonth.endMs,
  )
  const revenuePrevMonth = prevMonth
    ? sumRevenueInRange(paidOrders, prevMonth.startMs, prevMonth.endMs)
    : 0

  const newCustomersThisMonth = countNewCustomersInRange(
    firstPaidAt,
    thisMonth.startMs,
    thisMonth.endMs,
  )
  const newCustomersPrevMonth = prevMonth
    ? countNewCustomersInRange(firstPaidAt, prevMonth.startMs, prevMonth.endMs)
    : 0

  return {
    totalPaidOrders: paidOrders.length,
    bookingsThisMonth,
    bookingsPrevMonth,
    revenueThisMonth,
    revenuePrevMonth,
    newCustomersThisMonth,
    newCustomersPrevMonth,
    bookingGrowthRate: percentChange(bookingsThisMonth, bookingsPrevMonth),
    revenueGrowthRate: percentChange(revenueThisMonth, revenuePrevMonth),
  }
}

/**
 * @param {{ name?: string|null, price?: number|null, quantity?: number|null }[]} items
 * @param {number} [topN]
 */
export function buildRevenueMixFromItems(items, topN = 4) {
  /** @type {Map<string, number>} */
  const byName = new Map()
  for (const it of items) {
    const name = String(it.name || 'Other').trim() || 'Other'
    const line = (Number(it.price) || 0) * (Math.max(1, Number(it.quantity) || 1))
    byName.set(name, (byName.get(name) || 0) + line)
  }
  const sorted = [...byName.entries()].sort((a, b) => b[1] - a[1])
  const head = sorted.slice(0, topN)
  let other = 0
  for (let i = topN; i < sorted.length; i += 1) other += sorted[i][1]
  const out = head.map(([name, value]) => ({ name, value }))
  if (other > 0) out.push({ name: 'Other', value: other })
  if (!out.length) return [{ name: 'No paid bookings yet', value: 0 }]
  return out
}

/**
 * @param {ReturnType<typeof buildAnalystSummary>} summary
 * @param {{ label: string, count: number }[]} monthlyBookings
 * @param {{ name: string, value: number }[]} revenueMix
 */
export function buildAnalystInsights(summary, monthlyBookings, revenueMix) {
  /** @type {string[]} */
  const lines = []

  const bookingDelta = summary.bookingGrowthRate
  if (summary.bookingsThisMonth === 0 && summary.bookingsPrevMonth === 0) {
    lines.push('No paid bookings recorded this month or last month.')
  } else {
    lines.push(
      `Paid bookings this month: ${summary.bookingsThisMonth} (${bookingDelta.text} vs last month).`,
    )
  }

  const revenueDelta = summary.revenueGrowthRate
  if (summary.revenueThisMonth > 0 || summary.revenuePrevMonth > 0) {
    lines.push(
      `Revenue this month is ₱${Math.round(summary.revenueThisMonth).toLocaleString()} (${revenueDelta.text} vs last month).`,
    )
  }

  if (summary.newCustomersThisMonth !== summary.newCustomersPrevMonth) {
    const diff = summary.newCustomersThisMonth - summary.newCustomersPrevMonth
    const dir = diff > 0 ? 'up' : 'down'
    lines.push(
      `New customers this month: ${summary.newCustomersThisMonth} (${Math.abs(diff)} ${dir} vs last month).`,
    )
  } else {
    lines.push(`New customers this month: ${summary.newCustomersThisMonth}.`)
  }

  const mixTotal = revenueMix.reduce((s, r) => s + (Number(r.value) || 0), 0)
  const top = revenueMix.filter((r) => r.value > 0).sort((a, b) => b.value - a.value)[0]
  if (top && mixTotal > 0 && lines.length < 3) {
    const share = Math.round((top.value / mixTotal) * 100)
    lines.push(`${top.name} accounts for about ${share}% of line-item revenue in the last 12 months.`)
  }

  return lines.slice(0, 3)
}

/**
 * @param {{ monthKey: string, label: string, count: number }[]} monthlyBookings
 * @param {{ monthKey: string, amount: number }[]} monthlyRevenue
 * @param {{ monthKey: string, count: number }[]} monthlyNewCustomers
 */
export function buildAnalystExportRows(monthlyBookings, monthlyRevenue, monthlyNewCustomers) {
  const revenueByKey = new Map(monthlyRevenue.map((r) => [r.monthKey, r.amount]))
  const newByKey = new Map(monthlyNewCustomers.map((r) => [r.monthKey, r.count]))
  return monthlyBookings.map((row) => ({
    month: row.monthKey,
    monthLabel: row.label,
    bookings: row.count,
    revenue_php: Math.round(revenueByKey.get(row.monthKey) ?? 0),
    new_customers: newByKey.get(row.monthKey) ?? 0,
  }))
}

export function csvEscape(v) {
  const s = String(v ?? '')
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

/**
 * @param {ReturnType<typeof buildAnalystExportRows>} rows
 * @param {ReturnType<typeof buildAnalystSummary>} summary
 */
export function buildAnalystExportCsv(rows, summary) {
  const header = ['month', 'bookings', 'revenue_php', 'new_customers']
  const body = rows
    .map((r) =>
      [r.month, r.bookings, r.revenue_php, r.new_customers].map(csvEscape).join(','),
    )
    .join('\n')
  const kpiLines = [
    '',
    '# KPI Snapshot',
    `total_paid_orders,${summary.totalPaidOrders}`,
    `bookings_this_month,${summary.bookingsThisMonth}`,
    `revenue_this_month,${summary.revenueThisMonth}`,
    `new_customers_this_month,${summary.newCustomersThisMonth}`,
    `booking_growth_rate,${summary.bookingGrowthRate.text}`,
  ]
  return `${header.join(',')}\n${body}${kpiLines.join('\n')}\n`
}

/**
 * @param {ReturnType<typeof buildAnalystExportRows>} rows
 * @param {ReturnType<typeof buildAnalystSummary>} summary
 */
export function buildAnalystExportSheets(rows, summary) {
  const monthlySummary = rows.map((r) => ({
    Month: r.month,
    Bookings: r.bookings,
    RevenuePHP: r.revenue_php,
    NewCustomers: r.new_customers,
  }))
  const kpiSnapshot = [
    { Metric: 'Total paid orders', Value: summary.totalPaidOrders },
    { Metric: 'Bookings this month', Value: summary.bookingsThisMonth },
    { Metric: 'Revenue this month (PHP)', Value: summary.revenueThisMonth },
    { Metric: 'New customers this month', Value: summary.newCustomersThisMonth },
    { Metric: 'Booking growth rate', Value: summary.bookingGrowthRate.text },
  ]
  return { monthlySummary, kpiSnapshot }
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} supabaseAdmin
 */
async function fetchAllOrdersForAnalyst(supabaseAdmin) {
  const pageSize = 1000
  /** @type {AnalystOrderRow[]} */
  const rows = []
  for (let offset = 0; offset < 50000; offset += pageSize) {
    const { data, error } = await supabaseAdmin
      .from('orders')
      .select('id, buyer_id, subtotal, payment_status, created_at')
      .order('created_at', { ascending: false })
      .range(offset, offset + pageSize - 1)
    if (error) throw error
    rows.push(...(data || []))
    if (!data || data.length < pageSize) break
  }
  return rows
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} supabaseAdmin
 * @param {string[]} orderIds
 */
async function fetchOrderItemsForAnalyst(supabaseAdmin, orderIds) {
  if (!orderIds.length) return []
  const chunkSize = 200
  /** @type {{ name?: string|null, price?: number|null, quantity?: number|null }[]} */
  const items = []
  for (let i = 0; i < orderIds.length; i += chunkSize) {
    const chunk = orderIds.slice(i, i + chunkSize)
    const { data, error } = await supabaseAdmin
      .from('order_items')
      .select('name, price, quantity')
      .in('order_id', chunk)
    if (error) throw error
    items.push(...(data || []))
  }
  return items
}

/**
 * Full analyst payload for dashboard and export.
 * @param {import('@supabase/supabase-js').SupabaseClient} supabaseAdmin
 */
export async function getAdminAnalystMetrics(supabaseAdmin) {
  const allOrders = await fetchAllOrdersForAnalyst(supabaseAdmin)
  const paidOrders = allOrders.filter(orderIsPaid)

  const now = new Date()
  const { monthlyBookings, monthlyRevenue, monthlyNewCustomers } = buildMonthlySeriesFromOrders(
    paidOrders,
    12,
    now,
  )

  const buckets12 = utcMonthBuckets(12, now)
  const windowStart = buckets12[0]?.startMs ?? 0
  const orderIds12m = paidOrders
    .filter((o) => {
      const t = createdMsUtc(o.created_at)
      return Number.isFinite(t) && t >= windowStart
    })
    .map((o) => o.id)

  const items = await fetchOrderItemsForAnalyst(supabaseAdmin, orderIds12m)
  const revenueMix = buildRevenueMixFromItems(items, 4)
  const analystSummary = buildAnalystSummary(paidOrders, now)
  const insights = buildAnalystInsights(analystSummary, monthlyBookings, revenueMix)
  const exportRows = buildAnalystExportRows(monthlyBookings, monthlyRevenue, monthlyNewCustomers)

  return {
    analystSummary,
    monthlyBookings,
    monthlyRevenue,
    monthlyNewCustomers,
    revenueMix,
    insights,
    exportRows,
  }
}
