'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { Poppins } from 'next/font/google'
import { AppSidebar, AppTopbar } from '@/components/layout'
import { CartProvider } from '@/contexts/CartContext'
import { requireSeller } from '@/lib/auth/guards'
import { signOut } from '@/lib/auth/session'
import styles from './seller.module.css'

const poppins = Poppins({ weight: ['400', '600', '700'], subsets: ['latin'] })

export default function SellerLayout({ children }) {
  const router = useRouter()
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const [authStatus, setAuthStatus] = useState('loading')
  const [sellerStatus, setSellerStatus] = useState(null)

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

      setSellerStatus(status || null)
      setAuthStatus(status === 'pending' ? 'pending' : 'allowed')
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

  if (authStatus === 'loading' || authStatus === 'denied') {
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
        />
        <div className={styles.main}>
          <AppTopbar variant="seller" onLogout={handleLogout} />
          {sellerStatus === 'pending' && (
            <div className={styles.pendingBanner}>
              Your seller account is currently <strong>pending review</strong>. You can review your
              details, but some actions may be limited until an administrator approves your shop.
            </div>
          )}
          <div className={styles.mainScroll}>
            <div className={styles.content}>{children}</div>
          </div>
        </div>
      </div>
    </CartProvider>
  )
}

