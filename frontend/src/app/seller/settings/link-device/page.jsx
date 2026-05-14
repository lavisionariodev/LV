'use client'

import Link from 'next/link'
import SellerQrLoginScanner from '@/features/seller/auth/SellerQrLoginScanner'
import styles from '../settings.module.css'

export default function SellerLinkDevicePage() {
  return (
    <section className={`${styles.card} ${styles.full}`}>
      <div className={styles.tabDetailHead}>
        <div className={styles.tabDetailHeadRow}>
          <div className={styles.tabDetailHeadText}>
            <h2 className={styles.tabDetailTitle}>Link device</h2>
            <p className={styles.tabDetailSubtitle}>
              Scan the QR code on another device to sign in to Seller Centre as your account.
            </p>
          </div>
        </div>
      </div>

      <SellerQrLoginScanner
        context="settings"
        title="Scan login QR"
        subtitle="Open Seller Centre login on your other device, switch to Log in with QR, then scan that code here."
      />

      <Link href="/seller/settings/profile" className={styles.identityActionLink}>
        Back to profile settings
      </Link>
    </section>
  )
}
