'use client'

import Link from 'next/link'
import { useState } from 'react'
import { usePathname } from 'next/navigation'
import {
  TbLayoutSidebarLeftCollapse,
  TbLayoutSidebarLeftExpand,
  TbLayoutDashboardFilled,
  TbReportSearch,
  TbUsers,
  TbSettings,
  TbMessage2Question,
  TbShoppingCart,
  TbChartBar,
  TbList,
  TbUser,
  TbClipboardList,
  TbHome,
} from 'react-icons/tb'
import { LuUserCheck } from 'react-icons/lu'
import { HiOutlineNewspaper } from 'react-icons/hi'
import styles from './AppSidebar.module.css'

const SIDEBAR_CONFIG = {
  admin: {
    basePath: '/admin',
    brandSub: 'Admin Portal',
    navItems: [
      { href: '/admin', label: 'Dashboard', icon: TbLayoutDashboardFilled },
      { href: '/admin/payments', label: 'Payments', icon: TbReportSearch },
      { href: '/admin/disputes', label: 'Dispute', icon: TbReportSearch },
      { href: '/admin/users', label: 'Users', icon: TbUsers },
      { href: '/admin/sellers', label: 'Sellers', icon: LuUserCheck },
      { href: '/admin/content', label: 'Content', icon: HiOutlineNewspaper },
    ],
    footerItems: [
      { href: '/', label: 'Back to main site', icon: TbHome },
      { href: '/admin/settings', label: 'Settings', icon: TbSettings },
      { href: '/admin/help', label: 'Help Center', icon: TbMessage2Question },
    ],
  },
  seller: {
    basePath: '/seller',
    brandSub: 'Seller Centre',
    navItems: [
      { href: '/seller', label: 'Dashboard', icon: TbLayoutDashboardFilled },
      { href: '/seller/my-sales', label: 'My Sales', icon: TbShoppingCart },
      { href: '/seller/shop-performance', label: 'Shop Performance', icon: TbChartBar },
      { href: '/seller/my-services', label: 'My Services', icon: TbList },
      { href: '/seller/my-account', label: 'My Account', icon: TbUser },
      { href: '/seller/onboarding', label: 'Onboarding', icon: TbClipboardList },
    ],
    footerItems: [
      { href: '/', label: 'Back to main site', icon: TbHome },
      { href: '/seller/settings', label: 'Settings', icon: TbSettings },
      { href: '/seller/help', label: 'Help Center', icon: TbMessage2Question },
    ],
  },
}

export default function AppSidebar({ variant, collapsed, onToggle }) {
  const pathname = usePathname()
  const [internalCollapsed, setInternalCollapsed] = useState(false)

  const isControlled =
    collapsed !== undefined && typeof onToggle === 'function'
  const isCollapsed = isControlled ? collapsed : internalCollapsed
  const handleToggle = isControlled ? onToggle : () => setInternalCollapsed((c) => !c)

  const config = SIDEBAR_CONFIG[variant]
  if (!config) return null

  const isActive = (href) => {
    if (!pathname) return false
    if (href === config.basePath) return pathname === config.basePath
    return pathname === href || pathname.startsWith(`${href}/`)
  }

  return (
    <aside className={`${styles.sidebar} ${isCollapsed ? styles.collapsed : ''}`}>
      <div className={styles.logoRow}>
        <Link href="/" className={styles.logoLeft}>
          <div className={styles.logoMark}>LV</div>
          {!isCollapsed && (
            <div className={styles.logoText}>
              <p className={styles.brand}>Lavisionario</p>
              <p className={styles.brandSub}>{config.brandSub}</p>
            </div>
          )}
        </Link>

        <button
          className={styles.collapseBtn}
          onClick={handleToggle}
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          type="button"
        >
          {isCollapsed ? <TbLayoutSidebarLeftExpand /> : <TbLayoutSidebarLeftCollapse />}
        </button>
      </div>

      {!isCollapsed && <p className={styles.sectionLabel}>MENU</p>}

      <nav className={styles.nav}>
        {config.navItems.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={`${styles.link} ${isActive(href) ? styles.active : ''}`}
            title={isCollapsed ? label : undefined}
          >
            <span className={styles.iconWrap}>
              <Icon />
            </span>
            <span className={styles.linkText}>{label}</span>
          </Link>
        ))}
      </nav>

      <div className={styles.footerNav}>
        {config.footerItems.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={`${styles.footerLink} ${href !== '/' && isActive(href) ? styles.active : ''}`}
            title={isCollapsed ? label : undefined}
          >
            <span className={styles.iconWrap}>
              <Icon />
            </span>
            <span className={styles.linkText}>{label}</span>
          </Link>
        ))}
      </div>
    </aside>
  )
}
