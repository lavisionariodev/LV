'use client'

import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import styles from './dashboard.module.css'

const tiles = [
  {
    href: '/seller/my-sales',
    title: 'My Sales',
    description: 'View recent bookings, statuses, and payouts.',
    badge: 'Sales overview',
  },
  {
    href: '/seller/shop-performance',
    title: 'Shop Performance',
    description: 'Track total sales, bookings, commission, and net earnings.',
    badge: 'Insights',
  },
  {
    href: '/seller/my-services',
    title: 'My Services',
    description: 'Manage the services and packages you offer on Lavisionario.',
    badge: 'Listings',
  },
  {
    href: '/seller/my-account',
    title: 'My Account',
    description: 'Update your profile and business information.',
    badge: 'Account',
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
    <main className={styles.page}>
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
    </main>
  )
}

