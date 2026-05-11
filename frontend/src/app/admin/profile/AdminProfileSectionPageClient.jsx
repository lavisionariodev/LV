'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useMediaQuery } from '@/shared/hooks'
import styles from '../settings/settings.module.css'
import profileStyles from './profile.module.css'
import {
  AdminNotificationPreferencesPanel,
  AdminBillingSettingsPanel,
  AdminSiteContentPanel,
} from '../settings/AdminSettingsClient'

/**
 * Mobile profile detail pages for notification / billing / site content.
 * Standalone screens (no settings tab bar) — separate UX from desktop /admin/settings.
 * Desktop: redirect to the unified admin settings page with the matching tab.
 */
export default function AdminProfileSectionPageClient({ section }) {
  const router = useRouter()
  const isMobile = useMediaQuery('(max-width: 640px)')

  useEffect(() => {
    if (!isMobile) {
      router.replace(`/admin/settings?tab=${section}`)
    }
  }, [isMobile, router, section])

  if (!isMobile) {
    return (
      <div className={styles.page} role="status" aria-live="polite" aria-busy="true" aria-label="Opening settings">
        <div className={`${styles.contentArea} ${styles.grid}`}>
          <section className={`${styles.card} ${styles.full}`}>
            <div className={styles.settingsSkCardHead}>
              <span className={`${styles.settingsSkBar} ${styles.settingsSkTitle}`} />
              <span className={`${styles.settingsSkBar} ${styles.settingsSkSubtitle}`} />
            </div>
            <div className={styles.settingsSkNotifList}>
              {[0, 1, 2].map((i) => (
                <div key={i} className={styles.settingsSkNotifRow}>
                  <div className={styles.settingsSkNotifMeta}>
                    <span className={`${styles.settingsSkBar} ${styles.settingsSkNotifTitle}`} />
                    <span className={`${styles.settingsSkBar} ${styles.settingsSkNotifDesc}`} />
                  </div>
                  <div className={styles.settingsSkNotifControls}>
                    <span className={`${styles.settingsSkBar} ${styles.settingsSkSwitch}`} />
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    )
  }

  return (
    <div className={profileStyles.profileDetailPage}>
      <div className={profileStyles.profileDetailBody}>
        <div className={profileStyles.profileDetailBodyInner}>
          {section === 'notifications' && (
            <AdminNotificationPreferencesPanel variant="profileDetail" />
          )}
          {section === 'billing' && <AdminBillingSettingsPanel variant="profileDetail" />}
          {section === 'content' && <AdminSiteContentPanel profileDetailPage />}
        </div>
      </div>
    </div>
  )
}
