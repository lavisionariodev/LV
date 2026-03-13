'use client'

import { TbUsers } from 'react-icons/tb'
import styles from '../analytics.module.css'

export default function SellerAnalyticsCustomerInsightsPage() {
  return (
    <div className={styles.pageWrap}>
      <section aria-label="Customer summary" className={styles.summaryStrip}>
        <article className={styles.summaryCard}>
          <p className={styles.summaryLabel}>Total families</p>
          <div className={styles.summaryValueRow}>
            <p className={styles.summaryValue}>72</p>
            <span className={`${styles.summaryDelta} ${styles.summaryDeltaPositive}`}>
              +6 this month
            </span>
          </div>
          <p className={styles.summaryHint}>Unique families you&apos;ve supported</p>
        </article>

        <article className={styles.summaryCard}>
          <p className={styles.summaryLabel}>Returning rate</p>
          <div className={styles.summaryValueRow}>
            <p className={styles.summaryValue}>28%</p>
            <span className={`${styles.summaryDelta} ${styles.summaryDeltaNeutral}`}>
              Often for extended services
            </span>
          </div>
          <p className={styles.summaryHint}>Families with more than one booking</p>
        </article>

        <article className={styles.summaryCard}>
          <p className={styles.summaryLabel}>Average time between bookings</p>
          <div className={styles.summaryValueRow}>
            <p className={styles.summaryValue}>11.4 months</p>
          </div>
          <p className={styles.summaryHint}>Based on returning families over 2 years</p>
        </article>

        <article className={styles.summaryCard}>
          <p className={styles.summaryLabel}>In‑app engagement</p>
          <div className={styles.summaryValueRow}>
            <p className={styles.summaryValue}>63%</p>
          </div>
          <p className={styles.summaryHint}>Families who read messages inside Lavisionario</p>
        </article>
      </section>

      <section aria-label="Customer charts" className={styles.chartsGridSingle}>
        <article className={styles.chartCard}>
          <div className={styles.chartHeader}>
            <div className={styles.chartTitleGroup}>
              <h2 className={styles.chartTitle}>New vs returning customers</h2>
              <p className={styles.chartSubtitle}>
                A calm stacked bar view of how many families are new versus returning each month.
              </p>
            </div>
            <span className={styles.chartBadge}>
              <TbUsers size={13} style={{ marginRight: 4 }} aria-hidden />
              Last 6 months
            </span>
          </div>

          <div className={styles.chartBody}>
            <div className={styles.barChartRow} aria-hidden>
              {[
                { label: 'Oct', returning: '26%', fresh: '48%' },
                { label: 'Nov', returning: '24%', fresh: '52%' },
                { label: 'Dec', returning: '30%', fresh: '46%' },
                { label: 'Jan', returning: '32%', fresh: '50%' },
                { label: 'Feb', returning: '25%', fresh: '47%' },
                { label: 'Mar', returning: '28%', fresh: '49%' },
              ].map((month) => (
                <div key={month.label} className={styles.barGroup}>
                  <div className={styles.dualBarOuter}>
                    <div
                      className={styles.dualBarSegmentPrimary}
                      style={{ height: month.returning }}
                    />
                    <div
                      className={styles.dualBarSegmentSecondary}
                      style={{ height: month.fresh }}
                    />
                  </div>
                  <span className={styles.barValue}>{month.label}</span>
                  <span className={styles.barLabel}>Month</span>
                </div>
              ))}
            </div>
          </div>

          <footer className={styles.chartFooter}>
            <div className={styles.chartLegend}>
              <div className={styles.legendItem}>
                <span
                  className={styles.legendSwatch}
                  style={{ background: 'linear-gradient(180deg,#204f38,#356a4a)' }}
                />
                <span className={styles.legendLabel}>Returning families</span>
              </div>
              <div className={styles.legendItem}>
                <span
                  className={styles.legendSwatch}
                  style={{ background: 'linear-gradient(180deg,#e5e7eb,#cbd5e1)' }}
                />
                <span className={styles.legendLabel}>New families</span>
              </div>
            </div>
            <p className={styles.helperText}>
              This is directional data only and is meant to give you a sense of relationship
              patterns over time.
            </p>
          </footer>
        </article>
      </section>
    </div>
  )
}
