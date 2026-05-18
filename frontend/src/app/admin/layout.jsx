'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { AppSidebar, AppTopbar } from '@/components/layout'
import { useMediaQuery } from '@/shared/hooks'
import { requireAdmin } from '@/lib/auth/guards'
import { signOut } from '@/lib/auth/session'
import { PortalInAppNotificationFeedProvider } from '@/contexts/PortalInAppNotificationFeedContext'
import styles from './admin.module.css'
import { Poppins } from 'next/font/google'

const poppins = Poppins({ weight: ['400', '600', '700'], subsets: ['latin'] })

export default function AdminLayout({ children }) {
  const router = useRouter()
  const isMobile = useMediaQuery('(max-width: 860px)')
  const [collapsed, setCollapsed] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [authStatus, setAuthStatus] = useState('loading')

  useEffect(() => {
    // Fallback gate after middleware; denied users go to /administrator.
    let cancelled = false
    async function check() {
      const { user, isAdmin } = await requireAdmin()
      if (cancelled) return
      if (isAdmin && user) {
        setAuthStatus('allowed')
      } else {
        setAuthStatus('denied')
        router.replace('/administrator')
      }
    }
    check()
    return () => { cancelled = true }
  }, [router])

  const handleLogout = async () => {
    await signOut()
    router.push('/administrator')
  }

  if (authStatus === 'loading' || authStatus === 'denied') {
    return null
  }

  return (
    <PortalInAppNotificationFeedProvider>
    <div
      className={`${styles.shell} ${
        collapsed ? styles.shellCollapsed : ''
      } ${poppins.className}`}
    >
      <Suspense fallback={null}>
        <AppSidebar
          variant="admin"
          collapsed={collapsed}
          onToggle={() => setCollapsed((prev) => !prev)}
          isMobile={isMobile}
          mobileOpen={mobileMenuOpen}
          onMobileClose={() => setMobileMenuOpen(false)}
        />
      </Suspense>
      <div className={styles.main}>
        <AppTopbar
          variant="admin"
          onLogout={handleLogout}
          isMobile={isMobile}
          sidebarCollapsed={collapsed}
        />
        <div className={styles.contentScroll}>
          <div className={styles.content}>{children}</div>
        </div>
      </div>
    </div>
    </PortalInAppNotificationFeedProvider>
  )
}
