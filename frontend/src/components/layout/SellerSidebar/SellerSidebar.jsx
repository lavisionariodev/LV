'use client'

import Link from 'next/link'
import { useState } from 'react'
import { usePathname } from 'next/navigation'
import styles from './SellerSidebar.module.css'
import {
  TbLayoutSidebarLeftCollapse,
  TbLayoutSidebarLeftExpand,
  TbLayoutDashboardFilled,
  TbShoppingCart,
  TbChartBar,
  TbList,
  TbUser,
  TbClipboardList,
  TbHome,
  TbMessage2Question,
  TbSettings,
} from 'react-icons/tb'

const navItems = [
  { href: '/seller', label: 'Dashboard', icon: TbLayoutDashboardFilled },
  { href: '/seller/my-sales', label: 'My Sales', icon: TbShoppingCart },
  { href: '/seller/shop-performance', label: 'Shop Performance', icon: TbChartBar },
  { href: '/seller/my-services', label: 'My Services', icon: TbList },
  { href: '/seller/my-account', label: 'My Account', icon: TbUser },
  { href: '/seller/onboarding', label: 'Onboarding', icon: TbClipboardList },
]

export default function SellerSidebar() {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)

  const isActive = (href) => {
    if (!pathname) return false
    if (href === '/seller') return pathname === '/seller'
    return pathname === href || pathname.startsWith(`${href}/`)
  }

  return (
    <aside className={`${styles.sidebar} ${collapsed ? styles.collapsed : ''}`}>
      {/* Logo Row - clickable to main page */}
      <div className={styles.logoRow}>
        <Link href="/" className={styles.logoLeft}>
          <div className={styles.logoMark}>LV</div>
          {!collapsed && (
            <div className={styles.logoText}>
              <p className={styles.brand}>Lavisionario</p>
              <p className={styles.brandSub}>Seller Centre</p>
            </div>
          )}
        </Link>

        <button
          className={styles.collapseBtn}
          onClick={() => setCollapsed((c) => !c)}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          type="button"
        >
          {collapsed ? <TbLayoutSidebarLeftExpand /> : <TbLayoutSidebarLeftCollapse />}
        </button>
      </div>

      {!collapsed && <p className={styles.sectionLabel}>MENU</p>}

      {/* Main nav links */}
      <nav className={styles.nav}>
        {navItems.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={`${styles.link} ${isActive(href) ? styles.active : ''}`}
            title={collapsed ? label : undefined}
          >
            <span className={styles.iconWrap}>
              <Icon />
            </span>
            <span className={styles.linkText}>{label}</span>
          </Link>
        ))}
      </nav>

      {/* Footer - Back to main site, Settings, Help Center */}
      <div className={styles.footerNav}>
        <Link
          href="/"
          className={styles.footerLink}
          title={collapsed ? 'Back to main site' : undefined}
        >
          <span className={styles.iconWrap}>
            <TbHome />
          </span>
          <span className={styles.linkText}>Back to main site</span>
        </Link>

        <Link
          href="/seller/settings"
          className={`${styles.footerLink} ${isActive('/seller/settings') ? styles.active : ''}`}
          title={collapsed ? 'Settings' : undefined}
        >
          <span className={styles.iconWrap}>
            <TbSettings />
          </span>
          <span className={styles.linkText}>Settings</span>
        </Link>

        <Link
          href="/seller/help"
          className={`${styles.footerLink} ${isActive('/seller/help') ? styles.active : ''}`}
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
