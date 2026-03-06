'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AppSidebar, AppTopbar } from '@/components/layout'
import { requireAdmin } from '@/lib/auth/guards'
import { signOut } from '@/lib/auth/session'
import styles from './admin.module.css'
import { Inter } from 'next/font/google'

const inter = Inter({ subsets: ['latin'] })

export default function AdminLayout({ children }) {
  const router = useRouter()
  const [collapsed, setCollapsed] = useState(false)
  const [authStatus, setAuthStatus] = useState('loading')

  useEffect(() => {
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
    return (
      <div className={`${styles.authLoading} ${inter.className}`}>
        Loading…
      </div>
    )
  }

  return (
    <div
      className={`${styles.shell} ${
        collapsed ? styles.shellCollapsed : ''
      } ${inter.className}`}
    >
      <AppSidebar
        variant="admin"
        collapsed={collapsed}
        onToggle={() => setCollapsed((prev) => !prev)}
      />

      <div className={styles.main}>
        <AppTopbar variant="admin" onLogout={handleLogout} />
        <div className={styles.content}>{children}</div>
      </div>
    </div>
  )
}
