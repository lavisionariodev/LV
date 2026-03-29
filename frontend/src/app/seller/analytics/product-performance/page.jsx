'use client'

import { TbAdjustmentsHorizontal } from 'react-icons/tb'
import styles from '../analytics.module.css'

export default function SellerAnalyticsProductPerformancePage() {
  const packageBookings = [
    { label: 'Traditional full', confirmed: 18, pending: 6 },
    { label: 'Cremation', confirmed: 12, pending: 6 },
    { label: 'Simple wake', confirmed: 10, pending: 5 },
    { label: 'Memorial only', confirmed: 5, pending: 3 },
    { label: 'Transport add-on', confirmed: 7, pending: 2 },
    { label: 'Documentation', confirmed: 6, pending: 1 },
  ]

  const totals = packageBookings.map((pkg) => pkg.confirmed + pkg.pending)
  const maxTotal = Math.max(...totals, 1)

  return (
    <div className={styles.pageWrap}>
      <section aria-label="Product summary" className={styles.summaryStrip}>
        <article className={`${styles.summaryCard} ${styles.summaryCardSoftGreen}`}>
          <p className={styles.summaryLabel}>Revenue from top package</p>
          <div className={styles.summaryValueRow}>
            <p className={styles.summaryValue}>₱142,500</p>
            <span className={`${styles.summaryDelta} ${styles.summaryDeltaPositive}`}>+9.2%</span>
          </div>
          <p className={styles.summaryHint}>Traditional full service, this month</p>
        </article>

        <article className={`${styles.summaryCard} ${styles.summaryCardSoftBlue}`}>
          <p className={styles.summaryLabel}>Net conversion rate</p>
          <div className={styles.summaryValueRow}>
            <p className={styles.summaryValue}>82%</p>
          </div>
          <p className={styles.summaryHint}>From package view to booking</p>
        </article>

        <article className={`${styles.summaryCard} ${styles.summaryCardSoftIndigo}`}>
          <p className={styles.summaryLabel}>Best performing month</p>
          <div className={styles.summaryValueRow}>
            <p className={styles.summaryValue}>January</p>
          </div>
          <p className={styles.summaryHint}>Highest package revenue in 12 months</p>
        </article>

        <article className={`${styles.summaryCard} ${styles.summaryCardSoftAmber}`}>
          <p className={styles.summaryLabel}>Packages needing attention</p>
          <div className={styles.summaryValueRow}>
            <p className={styles.summaryValue}>3</p>
          </div>
          <p className={styles.summaryHint}>Low-activity services to review</p>
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
                <span>30</span>
                <span>24</span>
                <span>18</span>
                <span>12</span>
                <span>6</span>
                <span>0</span>
              </div>

              <div>
                <div className={styles.chartScrollX}>
                  <div className={styles.barChartRow} aria-hidden>
                    {packageBookings.map((pkg) => {
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
