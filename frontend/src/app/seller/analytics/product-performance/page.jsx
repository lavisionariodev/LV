'use client'

import { useMemo } from 'react'
import { TbAdjustmentsHorizontal } from 'react-icons/tb'
import styles from '../analytics.module.css'
import { useSellerAnalyticsData } from '@/lib/seller/useSellerAnalyticsData'
import {
  averagePaidBookingValueLastNMonths,
  bestMonthLabelLastNMonths,
  packageBookingCountsLastNMonths,
  packagesNeedingAttentionCount,
  returningBuyerRate,
  topPackagesByPaidRevenue,
} from '@/lib/seller/sellerOrderAnalytics'

function formatPhp(n) {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n)
}

const PRODUCT_PERF_SUMMARY_SOFT = [
  styles.summaryCardSoftGreen,
  styles.summaryCardSoftBlue,
  styles.summaryCardSoftIndigo,
  styles.summaryCardSoftAmber,
]

function SellerAnalyticsProductPerformanceSkeleton() {
  return (
    <div
      className={styles.pageWrap}
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label="Loading product analytics"
    >
      <section className={styles.summaryStrip} aria-hidden>
        {PRODUCT_PERF_SUMMARY_SOFT.map((soft, i) => (
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
            <span className={styles.analyticsSkBar} style={{ height: 32, width: 132, borderRadius: 999 }} />
          </div>
          <span className={`${styles.analyticsSkBar} ${styles.analyticsSkChartBlock}`} />
        </article>
      </section>
    </div>
  )
}

export default function SellerAnalyticsProductPerformancePage() {
  const { orders, loading, error } = useSellerAnalyticsData()

  const orders12m = useMemo(() => {
    if (!orders.length) return []
    const newest = Math.max(...orders.map((o) => new Date(o.created_at).getTime()))
    const start = newest - 365 * 24 * 60 * 60 * 1000
    return orders.filter((o) => new Date(o.created_at).getTime() >= start)
  }, [orders])

  const packageBookings = useMemo(() => packageBookingCountsLastNMonths(orders, 6), [orders])
  const totals = packageBookings.map((pkg) => pkg.confirmed + pkg.pending)
  const maxTotal = Math.max(...totals, 1)

  const topPaid = topPackagesByPaidRevenue(orders12m, 1)[0]
  const topRevenue = topPaid?.revenue ?? 0
  const topName = topPaid?.name ?? '—'

  const best = bestMonthLabelLastNMonths(orders, 12)
  const attention = packagesNeedingAttentionCount(orders)
  const repeatRate = returningBuyerRate(orders)
  const avg12 = averagePaidBookingValueLastNMonths(orders, 12)

  if (loading && !error) {
    return <SellerAnalyticsProductPerformanceSkeleton />
  }

  return (
    <div className={styles.pageWrap}>
      {error ? <p className={styles.pageError}>{error}</p> : null}

      <section aria-label="Product summary" className={styles.summaryStrip}>
        <article className={`${styles.summaryCard} ${styles.summaryCardSoftGreen}`}>
          <p className={styles.summaryLabel}>Revenue from top line item</p>
          <div className={styles.summaryValueRow}>
            <p className={styles.summaryValue}>{formatPhp(topRevenue)}</p>
          </div>
          <p className={styles.summaryHint}>
            {topPaid ? `${topName} · last 12 months, paid orders` : 'No paid bookings in the last year'}
          </p>
        </article>

        <article className={`${styles.summaryCard} ${styles.summaryCardSoftBlue}`}>
          <p className={styles.summaryLabel}>Returning families</p>
          <div className={styles.summaryValueRow}>
            <p className={styles.summaryValue}>{repeatRate}%</p>
          </div>
          <p className={styles.summaryHint}>Buyers with more than one order (all time)</p>
        </article>

        <article className={`${styles.summaryCard} ${styles.summaryCardSoftIndigo}`}>
          <p className={styles.summaryLabel}>Best revenue month</p>
          <div className={styles.summaryValueRow}>
            <p className={styles.summaryValue}>{best.label}</p>
          </div>
          <p className={styles.summaryHint}>
            {best.amount > 0 ? `${formatPhp(best.amount)} paid in that month` : '—'}
          </p>
        </article>

        <article className={`${styles.summaryCard} ${styles.summaryCardSoftAmber}`}>
          <p className={styles.summaryLabel}>Low-activity packages</p>
          <div className={styles.summaryValueRow}>
            <p className={styles.summaryValue}>{attention}</p>
          </div>
          <p className={styles.summaryHint}>
            Line items with under 2 bookings in the last 6 months · avg paid ticket {formatPhp(avg12)}
          </p>
        </article>
      </section>

      <section aria-label="Product performance charts" className={styles.chartsGridSingle}>
        <article className={styles.chartCard}>
          <div className={styles.chartHeader}>
            <div className={styles.chartTitleGroup}>
              <h2 className={styles.chartTitle}>Bookings by package</h2>
              <p className={styles.chartSubtitle}>
                Last 6 months – confirmed and pending bookings.
              </p>
            </div>
            <button type="button" className={styles.chartActionButton}>
              <span className={styles.chartActionButtonIcon} aria-hidden>
                <TbAdjustmentsHorizontal size={14} />
              </span>
              6-MONTH VIEW
            </button>
          </div>

          <div className={styles.chartBody}>
            <div className={styles.chartWithYAxis}>
              <div className={styles.chartYAxisLabels} aria-hidden>
                <span>{maxTotal}</span>
                <span>{Math.round(maxTotal * 0.75)}</span>
                <span>{Math.round(maxTotal * 0.5)}</span>
                <span>{Math.round(maxTotal * 0.25)}</span>
                <span>0</span>
              </div>

              <div>
                <div className={styles.chartScrollX}>
                  <div className={styles.barChartRow} aria-hidden>
                    {packageBookings.length === 0 ? (
                      <p className={styles.chartEmpty}>No bookings in this window yet.</p>
                    ) : (
                      packageBookings.map((pkg) => {
                        const total = pkg.confirmed + pkg.pending
                        const totalPct = (total / maxTotal) * 100
                        const confirmedPct = (pkg.confirmed / maxTotal) * 100
                        const pendingPct = (pkg.pending / maxTotal) * 100

                        return (
                          <div
                            key={pkg.label}
                            className={styles.barGroup}
                            title={`${total} bookings – ${pkg.label}`}
                          >
                            <div className={styles.pillStackOuter}>
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
                            <span className={styles.barLabel}>{pkg.label}</span>
                          </div>
                        )
                      })
                    )}
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
