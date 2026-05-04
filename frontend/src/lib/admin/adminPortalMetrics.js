/**
 * Aggregations for `/api/admin/metrics` and payout summary helpers.
 */

/** @param {any} oEmbed */
export function pickOrder(oEmbed) {
  if (!oEmbed) return null
  return Array.isArray(oEmbed) ? oEmbed[0] ?? null : oEmbed
}

/** UTC calendar dates `YYYY-MM-DD` for today and the prior `n - 1` days (oldest first). */
export function utcDateKeysLastN(n) {
  const keys = []
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date()
    d.setUTCHours(0, 0, 0, 0)
    d.setUTCDate(d.getUTCDate() - i)
    keys.push(d.toISOString().slice(0, 10))
  }
  return keys
}

/**
 * @param {any[]} rows order_escrows rows with nested `orders` (payment_status, etc.)
 */
export function summarizeEscrowsForPayoutStats(rows) {
  const cutoffMs = Date.now() - 30 * 24 * 60 * 60 * 1000
  let platformRevenue30d = 0
  let pendingPayoutAmt = 0
  let completedReleasedAmt = 0

  for (const r of rows) {
    const ord = pickOrder(r.orders)
    if (!ord || ord.payment_status !== 'paid') continue

    if (r.status === 'released' && r.released_at) {
      const t = new Date(r.released_at).getTime()
      if (Number.isFinite(t) && t >= cutoffMs) {
        platformRevenue30d += Number(r.commission_amount) || 0
      }
      completedReleasedAmt += Number(r.net_amount) || 0
    }
    if (r.status === 'escrowed' || r.status === 'on_hold') {
      pendingPayoutAmt += Number(r.net_amount) || 0
    }
  }

  return {
    platformRevenue30d,
    pendingPayoutAmt,
    completedReleasedAmt,
    totalEscrows: rows.length,
  }
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} supabaseAdmin
 * @param {string[]} chartDayKeys
 */
export async function fetchDailyReleasedCommissionSeries(supabaseAdmin, chartDayKeys) {
  const dayTotals = Object.fromEntries(chartDayKeys.map((k) => [k, 0]))
  const windowStart = `${chartDayKeys[0]}T00:00:00.000Z`

  const { data: releasedChartRows, error } = await supabaseAdmin
    .from('order_escrows')
    .select(
      `
      commission_amount,
      released_at,
      orders ( payment_status )
    `,
    )
    .eq('status', 'released')
    .not('released_at', 'is', null)
    .gte('released_at', windowStart)

  if (!error) {
    for (const r of releasedChartRows ?? []) {
      const ord = pickOrder(r.orders)
      if (!ord || ord.payment_status !== 'paid') continue
      if (!r.released_at) continue
      const key = String(r.released_at).slice(0, 10)
      if (Object.prototype.hasOwnProperty.call(dayTotals, key)) {
        dayTotals[key] += Number(r.commission_amount) || 0
      }
    }
  }

  return chartDayKeys.map((date) => ({ date, total: dayTotals[date] ?? 0 }))
}

/**
 * GMV/collected totals by escrow `created_at` UTC day (paid orders only).
 * @param {import('@supabase/supabase-js').SupabaseClient} supabaseAdmin
 * @param {string[]} chartDayKeys
 */
export async function fetchDailyCollectedGmvSeries(supabaseAdmin, chartDayKeys) {
  const dayTotals = Object.fromEntries(chartDayKeys.map((k) => [k, 0]))
  const windowStart = `${chartDayKeys[0]}T00:00:00.000Z`

  const { data: rows } = await supabaseAdmin
    .from('order_escrows')
    .select('gross_amount, created_at, orders ( payment_status )')
    .gte('created_at', windowStart)

  for (const r of rows ?? []) {
    const ord = pickOrder(r.orders)
    if (!ord || ord.payment_status !== 'paid') continue
    const key = r.created_at ? String(r.created_at).slice(0, 10) : ''
    if (Object.prototype.hasOwnProperty.call(dayTotals, key)) {
      dayTotals[key] += Number(r.gross_amount) || 0
    }
  }

  return chartDayKeys.map((date) => ({ date, total: dayTotals[date] ?? 0 }))
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} supabaseAdmin
 * @param {string} cutoffIso
 * @returns {Promise<{ name: string, value: number }[]>}
 */
