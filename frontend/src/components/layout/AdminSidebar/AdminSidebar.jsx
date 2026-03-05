'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import styles from './AdminSidebar.module.css'

import {
  TbLayoutSidebarLeftCollapse,
  TbLayoutSidebarLeftExpand,
  TbUsers,
  TbSettings,
  TbMessage2Question,
  TbReportSearch
} from 'react-icons/tb'
import { TbLayoutDashboardFilled } from 'react-icons/tb'
import { LuUserCheck } from 'react-icons/lu'
import { HiOutlineNewspaper } from 'react-icons/hi'
import { FaUser } from 'react-icons/fa6'
import { useAuth } from '@/contexts/AuthContext'
import { fetchCurrentAdminProfile } from '@/features/admin/settings/api'

export default function AdminSidebar({ collapsed = false, onToggle }) {
  const pathname = usePathname()
  const { user, profile } = useAuth()
  const [adminProfile, setAdminProfile] = useState(null)

  // Active logic:
  // - Dashboard (/admin) = exact match only
  // - Others = exact match OR nested routes
  const isActive = (href) => {
    if (!pathname) return false
    if (href === '/admin') return pathname === '/admin'
    return pathname === href || pathname.startsWith(`${href}/`)
  }

  useEffect(() => {
    let cancelled = false

    const loadAdmin = async () => {
      try {
        const data = await fetchCurrentAdminProfile()
        if (!cancelled) {
          setAdminProfile(data)
        }
      } catch {
        // ignore; fall back to AuthContext profile
      }
    }

    loadAdmin()

    return () => {
      cancelled = false
    }
  }, [])

  const avatarUrl = adminProfile?.avatarUrl || profile?.avatar_url || ''
  const displayName =
    adminProfile?.fullName?.trim() ||
    profile?.full_name?.trim() ||
    user?.email?.split('@')[0] ||
    'Admin User'
  const displayEmail = adminProfile?.email || user?.email || ''

  return (
    <aside className={`${styles.sidebar} ${collapsed ? styles.collapsed : ''}`}>
      {/* Logo Row */}
      <div className={styles.logoRow}>
        <div className={styles.logoLeft}>
          <div className={styles.logoMark}>LV</div>

          {!collapsed && (
            <div className={styles.logoText}>
              <p className={styles.brand}>Lavisionario</p>
              <p className={styles.brandSub}>Admin Portal</p>
            </div>
          )}
        </div>

        <button
          className={styles.collapseBtn}
          onClick={onToggle}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          type="button"
        >
          {collapsed ? <TbLayoutSidebarLeftExpand /> : <TbLayoutSidebarLeftCollapse />}
        </button>
      </div>

      {/* Profile (ALWAYS VISIBLE) */}
      <div
        className={styles.profileCard}
        title={collapsed ? displayName : undefined}
        aria-label="Admin profile"
      >
        <div className={styles.profileAvatar}>
          {avatarUrl ? (
            <Image
              src={avatarUrl}
              alt="Admin avatar"
              width={40}
              height={40}
              className={styles.profileAvatarImg}
              unoptimized
            />
          ) : (
            <FaUser />
          )}
        </div>

        {!collapsed && (
          <div className={styles.profileMeta}>
            <p className={styles.profileName}>{displayName}</p>
            <p className={styles.profileRole}>{displayEmail}</p>
          </div>
        )}
      </div>

      {!collapsed && <p className={styles.sectionLabel}>MENU</p>}

      {/* Main Navigation */}
      <nav className={styles.nav}>
        <Link
          href="/admin"
          className={`${styles.link} ${isActive('/admin') ? styles.active : ''}`}
          title={collapsed ? 'Dashboard' : undefined}
        >
          <span className={styles.iconWrap}>
            <TbLayoutDashboardFilled />
          </span>
          <span className={styles.linkText}>Dashboard</span>
        </Link>

        <Link
          href="/admin/payments"
          className={`${styles.link} ${isActive('/admin/payments') ? styles.active : ''}`}
          title={collapsed ? 'Payments' : undefined}
        >
          <span className={styles.iconWrap}>
            <TbReportSearch />
          </span>
          <span className={styles.linkText}>Payments</span>
        </Link>

        <Link
          href="/admin/disputes"
          className={`${styles.link} ${isActive('/admin/disputes') ? styles.active : ''}`}
          title={collapsed ? 'Dispute' : undefined}
        >
          <span className={styles.iconWrap}>
            <TbReportSearch />
          </span>
          <span className={styles.linkText}>Dispute</span>
        </Link>

        <Link
          href="/admin/users"
          className={`${styles.link} ${isActive('/admin/users') ? styles.active : ''}`}
          title={collapsed ? 'Users' : undefined}
        >
          <span className={styles.iconWrap}>
            <TbUsers />
          </span>
          <span className={styles.linkText}>Users</span>
        </Link>

        <Link
          href="/admin/sellers"
          className={`${styles.link} ${isActive('/admin/sellers') ? styles.active : ''}`}
          title={collapsed ? 'Sellers' : undefined}
        >
          <span className={styles.iconWrap}>
            <LuUserCheck />
          </span>
          <span className={styles.linkText}>Sellers</span>
        </Link>

        <Link
          href="/admin/content"
          className={`${styles.link} ${isActive('/admin/content') ? styles.active : ''}`}
          title={collapsed ? 'Content' : undefined}
        >
          <span className={styles.iconWrap}>
            <HiOutlineNewspaper />
          </span>
          <span className={styles.linkText}>Content</span>
        </Link>
      </nav>

      {/* Footer Navigation */}
      <div className={styles.footerNav}>
        <Link
          href="/admin/settings"
          className={`${styles.footerLink} ${isActive('/admin/settings') ? styles.active : ''}`}
          title={collapsed ? 'Settings' : undefined}
        >
          <span className={styles.iconWrap}>
            <TbSettings />
          </span>
          <span className={styles.linkText}>Settings</span>
        </Link>

        <Link
          href="/admin/help"
          className={`${styles.footerLink} ${isActive('/admin/help') ? styles.active : ''}`}
          title={collapsed ? 'Help Center' : undefined}
        >
          <span className={styles.iconWrap}>
            <TbMessage2Question />
          </span>
          <span className={styles.linkText}>Help Center</span>
        </Link>
      </div>
    </aside>
  )
}