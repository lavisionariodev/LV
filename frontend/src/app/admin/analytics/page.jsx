'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { MdArrowOutward } from 'react-icons/md'
import { TbChartBar, TbCoins, TbShoppingCart } from 'react-icons/tb'
import { LuUserCheck } from 'react-icons/lu'
import layoutStyles from '../admin.module.css'
import earningsStyles from '../earnings/earnings.module.css'
import analyticsStyles from './analytics.module.css'
import { formatCount, formatPHP } from '@/shared/utils'
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
const COMMISSION_ACCENT = '#2D4A38'
const RECENT_ACTIVITY_MAX = 5
const RANGE_OPTIONS = [
  { value: 7, label: '7d' },
  { value: 30, label: '30d' },
  { value: 90, label: '90d' },
]

const EMPTY_RANGE_SUMMARY = {
  gmvTotalInRange: 0,
  commissionReleasedInRange: 0,
  paidOrdersInRange: 0,
  avgOrderValueInRange: 0,
}

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

function chartXAxisInterval(rangeDays) {
  if (rangeDays >= 90) return 6
  if (rangeDays >= 30) return 2
  return 0
}

function seriesTotal(series) {
  return (series ?? []).reduce((sum, d) => sum + (Number(d?.total) || 0), 0)
}

function truncateLabel(name, max = 22) {
  const s = String(name || '').trim() || '—'
  if (s.length <= max) return s
  return `${s.slice(0, max - 1)}…`
}

/** @param {{ name: string, value: number }[]} rows */
function barChartRows(rows) {
  const source = rows.length > 0 ? rows : [{ name: '—', value: 0 }]
  return source.map((row) => ({
    ...row,
    fullName: row.name,
    name: truncateLabel(row.name),
  }))
}

