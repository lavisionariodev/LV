'use client'

import { useState } from 'react'
import { AdminSidebar, AdminTopbar } from '@/components/layout'
import styles from './admin.module.css'
import { Inter } from 'next/font/google'

const inter = Inter({ subsets: ['latin'] })

export default function AdminLayout({ children }) {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div
      className={`${styles.shell} ${
        collapsed ? styles.shellCollapsed : ''
      } ${inter.className}`}
    >
      <AdminSidebar
        collapsed={collapsed}
        onToggle={() => setCollapsed((prev) => !prev)}
      />

      <div className={styles.main}>
        <AdminTopbar />
        <div className={styles.content}>{children}</div>
      </div>
    </div>
  )
}