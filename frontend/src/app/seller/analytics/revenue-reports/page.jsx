'use client'

import { useMemo } from 'react'
import { TbCurrencyPeso, TbDownload } from 'react-icons/tb'
import styles from '../analytics.module.css'
import { useSellerAnalyticsData } from '@/lib/seller/useSellerAnalyticsData'
import {
  averagePaidBookingValueLastNMonths,
  bestMonthLabelLastNMonths,
  monthlyPaidRevenueBarPercents,
  outstandingPaidPendingConfirmation,
  percentChange,
  revenueThisCalendarMonth,
  revenuePreviousCalendarMonth,
} from '@/lib/seller/sellerOrderAnalytics'

function formatPhp(n) {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n)
}

export default function SellerAnalyticsRevenueReportsPage() {
  const { orders, loading, error } = useSellerAnalyticsData()

  const thisMonth = revenueThisCalendarMonth(orders)
  const prevMonth = revenuePreviousCalendarMonth(orders)
  const monthDelta = percentChange(thisMonth, prevMonth)

  const best = bestMonthLabelLastNMonths(orders, 12)
  const outstanding = outstandingPaidPendingConfirmation(orders)
  const avg12 = averagePaidBookingValueLastNMonths(orders, 12)

  const monthlyBars = useMemo(() => monthlyPaidRevenueBarPercents(orders, 6), [orders])
  const maxAmt = useMemo(
    () => Math.max(...monthlyBars.map((m) => m.amount), 1),
    [monthlyBars],
  )

  return (
    <div className={styles.pageWrap}>
      {error ? <p className={styles.pageError}>{error}</p> : null}
      {loading ? <p className={styles.pageLoading}>Loading analytics…</p> : null}

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
            <p className={styles.summaryValue}>{formatPhp(thisMonth)}</p>
            <span
              className={`${styles.summaryDelta} ${
                monthDelta.up ? styles.summaryDeltaPositive : styles.summaryDeltaNegative
              }`}
            >
              {monthDelta.text}
            </span>
          </div>
          <p className={styles.summaryHint}>Paid orders only · vs last calendar month</p>
        </article>

        <article className={`${styles.summaryCard} ${styles.summaryCardSoftIndigo}`}>
          <p className={styles.summaryLabel}>Avg booking value (12 mo)</p>
          <div className={styles.summaryValueRow}>
            <p className={styles.summaryValue}>{formatPhp(avg12)}</p>
          </div>
          <p className={styles.summaryHint}>Paid orders in the trailing year</p>
        </article>

        <article className={`${styles.summaryCard} ${styles.summaryCardSoftBlue}`}>
          <p className={styles.summaryLabel}>Best month (12 months)</p>
          <div className={styles.summaryValueRow}>
            <p className={styles.summaryValue}>{best.label}</p>
          </div>
          <p className={styles.summaryHint}>
            {best.amount > 0 ? `${formatPhp(best.amount)} collected` : 'No paid revenue yet'}
          </p>
        </article>

        <article className={`${styles.summaryCard} ${styles.summaryCardSoftAmber}`}>
          <p className={styles.summaryLabel}>Awaiting confirmation</p>
          <div className={styles.summaryValueRow}>
            <p className={styles.summaryValue}>{formatPhp(outstanding)}</p>
          </div>
          <p className={styles.summaryHint}>Paid bookings still pending your confirmation</p>
        </article>
      </section>

      <section aria-label="Revenue charts" className={styles.chartsGridSingle}>
        <article className={styles.chartCard}>
          <div className={styles.chartHeader}>
            <div className={styles.chartTitleGroup}>
              <h2 className={styles.chartTitle}>Monthly paid revenue</h2>
              <p className={styles.chartSubtitle}>
                Last 6 months · gross collected on paid orders. Payout series will appear here when
                seller escrow data is exposed via API.
              </p>
            </div>
            <span className={styles.chartBadge}>
              <TbCurrencyPeso size={13} style={{ marginRight: 4 }} aria-hidden />
              6‑month view
            </span>
          </div>

          <div className={styles.chartBody}>
            <div className={styles.chartWithYAxis}>
              <div className={styles.chartYAxisLabels} aria-hidden>
                {[1, 0.75, 0.5, 0.25, 0].map((step) => {
                  const v = maxAmt * step
                  const label = v >= 1000 ? `₱${(v / 1000).toFixed(0)}k` : `₱${Math.round(v)}`
                  return <span key={step}>{label}</span>
                })}
              </div>

              <div>
                <div className={styles.barChartRow} aria-hidden>
                  {monthlyBars.map((month) => (
                    <div key={month.label} className={styles.barGroup}>
                      <div className={styles.barOuter}>
                        <div
                          className={styles.barInnerPrimary}
                          style={{ height: month.heightPct }}
                          title={formatPhp(month.amount)}
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
                <span className={styles.legendLabel}>Paid revenue (collected)</span>
              </div>
            </div>
          </footer>
        </article>
      </section>
    </div>
  )
}
