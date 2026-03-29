'use client'

import Link from 'next/link'
import { TbChartLine, TbCurrencyPeso, TbUsers, TbChartBar } from 'react-icons/tb'
import styles from './analytics.module.css'

export default function SellerAnalyticsPage() {
  // Static illustrative metrics for now – these can be wired to real data later.
  const totalOrders = 128
  const totalRevenue = '₱845,230'
  const activeServices = 18
  const totalCustomers = 72

  return (
    <div className={styles.pageWrap}>
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
