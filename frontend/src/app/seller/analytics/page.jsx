'use client'

import Link from 'next/link'
import { useMemo } from 'react'
import { TbChartLine, TbCurrencyPeso, TbUsers, TbChartBar } from 'react-icons/tb'
import styles from './analytics.module.css'
import { useSellerAnalyticsData } from '@/lib/seller/useSellerAnalyticsData'
import SellerAnalyticsLoadError from './SellerAnalyticsLoadError'
import { formatPhpWholeAmount } from '@/lib/cart/formatPhp'
import {
  listingsApprovedCount,
  totalPaidRevenueAllTime,
  uniqueBuyerCount,
} from '@/lib/seller/sellerOrderAnalytics'

const ANALYTICS_HUB_SUMMARY_SOFT = [
  styles.summaryCardSoftGreen,
  styles.summaryCardSoftBlue,
  styles.summaryCardSoftIndigo,
  styles.summaryCardSoftAmber,
]

function SellerAnalyticsHubSkeleton() {
  return (
    <div
      className={styles.pageWrap}
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label="Loading analytics summary"
    >
      <section className={styles.summaryStrip} aria-hidden>
        {ANALYTICS_HUB_SUMMARY_SOFT.map((soft, i) => (
          <article key={i} className={`${styles.summaryCard} ${soft}`}>
            <span className={`${styles.analyticsSkBar} ${styles.analyticsSkSummaryLabel}`} />
            <div className={styles.summaryValueRow}>
              <span className={`${styles.analyticsSkBar} ${styles.analyticsSkSummaryValue}`} />
            </div>
            <span className={`${styles.analyticsSkBar} ${styles.analyticsSkSummaryHint}`} />
          </article>
        ))}
      </section>

      <section className={styles.navGrid} aria-hidden>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className={styles.navCard} style={{ pointerEvents: 'none' }}>
            <div className={styles.navCardHeader}>
              <div>
                <span className={`${styles.analyticsSkBar} ${styles.analyticsSkNavPill}`} />
                <span className={`${styles.analyticsSkBar} ${styles.analyticsSkNavTitle}`} />
              </div>
              <span className={`${styles.analyticsSkBar} ${styles.analyticsSkNavIcon}`} />
            </div>
            <span className={`${styles.analyticsSkBar} ${styles.analyticsSkNavText}`} />
            <span className={`${styles.analyticsSkBar} ${styles.analyticsSkNavText2}`} />
          </div>
        ))}
      </section>
    </div>
  )
}

export default function SellerAnalyticsPage() {
  const { orders, listings, loading, error, reload } = useSellerAnalyticsData()

  const totalOrders = orders.length
  const totalRevenue = formatPhpWholeAmount(totalPaidRevenueAllTime(orders))
  const activeServices = listingsApprovedCount(listings)
  const totalCustomers = uniqueBuyerCount(orders)

  const summary = useMemo(
    () => [
      { label: 'Total orders', value: String(totalOrders) },
      { label: 'Paid revenue (all time)', value: totalRevenue },
      { label: 'Approved listings', value: String(activeServices) },
      { label: 'Unique buyers', value: String(totalCustomers) },
    ],
    [totalOrders, totalRevenue, activeServices, totalCustomers],
  )

  if (loading && !error) {
    return <SellerAnalyticsHubSkeleton />
  }

  if (error) {
    return <SellerAnalyticsLoadError onRetry={() => reload()} />
  }

  return (
    <div className={styles.pageWrap}>
      <section aria-label="Analytics summary" className={styles.summaryStrip}>
        {summary.map((s) => (
          <article key={s.label} className={`${styles.summaryCard} ${styles.summaryCardSoftGreen}`}>
            <p className={styles.summaryLabel}>{s.label}</p>
            <div className={styles.summaryValueRow}>
              <p className={styles.summaryValue}>{s.value}</p>
            </div>
          </article>
        ))}
      </section>

      <section aria-label="Analytics areas" className={styles.navGrid}>
        <Link href="/seller/analytics/sales-overview" className={styles.navCard}>
          <div className={styles.navCardHeader}>
            <div>
              <p className={styles.navCardPill}>Sales</p>
              <h2 className={styles.navCardTitle}>Sales overview</h2>
            </div>
            <span className={styles.navCardIcon}>
              <TbChartLine size={16} aria-hidden />
            </span>
          </div>
          <p className={styles.navCardText}>
            Track how orders and booked services change over time, with a gentle view of daily and
            weekly trends.
          </p>
        </Link>

        <Link href="/seller/analytics/revenue-reports" className={styles.navCard}>
          <div className={styles.navCardHeader}>
            <div>
              <p className={styles.navCardPill}>Finance</p>
              <h2 className={styles.navCardTitle}>Revenue reports</h2>
            </div>
            <span className={styles.navCardIcon}>
              <TbCurrencyPeso size={16} aria-hidden />
            </span>
          </div>
          <p className={styles.navCardText}>
            Understand monthly earnings, average booking value, and which periods are most active.
          </p>
        </Link>

        <Link href="/seller/analytics/product-performance" className={styles.navCard}>
          <div className={styles.navCardHeader}>
            <div>
              <p className={styles.navCardPill}>Services</p>
              <h2 className={styles.navCardTitle}>Product performance</h2>
            </div>
            <span className={styles.navCardIcon}>
              <TbChartBar size={16} aria-hidden />
            </span>
          </div>
          <p className={styles.navCardText}>
            See which funeral packages and services are requested most often, and where interest is
            growing.
          </p>
        </Link>

        <Link href="/seller/analytics/customer-insights" className={styles.navCard}>
          <div className={styles.navCardHeader}>
            <div>
              <p className={styles.navCardPill}>Families</p>
              <h2 className={styles.navCardTitle}>Customer insights</h2>
            </div>
            <span className={styles.navCardIcon}>
              <TbUsers size={16} aria-hidden />
            </span>
          </div>
          <p className={styles.navCardText}>
            Explore how many families are new or returning, and how engagement changes over time.
          </p>
        </Link>
      </section>
    </div>
  )
}
