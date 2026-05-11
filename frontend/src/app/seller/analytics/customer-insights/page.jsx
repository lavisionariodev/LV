'use client'

import { useMemo } from 'react'
import { useSiteContent } from '@/lib/siteContent/client'
import { TbUsers } from 'react-icons/tb'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import styles from '../analytics.module.css'
import { useSellerAnalyticsData } from '@/lib/seller/useSellerAnalyticsData'
import {
  averageMonthsBetweenRepeatBookings,
  familiesSupportedLast12Months,
  newBuyersThisMonthCount,
  newVsReturningByMonth,
  paidOrderCountLast12Months,
  returningBuyerRate,
} from '@/lib/seller/sellerOrderAnalytics'

const CUSTOMER_BAR_COLORS = {
  returning: '#1f312b',
  fresh: '#9ca3af',
}

const CUSTOMER_INSIGHTS_SUMMARY_SOFT = [
  styles.summaryCardSoftGreen,
  styles.summaryCardSoftBlue,
  styles.summaryCardSoftIndigo,
  styles.summaryCardSoftAmber,
]

function SellerAnalyticsCustomerInsightsSkeleton() {
  return (
    <div
      className={styles.pageWrap}
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label="Loading customer analytics"
    >
      <section className={styles.summaryStrip} aria-hidden>
        {CUSTOMER_INSIGHTS_SUMMARY_SOFT.map((soft, i) => (
          <article key={i} className={`${styles.summaryCard} ${soft}`}>
            <span className={`${styles.analyticsSkBar} ${styles.analyticsSkSummaryLabel}`} />
            <div className={styles.summaryValueRow}>
              <span className={`${styles.analyticsSkBar} ${styles.analyticsSkSummaryValue}`} />
            </div>
            <span className={`${styles.analyticsSkBar} ${styles.analyticsSkSummaryHint}`} />
          </article>
        ))}
      </section>

      <section className={styles.chartsGridSingle} aria-hidden>
        <article className={styles.chartCard}>
          <div className={styles.chartHeader}>
            <div className={styles.chartTitleGroup}>
              <span className={`${styles.analyticsSkBar} ${styles.analyticsSkChartHeadLine}`} />
              <span className={`${styles.analyticsSkBar} ${styles.analyticsSkChartHeadSub}`} />
            </div>
            <span className={`${styles.analyticsSkBar} ${styles.analyticsSkChartBadge}`} />
          </div>
          <span className={`${styles.analyticsSkBar} ${styles.analyticsSkChartBlock}`} />
        </article>
      </section>
    </div>
  )
}

export default function SellerAnalyticsCustomerInsightsPage() {
  const { data: siteContent } = useSiteContent()
  const systemName = siteContent?.systemName || 'La Visionario'
  const { orders, loading, error } = useSellerAnalyticsData()

  const chartData = useMemo(() => newVsReturningByMonth(orders, 6), [orders])
  const maxStack = useMemo(
    () => Math.max(...chartData.map((d) => d.fresh + d.returning), 1),
    [chartData],
  )

  const families12 = familiesSupportedLast12Months(orders)
  const newThis = newBuyersThisMonthCount(orders)

  const returning = returningBuyerRate(orders)
  const avgBetween = averageMonthsBetweenRepeatBookings(orders)
  const paid12 = paidOrderCountLast12Months(orders)

  if (loading && !error) {
    return <SellerAnalyticsCustomerInsightsSkeleton />
  }

  return (
    <div className={styles.pageWrap}>
      {error ? <p className={styles.pageError}>{error}</p> : null}

      <section aria-label="Customer summary" className={styles.summaryStrip}>
        <article className={`${styles.summaryCard} ${styles.summaryCardSoftGreen}`}>
          <p className={styles.summaryLabel}>Families supported (12 months)</p>
          <div className={styles.summaryValueRow}>
            <p className={styles.summaryValue}>{families12}</p>
            <span className={`${styles.summaryDelta} ${styles.summaryDeltaPositive}`}>
              {newThis > 0 ? `${newThis} new this month` : 'No new families yet this month'}
            </span>
          </div>
          <p className={styles.summaryHint}>Unique buyers with any order in the last 12 months</p>
        </article>

        <article className={`${styles.summaryCard} ${styles.summaryCardSoftBlue}`}>
          <p className={styles.summaryLabel}>Returning rate</p>
          <div className={styles.summaryValueRow}>
            <p className={styles.summaryValue}>{returning}%</p>
          </div>
          <p className={styles.summaryHint}>Families with more than one booking (all time)</p>
        </article>

        <article className={`${styles.summaryCard} ${styles.summaryCardSoftIndigo}`}>
          <p className={styles.summaryLabel}>Avg time between repeat bookings</p>
          <div className={styles.summaryValueRow}>
            <p className={styles.summaryValue}>
              {avgBetween != null ? `${avgBetween} mo` : '—'}
            </p>
          </div>
          <p className={styles.summaryHint}>Across buyers with 2+ orders</p>
        </article>

        <article className={`${styles.summaryCard} ${styles.summaryCardSoftAmber}`}>
          <p className={styles.summaryLabel}>Paid orders (12 months)</p>
          <div className={styles.summaryValueRow}>
            <p className={styles.summaryValue}>{paid12}</p>
          </div>
          <p className={styles.summaryHint}>Completed payments on your shop in {systemName}</p>
        </article>
      </section>

      <section aria-label="Customer charts" className={styles.chartsGridSingle}>
        <article className={styles.chartCard}>
          <div className={styles.chartHeader}>
            <div className={styles.chartTitleGroup}>
              <h2 className={styles.chartTitle}>New vs returning customers</h2>
              <p className={styles.chartSubtitle}>
                Unique buyers with an order in each month — new vs returning (last 6 months).
              </p>
            </div>
            <span className={styles.chartBadge}>
              <TbUsers size={13} style={{ marginRight: 4 }} aria-hidden />
              Last 6 months
            </span>
          </div>

          <div className={styles.chartBody}>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barSize={26}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  domain={[0, maxStack]}
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  width={36}
                />
                <Tooltip
                  formatter={(value, name) => [
                    `${value}`,
                    name === 'returning' ? 'Returning families' : 'New families',
                  ]}
                  labelFormatter={(label) => `Month: ${label}`}
                  contentStyle={{ fontSize: 12, borderRadius: 8 }}
                />
                <Bar
                  dataKey="fresh"
                  stackId="customers"
                  fill={CUSTOMER_BAR_COLORS.fresh}
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="returning"
                  stackId="customers"
                  fill={CUSTOMER_BAR_COLORS.returning}
                  radius={[0, 0, 4, 4]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <footer className={styles.chartFooter}>
            <div className={styles.chartLegend}>
              <div className={styles.legendItem}>
                <span
                  className={styles.legendSwatch}
                  style={{ background: CUSTOMER_BAR_COLORS.returning }}
                />
                <span className={styles.legendLabel}>Returning families</span>
              </div>
              <div className={styles.legendItem}>
                <span
                  className={styles.legendSwatch}
                  style={{ background: CUSTOMER_BAR_COLORS.fresh }}
                />
                <span className={styles.legendLabel}>New families</span>
              </div>
            </div>
          </footer>
        </article>
      </section>
    </div>
  )
}
