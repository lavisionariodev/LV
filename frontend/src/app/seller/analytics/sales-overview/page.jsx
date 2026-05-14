'use client'

import { useMemo, useState } from 'react'
import { TbChartLine } from 'react-icons/tb'
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
import styles from '../analytics.module.css'
import { useSellerAnalyticsData } from '@/lib/seller/useSellerAnalyticsData'
import SellerAnalyticsLoadError from '../SellerAnalyticsLoadError'
import {
  averagePaidBookingValue,
  packageBookingCountsLastNMonths,
  paidOrdersLast30Days,
  paidRevenueByLastNDays,
  paidRevenueLast7DaysTotal,
  paidRevenuePrevious7DaysTotal,
  percentChange,
  revenueByLineItemTopN,
  monthlyRevenueBarsLastNMonths,
  topPackageThisMonth,
} from '@/lib/seller/sellerOrderAnalytics'
import { formatPhpWholeAmount } from '@/lib/cart/formatPhp'

const SELLER_BAR_COLORS = ['#1F312B', '#2D4A38', '#3D683A', '#4A7C47']
const SELLER_CHART_ACCENT = '#1F312B'
const PACKAGE_WINDOW_OPTIONS = [3, 6, 12]

function formatShortDate(dateStr) {
  const d = new Date(dateStr + 'T12:00:00')
  if (Number.isNaN(d.getTime())) return dateStr
  return `${d.getMonth() + 1}/${d.getDate()}`
}

const SALES_SUMMARY_SOFT = [
  styles.summaryCardSoftGreen,
  styles.summaryCardSoftBlue,
  styles.summaryCardSoftIndigo,
  styles.summaryCardSoftAmber,
]

function SalesOverviewChartCardSk({ withBadge, withAction }) {
  return (
    <article className={styles.chartCard}>
      <div className={styles.chartHeader}>
        <div className={styles.chartTitleGroup}>
          <span className={`${styles.analyticsSkBar} ${styles.analyticsSkChartHeadLine}`} />
          <span className={`${styles.analyticsSkBar} ${styles.analyticsSkChartHeadSub}`} />
        </div>
        {withBadge ? <span className={`${styles.analyticsSkBar} ${styles.analyticsSkChartBadge}`} /> : null}
        {withAction ? (
          <span className={styles.analyticsSkBar} style={{ height: 32, width: 124, borderRadius: 999 }} />
        ) : null}
      </div>
      <span className={`${styles.analyticsSkBar} ${styles.analyticsSkChartBlock}`} />
    </article>
  )
}

function SellerAnalyticsSalesOverviewSkeleton() {
  return (
    <div
      className={styles.pageWrap}
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label="Loading sales analytics"
    >
      <section className={styles.summaryStrip} aria-hidden>
        {SALES_SUMMARY_SOFT.map((soft, i) => (
          <article key={i} className={`${styles.summaryCard} ${soft}`}>
            <span className={`${styles.analyticsSkBar} ${styles.analyticsSkSummaryLabel}`} />
            <div className={styles.summaryValueRow}>
              <span className={`${styles.analyticsSkBar} ${styles.analyticsSkSummaryValue}`} />
            </div>
            <span className={`${styles.analyticsSkBar} ${styles.analyticsSkSummaryHint}`} />
          </article>
        ))}
      </section>

      <section className={styles.chartsGrid} aria-hidden>
        <SalesOverviewChartCardSk withBadge />
        <SalesOverviewChartCardSk />
      </section>

      <section className={styles.chartsGridTwo} aria-hidden>
        <SalesOverviewChartCardSk />
        <SalesOverviewChartCardSk withAction />
      </section>
    </div>
  )
}

