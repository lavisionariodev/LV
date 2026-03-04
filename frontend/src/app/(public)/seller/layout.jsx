'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { requireSeller } from '@/lib/auth/guards'

export default function SellerLayout({ children }) {
  const router = useRouter()
  const pathname = usePathname()
  const [authStatus, setAuthStatus] = useState('loading')
  const [sellerStatus, setSellerStatus] = useState(null)

  useEffect(() => {
    let cancelled = false

    async function check() {
      const { user, isSeller, sellerStatus: status } = await requireSeller()
      if (cancelled) return

      if (!user || !isSeller) {
        const redirectTo = encodeURIComponent(pathname || '/seller/my-sales')
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

  if (authStatus === 'loading' || authStatus === 'denied') {
    return (
      <div
        style={{
          minHeight: '60vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '0.95rem',
        }}
      >
        Loading seller portal…
      </div>
    )
  }

  return (
    <div>
      {sellerStatus === 'pending' && (
        <div
          style={{
            backgroundColor: '#FFF7E6',
            borderBottom: '1px solid #FACC6B',
            padding: '0.75rem 1.25rem',
            fontSize: '0.9rem',
          }}
        >
          Your seller account is currently <strong>pending review</strong>. You can review your
          details, but some actions may be limited until an administrator approves your shop.
        </div>
      )}
      {children}
    </div>
  )
}

