'use client'

import { TbChartLine } from 'react-icons/tb'
import styles from '../analytics.module.css'

export default function SellerAnalyticsSalesOverviewPage() {
  const dailyLabels = ['2/18', '2/19', '2/20', '2/21', '2/22', '2/23', '2/24']

  return (
    <div className={styles.pageWrap}>
      <section aria-label="Sales summary" className={styles.summaryStrip}>
        <article className={styles.summaryCard}>
          <p className={styles.summaryLabel}>Revenue (7 days)</p>
          <div className={styles.summaryValueRow}>
            <p className={styles.summaryValue}>₱320k</p>
            <span className={`${styles.summaryDelta} ${styles.summaryDeltaPositive}`}>
              +12% vs prior
            </span>
          </div>
          <p className={styles.summaryHint}>Estimated confirmed revenue</p>
        </article>

        <article className={styles.summaryCard}>
          <p className={styles.summaryLabel}>Transactions (7 days)</p>
          <div className={styles.summaryValueRow}>
            <p className={styles.summaryValue}>32</p>
            <span className={`${styles.summaryDelta} ${styles.summaryDeltaNeutral}`}>
              Avg. 4–5 per day
            </span>
          </div>
          <p className={styles.summaryHint}>Completed bookings during this period</p>
        </article>
      </section>

      <section aria-label="Sales charts" className={styles.chartsGridSingle}>
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

          <div className={styles.chartSplit}>
            <div className={styles.chartSplitMain}>
              <div className={styles.chartWithYAxis}>
                <div className={styles.chartYAxisLabels} aria-hidden>
                  <span>₱80k</span>
                  <span>₱60k</span>
                  <span>₱40k</span>
                  <span>₱20k</span>
                  <span>₱0k</span>
                </div>
                <div>
                  <div className={styles.chartBody}>
                    <div className={styles.chartGridLines} aria-hidden />
                    <svg
                      className={styles.lineChartSvg}
                      viewBox="0 0 100 60"
                      role="img"
                      aria-label="Line chart for sales this week"
                    >
                      <defs>
                        <linearGradient id="salesFill" x1="0" x2="0" y1="0" y2="1">
                          <stop offset="0%" stopColor="#e5e7eb" stopOpacity="0.9" />
                          <stop offset="100%" stopColor="#e5e7eb" stopOpacity="0" />
                        </linearGradient>
                      </defs>
                      {/* Area under the line */}
                      <path
                        d="M0,60 L0,44 L16,40 L33,48 L50,36 L66,30 L83,34 L100,30 L100,60 Z"
                        fill="url(#salesFill)"
                        stroke="none"
                      />
                      {/* Line itself (stroke only) */}
                      <polyline
                        fill="none"
                        stroke="#102820"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        points="0,44 16,40 33,48 50,36 66,30 83,34 100,30"
                      />
                      {/* Dots on each data point */}
                      <circle className={styles.lineDots} cx="0" cy="44" r="1.4" />
                      <circle className={styles.lineDots} cx="16" cy="40" r="1.4" />
                      <circle className={styles.lineDots} cx="33" cy="48" r="1.4" />
                      <circle className={styles.lineDots} cx="50" cy="36" r="1.4" />
                      <circle className={styles.lineDots} cx="66" cy="30" r="1.4" />
                      <circle className={styles.lineDots} cx="83" cy="34" r="1.4" />
                      <circle className={styles.lineDots} cx="100" cy="30" r="1.4" />
                    </svg>
                  </div>
                  <div className={styles.chartAxisLabels} aria-hidden>
                    {dailyLabels.map((label) => (
                      <span key={label}>{label}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <aside className={styles.chartSplitSide} aria-label="Bookings by category">
              <p className={styles.helperText}>By category</p>
              <div className={styles.hBarList}>
                <div className={styles.hBarRow}>
                  <div className={styles.hBarLabelRow}>
                    <span>Memorial Packages</span>
                    <span>₱160k</span>
                  </div>
                  <div className={styles.hBarTrack}>
                    <div
                      className={styles.hBarFill}
                      style={{ width: '96%' }}
                    />
                  </div>
                </div>

                <div className={styles.hBarRow}>
                  <div className={styles.hBarLabelRow}>
                    <span>Flowers &amp; Add‑ons</span>
                    <span>₱58k</span>
                  </div>
                  <div className={styles.hBarTrack}>
                    <div
                      className={styles.hBarFill}
                      style={{ width: '54%' }}
                    />
                  </div>
                </div>

                <div className={styles.hBarRow}>
                  <div className={styles.hBarLabelRow}>
                    <span>Transport &amp; Logistics</span>
                    <span>₱32k</span>
                  </div>
                  <div className={styles.hBarTrack}>
                    <div
                      className={styles.hBarFill}
                      style={{ width: '32%' }}
                    />
                  </div>
                </div>

                <div className={styles.hBarRow}>
                  <div className={styles.hBarLabelRow}>
                    <span>Documentation</span>
                    <span>₱18k</span>
                  </div>
                  <div className={styles.hBarTrack}>
                    <div
                      className={styles.hBarFill}
                      style={{ width: '22%' }}
                    />
                  </div>
                </div>
              </div>
              <div className={styles.categoryAxis} aria-hidden>
                <span>₱0k</span>
                <span>₱45k</span>
                <span>₱90k</span>
                <span>₱135k</span>
                <span>₱180k</span>
              </div>
            </aside>
          </div>

          <footer className={styles.chartFooter}>
            <div className={styles.chartLegend}>
              <div className={styles.legendItem}>
                <span
                  className={styles.legendSwatch}
                  style={{ background: '#111827' }}
                />
                <span className={styles.legendLabel}>Estimated revenue</span>
              </div>
            </div>
            <p className={styles.helperText}>
              Sample figures to mirror your live dashboard; wire them up to real data when ready.
            </p>
          </footer>
        </article>
      </section>
    </div>
  )
}
