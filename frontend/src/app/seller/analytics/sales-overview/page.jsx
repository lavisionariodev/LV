'use client'

import { TbChartLine } from 'react-icons/tb'
import styles from '../analytics.module.css'

export default function SellerAnalyticsSalesOverviewPage() {
  const dailyLabels = ['2/18', '2/19', '2/20', '2/21', '2/22', '2/23', '2/24']
  const monthlyRevenue = [
    { label: 'Oct', value: '68%', tooltip: '₱118k in October' },
    { label: 'Nov', value: '74%', tooltip: '₱126k in November' },
    { label: 'Dec', value: '82%', tooltip: '₱138k in December' },
    { label: 'Jan', value: '100%', tooltip: '₱168k in January' },
    { label: 'Feb', value: '76%', tooltip: '₱128k in February' },
    { label: 'Mar', value: '84%', tooltip: '₱142k in March' },
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
          <p className={styles.summaryLabel}>Transactions</p>
          <div className={styles.summaryValueRow}>
            <p className={styles.summaryValue}>32</p>
            <span className={`${styles.summaryDelta} ${styles.summaryDeltaNeutral}`}>
              Avg. 4–5 per day
            </span>
          </div>
          <p className={styles.summaryHint}>Completed bookings during this period</p>
        </article>

        <article className={styles.summaryCard}>
          <p className={styles.summaryLabel}>Average booking value</p>
          <div className={styles.summaryValueRow}>
            <p className={styles.summaryValue}>₱26,800</p>
          </div>
          <p className={styles.summaryHint}>Typical revenue per confirmed service</p>
        </article>

        <article className={styles.summaryCard}>
          <p className={styles.summaryLabel}>Top package</p>
          <div className={styles.summaryValueRow}>
            <p className={styles.summaryValue}>Traditional Full Service</p>
          </div>
          <p className={styles.summaryHint}>Most booked over the last 30 days</p>
        </article>
      </section>

      <section aria-label="Revenue and categories" className={styles.chartsGrid}>
        <article className={styles.chartCard}>
          <div className={styles.chartHeader}>
            <div className={styles.chartTitleGroup}>
              <h2 className={styles.chartTitle}>Revenue trend</h2>
              <p className={styles.chartSubtitle}>Last 7 days</p>
            </div>
            <span className={styles.chartBadge}>
              <TbChartLine size={13} style={{ marginRight: 4 }} aria-hidden />
              7‑day view
            </span>
          </div>

          <div className={styles.chartBody}>
            <div className={styles.chartGridLines} aria-hidden />
            <svg
              className={styles.lineChartSvg}
              viewBox="0 0 100 60"
              role="img"
              aria-label="Revenue trend for the last 7 days"
            >
              <defs>
                <linearGradient id="salesFill" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#e5efe9" stopOpacity="0.9" />
                  <stop offset="100%" stopColor="#e5efe9" stopOpacity="0" />
                </linearGradient>
              </defs>

              <line x1="0" y1="6" x2="0" y2="56" stroke="#d1d5db" strokeWidth="0.6" />
              <line x1="0" y1="56" x2="100" y2="56" stroke="#d1d5db" strokeWidth="0.6" />

              <path
                d="M0,56 L0,44 
                   C 8,40 12,38 16,38 
                   C 22,37 28,36 33,40 
                   C 38,44 44,50 50,46 
                   C 58,40 62,34 66,32 
                   C 74,29 80,30 83,32 
                   C 90,36 95,40 100,38 
                   L100,56 Z"
                fill="url(#salesFill)"
                stroke="none"
              />

              <path
                d="M0,44 
                   C 8,40 12,38 16,38 
                   C 22,37 28,36 33,40 
                   C 38,44 44,50 50,46 
                   C 58,40 62,34 66,32 
                   C 74,29 80,30 83,32 
                   C 90,36 95,40 100,38"
                fill="none"
                stroke="#204f38"
                strokeWidth="1.6"
                strokeLinecap="round"
              />

              <circle className={styles.lineDots} cx="0" cy="44" r="1.3" />
              <circle className={styles.lineDots} cx="16" cy="38" r="1.3" />
              <circle className={styles.lineDots} cx="33" cy="40" r="1.3" />
              <circle className={styles.lineDots} cx="50" cy="46" r="1.3" />
              <circle className={styles.lineDots} cx="66" cy="32" r="1.3" />
              <circle className={styles.lineDots} cx="83" cy="32" r="1.3" />
              <circle className={styles.lineDots} cx="100" cy="38" r="1.3" />
            </svg>
          </div>
          <div className={styles.chartAxisLabels} aria-hidden>
            {dailyLabels.map((label) => (
              <span key={label}>{label}</span>
            ))}
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
            <div className={styles.hBarList}>
              <div className={styles.hBarRow}>
                <div className={styles.hBarLabelRow}>
                  <span>Memorial packages</span>
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
                  <span>Flowers &amp; add‑ons</span>
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
                  <span>Transport &amp; logistics</span>
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
            <div className={styles.barChartRow} aria-hidden>
              {monthlyRevenue.map((month) => (
                <div key={month.label} className={styles.barGroup}>
                  <div className={styles.barOuter} title={month.tooltip}>
                    <div
                      className={styles.barInnerPrimary}
                      style={{ height: month.value }}
                    />
                  </div>
                  <span className={styles.barValue}>{month.label}</span>
                </div>
              ))}
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
            <div className={styles.barChartRow} aria-hidden>
              {packageBookings.map((pkg) => (
                <div key={pkg.label} className={styles.barGroup}>
                  <div className={styles.barOuter} title={`${pkg.count} bookings – ${pkg.label}`}>
                    <div
                      className={styles.barInnerPrimary}
                      style={{ height: pkg.value }}
                    />
                  </div>
                  <span className={styles.barValue}>{pkg.count}</span>
                  <span className={styles.barLabel}>{pkg.label}</span>
                </div>
              ))}
            </div>
          </div>
        </article>
      </section>
    </div>
  )
}
