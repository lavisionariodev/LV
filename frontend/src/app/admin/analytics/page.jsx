'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import layoutStyles from '../admin.module.css'
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
const RANGE_OPTIONS = [
  { value: 7, label: '7d' },
  { value: 30, label: '30d' },
  { value: 90, label: '90d' },
]

function utcLastNDaysSeriesZeros(n) {
  const out = []
  for (let i = n - 1; i >= 0; i--) {
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
  const [loading, setLoading] = useState(true)
  const [rangeDays, setRangeDays] = useState(7)
  const [sellersTotal, setSellersTotal] = useState(0)
  const [buyersTotal, setBuyersTotal] = useState(0)
  const [paidOrdersLast30Days, setPaidOrdersLast30Days] = useState(0)
  const [dailyCollectedGmv, setDailyCollectedGmv] = useState(() => utcLastNDaysSeriesZeros(7))
  const [topLineItems, setTopLineItems] = useState([])
  const [recentActivity, setRecentActivity] = useState([])
  const [disputesNeedingAttention, setDisputesNeedingAttention] = useState(0)
  const [metricsError, setMetricsError] = useState(null)
  const [metricsRetryTick, setMetricsRetryTick] = useState(0)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoading(true)
      setMetricsError(null)
      try {
        const res = await fetch(`/api/admin/metrics?range=${rangeDays}d`, {
          credentials: 'include',
        })
        const body = await res.json().catch(() => null)
        if (cancelled) return
        if (!res.ok || !body?.payoutSummary) {
          const msg =
            typeof body?.error === 'string'
              ? body.error
              : 'Could not load analytics. Charts and totals below may be incomplete.'
          setMetricsError(msg)
          return
        }
        setSellersTotal(Number(body.sellersTotal) || 0)
        setBuyersTotal(Number(body.buyersTotal) || 0)
        setPaidOrdersLast30Days(Number(body.paidOrdersLast30Days) || 0)
        if (Array.isArray(body.dailyCollectedGmv) && body.dailyCollectedGmv.length > 0) {
          setDailyCollectedGmv(body.dailyCollectedGmv)
        } else {
          setDailyCollectedGmv(utcLastNDaysSeriesZeros(rangeDays))
        }
        if (Array.isArray(body.topLineItems)) setTopLineItems(body.topLineItems)
        if (Array.isArray(body.recentActivity)) setRecentActivity(body.recentActivity)
        setDisputesNeedingAttention(Number(body.disputesNeedingAttention) || 0)
      } catch {
        if (!cancelled) {
          setMetricsError(
            'Could not load analytics. Check your connection and try again.',
          )
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [rangeDays, metricsRetryTick])

  if (loading) {
    return (
      <div className={layoutStyles.dashWrap} role="status" aria-live="polite" aria-busy="true" aria-label="Loading analytics">
        <section className={layoutStyles.analyticsSkStats}>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className={layoutStyles.analyticsSkStatCard}>
              <span className={`${layoutStyles.adminSkBar} ${layoutStyles.authGateSkNavItem}`} style={{ height: 11, width: '55%' }} />
              <span className={`${layoutStyles.adminSkBar} ${layoutStyles.authGateSkNavItem}`} style={{ height: 24, width: '48%' }} />
              <span className={`${layoutStyles.adminSkBar} ${layoutStyles.authGateSkNavItem}`} style={{ height: 10, width: '72%' }} />
            </div>
          ))}
        </section>
        <section className={layoutStyles.analyticsSkPanel}>
          <div className={layoutStyles.analyticsSkPanelHead}>
            <span className={`${layoutStyles.adminSkBar} ${layoutStyles.authGateSkNavItem}`} style={{ height: 16, width: 180 }} />
            <span className={`${layoutStyles.adminSkBar} ${layoutStyles.authGateSkNavItem}`} style={{ height: 12, width: 100 }} />
          </div>
          <span className={`${layoutStyles.adminSkBar} ${layoutStyles.authGateSkNavItem}`} style={{ height: 12, width: '62%', maxWidth: 400 }} />
          <div className={layoutStyles.analyticsSkChartGrid}>
            <span className={`${layoutStyles.adminSkBar} ${layoutStyles.analyticsSkChart}`} />
            <span className={`${layoutStyles.adminSkBar} ${layoutStyles.analyticsSkChart}`} />
          </div>
        </section>
        <section className={`${layoutStyles.panel} ${layoutStyles.homeDesktopOnly}`}>
          <div className={layoutStyles.panelHead}>
            <span className={`${layoutStyles.adminSkBar} ${layoutStyles.authGateSkNavItem}`} style={{ height: 15, width: 160 }} />
          </div>
          <div className={layoutStyles.analyticsSkRowHead}>
            <span className={`${layoutStyles.adminSkBar} ${layoutStyles.authGateSkNavItem}`} style={{ height: 10 }} />
            <span className={`${layoutStyles.adminSkBar} ${layoutStyles.authGateSkNavItem}`} style={{ height: 10 }} />
            <span className={`${layoutStyles.adminSkBar} ${layoutStyles.authGateSkNavItem}`} style={{ height: 10 }} />
          </div>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className={layoutStyles.analyticsSkRow}>
              <span className={`${layoutStyles.adminSkBar} ${layoutStyles.authGateSkNavItem}`} style={{ height: 12 }} />
              <span className={`${layoutStyles.adminSkBar} ${layoutStyles.authGateSkNavItem}`} style={{ height: 12 }} />
              <span className={`${layoutStyles.adminSkBar} ${layoutStyles.authGateSkNavItem}`} style={{ height: 22, borderRadius: 8 }} />
            </div>
          ))}
        </section>
        <section className={`${layoutStyles.panel} ${layoutStyles.homeMobileOnly}`}>
          <div className={layoutStyles.panelHead}>
            <span className={`${layoutStyles.adminSkBar} ${layoutStyles.authGateSkNavItem}`} style={{ height: 15, width: 160 }} />
          </div>
          <div className={layoutStyles.analyticsSkRowHead}>
            <span className={`${layoutStyles.adminSkBar} ${layoutStyles.authGateSkNavItem}`} style={{ height: 10 }} />
            <span className={`${layoutStyles.adminSkBar} ${layoutStyles.authGateSkNavItem}`} style={{ height: 10 }} />
            <span className={`${layoutStyles.adminSkBar} ${layoutStyles.authGateSkNavItem}`} style={{ height: 10 }} />
          </div>
          {[0, 1, 2, 3].map((i) => (
            <div key={`m-sk-act-${i}`} className={layoutStyles.analyticsSkRow}>
              <span className={`${layoutStyles.adminSkBar} ${layoutStyles.authGateSkNavItem}`} style={{ height: 12 }} />
              <span className={`${layoutStyles.adminSkBar} ${layoutStyles.authGateSkNavItem}`} style={{ height: 12 }} />
              <span className={`${layoutStyles.adminSkBar} ${layoutStyles.authGateSkNavItem}`} style={{ height: 22, borderRadius: 8 }} />
            </div>
          ))}
        </section>
      </div>
    )
  }

  return (
    <div className={layoutStyles.dashWrap}>
      {metricsError ? (
        <div className={layoutStyles.metricsLoadBanner} role="alert">
          <p className={layoutStyles.metricsLoadBannerText}>{metricsError}</p>
          <div className={layoutStyles.metricsLoadBannerActions}>
            <button
              type="button"
              className={layoutStyles.metricsLoadBannerBtn}
              onClick={() => setMetricsRetryTick((n) => n + 1)}
            >
              Try again
            </button>
          </div>
        </div>
      ) : null}
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
          <p className={layoutStyles.statLabel}>Disputes to review</p>
          <p className={layoutStyles.statValue}>{formatCount(disputesNeedingAttention)}</p>
          <p className={layoutStyles.statHint}>Open or under review</p>
        </div>
      </section>

      {/* Revenue overview panel */}
      <section className={layoutStyles.panel}>
        <div className={layoutStyles.panelHead}>
          <p className={layoutStyles.panelTitle}>Revenue overview</p>
          <div
            role="group"
            aria-label="Date range"
            style={{ display: 'inline-flex', gap: 4, padding: 2, background: '#f1f5f9', borderRadius: 8 }}
          >
            {RANGE_OPTIONS.map((opt) => {
              const active = rangeDays === opt.value
              return (
                <button
                  key={opt.value}
                  type="button"
                  className={layoutStyles.smallBtn}
                  aria-pressed={active}
                  onClick={() => setRangeDays(opt.value)}
                  style={{
                    background: active ? '#1F312B' : 'transparent',
                    color: active ? '#fff' : '#334155',
                    border: 'none',
                    padding: '4px 10px',
                    fontSize: 12,
                    fontWeight: active ? 600 : 500,
                    borderRadius: 6,
                    cursor: 'pointer',
                  }}
                >
                  {opt.label}
                </button>
              )
            })}
          </div>
        </div>
        <p className={layoutStyles.analyticsSubtitle}>
          Collected GMV from paid orders (order escrows), last {rangeDays} days · UTC day.
        </p>

        <div className={layoutStyles.analyticsChartGrid}>
          {/* Area chart — last N days GMV */}
          <div className={layoutStyles.analyticsChartBlock}>
            <p className={layoutStyles.analyticsChartLabel}>Last {rangeDays} days · GMV</p>
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

          {/* Bar chart — top line items (paid orders within selected range) */}
          <div className={layoutStyles.analyticsChartBlock}>
            <p className={layoutStyles.analyticsChartLabel}>
              Top paid line items · {rangeDays}d
            </p>
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

      {/* Recent activity — desktop */}
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

      {/* Recent activity — mobile (matches dashboard lower panel pattern) */}
      <section className={`${layoutStyles.panel} ${layoutStyles.homeMobileOnly}`}>
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
              <div className={layoutStyles.row} key={`m-${item.id}`}>
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
