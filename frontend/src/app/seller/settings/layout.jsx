'use client'

import Link from 'next/link'
import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { MdCheckCircle, MdErrorOutline } from 'react-icons/md'
import SellerSettingsProvider, {
  SellerSettingsPanelSkeleton,
  useSellerSettings,
} from '@/features/seller/settings/sellerSettings'
import { SELLER_SETTINGS_NAV, getSettingsSectionFromPathname } from './sellerSettingsNav'
import styles from './settings.module.css'

function SellerSettingsChrome({ children }) {
  const pathname = usePathname()
  const router = useRouter()
  const activeId = getSettingsSectionFromPathname(pathname) ?? 'profile'
  const { loading, sellerCanChangePassword, toast, setToast } = useSellerSettings()

  useEffect(() => {
    if (sellerCanChangePassword === false && activeId === 'password') {
      router.replace('/seller/settings/profile')
    }
  }, [sellerCanChangePassword, activeId, router])

  const visibleNavItems = SELLER_SETTINGS_NAV.filter(
    (tab) => tab.id !== 'password' || sellerCanChangePassword === true,
  )

  return (
    <div className={styles.page}>
      <nav className={styles.tabBar} aria-label="Settings sections">
        {loading
          ? SELLER_SETTINGS_NAV.map((tab) => (
              <button
                key={tab.id}
                type="button"
                disabled
                className={`${styles.tabItem} ${activeId === tab.id ? styles.tabItemActive : ''}`}
              >
                <span className={styles.tabLabel}>{tab.label}</span>
              </button>
            ))
          : visibleNavItems.map((tab) => (
              <Link
                key={tab.id}
                href={tab.href}
                id={`seller-settings-tab-${tab.id}`}
                className={`${styles.tabItem} ${activeId === tab.id ? styles.tabItemActive : ''}`}
                aria-current={activeId === tab.id ? 'page' : undefined}
              >
                <span className={styles.tabLabel}>{tab.label}</span>
              </Link>
            ))}
      </nav>

      <div className={`${styles.contentArea} ${styles.grid}`}>
        {loading ? (
          <section
            className={`${styles.card} ${styles.full}`}
            role="status"
            aria-live="polite"
            aria-busy="true"
            aria-label="Loading settings"
          >
            <SellerSettingsPanelSkeleton variant={activeId} />
          </section>
        ) : (
          children
        )}
      </div>

      {toast ? (
        <div
          className={`${styles.toast} ${
            toast.type === 'error' ? styles.toastError : styles.toastSuccess
          }`}
          role="status"
          aria-live="polite"
        >
          {toast.type === 'error' ? <MdErrorOutline /> : <MdCheckCircle />}
          <span>{toast.message}</span>
          <button
            type="button"
            className={styles.toastClose}
            onClick={() => setToast(null)}
            aria-label="Close notification"
          >
            ×
          </button>
        </div>
      ) : null}
    </div>
  )
}

export default function SellerSettingsLayout({ children }) {
  return (
    <SellerSettingsProvider>
      <SellerSettingsChrome>{children}</SellerSettingsChrome>
    </SellerSettingsProvider>
  )
}
