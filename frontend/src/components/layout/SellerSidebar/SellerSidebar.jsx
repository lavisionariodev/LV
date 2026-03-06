'use client'

import Link from 'next/link'
import Image from 'next/image'
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
  TbBell,
  TbClipboardList,
  TbHome,
  TbMessage2Question,
} from 'react-icons/tb'
import { FaUser } from 'react-icons/fa6'
import { useAuth } from '@/contexts/AuthContext'

const navItems = [
  { href: '/seller', label: 'Dashboard', icon: TbLayoutDashboardFilled },
  { href: '/seller/my-sales', label: 'My Sales', icon: TbShoppingCart },
  { href: '/seller/shop-performance', label: 'Shop Performance', icon: TbChartBar },
  { href: '/seller/my-services', label: 'My Services', icon: TbList },
  { href: '/seller/my-account', label: 'My Account', icon: TbUser },
  { href: '/seller/notifications', label: 'Notifications', icon: TbBell },
  { href: '/seller/onboarding', label: 'Onboarding', icon: TbClipboardList },
]

export default function SellerSidebar() {
  const pathname = usePathname()
  const { user, profile } = useAuth()
  const [collapsed, setCollapsed] = useState(false)

  const isActive = (href) => {
    if (!pathname) return false
    if (href === '/seller') return pathname === '/seller'
    return pathname === href || pathname.startsWith(`${href}/`)
  }

  const avatarUrl = profile?.avatar_url || ''
  const displayName =
    profile?.full_name?.trim() ||
    user?.user_metadata?.full_name ||
    user?.email?.split('@')[0] ||
    'Seller'
  const displayEmail = user?.email || ''

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

      {/* Profile - avatar (circular) + name + email */}
      <div
        className={styles.profileCard}
        title={collapsed ? displayName : undefined}
        aria-label="Seller profile"
      >
        <div className={styles.profileAvatar}>
          {avatarUrl ? (
            <Image
              src={avatarUrl}
              alt="Seller avatar"
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

      {/* Footer - Back to main site + Help Center */}
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