async function aggregateTopOrderLineItems(supabaseAdmin, cutoffIso) {
  const { data: orders } = await supabaseAdmin
    .from('orders')
    .select('id')
    .eq('payment_status', 'paid')
    .gte('created_at', cutoffIso)

  const ids = (orders ?? []).map((o) => o.id)
  if (ids.length === 0) return []

  /** @type {Map<string, number>} */
  const byName = new Map()
  const chunkSize = 200
  for (let i = 0; i < ids.length; i += chunkSize) {
    const chunk = ids.slice(i, i + chunkSize)
    const { data: items } = await supabaseAdmin
      .from('order_items')
      .select('name, price, quantity')
      .in('order_id', chunk)

    for (const it of items ?? []) {
      const name = String(it.name || 'Other').trim() || 'Other'
      const line = Number(it.price) * (Number(it.quantity) || 1)
      byName.set(name, (byName.get(name) || 0) + line)
    }
  }

  return [...byName.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8)
}

/**
 * Dashboard + analytics payloads (counts, charts, recent paid orders).
 * @param {import('@supabase/supabase-js').SupabaseClient} supabaseAdmin
 */
export async function getAdminPortalMetrics(supabaseAdmin) {
  const chartDayKeys = utcDateKeysLastN(7)
  const cutoff30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

  const escrowSelect = `
    gross_amount,
    commission_amount,
    net_amount,
    status,
    released_at,
    created_at,
    orders ( payment_status )
  `

  const [
    billingRes,
    sellersTotalRes,
    sellersActiveRes,
    buyersTotalRes,
    paidOrders30Res,
    escrowsLimitedRes,
    dailyReleasedCommission,
    dailyCollectedGmv,
    topLineItems,
    recentOrdersRes,
  ] = await Promise.all([
    supabaseAdmin.from('platform_billing').select('default_commission_percent').eq('id', 1).maybeSingle(),
    supabaseAdmin.from('sellers').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('sellers').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    supabaseAdmin.from('users').select('*', { count: 'exact', head: true }).eq('role', 'buyer'),
    supabaseAdmin
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('payment_status', 'paid')
      .gte('created_at', cutoff30),
    supabaseAdmin
      .from('order_escrows')
      .select(escrowSelect)
      .order('created_at', { ascending: false })
      .limit(500),
    fetchDailyReleasedCommissionSeries(supabaseAdmin, chartDayKeys),
    fetchDailyCollectedGmvSeries(supabaseAdmin, chartDayKeys),
    aggregateTopOrderLineItems(supabaseAdmin, cutoff30),
    supabaseAdmin
      .from('orders')
      .select('id, order_number, subtotal, payment_status, created_at')
      .eq('payment_status', 'paid')
      .order('created_at', { ascending: false })
      .limit(12),
  ])

  const defaultCommissionPercent =
    billingRes.data?.default_commission_percent != null
      ? Number(billingRes.data.default_commission_percent)
      : 10

  const escrowRows = escrowsLimitedRes.data ?? []
  const payoutAgg = summarizeEscrowsForPayoutStats(escrowRows)

  const recentActivity = (recentOrdersRes.data ?? []).map((o) => {
    const d = o.created_at ? String(o.created_at).slice(0, 10) : '—'
    const ref = o.order_number?.trim()
      ? o.order_number
      : `#${String(o.id).slice(0, 8)}`
    return {
      id: String(o.id),
      date: d,
      type: `Paid · ${ref}`,
      status: 'Paid',
    }
  })

  return {
    defaultCommissionPercent,
    sellersTotal: sellersTotalRes.count ?? 0,
    sellersActive: sellersActiveRes.count ?? 0,
    buyersTotal: buyersTotalRes.count ?? 0,
    paidOrdersLast30Days: paidOrders30Res.count ?? 0,
    payoutSummary: {
      platformRevenue30d: payoutAgg.platformRevenue30d,
      pendingPayoutAmt: payoutAgg.pendingPayoutAmt,
      completedReleasedAmt: payoutAgg.completedReleasedAmt,
      totalEscrows: payoutAgg.totalEscrows,
    },
    dailyReleasedCommission,
    dailyCollectedGmv,
    topLineItems,
    recentActivity,
  }
}
