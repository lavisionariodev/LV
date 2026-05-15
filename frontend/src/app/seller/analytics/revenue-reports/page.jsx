'use client'

import { useEffect, useMemo, useState } from 'react'
import { TbCurrencyPeso, TbDownload } from 'react-icons/tb'
import styles from '../analytics.module.css'
import { useSellerAnalyticsData } from '@/lib/seller/useSellerAnalyticsData'
import SellerAnalyticsLoadError from '../SellerAnalyticsLoadError'
import {
  averagePaidBookingValueLastNMonths,
  bestMonthLabelLastNMonths,
  monthlyPaidRevenueBarPercents,
  percentChange,
  revenueThisCalendarMonth,
  revenuePreviousCalendarMonth,
} from '@/lib/seller/sellerOrderAnalytics'
import SellerWithdrawPanel from '../SellerWithdrawPanel'
import { formatPhpWholeAmount } from '@/lib/cart/formatPhp'

const REVENUE_SUMMARY_SOFT = [
  styles.summaryCardSoftGreen,
  styles.summaryCardSoftIndigo,
  styles.summaryCardSoftBlue,
  styles.summaryCardSoftAmber,
]

function SellerAnalyticsRevenueReportsSkeleton() {
  return (
    <div
      className={styles.pageWrap}
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label="Loading revenue analytics"
    >
      <div className={styles.analyticsSkDownloadRow} aria-hidden>
        <span className={`${styles.analyticsSkBar} ${styles.analyticsSkDownloadBtn}`} />
      </div>

      <section className={styles.summaryStrip} aria-hidden>
        {REVENUE_SUMMARY_SOFT.map((soft, i) => (
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

export default function SellerAnalyticsRevenueReportsPage() {
  const { orders, loading, error, reload } = useSellerAnalyticsData()
  const [escrowSummary, setEscrowSummary] = useState(null)
  const [ledgerEntries, setLedgerEntries] = useState([])
  const [escrowError, setEscrowError] = useState('')

  useEffect(() => {
    let cancelled = false
    async function loadEscrow() {
      try {
        const res = await fetch('/api/seller/escrow-summary', { cache: 'no-store' })
        const body = await res.json().catch(() => null)
        if (!res.ok) throw new Error(body?.error || 'Failed to load escrow report.')
        if (!cancelled) {
          setEscrowSummary(body?.summary || null)
          setLedgerEntries(Array.isArray(body?.ledgerEntries) ? body.ledgerEntries : [])
          setEscrowError('')
        }
      } catch (err) {
        if (!cancelled) setEscrowError(err?.message || 'Failed to load escrow report.')
      }
    }
    loadEscrow()
    return () => {
      cancelled = true
    }
  }, [])

  const thisMonth = revenueThisCalendarMonth(orders)
  const prevMonth = revenuePreviousCalendarMonth(orders)
  const monthDelta = percentChange(thisMonth, prevMonth)

  const best = bestMonthLabelLastNMonths(orders, 12)
  const avg12 = averagePaidBookingValueLastNMonths(orders, 12)

  const monthlyBars = useMemo(() => monthlyPaidRevenueBarPercents(orders, 6), [orders])
  const maxAmt = useMemo(
    () => Math.max(...monthlyBars.map((m) => m.amount), 1),
    [monthlyBars],
  )

  if (loading && !error) {
    return <SellerAnalyticsRevenueReportsSkeleton />
  }

  if (error) {
    return <SellerAnalyticsLoadError onRetry={() => reload()} />
  }

  return (
    <div className={styles.pageWrap}>
      {escrowError ? <p className={styles.pageError}>{escrowError}</p> : null}

      <div className={styles.downloadRow}>
        <a
          href="/api/seller/escrow-summary?format=csv"
          className={styles.downloadButton}
          aria-label="Download escrow revenue CSV"
        >
          <TbDownload size={14} aria-hidden />
          <span>Download escrow CSV</span>
        </a>
      </div>

      <section aria-label="Revenue summary" className={styles.summaryStrip}>
        <article className={`${styles.summaryCard} ${styles.summaryCardSoftGreen}`}>
          <p className={styles.summaryLabel}>Gross revenue this month</p>
          <div className={styles.summaryValueRow}>
            <p className={styles.summaryValue}>{formatPhpWholeAmount(thisMonth)}</p>
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

        <article className={`${styles.summaryCard} ${styles.summaryCardSoftGreen}`}>
          <p className={styles.summaryLabel}>Net payable</p>
          <div className={styles.summaryValueRow}>
            <p className={styles.summaryValue}>{formatPhpWholeAmount(escrowSummary?.net || 0)}</p>
          </div>
          <p className={styles.summaryHint}>
            Gross {formatPhpWholeAmount(escrowSummary?.gross || 0)} less commission {formatPhpWholeAmount(escrowSummary?.commission || 0)}
          </p>
        </article>

        <article className={`${styles.summaryCard} ${styles.summaryCardSoftIndigo}`}>
          <p className={styles.summaryLabel}>Held balance</p>
          <div className={styles.summaryValueRow}>
            <p className={styles.summaryValue}>{formatPhpWholeAmount(escrowSummary?.heldBalanceNet || 0)}</p>
          </div>
          <p className={styles.summaryHint}>
            Escrowed {formatPhpWholeAmount(escrowSummary?.escrowedNet || 0)} · on hold {formatPhpWholeAmount(escrowSummary?.onHoldNet || 0)}
          </p>
        </article>

        <article className={`${styles.summaryCard} ${styles.summaryCardSoftBlue}`}>
          <p className={styles.summaryLabel}>Wallet balance</p>
          <div className={styles.summaryValueRow}>
            <p className={styles.summaryValue}>{formatPhpWholeAmount(escrowSummary?.walletBalanceNet || 0)}</p>
          </div>
          <p className={styles.summaryHint}>
            Available to withdraw {formatPhpWholeAmount(escrowSummary?.availableNet || 0)}
          </p>
        </article>

        <article className={`${styles.summaryCard} ${styles.summaryCardSoftGreen}`}>
          <p className={styles.summaryLabel}>Pending withdrawal</p>
          <div className={styles.summaryValueRow}>
            <p className={styles.summaryValue}>{formatPhpWholeAmount(escrowSummary?.pendingWithdrawalNet || 0)}</p>
          </div>
          <p className={styles.summaryHint}>PayMongo transfer in progress</p>
        </article>

        <article className={`${styles.summaryCard} ${styles.summaryCardSoftGreen}`}>
          <p className={styles.summaryLabel}>Paid out</p>
          <div className={styles.summaryValueRow}>
            <p className={styles.summaryValue}>{formatPhpWholeAmount(escrowSummary?.paidOutNet || 0)}</p>
          </div>
          <p className={styles.summaryHint}>Sent to your bank or GCash</p>
        </article>

        <article className={`${styles.summaryCard} ${styles.summaryCardSoftAmber}`}>
          <p className={styles.summaryLabel}>Avg booking value</p>
          <div className={styles.summaryValueRow}>
            <p className={styles.summaryValue}>{formatPhpWholeAmount(avg12)}</p>
          </div>
          <p className={styles.summaryHint}>Best month: {best.amount > 0 ? `${best.label} · ${formatPhpWholeAmount(best.amount)}` : 'No paid revenue yet'}</p>
        </article>
      </section>

      <section aria-label="Revenue charts" className={styles.chartsGridSingle}>
        <article className={styles.chartCard}>
          <div className={styles.chartHeader}>
            <div className={styles.chartTitleGroup}>
              <h2 className={styles.chartTitle}>Monthly paid revenue</h2>
              <p className={styles.chartSubtitle}>
                Last 6 months · gross collected on paid orders. Seller payout totals above come from
                escrow snapshots and your seller wallet balance.
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
                          title={formatPhpWholeAmount(month.amount)}
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

      {Number(escrowSummary?.legacyPaidViaDisbursementNet || 0) > 0 ? (
        <section className={styles.chartCard} aria-label="Legacy payouts">
          <div className={styles.chartHeader}>
            <div className={styles.chartTitleGroup}>
              <h2 className={styles.chartTitle}>Legacy direct payouts</h2>
              <p className={styles.chartSubtitle}>
                {formatPhpWholeAmount(escrowSummary.legacyPaidViaDisbursementNet || 0)} net was sent via the
                previous per-order PayMongo release flow before seller wallet withdrawals.
              </p>
            </div>
          </div>
        </section>
      ) : null}

      {ledgerEntries.length > 0 ? (
        <section className={styles.chartCard} aria-label="Wallet ledger history">
          <div className={styles.chartHeader}>
            <div className={styles.chartTitleGroup}>
              <h2 className={styles.chartTitle}>Wallet ledger</h2>
              <p className={styles.chartSubtitle}>Recent wallet movements tied to orders, refunds, and payouts.</p>
            </div>
          </div>
          <div className={styles.chartBody}>
            <ul className={styles.chartLegend}>
              {ledgerEntries.map((entry) => (
                <li key={entry.id} className={styles.legendItem}>
                  <span className={styles.legendLabel}>
                    {entry.entryType} · {formatPhpWholeAmount(entry.amountPhp || 0)}
                    {entry.orderId ? ` · order ${entry.orderId}` : ''}
                    {entry.createdAt
                      ? ` · ${new Date(entry.createdAt).toLocaleString('en-PH', {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        })}`
                      : ''}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      <SellerWithdrawPanel />
    </div>
  )
}