export default function SellerAnalyticsSalesOverviewPage() {
  const { orders, loading, error, reload } = useSellerAnalyticsData()
  const [packageWindowMonths, setPackageWindowMonths] = useState(6)

  const revenueByDay = useMemo(() => paidRevenueByLastNDays(orders, 7), [orders])
  const revenueByCategory = useMemo(() => revenueByLineItemTopN(orders, 7, 4), [orders])
  const monthlyRevenue = useMemo(() => monthlyRevenueBarsLastNMonths(orders, 6), [orders])
  const packageBookings = useMemo(
    () => packageBookingCountsLastNMonths(orders, packageWindowMonths),
    [orders, packageWindowMonths],
  )

  const packageTotals = packageBookings.map((pkg) => pkg.confirmed + pkg.pending)
  const packageMaxTotal = Math.max(...packageTotals, 1)

  const rev7 = paidRevenueLast7DaysTotal(orders)
  const rev7prev = paidRevenuePrevious7DaysTotal(orders)
  const revDelta = percentChange(rev7, rev7prev)

  const paid30 = paidOrdersLast30Days(orders)

  const topPkg = topPackageThisMonth(orders)

  if (loading && !error) {
    return <SellerAnalyticsSalesOverviewSkeleton />
  }

  if (error) {
    return <SellerAnalyticsLoadError onRetry={() => reload()} />
  }

  return (
    <div className={styles.pageWrap}>

      <section aria-label="Sales summary" className={styles.summaryStrip}>
        <article className={`${styles.summaryCard} ${styles.summaryCardSoftGreen}`}>
          <p className={styles.summaryLabel}>Revenue (7 days)</p>
          <div className={styles.summaryValueRow}>
            <p className={styles.summaryValue}>{formatPhpWholeAmount(rev7)}</p>
            <span
              className={`${styles.summaryDelta} ${
                revDelta.up ? styles.summaryDeltaPositive : styles.summaryDeltaNegative
              }`}
            >
              {revDelta.text}
            </span>
          </div>
          <p className={styles.summaryHint}>Paid orders only · vs prior 7 days</p>
        </article>

        <article className={`${styles.summaryCard} ${styles.summaryCardSoftBlue}`}>
          <p className={styles.summaryLabel}>Average booking value</p>
          <div className={styles.summaryValueRow}>
            <p className={styles.summaryValue}>{formatPhpWholeAmount(averagePaidBookingValue(orders))}</p>
          </div>
          <p className={styles.summaryHint}>All paid orders</p>
        </article>

        <article className={`${styles.summaryCard} ${styles.summaryCardSoftIndigo}`}>
          <p className={styles.summaryLabel}>Paid transactions</p>
          <div className={styles.summaryValueRow}>
            <p className={styles.summaryValue}>{paid30.length}</p>
          </div>
          <p className={styles.summaryHint}>Last 30 days</p>
        </article>

        <article className={`${styles.summaryCard} ${styles.summaryCardSoftAmber}`}>
          <p className={styles.summaryLabel}>Top package</p>
          <div className={styles.summaryValueRow}>
            <p className={`${styles.summaryValue} ${styles.summaryValueCompact}`}>{topPkg.name}</p>
          </div>
          <p className={styles.summaryHint}>
            {topPkg.count > 0 ? `${topPkg.count} booking(s) this month` : 'No bookings this month'}
          </p>
        </article>
      </section>

      <section aria-label="Revenue and categories" className={styles.chartsGrid}>
        <article className={styles.chartCard}>
          <div className={styles.chartHeader}>
            <div className={styles.chartTitleGroup}>
              <h2 className={styles.chartTitle}>Revenue overview</h2>
              <p className={styles.chartSubtitle}>Last 7 days · paid orders</p>
            </div>
            <span className={styles.chartBadge}>
              <TbChartLine size={13} style={{ marginRight: 4 }} aria-hidden />
              Last 7 days
            </span>
          </div>

          <div className={styles.chartBody}>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={revenueByDay} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="revenueGradientSeller" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={SELLER_CHART_ACCENT} stopOpacity={0.35} />
                    <stop offset="100%" stopColor={SELLER_CHART_ACCENT} stopOpacity={0} />
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
                  formatter={(value) => [`₱ ${Number(value).toLocaleString()}`, 'Revenue']}
                  labelFormatter={(label) => `Date: ${label}`}
                  contentStyle={{ fontSize: 12, borderRadius: 8 }}
                />
                <Area
                  type="monotone"
                  dataKey="total"
                  stroke={SELLER_CHART_ACCENT}
                  strokeWidth={2}
                  fill="url(#revenueGradientSeller)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className={styles.chartCard}>
          <div className={styles.chartHeader}>
            <div className={styles.chartTitleGroup}>
              <h2 className={styles.chartTitle}>Revenue by line item</h2>
              <p className={styles.chartSubtitle}>Same 7‑day period · paid orders</p>
            </div>
          </div>

          <div className={styles.chartBody}>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart
                data={revenueByCategory}
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
                  width={120}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  formatter={(value) => [`₱ ${Number(value).toLocaleString()}`, 'Revenue']}
                  contentStyle={{ fontSize: 12, borderRadius: 8 }}
                />
                <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={24} label={false}>
                  {revenueByCategory.map((row, index) => (
                    <Cell
                      key={`${row.name}-${index}`}
                      fill={SELLER_BAR_COLORS[index % SELLER_BAR_COLORS.length]}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>
      </section>

      <section aria-label="Monthly and package insights" className={styles.chartsGridTwo}>
        <article className={styles.chartCard}>
          <div className={styles.chartHeader}>
            <div className={styles.chartTitleGroup}>
              <h2 className={styles.chartTitle}>Revenue by month</h2>
              <p className={styles.chartSubtitle}>Last 6 months · paid orders</p>
            </div>
          </div>

          <div className={styles.chartBody}>
            <div className={styles.chartWithYAxis}>
              <div className={styles.chartYAxisLabels} aria-hidden>
                {(() => {
                  const maxAmt = Math.max(...monthlyRevenue.map((m) => m.amount), 1)
                  return [1, 0.75, 0.5, 0.25, 0].map((step) => {
                    const v = maxAmt * step
                    const label = v >= 1000 ? `₱${(v / 1000).toFixed(0)}k` : `₱${Math.round(v)}`
                    return <span key={step}>{label}</span>
                  })
                })()}
              </div>

              <div>
                <div className={styles.barChartRow} aria-hidden>
                  {monthlyRevenue.map((month) => (
                    <div key={month.label} className={styles.barGroup}>
                      <div className={styles.barOuter}>
                        <div className={styles.barInnerPrimary} style={{ height: month.value }} />
                      </div>
                      <span className={styles.barLabel}>{month.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </article>

        <article className={styles.chartCard}>
          <div className={styles.chartHeader}>
            <div className={styles.chartTitleGroup}>
              <h2 className={styles.chartTitle}>Bookings by package</h2>
              <p className={styles.chartSubtitle}>
                Last {packageWindowMonths} months · confirmed and pending bookings
              </p>
            </div>
            <div className={styles.chartSegmentedControl} aria-label="Booking package date range">
              {PACKAGE_WINDOW_OPTIONS.map((months) => (
                <button
                  key={months}
                  type="button"
                  className={`${styles.chartActionButton} ${
                    packageWindowMonths === months ? styles.chartActionButtonActive : ''
                  }`}
                  onClick={() => setPackageWindowMonths(months)}
                  aria-pressed={packageWindowMonths === months}
                >
                  {packageWindowMonths === months ? (
                    <span className={styles.chartActionButtonIcon} aria-hidden>
                      <TbChartLine size={14} />
                    </span>
                  ) : null}
                  {months}-month view
                </button>
              ))}
            </div>
          </div>

          <div className={styles.chartBody}>
            <div className={styles.chartWithYAxis}>
              <div className={styles.chartYAxisLabels} aria-hidden>
                <span>{packageMaxTotal}</span>
                <span>{Math.round(packageMaxTotal * 0.75)}</span>
                <span>{Math.round(packageMaxTotal * 0.5)}</span>
                <span>{Math.round(packageMaxTotal * 0.25)}</span>
                <span>0</span>
              </div>

              <div>
                <div className={styles.chartScrollX}>
                  <div className={styles.barChartRow} aria-hidden>
                    {packageBookings.map((pkg) => {
                      const total = pkg.confirmed + pkg.pending
                      const totalPct = (total / packageMaxTotal) * 100
                      const confirmedPct = (pkg.confirmed / packageMaxTotal) * 100
                      const pendingPct = (pkg.pending / packageMaxTotal) * 100

                      return (
                        <div key={pkg.label} className={styles.barGroup}>
                          <div
                            className={styles.pillStackOuter}
                            title={`${total} bookings – ${pkg.label}`}
                          >
                            <div
                              className={styles.pillStackSegmentPrimary}
                              style={{ height: `${confirmedPct}%` }}
                            />
                            <div
                              className={styles.pillStackSegmentSecondary}
                              style={{ height: `${pendingPct}%` }}
                            />
                            <div style={{ height: `${Math.max(0, 100 - totalPct)}%` }} />
                          </div>
                          <div
                            className={styles.barLabel}
                            style={{ textAlign: 'center', maxWidth: 96 }}
                          >
                            {pkg.label}
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  <div className={styles.pillLegendRow} aria-hidden>
                    <span className={styles.legendItem}>
                      <span className={styles.pillLegendDot} style={{ background: '#1f312b' }} />
                      <span className={styles.pillLegendLabel}>Confirmed</span>
                    </span>
                    <span className={styles.legendItem}>
                      <span className={styles.pillLegendDot} style={{ background: '#8fb9a3' }} />
                      <span className={styles.pillLegendLabel}>Pending</span>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </article>
      </section>
    </div>
  )
}
