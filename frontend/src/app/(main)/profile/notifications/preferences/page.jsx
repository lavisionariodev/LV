'use client'

import Link from 'next/link'
import BuyerNotificationPreferencesPanel from '@/features/buyer/notifications/BuyerNotificationPreferencesPanel'
import styles from '../profile.module.css'
import notifStyles from './notifications.module.css'

export default function BuyerNotificationPreferencesPage() {
  return (
    <div className={styles.profileCard}>
      <div className={styles.profileAccentBar} />
      <header className={styles.profileHeader}>
        <div className={notifStyles.headerWrap}>
          <div className={notifStyles.headerTop}>
            <div className={notifStyles.headerText}>
              <p className={styles.profileEyebrow}>Notifications</p>
              <p className={styles.profileSignedIn}>Choose how booking and account alerts reach you.</p>
            </div>
            <Link href="/profile/notifications" className={notifStyles.inboxActionBtn}>
              Back to inbox
            </Link>
          </div>
        </div>
      </header>
      <BuyerNotificationPreferencesPanel />
    </div>
  )
}
