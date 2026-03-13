'use client'

import { TbChartBar } from 'react-icons/tb'
import styles from '../analytics.module.css'

export default function SellerAnalyticsProductPerformancePage() {
  return (
    <div className={styles.pageWrap}>
      <section aria-label="Product summary" className={styles.summaryStrip}>
        <article className={styles.summaryCard}>
          <p className={styles.summaryLabel}>Top package</p>
          <div className={styles.summaryValueRow}>
            <p className={styles.summaryValue}>Traditional Full Service</p>
          </div>
          <p className={styles.summaryHint}>Most frequently booked in the last 30 days</p>
        </article>

        <article className={styles.summaryCard}>
          <p className={styles.summaryLabel}>Most booked add‑on</p>
          <div className={styles.summaryValueRow}>
            <p className={styles.summaryValue}>Floral & viewing set‑up</p>
          </div>
          <p className={styles.summaryHint}>Popular alongside both simple and full packages</p>
        </article>

        <article className={styles.summaryCard}>
          <p className={styles.summaryLabel}>Services with low activity</p>
          <div className={styles.summaryValueRow}>
            <p className={styles.summaryValue}>3</p>
          </div>
          <p className={styles.summaryHint}>May benefit from clearer descriptions or pricing</p>
        </article>

        <article className={styles.summaryCard}>
          <p className={styles.summaryLabel}>Booking concentration</p>
          <div className={styles.summaryValueRow}>
            <p className={styles.summaryValue}>62%</p>
          </div>
          <p className={styles.summaryHint}>Share of bookings from top 3 packages</p>
        </article>
      </section>

      <section aria-label="Product performance charts" className={styles.chartsGridSingle}>
        <article className={styles.chartCard}>
          <div className={styles.chartHeader}>
            <div className={styles.chartTitleGroup}>
              <h2 className={styles.chartTitle}>Bookings by package</h2>
              <p className={styles.chartSubtitle}>
                A bar chart comparing how often each core funeral package is booked.
              </p>
            </div>
            <span className={styles.chartBadge}>
              <TbChartBar size={13} style={{ marginRight: 4 }} aria-hidden />
              Last 30 days
            </span>
          </div>

          <div className={styles.chartBody}>
            <div className={styles.barChartRow} aria-hidden>
              <div className={styles.barGroup}>
                <div className={styles.barOuter}>
                  <div
                    className={styles.barInnerPrimary}
                    style={{ height: '82%' }}
                  />
                </div>
                <span className={styles.barValue}>24</span>
                <span className={styles.barLabel}>Traditional full</span>
              </div>

              <div className={styles.barGroup}>
                <div className={styles.barOuter}>
                  <div
                    className={styles.barInnerSecondary}
                    style={{ height: '64%' }}
                  />
                </div>
                <span className={styles.barValue}>18</span>
                <span className={styles.barLabel}>Cremation</span>
              </div>

              <div className={styles.barGroup}>
                <div className={styles.barOuter}>
                  <div
                    className={styles.barInnerMuted}
                    style={{ height: '52%' }}
                  />
                </div>
                <span className={styles.barValue}>15</span>
                <span className={styles.barLabel}>Simple wake</span>
              </div>

              <div className={styles.barGroup}>
                <div className={styles.barOuter}>
                  <div
                    className={styles.barInnerSecondary}
                    style={{ height: '28%' }}
                  />
                </div>
                <span className={styles.barValue}>8</span>
                <span className={styles.barLabel}>Memorial only</span>
              </div>
            </div>
          </div>

          <footer className={styles.chartFooter}>
            <div className={styles.chartLegend}>
              <div className={styles.legendItem}>
                <span
                  className={styles.legendSwatch}
                  style={{ background: 'linear-gradient(180deg,#204f38,#356a4a)' }}
                />
                <span className={styles.legendLabel}>Most booked</span>
              </div>
              <div className={styles.legendItem}>
                <span
                  className={styles.legendSwatch}
                  style={{ background: 'linear-gradient(180deg,#bfdbfe,#1d4ed8)' }}
                />
                <span className={styles.legendLabel}>Steady bookings</span>
              </div>
              <div className={styles.legendItem}>
                <span
                  className={styles.legendSwatch}
                  style={{ background: 'linear-gradient(180deg,#f97316,#ea580c)' }}
                />
                <span className={styles.legendLabel}>Emerging interest</span>
              </div>
            </div>
            <p className={styles.helperText}>
              Consider reviewing descriptions or visibility for packages with lower booking counts.
            </p>
          </footer>
        </article>
      </section>
    </div>
  )
}
