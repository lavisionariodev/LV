'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { useMediaQuery } from '@/shared/hooks'
import profileStyles from '../profile/profile.module.css'
import styles from './settings.module.css'
import { ADMIN_SETTINGS_NAV, getSettingsSectionFromPathname } from './adminSettingsNav'

export default function AdminSettingsLayout({ children }) {
  const router = useRouter()
  const isMobile = useMediaQuery('(max-width: 640px)')
  const pathname = usePathname()
  const activeId = getSettingsSectionFromPathname(pathname) ?? 'account'

  useEffect(() => {
    if (!isMobile) return
    if (pathname === '/admin/settings/account') {
      router.replace('/admin/profile?sheet=account', { scroll: false })
      return
    }
    if (pathname === '/admin/settings/password') {
      router.replace('/admin/profile?sheet=password', { scroll: false })
    }
  }, [isMobile, pathname, router])

  const tabNav = !isMobile ? (
    <nav className={styles.tabBar} aria-label="Settings sections">
      {ADMIN_SETTINGS_NAV.map((tab) => (
        <Link
          key={tab.id}
          href={tab.href}
          className={`${styles.tabItem} ${activeId === tab.id ? styles.tabItemActive : ''}`}
          aria-current={activeId === tab.id ? 'page' : undefined}
        >
          <span className={styles.tabLabel}>{tab.label}</span>
        </Link>
      ))}
    </nav>
  ) : null

  if (isMobile) {
    return (
      <div className={styles.page} data-portal-inner-page>
        {tabNav}
        <div className={profileStyles.profileDetailPage}>
          <div className={profileStyles.profileDetailBody}>
            <div className={profileStyles.profileDetailBodyInner}>{children}</div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      {tabNav}
      <div className={`${styles.contentArea} ${styles.grid}`}>{children}</div>
    </div>
  )
}
