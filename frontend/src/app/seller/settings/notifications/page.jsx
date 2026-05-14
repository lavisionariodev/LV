'use client'

import { SellerNotificationPreferencesPanel, useSellerSettings } from '@/features/seller/settings/sellerSettings'
import styles from '../settings.module.css'

export default function Page() {
  const ctx = useSellerSettings()
  const {
    notificationsTabId,
    notificationsPanelId,
  } = ctx

  return (
                  <section
            id={notificationsPanelId}
            role="tabpanel"
            aria-labelledby={notificationsTabId}
            className={`${styles.card} ${styles.full}`}
          >
            <div className={styles.tabDetailHead}>
              <div className={styles.tabDetailHeadRow}>
                <div className={styles.tabDetailHeadText}>
                  <h2 className={styles.tabDetailTitle}>Notification preferences</h2>
                  <p className={styles.tabDetailSubtitle}>
                    Choose in-app and email alerts.
                  </p>
                </div>
              </div>
            </div>
            <SellerNotificationPreferencesPanel />
          </section>

  )
}
