'use client'

import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import styles from './seller.module.css'

const tiles = [
  {
    href: '/seller/orders',
    title: 'Orders',
    description: 'View and manage all your orders, pending and completed.',
    badge: 'Orders',
  },
  {
    href: '/seller/products',
    title: 'Products',
    description: 'Manage services, packages, and your catalog.',
    badge: 'Listings',
  },
  {
    href: '/seller/customers',
    title: 'Customers',
    description: 'View your customers and booking history.',
    badge: 'Customers',
  },
  {
    href: '/seller/analytics',
    title: 'Analytics',
    description: 'Track sales, revenue, and performance insights.',
    badge: 'Insights',
  },
  {
    href: '/seller/marketing',
    title: 'Marketing',
    description: 'Discounts, vouchers, and campaigns.',
    badge: 'Marketing',
  },
  {
    href: '/seller/notifications',
    title: 'Notifications',
    description: 'Review booking alerts, payout updates, and admin messages.',
    badge: 'Inbox',
  },
  {
    href: '/seller/onboarding',
    title: 'Onboarding',
    description: 'Complete or review your shop information and documents.',
    badge: 'Setup',
  },
]

export default function SellerDashboardPage() {
  const { user } = useAuth()
  const displayEmail = user?.email || ''

  return (
    <div className={`${styles.pageWrap} ${styles.dashboardPage}`}>
      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <div>
            <p className={styles.kicker}>Seller Centre</p>
            <h1 className={styles.title}>Welcome to your seller home</h1>
            <p className={styles.subtitle}>
              Manage your services, keep track of bookings, and monitor your shop performance
              in one place.
            </p>
            {displayEmail && (
              <p className={styles.signedIn}>
                Signed in as <strong>{displayEmail}</strong>
              </p>
            )}
          </div>
        </div>
      </section>

      <section className={styles.gridSection}>
        <div className={styles.gridHeader}>
          <h2 className={styles.gridTitle}>Quick navigation</h2>
          <p className={styles.gridSubtitle}>
            Go straight to the sections you&apos;ll use most often as a seller.
          </p>
        </div>

        <div className={styles.grid}>
          {tiles.map((tile) => (
            <Link key={tile.href} href={tile.href} className={styles.card}>
              <div className={styles.cardHeader}>
                <span className={styles.cardBadge}>{tile.badge}</span>
                <h3 className={styles.cardTitle}>{tile.title}</h3>
              </div>
              <p className={styles.cardBody}>{tile.description}</p>
              <span className={styles.cardLink}>Open &rarr;</span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}

