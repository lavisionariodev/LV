'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import styles from './listings.module.css'

export default function ListingsMobileTabs() {
  const pathname = usePathname()
  const clean = pathname?.split(/[?#]/)[0] || ''
  const isApprovals = clean.startsWith('/admin/listings/approvals')

  return (
    <nav className={styles.listingsMobileSwitch} aria-label="Listings navigation">
      <Link
        href="/admin/listings/browse"
        className={`${styles.listingsMobileSwitchLink} ${!isApprovals ? styles.listingsMobileSwitchLinkActive : ''}`}
        aria-current={!isApprovals ? 'page' : undefined}
      >
        Browse
      </Link>
      <Link
        href="/admin/listings/approvals"
        className={`${styles.listingsMobileSwitchLink} ${isApprovals ? styles.listingsMobileSwitchLinkActive : ''}`}
        aria-current={isApprovals ? 'page' : undefined}
      >
        Approvals
      </Link>
    </nav>
  )
}