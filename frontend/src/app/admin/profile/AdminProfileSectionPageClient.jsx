'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useMediaQuery } from '@/shared/hooks'
import styles from '../settings/settings.module.css'
import profileStyles from './profile.module.css'
import loadingStyles from '../admin-loading.module.css'
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
      <div className={styles.page}>
        <div className={`${styles.contentArea} ${styles.grid}`}>
          <section className={`${styles.card} ${styles.full}`}>
            <div
              className={`${loadingStyles.root} ${loadingStyles.variantCard}`}
              role="status"
              aria-live="polite"
              aria-busy="true"
            >
              <span className={loadingStyles.spinner} aria-hidden />
              <span className={loadingStyles.label}>Opening settings</span>
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
