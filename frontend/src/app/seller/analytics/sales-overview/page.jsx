'use client'

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

const SELLER_BAR_COLORS = ['#1F312B', '#2D4A38', '#3D683A', '#4A7C47']
const SELLER_CHART_ACCENT = '#1F312B'

function formatShortDate(dateStr) {
  const d = new Date(dateStr)
  return `${d.getMonth() + 1}/${d.getDate()}`
}

export default function SellerAnalyticsSalesOverviewPage() {
  const revenueByDay = [
    { date: '2026-02-18', total: 42000 },
    { date: '2026-02-19', total: 46000 },
    { date: '2026-02-20', total: 38000 },
    { date: '2026-02-21', total: 52000 },
    { date: '2026-02-22', total: 61000 },
    { date: '2026-02-23', total: 58000 },
    { date: '2026-02-24', total: 64000 },
  ]

  const revenueByCategory = [
    { name: 'Memorial Packages', value: 160000 },
    { name: 'Flowers & Add-ons', value: 58000 },
    { name: 'Transport & Logistics', value: 32000 },
    { name: 'Documentation', value: 18000 },
  ]
  const monthlyRevenue = [
    { label: 'Oct', value: '68%', amount: 118000 },
    { label: 'Nov', value: '74%', amount: 126000 },
    { label: 'Dec', value: '82%', amount: 138000 },
    { label: 'Jan', value: '100%', amount: 168000 },
    { label: 'Feb', value: '76%', amount: 128000 },
    { label: 'Mar', value: '84%', amount: 142000 },
  ]

  const packageBookings = [
    { label: 'Traditional full', value: '82%', count: 24 },
    { label: 'Cremation', value: '64%', count: 18 },
    { label: 'Simple wake', value: '52%', count: 15 },
    { label: 'Memorial only', value: '28%', count: 8 },
  ]

  return (
    <div className={styles.pageWrap}>
      <section aria-label="Sales summary" className={styles.summaryStrip}>
        <article className={`${styles.summaryCard} ${styles.summaryCardSoftGreen}`}>
          <p className={styles.summaryLabel}>Revenue (7 days)</p>
          <div className={styles.summaryValueRow}>
            <p className={styles.summaryValue}>₱320k</p>
            <span className={`${styles.summaryDelta} ${styles.summaryDeltaPositive}`}>
              +12%
            </span>
          </div>
          <p className={styles.summaryHint}>Confirmed revenue</p>
        </article>

        <article className={`${styles.summaryCard} ${styles.summaryCardSoftBlue}`}>
          <p className={styles.summaryLabel}>Average booking value</p>
          <div className={styles.summaryValueRow}>
            <p className={styles.summaryValue}>₱26,800</p>
          </div>
          <p className={styles.summaryHint}>Per service</p>
        </article>

        <article className={`${styles.summaryCard} ${styles.summaryCardSoftIndigo}`}>
          <p className={styles.summaryLabel}>Transactions</p>
          <div className={styles.summaryValueRow}>
            <p className={styles.summaryValue}>32</p>
          </div>
          <p className={styles.summaryHint}>Last 7 days</p>
        </article>

        <article className={`${styles.summaryCard} ${styles.summaryCardSoftAmber}`}>
          <p className={styles.summaryLabel}>Top package</p>
          <div className={styles.summaryValueRow}>
            <p className={styles.summaryValue}>Traditional Full Service</p>
          </div>
          <p className={styles.summaryHint}>Most booked (30 days)</p>
        </article>
      </section>

      <section aria-label="Revenue and categories" className={styles.chartsGrid}>
        <article className={styles.chartCard}>
          <div className={styles.chartHeader}>
            <div className={styles.chartTitleGroup}>
              <h2 className={styles.chartTitle}>Revenue overview (sample data)</h2>
              <p className={styles.chartSubtitle}>Last 7 days</p>
            </div>
            <span className={styles.chartBadge}>
              <TbChartLine size={13} style={{ marginRight: 4 }} aria-hidden />
              Last 7 days
            </span>
          </div>

          <div className={styles.chartBody}>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart
                data={revenueByDay}
                margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
              >
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
              <h2 className={styles.chartTitle}>Revenue by category</h2>
              <p className={styles.chartSubtitle}>Same 7‑day period</p>
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
                <Bar
                  dataKey="value"
                  radius={[0, 4, 4, 0]}
                  maxBarSize={24}
                  label={false}
                >
                  {revenueByCategory.map((_, index) => (
                    // eslint-disable-next-line react/no-array-index-key
                    <Cell key={index} fill={SELLER_BAR_COLORS[index % SELLER_BAR_COLORS.length]} />
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
              <p className={styles.chartSubtitle}>Last 6 months</p>
            </div>
          </div>

          <div className={styles.chartBody}>
            <div className={styles.chartWithYAxis}>
              <div className={styles.chartYAxisLabels} aria-hidden>
                <span>₱180k</span>
                <span>₱150k</span>
                <span>₱120k</span>
                <span>₱90k</span>
                <span>₱60k</span>
                <span>₱30k</span>
                <span>₱0</span>
              </div>

              <div>
                <div className={styles.barChartRow} aria-hidden>
                  {monthlyRevenue.map((month) => (
                    <div key={month.label} className={styles.barGroup}>
                      <div className={styles.barOuter}>
                        <div
                          className={styles.barInnerPrimary}
                          style={{ height: month.value }}
                        />
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
              <p className={styles.chartSubtitle}>Last 30 days</p>
            </div>
          </div>

          <div className={styles.chartBody}>
            <div className={styles.chartWithYAxis}>
              <div className={styles.chartYAxisLabels} aria-hidden>
                <span>30</span>
                <span>24</span>
                <span>18</span>
                <span>12</span>
                <span>6</span>
                <span>0</span>
              </div>

              <div>
                <div className={styles.barChartRow} aria-hidden>
                  {packageBookings.map((pkg) => (
                    <div key={pkg.label} className={styles.barGroup}>
                      <div className={styles.barOuter} title={`${pkg.count} bookings – ${pkg.label}`}>
                        <div
                          className={styles.barInnerPrimary}
                          style={{ height: pkg.value }}
                        />
                      </div>
                      <span className={styles.barLabel}>{pkg.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </article>
      </section>
    </div>
  )
}
