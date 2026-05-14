'use client'

import Link from 'next/link'
import styles from './more.module.css'

const moreLinks = [
  {
    href: '/seller/analytics',
    title: 'Analytics',
    description: 'Sales overview, revenue reports, and product performance.',
    badge: 'Insights',
  },
  {
    href: '/seller/marketing',
    title: 'Marketing',
    description: 'Marketing centre, discounts, vouchers, and campaigns.',
    badge: 'Marketing',
  },
  {
    href: '/seller/reviews',
    title: 'Reviews',
    description: 'Buyer ratings and feedback from completed bookings.',
    badge: 'Reputation',
  },
  {
    href: '/seller/notifications',
    title: 'Notifications',
    description: 'Booking alerts, payout updates, and account notices.',
    badge: 'Inbox',
  },
  {
    href: '/seller/settings/profile',
    title: 'Settings',
    description: 'Profile, shop details, payouts, documents, and preferences.',
    badge: 'Account',
  },
  {
    href: '/seller/help',
    title: 'Help',
    description: 'Get support and browse help articles.',
    badge: 'Support',
  },
]

export default function SellerMorePage() {
  return (
    <div className={styles.pageWrap}>
      <section className={styles.cardsGrid}>
        {moreLinks.map((tile) => (
          <Link key={tile.href} href={tile.href} className={styles.moreCard}>
            <span className={styles.cardBadge}>{tile.badge}</span>
            <h3 className={styles.cardTitle}>{tile.title}</h3>
            <p className={styles.cardBody}>{tile.description}</p>
            <span className={styles.cardLink}>Open &rarr;</span>
          </Link>
        ))}
      </section>
    </div>
  )
}
