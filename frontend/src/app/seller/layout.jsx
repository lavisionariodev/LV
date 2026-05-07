'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { Poppins } from 'next/font/google'
import { AppSidebar, AppTopbar } from '@/components/layout'
import { useMediaQuery } from '@/shared/hooks'
import { CartProvider } from '@/contexts/CartContext'
import { requireSeller } from '@/lib/auth/guards'
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
    }

    check()

    return () => {
      cancelled = true
    }
  }, [router, pathname])

  const handleLogout = async () => {
    await signOut()
    router.push('/seller/login')
  }

  if (authStatus === 'loading' || authStatus === 'denied' || authStatus === 'pending') {
    return (
      <div className={`${styles.authLoading} ${poppins.className}`}>
        Loading seller portal…
      </div>
    )
  }

  return (
    <CartProvider>
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
        />
        <div className={styles.main}>
          <div className={styles.mainScroll}>
            <AppTopbar
              variant="seller"
              onLogout={handleLogout}
              isMobile={isMobile}
              sidebarCollapsed={collapsed}
            />
            <div className={styles.content}>{children}</div>
          </div>
        </div>
      </div>
    </CartProvider>
  )
}