function ChartRangeToggle({ rangeDays, onChange }) {
  return (
    <div className={earningsStyles.chartRangeGroup} role="group" aria-label="Date range">
      {RANGE_OPTIONS.map((opt) => {
        const active = rangeDays === opt.value
        return (
          <button
            key={opt.value}
            type="button"
            className={`${earningsStyles.chartRangeBtn}${active ? ` ${earningsStyles.chartRangeBtnActive}` : ''}`}
            aria-pressed={active}
            onClick={() => onChange(opt.value)}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}

function ChartEmpty({ message }) {
  return (
    <div className={analyticsStyles.chartEmpty} role="status">
      {message}
    </div>
  )
}

function AreaTrendChart({
  data,
  rangeDays,
  gradientId,
  strokeColor,
  tooltipLabel,
  emptyMessage,
}) {
  if (seriesTotal(data) <= 0) {
    return <ChartEmpty message={emptyMessage} />
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={strokeColor} stopOpacity={0.35} />
            <stop offset="100%" stopColor={strokeColor} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis
          dataKey="date"
          tickFormatter={formatShortDate}
          interval={chartXAxisInterval(rangeDays)}
          tick={{ fontSize: 11, fill: '#64748b' }}
        />
        <YAxis
          tickFormatter={(v) => `₱${(v / 1000).toFixed(0)}k`}
          tick={{ fontSize: 11, fill: '#64748b' }}
          width={44}
        />
        <Tooltip
          formatter={(value) => [`₱ ${Number(value).toLocaleString()}`, tooltipLabel]}
          labelFormatter={(label) => `Date: ${label}`}
          contentStyle={{ fontSize: 12, borderRadius: 8 }}
        />
        <Area
          type="monotone"
          dataKey="total"
          stroke={strokeColor}
          strokeWidth={2}
          fill={`url(#${gradientId})`}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}

function BreakdownBarChart({ rows, emptyMessage }) {
  const chartData = useMemo(() => barChartRows(rows), [rows])

  if (rows.length === 0 || chartData.every((r) => !r.value)) {
    return <ChartEmpty message={emptyMessage} />
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={chartData} layout="vertical" margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
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
          width={96}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip
          formatter={(value) => [`₱ ${Number(value).toLocaleString()}`, 'Total']}
          labelFormatter={(_, payload) => payload?.[0]?.payload?.fullName ?? '—'}
          contentStyle={{ fontSize: 12, borderRadius: 8 }}
        />
        <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={22} label={false}>
          {chartData.map((_, index) => (
            <Cell key={index} fill={BAR_COLORS[index % BAR_COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

function AnalyticsSkeleton() {
  return (
    <div
      className={layoutStyles.dashWrap}
      data-admin-analytics
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label="Loading analytics"
    >
      <div className={layoutStyles.analyticsSkStats}>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className={layoutStyles.analyticsSkStatCard}>
            <span className={`${layoutStyles.adminSkBar} ${layoutStyles.adminSkLine}`} style={{ height: 12, width: '55%' }} />
            <span className={`${layoutStyles.adminSkBar} ${layoutStyles.adminSkLine}`} style={{ height: 24, width: '70%' }} />
            <span className={`${layoutStyles.adminSkBar} ${layoutStyles.adminSkLine}`} style={{ height: 10, width: '45%' }} />
          </div>
        ))}
      </div>

      <section className={layoutStyles.analyticsSkPanel}>
        <div className={layoutStyles.analyticsSkPanelHead}>
          <span className={`${layoutStyles.adminSkBar} ${layoutStyles.adminSkLine}`} style={{ height: 16, width: 180 }} />
          <span className={`${layoutStyles.adminSkBar} ${layoutStyles.adminSkLine}`} style={{ height: 28, width: 120 }} />
        </div>
        <span className={`${layoutStyles.adminSkBar} ${layoutStyles.adminSkLine}`} style={{ height: 12, width: '62%', maxWidth: 420 }} />
        <div className={layoutStyles.analyticsSkChartGrid}>
          <span className={`${layoutStyles.adminSkBar} ${layoutStyles.analyticsSkChart}`} />
          <span className={`${layoutStyles.adminSkBar} ${layoutStyles.analyticsSkChart}`} />
        </div>
      </section>

      <section className={layoutStyles.analyticsSkPanel}>
        <div className={layoutStyles.analyticsSkPanelHead}>
          <span className={`${layoutStyles.adminSkBar} ${layoutStyles.adminSkLine}`} style={{ height: 16, width: 200 }} />
        </div>
        <div className={analyticsStyles.breakdownGrid}>
          {[0, 1, 2].map((i) => (
            <span key={i} className={`${layoutStyles.adminSkBar} ${layoutStyles.analyticsSkChart}`} />
          ))}
        </div>
      </section>

      <section className={layoutStyles.panel}>
        <div className={layoutStyles.panelHead}>
          <span className={`${layoutStyles.adminSkBar} ${layoutStyles.adminSkLine}`} style={{ height: 15, width: 160 }} />
        </div>
        <div className={layoutStyles.analyticsSkActivityHead}>
          <span className={`${layoutStyles.adminSkBar} ${layoutStyles.adminSkLine}`} style={{ height: 10 }} />
          <span className={`${layoutStyles.adminSkBar} ${layoutStyles.adminSkLine}`} style={{ height: 10 }} />
          <span className={`${layoutStyles.adminSkBar} ${layoutStyles.adminSkLine}`} style={{ height: 10 }} />
          <span className={`${layoutStyles.adminSkBar} ${layoutStyles.adminSkLine}`} style={{ height: 10 }} />
        </div>
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className={layoutStyles.analyticsSkActivityRow}>
            <span className={`${layoutStyles.adminSkBar} ${layoutStyles.adminSkLine}`} style={{ height: 12 }} />
            <span className={`${layoutStyles.adminSkBar} ${layoutStyles.adminSkLine}`} style={{ height: 12 }} />
            <span className={`${layoutStyles.adminSkBar} ${layoutStyles.adminSkLine}`} style={{ height: 12 }} />
            <span className={`${layoutStyles.adminSkBar} ${layoutStyles.adminSkLine}`} style={{ height: 22, borderRadius: 8 }} />
          </div>
        ))}
      </section>
    </div>
  )
}

function KpiCard({ href, label, value, hint, icon: Icon, ariaLabel }) {
  const inner = (
    <>
      <div className={layoutStyles.statCardTop}>
        <p className={layoutStyles.statLabel}>{label}</p>
        {href ? (
          <span className={layoutStyles.statCardArrow} aria-hidden>
            <MdArrowOutward />
          </span>
        ) : null}
      </div>
      <div className={layoutStyles.statCardBody}>
        <span className={layoutStyles.statCardIcon} aria-hidden>
          <Icon />
        </span>
        <div className={layoutStyles.statCardText}>
          <p className={layoutStyles.statValue}>{value}</p>
          <p className={layoutStyles.statHint}>{hint}</p>
        </div>
      </div>
    </>
  )

  if (href) {
    return (
      <Link href={href} className={`${layoutStyles.statCard} ${analyticsStyles.analyticsKpiCard}`} aria-label={ariaLabel}>
        {inner}
      </Link>
    )
  }

  return <article className={layoutStyles.statCard}>{inner}</article>
}

export default function AdminAnalyticsPage() {
  const [loading, setLoading] = useState(true)
  const [rangeDays, setRangeDays] = useState(7)
  const [dailyCollectedGmv, setDailyCollectedGmv] = useState(() => utcLastNDaysSeriesZeros(7))
  const [dailyReleasedCommission, setDailyReleasedCommission] = useState(() => utcLastNDaysSeriesZeros(7))
  const [rangeSummary, setRangeSummary] = useState(EMPTY_RANGE_SUMMARY)
  const [sellersActive, setSellersActive] = useState(0)
  const [buyersTotal, setBuyersTotal] = useState(0)
  const [topLineItems, setTopLineItems] = useState([])
  const [topSellers, setTopSellers] = useState([])
  const [topListings, setTopListings] = useState([])
  const [recentActivity, setRecentActivity] = useState([])
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
        if (!res.ok || !body?.rangeSummary) {
          const msg =
            typeof body?.error === 'string'
              ? body.error
              : "Couldn't load analytics."
          setMetricsError(msg)
          return
        }

        setRangeSummary({
          gmvTotalInRange: Number(body.rangeSummary.gmvTotalInRange) || 0,
          commissionReleasedInRange: Number(body.rangeSummary.commissionReleasedInRange) || 0,
          paidOrdersInRange: Number(body.rangeSummary.paidOrdersInRange) || 0,
          avgOrderValueInRange: Number(body.rangeSummary.avgOrderValueInRange) || 0,
        })
        setSellersActive(Number(body.sellersActive) || 0)
        setBuyersTotal(Number(body.buyersTotal) || 0)

        if (Array.isArray(body.dailyCollectedGmv) && body.dailyCollectedGmv.length > 0) {
          setDailyCollectedGmv(body.dailyCollectedGmv)
        } else {
          setDailyCollectedGmv(utcLastNDaysSeriesZeros(rangeDays))
        }
        if (Array.isArray(body.dailyReleasedCommission) && body.dailyReleasedCommission.length > 0) {
          setDailyReleasedCommission(body.dailyReleasedCommission)
        } else {
          setDailyReleasedCommission(utcLastNDaysSeriesZeros(rangeDays))
        }

        if (Array.isArray(body.topLineItems)) setTopLineItems(body.topLineItems)
        if (Array.isArray(body.topSellers)) setTopSellers(body.topSellers)
        if (Array.isArray(body.topListings)) setTopListings(body.topListings)
        if (Array.isArray(body.recentActivity)) {
          setRecentActivity(body.recentActivity.slice(0, RECENT_ACTIVITY_MAX))
        }
      } catch {
        if (!cancelled) {
          setMetricsError("Couldn't load analytics. Check your connection and try again.")
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
    return <AnalyticsSkeleton />
  }

  const rangeLabel = `last ${rangeDays} days`

  return (
    <div className={layoutStyles.dashWrap} data-admin-analytics>
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

      {!metricsError ? (
        <>
          <p className={analyticsStyles.intro}>
            Platform activity by UTC day. Settlement and PayMongo health live on{' '}
            <Link href="/admin/earnings" className={analyticsStyles.introLink}>
              Platform earnings
            </Link>
            .
          </p>

          <section className={layoutStyles.analyticsStatsGrid} aria-label="Summary metrics">
            <KpiCard
              label="GMV collected"
              value={formatPHP(rangeSummary.gmvTotalInRange)}
              hint={rangeLabel}
              icon={TbCoins}
              href="/admin/payouts?tab=transactions"
              ariaLabel="View payouts and transactions"
            />
            <KpiCard
              label="Paid orders"
              value={formatCount(rangeSummary.paidOrdersInRange, { desktop: true })}
              hint={rangeLabel}
              icon={TbShoppingCart}
              href="/admin/payouts?tab=transactions"
              ariaLabel="View paid orders in payouts"
            />
            <KpiCard
              label="Avg order value"
              value={formatPHP(rangeSummary.avgOrderValueInRange)}
              hint={rangeSummary.paidOrdersInRange > 0 ? 'GMV ÷ paid orders' : 'No paid orders in range'}
              icon={TbChartBar}
            />
            <KpiCard
              label="Active sellers"
              value={formatCount(sellersActive, { desktop: true })}
              hint={`${formatCount(buyersTotal, { desktop: true })} registered buyers`}
              icon={LuUserCheck}
              href="/admin/sellers"
              ariaLabel="View sellers"
            />
          </section>

          <section className={layoutStyles.panel}>
            <div className={layoutStyles.panelHead}>
              <p className={layoutStyles.panelTitle}>Marketplace trends</p>
              <ChartRangeToggle rangeDays={rangeDays} onChange={setRangeDays} />
            </div>
            <p className={layoutStyles.analyticsSubtitle}>
              GMV is collected when escrows are created for paid orders; commission is counted when
              escrows are released · {rangeLabel} · UTC.
            </p>

            <div className={analyticsStyles.trendsGrid}>
              <div className={layoutStyles.analyticsChartBlock}>
                <p className={layoutStyles.analyticsChartLabel}>GMV collected · {rangeDays}d</p>
                <AreaTrendChart
                  data={dailyCollectedGmv}
                  rangeDays={rangeDays}
                  gradientId="analyticsGmvGradient"
                  strokeColor={CHART_ACCENT}
                  tooltipLabel="GMV collected"
                  emptyMessage={`No paid order GMV in the last ${rangeDays} days.`}
                />
              </div>
              <div className={layoutStyles.analyticsChartBlock}>
                <p className={layoutStyles.analyticsChartLabel}>Commission released · {rangeDays}d</p>
                <AreaTrendChart
                  data={dailyReleasedCommission}
                  rangeDays={rangeDays}
                  gradientId="analyticsCommissionGradient"
                  strokeColor={COMMISSION_ACCENT}
                  tooltipLabel="Commission"
                  emptyMessage={`No commission released in the last ${rangeDays} days.`}
                />
              </div>
            </div>
          </section>

          <section className={layoutStyles.panel}>
            <div className={layoutStyles.panelHead}>
              <p className={layoutStyles.panelTitle}>Marketplace breakdown</p>
            </div>
            <p className={layoutStyles.analyticsSubtitle}>
              Top performers in the selected range ({rangeDays}d).
            </p>
            <div className={analyticsStyles.breakdownGrid}>
              <div className={layoutStyles.analyticsBreakdownBlock}>
                <p className={layoutStyles.analyticsChartLabel}>Top line items</p>
                <BreakdownBarChart
                  rows={topLineItems}
                  emptyMessage={`No paid line items in the last ${rangeDays} days.`}
                />
              </div>
              <div className={layoutStyles.analyticsBreakdownBlock}>
                <p className={layoutStyles.analyticsChartLabel}>Top sellers by GMV</p>
                <BreakdownBarChart
                  rows={topSellers}
                  emptyMessage={`No seller GMV in the last ${rangeDays} days.`}
                />
              </div>
              <div className={layoutStyles.analyticsBreakdownBlock}>
                <p className={layoutStyles.analyticsChartLabel}>Top listings / products</p>
                <BreakdownBarChart
                  rows={topListings}
                  emptyMessage={`No listing revenue in the last ${rangeDays} days.`}
                />
              </div>
            </div>
          </section>

          <section className={layoutStyles.panel}>
            <div className={layoutStyles.panelHead}>
              <div>
                <p className={layoutStyles.panelTitle}>Recent activity</p>
                <p className={analyticsStyles.activityLimit}>
                  Showing up to {RECENT_ACTIVITY_MAX} most recent paid orders.
                </p>
              </div>
              <Link href="/admin/payouts?tab=transactions" className={layoutStyles.smallBtn}>
                View payouts
              </Link>
            </div>

            <div className={analyticsStyles.activityTable}>
              <div className={analyticsStyles.activityHead}>
                <span>Date</span>
                <span>Order</span>
                <span>Amount</span>
                <span>Status</span>
              </div>
              {recentActivity.length === 0 ? (
                <div className={analyticsStyles.chartEmpty} role="status">
                  No recent paid orders yet.
                </div>
              ) : (
                recentActivity.map((item) => (
                  <Link
                    key={item.id}
                    href={item.payoutsHref || '/admin/payouts'}
                    className={analyticsStyles.activityRow}
                  >
                    <span>{item.date}</span>
                    <span className={analyticsStyles.activityOrder} title={item.orderNumber}>
                      {item.orderNumber}
                    </span>
                    <span className={analyticsStyles.activityAmount}>
                      {formatPHP(Number(item.amount) || 0)}
                    </span>
                    <span className={layoutStyles.badge}>{item.status}</span>
                  </Link>
                ))
              )}
            </div>
          </section>
        </>
      ) : null}
    </div>
  )
}
