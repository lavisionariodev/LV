'use client'

import { useState, useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import styles from './AppTopbar.module.css'
import { IoSearch } from 'react-icons/io5'
import { TbBell } from 'react-icons/tb'
import { FaUser } from 'react-icons/fa6'
import { LuLogOut } from 'react-icons/lu'
import { Logout } from '@/components/ui'
import { useAuth } from '@/contexts/AuthContext'
import { fetchCurrentAdminProfile } from '@/features/admin/settings/getAdminProfile'

const TOPBAR_CONFIG = {
  admin: {
    searchPlaceholder: 'Search…',
    searchAriaLabel: 'Search admin panel',
    notificationsHref: '/admin/notifications',
    defaultDisplayName: 'Admin',
    avatarAlt: 'Admin avatar',
  },
  seller: {
    searchPlaceholder: 'Search…',
    searchAriaLabel: 'Search seller centre',
    notificationsHref: '/seller/notifications',
    defaultDisplayName: 'Seller',
    avatarAlt: 'Seller avatar',
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
  },
}

const getPageTitle = (variant, pathname) => {
  if (!pathname) return ''

  const cleanPath = pathname.split(/[?#]/)[0]
  const segments = cleanPath.split('/').filter(Boolean)

  if (segments.length === 0) return ''

  // Map nested routes like /admin/users/123 to /admin/users
  const base =
    segments.length >= 2
      ? `/${segments[0]}/${segments[1]}`
      : `/${segments[0]}`

  const map = PAGE_TITLES[variant] || {}
  const fullPath = `/${segments.join('/')}`
  if (map[fullPath]) return map[fullPath]
  if (map[base]) return map[base]

  // Fallback: use last segment, capitalized
  const raw = segments[segments.length - 1]
  if (!raw) return ''

  const withSpaces = raw
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())

  return withSpaces
}

export default function AppTopbar({ variant, onLogout }) {
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

  const onClickLogout = () => setShowLogout(true)
  const onCancelLogout = () => setShowLogout(false)
  const onConfirmLogout = async () => {
    setShowLogout(false)
    if (typeof onLogout === 'function') await onLogout()
  }

  return (
    <>
      <header className={styles.topbar}>
        <div className={styles.left}>
          {pageTitle && <h1 className={styles.pageTitle}>{pageTitle}</h1>}
        </div>

        <div className={styles.right}>
          <div className={styles.searchWrap}>
            <span className={styles.searchIcon}>
              <IoSearch />
            </span>
            <input
              type="text"
              className={styles.search}
              placeholder={config.searchPlaceholder}
              aria-label={config.searchAriaLabel}
            />
          </div>

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
            <div
              role="button"
              tabIndex={0}
              className={styles.profileTrigger}
              onClick={() => setDropdownOpen((prev) => !prev)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  setDropdownOpen((prev) => !prev)
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
                    width={36}
                    height={36}
                    className={styles.profileAvatarImg}
                    unoptimized
                  />
                ) : (
                  <FaUser />
                )}
              </div>
              <span className={styles.profileName}>{displayName}</span>
            </div>

            <div className={styles.profileDropdown}>
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
      </header>

      <Logout open={showLogout} onCancel={onCancelLogout} onConfirm={onConfirmLogout} />
    </>
  )
}