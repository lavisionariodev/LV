'use client'

import { TbCurrencyPeso } from 'react-icons/tb'
import styles from '../analytics.module.css'

export default function SellerAnalyticsRevenueReportsPage() {
  return (
    <div className={styles.pageWrap}>
      <section aria-label="Revenue summary" className={styles.summaryStrip}>
        <article className={styles.summaryCard}>
          <p className={styles.summaryLabel}>Revenue this month</p>
          <div className={styles.summaryValueRow}>
            <p className={styles.summaryValue}>₱142,500</p>
            <span className={`${styles.summaryDelta} ${styles.summaryDeltaPositive}`}>
              +9.2% vs last month
            </span>
          </div>
          <p className={styles.summaryHint}>Confirmed and completed bookings only</p>
        </article>

        <article className={styles.summaryCard}>
          <p className={styles.summaryLabel}>Average booking value</p>
          <div className={styles.summaryValueRow}>
            <p className={styles.summaryValue}>₱26,800</p>
            <span className={`${styles.summaryDelta} ${styles.summaryDeltaNeutral}`}>
              Stable across recent months
            </span>
          </div>
          <p className={styles.summaryHint}>Average revenue per confirmed service</p>
        </article>

        <article className={styles.summaryCard}>
          <p className={styles.summaryLabel}>Highest month</p>
          <div className={styles.summaryValueRow}>
            <p className={styles.summaryValue}>January</p>
            <span className={`${styles.summaryDelta} ${styles.summaryDeltaPositive}`}>
              Stronger holiday‑adjacent demand
            </span>
          </div>
          <p className={styles.summaryHint}>Based on the last 12 months</p>
        </article>

        <article className={styles.summaryCard}>
          <p className={styles.summaryLabel}>Payouts pending</p>
          <div className={styles.summaryValueRow}>
            <p className={styles.summaryValue}>₱38,900</p>
          </div>
          <p className={styles.summaryHint}>Estimated amount before fees and adjustments</p>
        </article>
      </section>

      <section aria-label="Revenue charts" className={styles.chartsGridSingle}>
        <article className={styles.chartCard}>
          <div className={styles.chartHeader}>
            <div className={styles.chartTitleGroup}>
              <h2 className={styles.chartTitle}>Revenue by month</h2>
              <p className={styles.chartSubtitle}>
                A soft bar chart across the last 6 months to help you notice gradual changes.
              </p>
            </div>
            <span className={styles.chartBadge}>
              <TbCurrencyPeso size={13} style={{ marginRight: 4 }} aria-hidden />
              6‑month view
            </span>
          </div>

          <div className={styles.chartBody}>
            <div className={styles.barChartRow} aria-hidden>
              {[
                { label: 'Oct', value: '68%' },
                { label: 'Nov', value: '74%' },
                { label: 'Dec', value: '82%' },
                { label: 'Jan', value: '100%' },
                { label: 'Feb', value: '76%' },
                { label: 'Mar', value: '84%' },
              ].map((month) => (
                <div key={month.label} className={styles.barGroup}>
                  <div className={styles.barOuter}>
                    <div
                      className={styles.barInnerPrimary}
                      style={{ height: month.value }}
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
                <span className={styles.legendLabel}>Relative revenue</span>
              </div>
            </div>
            <p className={styles.helperText}>
              Heights are scaled so you can compare months visually, not as exact values.
            </p>
          </footer>
        </article>
      </section>
    </div>
  )
}
