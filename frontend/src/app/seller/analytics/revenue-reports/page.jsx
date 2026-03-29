'use client'

import { TbCurrencyPeso, TbDownload } from 'react-icons/tb'
import styles from '../analytics.module.css'

export default function SellerAnalyticsRevenueReportsPage() {
  return (
    <div className={styles.pageWrap}>
      <div className={styles.downloadRow}>
        <button
          type="button"
          className={styles.downloadButton}
          onClick={() => window.print()}
          aria-label="Download revenue report"
        >
          <TbDownload size={14} aria-hidden />
          <span>Download report</span>
        </button>
      </div>

      <section aria-label="Revenue summary" className={styles.summaryStrip}>
        <article className={`${styles.summaryCard} ${styles.summaryCardSoftGreen}`}>
          <p className={styles.summaryLabel}>Revenue this month</p>
          <div className={styles.summaryValueRow}>
            <p className={styles.summaryValue}>₱142,500</p>
            <span className={`${styles.summaryDelta} ${styles.summaryDeltaPositive}`}>
              +9.2%
            </span>
          </div>
          <p className={styles.summaryHint}>Confirmed bookings only</p>
        </article>

        <article className={`${styles.summaryCard} ${styles.summaryCardSoftIndigo}`}>
          <p className={styles.summaryLabel}>Net payout rate</p>
          <div className={styles.summaryValueRow}>
            <p className={styles.summaryValue}>82%</p>
          </div>
          <p className={styles.summaryHint}>After fees and adjustments</p>
        </article>

        <article className={`${styles.summaryCard} ${styles.summaryCardSoftBlue}`}>
          <p className={styles.summaryLabel}>Best month (12 months)</p>
          <div className={styles.summaryValueRow}>
            <p className={styles.summaryValue}>January</p>
          </div>
          <p className={styles.summaryHint}>Highest revenue in the past year</p>
        </article>

        <article className={`${styles.summaryCard} ${styles.summaryCardSoftAmber}`}>
          <p className={styles.summaryLabel}>Payouts pending</p>
          <div className={styles.summaryValueRow}>
            <p className={styles.summaryValue}>₱38,900</p>
          </div>
          <p className={styles.summaryHint}>Before fees and adjustments</p>
        </article>
      </section>

      <section aria-label="Revenue charts" className={styles.chartsGridSingle}>
        <article className={styles.chartCard}>
          <div className={styles.chartHeader}>
            <div className={styles.chartTitleGroup}>
              <h2 className={styles.chartTitle}>Revenue vs payouts</h2>
              <p className={styles.chartSubtitle}>Last 6 months – gross revenue and paid out</p>
            </div>
            <span className={styles.chartBadge}>
              <TbCurrencyPeso size={13} style={{ marginRight: 4 }} aria-hidden />
              6‑month view
            </span>
          </div>

          <div className={styles.chartBody}>
            <div className={styles.chartWithYAxis}>
              <div className={styles.chartYAxisLabels} aria-hidden>
                <span>₱200k</span>
                <span>₱160k</span>
                <span>₱120k</span>
                <span>₱80k</span>
                <span>₱40k</span>
                <span>₱0</span>
              </div>

              <div>
                <div className={styles.barChartRow} aria-hidden>
                  {[
                    { label: 'Oct', gross: '68%', paid: '58%' },
                    { label: 'Nov', gross: '74%', paid: '61%' },
                    { label: 'Dec', gross: '82%', paid: '70%' },
                    { label: 'Jan', gross: '100%', paid: '84%' },
                    { label: 'Feb', gross: '76%', paid: '63%' },
                    { label: 'Mar', gross: '84%', paid: '69%' },
                  ].map((month) => (
                    <div key={month.label} className={styles.barGroup}>
                      <div className={styles.barOuter}>
                        <div
                          className={styles.barInnerPrimary}
                          style={{ height: month.gross }}
                        />
                        <div
                          className={styles.barInnerSecondary}
                          style={{ height: month.paid }}
                        />
                      </div>
                      <span className={styles.barLabel}>{month.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <footer className={styles.chartFooter}>
            <div className={styles.chartLegend}>
              <div className={styles.legendItem}>
                <span
                  className={styles.legendSwatch}
                  style={{ background: 'linear-gradient(180deg,#1f312b,#355846)' }}
                />
                <span className={styles.legendLabel}>Gross revenue</span>
              </div>
              <div className={styles.legendItem}>
                <span
                  className={styles.legendSwatch}
                  style={{ background: 'linear-gradient(180deg,#8fb9a3,#5b8c71)' }}
                />
                <span className={styles.legendLabel}>Paid out</span>
              </div>
            </div>
          </footer>
        </article>
      </section>
    </div>
  )
}
