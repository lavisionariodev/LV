'use client'

import Link from 'next/link'
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

export default function AdminSidebar({ collapsed = false, onToggle }) {
  const pathname = usePathname()

  // Active logic:
  // - Dashboard (/admin) = exact match only
  // - Others = exact match OR nested routes
  const isActive = (href) => {
    if (!pathname) return false
    if (href === '/admin') return pathname === '/admin'
    return pathname === href || pathname.startsWith(`${href}/`)
  }

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
        title={collapsed ? 'Admin User' : undefined}
        aria-label="Admin profile"
      >
        <div className={styles.profileAvatar}>
          <FaUser />
        </div>

        <div className={styles.profileMeta}>
          <p className={styles.profileName}>Admin User</p>
          <p className={styles.profileRole}>Administrator</p>
        </div>
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
          href="/admin/payouts"
          className={`${styles.link} ${isActive('/admin/payouts') ? styles.active : ''}`}
          title={collapsed ? 'Payouts' : undefined}
        >
          <span className={styles.iconWrap}>
            <TbReportSearch />
          </span>
          <span className={styles.linkText}>Payouts</span>
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