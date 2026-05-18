'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { Poppins } from 'next/font/google'
import { AppSidebar, AppTopbar, AppMobileBottomNav } from '@/components/layout'
import { useMediaQuery } from '@/shared/hooks'
import { CartProvider } from '@/contexts/CartContext'
import { PortalInAppNotificationFeedProvider } from '@/contexts/PortalInAppNotificationFeedContext'
import { requireSeller } from '@/lib/auth/guards'
import { registerSellerPortalSession } from '@/lib/auth/sellerPortalSessionsClient'
import { signOut } from '@/lib/auth/session'
import styles from './seller.module.css'

const poppins = Poppins({ weight: ['400', '600', '700'], subsets: ['latin'] })

export default function SellerLayout({ children }) {
  const router = useRouter()
  const pathname = usePathname()
  const isMobile = useMediaQuery('(max-width: 860px)')
  const [collapsed, setCollapsed] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [authStatus, setAuthStatus] = useState('loading')

  useEffect(() => {
    if (authStatus === 'allowed') return

    let cancelled = false

    async function check() {
      const { user, isSeller, sellerStatus: status } = await requireSeller()
      if (cancelled) return

      if (!user || !isSeller) {
        const targetPath =
          pathname && pathname.startsWith('/seller') ? pathname : '/seller'
        const redirectTo = encodeURIComponent(targetPath)
        router.replace(`/seller/login?redirect=${redirectTo}`)
        setAuthStatus('denied')
        return
      }

      if (status === 'pending' || status === 'rejected') {
        router.replace('/seller/onboarding')
        setAuthStatus('pending')
        return
      }
      setAuthStatus('allowed')
      void registerSellerPortalSession()
    }

    check()

    return () => {
      cancelled = true
    }
  }, [router, pathname, authStatus])

  const handleLogout = async () => {
    await signOut()
    router.push('/seller/login')
  }

  if (authStatus === 'loading' || authStatus === 'denied' || authStatus === 'pending') {
    return null
  }

  return (
    <CartProvider>
      <PortalInAppNotificationFeedProvider>
      <div
        className={`${styles.shell} ${
          collapsed ? styles.shellCollapsed : ''
        } ${poppins.className}`}
      >
        <AppSidebar
          variant="seller"
          collapsed={collapsed}
          onToggle={() => setCollapsed((prev) => !prev)}
          isMobile={isMobile}
          mobileOpen={mobileMenuOpen}
          onMobileClose={() => setMobileMenuOpen(false)}
          omitBottomNav={isMobile}
        />
        <div className={styles.main}>
          <AppTopbar
            variant="seller"
            onLogout={handleLogout}
            isMobile={isMobile}
            sidebarCollapsed={collapsed}
          />
          <div className={styles.contentScroll}>
            <div className={styles.content}>{children}</div>
          </div>
          {isMobile ? (
            <AppMobileBottomNav variant="seller" onMobileClose={() => setMobileMenuOpen(false)} />
          ) : null}
        </div>
      </div>
      </PortalInAppNotificationFeedProvider>
    </CartProvider>
  )
}
