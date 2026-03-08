'use client'

import { useState, useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import styles from './AppTopbar.module.css'
import { TbBell, TbMenu2 } from 'react-icons/tb'
import { FaUser } from 'react-icons/fa6'
import { LuLogOut, LuChevronDown } from 'react-icons/lu'
import { TbSettings, TbMessage2Question, TbClipboardList } from 'react-icons/tb'
import { Logout } from '@/components/ui'
import { useAuth } from '@/contexts/AuthContext'
import { fetchCurrentAdminProfile } from '@/features/admin/settings/getAdminProfile'

const TOPBAR_CONFIG = {
  admin: {
    notificationsHref: '/admin/notifications',
    defaultDisplayName: 'Admin',
    avatarAlt: 'Admin avatar',
    profileMenuItems: [
      { href: '/admin/settings', label: 'Settings', icon: TbSettings },
      { href: '/admin/help', label: 'Help Center', icon: TbMessage2Question },
    ],
  },
  seller: {
    notificationsHref: '/seller/notifications',
    defaultDisplayName: 'Seller',
    avatarAlt: 'Seller avatar',
    profileMenuItems: [
      { href: '/seller/onboarding', label: 'Onboarding', icon: TbClipboardList },
      { href: '/seller/settings', label: 'Settings', icon: TbSettings },
      { href: '/seller/help', label: 'Help Center', icon: TbMessage2Question },
    ],
  },
}

const PAGE_TITLES = {
  admin: {
    '/admin': 'Dashboard',
    '/admin/payments': 'Payments',
    '/admin/disputes': 'Disputes',
    '/admin/users': 'Users',
    '/admin/sellers': 'Sellers',
    '/admin/content': 'Content',
    '/admin/settings': 'Settings',
    '/admin/help': 'Help Center',
    '/admin/notifications': 'Notifications',
  },
  seller: {
    '/seller': 'Dashboard',
    '/seller/orders': 'All Orders',
    '/seller/orders/pending': 'Pending',
    '/seller/orders/completed': 'Completed',
    '/seller/products': 'Products',
    '/seller/products/services': 'Services',
    '/seller/products/packages': 'Packages',
    '/seller/products/catalog': 'Catalog',
    '/seller/customers': 'Customers',
    '/seller/analytics': 'Analytics',
    '/seller/analytics/sales-overview': 'Sales Overview',
    '/seller/analytics/revenue-reports': 'Revenue Reports',
    '/seller/analytics/product-performance': 'Product Performance',
    '/seller/analytics/customer-insights': 'Customer Insights',
    '/seller/marketing': 'Marketing',
    '/seller/marketing/centre': 'Marketing Centre',
    '/seller/marketing/discount': 'Discount',
    '/seller/marketing/vouchers': 'Vouchers',
    '/seller/marketing/campaign': 'Campaign',
    '/seller/onboarding': 'Onboarding',
    '/seller/settings': 'Settings',
    '/seller/help': 'Help Center',
    '/seller/notifications': 'Notifications',
    '/seller/more': 'More',
  },
}

function getPageTitle(variant, pathname) {
  if (!pathname) return ''
  const cleanPath = pathname.split(/[?#]/)[0]
  const segments = cleanPath.split('/').filter(Boolean)
  if (segments.length === 0) return ''

  const map = PAGE_TITLES[variant] || {}
  const fullPath = `/${segments.join('/')}`
  const base = segments.length >= 2 ? `/${segments[0]}/${segments[1]}` : `/${segments[0]}`
  const fromMap = map[fullPath] ?? map[base]
  if (fromMap) return fromMap

  const raw = segments[segments.length - 1]
  return raw
    ? raw.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
    : ''
}

export default function AppTopbar({ variant, onLogout, isMobile, onMenuClick, sidebarCollapsed }) {
  const { user, profile } = useAuth()
  const [showLogout, setShowLogout] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [adminProfile, setAdminProfile] = useState(null)
  const profileWrapRef = useRef(null)
  const pathname = usePathname()

  useEffect(() => {
    if (!dropdownOpen) return
    function handleClickOutside(e) {
      if (profileWrapRef.current && !profileWrapRef.current.contains(e.target)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [dropdownOpen])

  const config = TOPBAR_CONFIG[variant]
  if (!config) return null

  const isAdmin = variant === 'admin'
  const pageTitle = getPageTitle(variant, pathname)

  useEffect(() => {
    if (!isAdmin) return
    let cancelled = false
    const load = async () => {
      try {
        const data = await fetchCurrentAdminProfile()
        if (!cancelled) setAdminProfile(data)
      } catch {
        // ignore; fall back to AuthContext profile
      }
    }
    load()
    return () => { cancelled = true }
  }, [isAdmin])

  const avatarUrl = isAdmin
    ? (adminProfile?.avatarUrl || profile?.avatar_url || '')
    : (profile?.avatar_url || '')

  const displayName = isAdmin
    ? (adminProfile?.fullName?.trim() || profile?.full_name?.trim() || user?.email?.split('@')[0] || config.defaultDisplayName)
    : (profile?.full_name?.trim() || user?.user_metadata?.full_name || user?.email?.split('@')[0] || config.defaultDisplayName)

  const displayEmail = user?.email || ''

  const onClickLogout = () => setShowLogout(true)
  const onCancelLogout = () => setShowLogout(false)
  const onConfirmLogout = async () => {
    setShowLogout(false)
    if (typeof onLogout === 'function') await onLogout()
  }

  return (
    <>
      <header
        className={`${styles.topbar} ${!isMobile && sidebarCollapsed ? styles.sidebarCollapsed : ''}`}
      >
        <div className={styles.left}>
          {pageTitle && <h1 className={styles.pageTitle}>{pageTitle}</h1>}
        </div>

        <div className={styles.right}>
          <Link
            href={config.notificationsHref}
            className={styles.iconBtn}
            aria-label="Notifications"
          >
            <TbBell />
          </Link>

          <div
            ref={profileWrapRef}
            className={`${styles.profileWrap} ${dropdownOpen ? styles.profileWrapOpen : ''}`}
          >
            <div className={styles.profileIconWrap}>
              <div
                role="button"
                tabIndex={0}
                className={styles.profileTrigger}
                onClick={() => setDropdownOpen((o) => !o)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    setDropdownOpen((o) => !o)
                  }
                }}
                aria-expanded={dropdownOpen}
                aria-haspopup="true"
                aria-label="Profile menu"
              >
                <div className={styles.profileAvatar}>
                  {avatarUrl ? (
                    <Image
                      src={avatarUrl}
                      alt={config.avatarAlt}
                      width={28}
                      height={28}
                      className={styles.profileAvatarImg}
                      unoptimized
                    />
                  ) : (
                    <FaUser />
                  )}
                </div>
                <span className={styles.profileChevron} aria-hidden>
                  <LuChevronDown />
                </span>
              </div>
            </div>

            <div className={styles.profileDropdown}>
              <div className={styles.profileDropdownCard}>
                <div className={styles.profileDropdownAvatar}>
                  {avatarUrl ? (
                    <Image
                      src={avatarUrl}
                      alt=""
                      width={40}
                      height={40}
                      className={styles.profileDropdownAvatarImg}
                      unoptimized
                    />
                  ) : (
                    <span className={styles.profileDropdownAvatarFallback}>
                      <FaUser />
                    </span>
                  )}
                </div>
                <div className={styles.profileDropdownInfo}>
                  <p className={styles.profileDropdownName}>{displayName}</p>
                  {displayEmail && (
                    <p className={styles.profileDropdownEmail}>{displayEmail}</p>
                  )}
                </div>
              </div>
              <div className={styles.profileDropdownMenu}>
                {config.profileMenuItems?.map(({ href, label, icon: Icon }) => (
                  <Link
                    key={href}
                    href={href}
                    className={styles.profileDropdownItem}
                    onClick={() => setDropdownOpen(false)}
                  >
                    <Icon className={styles.profileDropdownItemIcon} />
                    <span>{label}</span>
                  </Link>
                ))}
                <button
                  type="button"
                  className={styles.logoutBtn}
                  onClick={onClickLogout}
                >
                  <LuLogOut />
                  <span>Log out</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <Logout open={showLogout} onCancel={onCancelLogout} onConfirm={onConfirmLogout} />
    </>
  )
}