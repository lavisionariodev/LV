'use client'

import { useState, useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import styles from './AppTopbar.module.css'
import { TbBell } from 'react-icons/tb'
import { FaUser } from 'react-icons/fa6'
import { LuLogOut, LuChevronDown } from 'react-icons/lu'
import { IoIosArrowBack } from 'react-icons/io'
import { TbSettings, TbMessage2Question } from 'react-icons/tb'
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
      { href: '/seller/settings', label: 'Settings', icon: TbSettings },
      { href: '/seller/help', label: 'Help Center', icon: TbMessage2Question },
    ],
  },
}

const PAGE_TITLES = {
  admin: {
    '/admin': 'Dashboard',
    '/admin/payouts': 'Payouts',
    '/admin/analytics': 'Analytics',
    '/admin/disputes': 'Disputes',
    '/admin/buyers': 'Buyers',
    '/admin/sellers': 'Sellers',
    '/admin/listings': 'Listings',
    '/admin/seller-template': 'Template',
    '/admin/settings': 'Settings',
    '/admin/profile': 'Profile',
    '/admin/profile/notifications': 'Notification settings',
    '/admin/profile/billing': 'Platform billing',
    '/admin/profile/content': 'Site content',
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
    '/seller/products/new-listing': 'Add New Listing',
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

const SAMPLE_NOTIFICATIONS = [
  {
    id: 1,
    title: 'New dispute filed',
    message: 'Order #4821 has a new dispute requiring your review.',
    time: '2 min ago',
    unread: true,
  },
  {
    id: 2,
    title: 'Seller approved',
    message: 'Seller "Maria Santos" has been successfully verified.',
    time: '1 hr ago',
    unread: true,
  },
  {
    id: 3,
    title: 'Payout processed',
    message: '₱12,500 payout was sent to 3 sellers.',
    time: '3 hrs ago',
    unread: false,
  },
  {
    id: 4,
    title: 'New user registered',
    message: 'juan.dela.cruz@email.com just created an account.',
    time: 'Yesterday',
    unread: false,
  },
]

export default function AppTopbar({ variant, onLogout, isMobile, sidebarCollapsed }) {
  const { user, profile } = useAuth()
  const [showLogout, setShowLogout] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [adminProfile, setAdminProfile] = useState(null)
  const profileWrapRef = useRef(null)
  const notifWrapRef = useRef(null)
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

  useEffect(() => {
    if (!notifOpen) return
    function handleClickOutside(e) {
      if (notifWrapRef.current && !notifWrapRef.current.contains(e.target)) {
        setNotifOpen(false)
      }
    }
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [notifOpen])

  const config = TOPBAR_CONFIG[variant]
  if (!config) return null

  const isAdmin = variant === 'admin'
  const pageTitle = getPageTitle(variant, pathname)
  const isAdminHome =
    isAdmin && pathname && pathname.split(/[?#]/)[0] === '/admin'
  const heading = isAdminHome && isMobile ? 'Hello, Admin!' : pageTitle

  const cleanPathname = pathname?.split(/[?#]/)[0] || ''
  const isSettingsPage = isMobile && (
    cleanPathname === '/admin/settings' ||
    cleanPathname === '/admin/profile' ||
    cleanPathname === '/seller/settings'
  )

  const isNotificationsPage = isMobile && (
    cleanPathname === '/admin/notifications' || cleanPathname === '/seller/notifications'
  )

  const isProfileSectionPage = isMobile && (
    cleanPathname === '/admin/profile/notifications' ||
    cleanPathname === '/admin/profile/billing' ||
    cleanPathname === '/admin/profile/content'
  )

  const isCenteredPage = isSettingsPage || isNotificationsPage || isProfileSectionPage
  const centeredTitle = isProfileSectionPage
    ? (PAGE_TITLES.admin[cleanPathname] || pageTitle)
    : isSettingsPage ? 'Profile'
    : isNotificationsPage ? 'Notifications'
    : ''

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
        className={`${styles.topbar} ${!isMobile && sidebarCollapsed ? styles.sidebarCollapsed : ''} ${isCenteredPage ? styles.topbarCentered : ''}`}
      >
        {isCenteredPage ? (
          <>
            {isProfileSectionPage && (
              <Link href="/admin/profile" className={styles.topbarBackBtn} aria-label="Back to profile">
                <IoIosArrowBack />
              </Link>
            )}
            <h1 className={styles.pageTitleCentered}>{centeredTitle}</h1>
          </>
        ) : (<>
        <div className={styles.left}>
          {heading && <h1 className={styles.pageTitle}>{heading}</h1>}
        </div>

        <div className={styles.right}>
          <div
            ref={notifWrapRef}
            className={`${styles.notifWrap} ${notifOpen ? styles.notifWrapOpen : ''}`}
          >
            <button
              type="button"
              className={styles.iconBtn}
              aria-label="Notifications"
              onClick={() => setNotifOpen((o) => !o)}
            >
              <TbBell />
            </button>

            <div className={styles.notifDropdown}>
              <div className={styles.notifDropdownHead}>
                <p className={styles.notifDropdownTitle}>Notifications</p>
                {SAMPLE_NOTIFICATIONS.some((n) => n.unread) && (
                  <span className={styles.notifUnreadCount}>
                    {SAMPLE_NOTIFICATIONS.filter((n) => n.unread).length} new
                  </span>
                )}

              </div>
              <ul className={styles.notifList}>
                {SAMPLE_NOTIFICATIONS.map((n) => (
                  <li
                    key={n.id}
                    className={`${styles.notifItem} ${n.unread ? styles.notifItemUnread : ''}`}
                  >
                    <span className={styles.notifDot} data-unread={n.unread} />
                    <div className={styles.notifItemBody}>
                      <p className={styles.notifItemTitle}>{n.title}</p>
                      <p className={styles.notifItemMsg}>{n.message}</p>
                      <p className={styles.notifItemTime}>{n.time}</p>
                    </div>
                  </li>
                ))}
              </ul>
              <div className={styles.notifFooter}>
                <Link
                  href={config.notificationsHref}
                  className={styles.notifViewAll}
                  onClick={() => setNotifOpen(false)}
                >
                  See all notifications
                </Link>
              </div>
            </div>
          </div>

          {(!isMobile || variant === 'seller') && (
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
          )}
        </div>
        </>)}
      </header>

      <Logout open={showLogout} onCancel={onCancelLogout} onConfirm={onConfirmLogout} />
    </>
  )
}