'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import layoutStyles from '../admin.module.css'
import { disputes } from '@/data/adminSampleData'
import { formatCount } from '@/shared/utils/formatCount'
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

const BAR_COLORS = ['#1F312B', '#2D4A38', '#3D683A', '#4A7C47']
const CHART_ACCENT = '#1F312B'

function utcLast7DaysSeriesZeros() {
  const out = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setUTCHours(0, 0, 0, 0)
    d.setUTCDate(d.getUTCDate() - i)
    out.push({ date: d.toISOString().slice(0, 10), total: 0 })
  }
  return out
}

function formatShortDate(dateStr) {
  const d = new Date(`${String(dateStr)}T12:00:00Z`)
  return `${d.getUTCMonth() + 1}/${d.getUTCDate()}`
}

export default function AdminAnalyticsPage() {
  const openDisputesMock = disputes.filter((d) => d.status === 'open').length

  const [loading, setLoading] = useState(true)
  const [sellersTotal, setSellersTotal] = useState(0)
  const [buyersTotal, setBuyersTotal] = useState(0)
  const [paidOrdersLast30Days, setPaidOrdersLast30Days] = useState(0)
  const [dailyCollectedGmv, setDailyCollectedGmv] = useState(() => utcLast7DaysSeriesZeros())
  const [topLineItems, setTopLineItems] = useState([])
  const [recentActivity, setRecentActivity] = useState([])

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoading(true)
      try {
        const res = await fetch('/api/admin/metrics', { credentials: 'include' })
        const body = await res.json().catch(() => null)
        if (cancelled || !res.ok || !body?.payoutSummary) return
        setSellersTotal(Number(body.sellersTotal) || 0)
        setBuyersTotal(Number(body.buyersTotal) || 0)
        setPaidOrdersLast30Days(Number(body.paidOrdersLast30Days) || 0)
        if (Array.isArray(body.dailyCollectedGmv) && body.dailyCollectedGmv.length > 0) {
          setDailyCollectedGmv(body.dailyCollectedGmv)
        }
        if (Array.isArray(body.topLineItems)) setTopLineItems(body.topLineItems)
        if (Array.isArray(body.recentActivity)) setRecentActivity(body.recentActivity)
      } catch {
        // keep defaults / zeros
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className={layoutStyles.dashWrap}>
      {/* Stat cards — 4 col desktop, 2 col tablet/mobile */}
      <section className={layoutStyles.analyticsStatsGrid}>
        <div className={layoutStyles.statCard}>
          <p className={layoutStyles.statLabel}>Total Sellers</p>
          <p className={layoutStyles.statValue}>{formatCount(sellersTotal)}</p>
          <p className={layoutStyles.statHint}>Registered sellers</p>
        </div>
        <div className={layoutStyles.statCard}>
          <p className={layoutStyles.statLabel}>Total Buyers</p>
          <p className={layoutStyles.statValue}>{formatCount(buyersTotal)}</p>
          <p className={layoutStyles.statHint}>Buyer accounts</p>
        </div>
        <div className={layoutStyles.statCard}>
          <p className={layoutStyles.statLabel}>Paid orders</p>
          <p className={layoutStyles.statValue}>{formatCount(paidOrdersLast30Days)}</p>
          <p className={layoutStyles.statHint}>Last 30 days (count)</p>
        </div>
        <div className={layoutStyles.statCard}>
          <p className={layoutStyles.statLabel}>Open Disputes</p>
          <p className={layoutStyles.statValue}>{formatCount(openDisputesMock)}</p>
          <p className={layoutStyles.statHint}>Needs review</p>
        </div>
      </section>

      {/* Revenue overview panel */}
      <section className={layoutStyles.panel}>
        <div className={layoutStyles.panelHead}>
          <p className={layoutStyles.panelTitle}>Revenue overview</p>
          {loading ? <span style={{ fontSize: 13, color: '#64748b' }}>Loading…</span> : null}
        </div>
        <p className={layoutStyles.analyticsSubtitle}>
          Collected GMV from paid orders (order escrows), last 7 days · UTC day.
        </p>

        <div className={layoutStyles.analyticsChartGrid}>
          {/* Area chart — last 7 days GMV */}
          <div className={layoutStyles.analyticsChartBlock}>
            <p className={layoutStyles.analyticsChartLabel}>Last 7 days · GMV</p>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart
                data={dailyCollectedGmv}
                margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="analyticsGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={CHART_ACCENT} stopOpacity={0.35} />
                    <stop offset="100%" stopColor={CHART_ACCENT} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="date"
                  tickFormatter={formatShortDate}
                  tick={{ fontSize: 11, fill: '#64748b' }}
                />
                <YAxis
                  tickFormatter={(v) => `₱${(v / 1000).toFixed(0)}k`}
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  width={44}
                />
                <Tooltip
                  formatter={(value) => [`₱ ${Number(value).toLocaleString()}`, 'GMV collected']}
                  labelFormatter={(label) => `Date: ${label}`}
                  contentStyle={{ fontSize: 12, borderRadius: 8 }}
                />
                <Area
                  type="monotone"
                  dataKey="total"
                  stroke={CHART_ACCENT}
                  strokeWidth={2}
                  fill="url(#analyticsGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Bar chart — top line items (30d paid orders) */}
          <div className={layoutStyles.analyticsChartBlock}>
            <p className={layoutStyles.analyticsChartLabel}>Top paid line items · 30d</p>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart
                data={topLineItems.length > 0 ? topLineItems : [{ name: '—', value: 0 }]}
                layout="vertical"
                margin={{ top: 4, right: 8, left: 0, bottom: 4 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
                <XAxis
                  type="number"
                  tickFormatter={(v) => `₱${(v / 1000).toFixed(0)}k`}
                  tick={{ fontSize: 10, fill: '#64748b' }}
                  width={40}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fontSize: 11, fill: '#374151' }}
                  width={100}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  formatter={(value) => [`₱ ${Number(value).toLocaleString()}`, 'Line total']}
                  contentStyle={{ fontSize: 12, borderRadius: 8 }}
                />
                <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={24} label={false}>
                  {(topLineItems.length > 0 ? topLineItems : [{ name: '—', value: 0 }]).map(
                    (_, index) => (
                      <Cell key={index} fill={BAR_COLORS[index % BAR_COLORS.length]} />
                    ),
                  )}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      {/* Recent activity — full width */}
      <section className={`${layoutStyles.panel} ${layoutStyles.homeDesktopOnly}`}>
        <div className={layoutStyles.panelHead}>
          <p className={layoutStyles.panelTitle}>Recent activity</p>
          <Link href="/admin" className={layoutStyles.smallBtn}>
            Dashboard
          </Link>
        </div>
        <div className={layoutStyles.table}>
          <div className={layoutStyles.rowHead}>
            <span>Date</span>
            <span>Type</span>
            <span>Status</span>
          </div>
          {recentActivity.length === 0 ? (
            <div className={layoutStyles.row}>
              <span style={{ gridColumn: '1 / -1', color: '#64748b', fontSize: 13 }}>
                No recent paid orders yet.
              </span>
            </div>
          ) : (
            recentActivity.map((item) => (
              <div className={layoutStyles.row} key={item.id}>
                <span>{item.date}</span>
                <span>{item.type}</span>
                <span className={layoutStyles.badge}>{item.status}</span>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  )
}
