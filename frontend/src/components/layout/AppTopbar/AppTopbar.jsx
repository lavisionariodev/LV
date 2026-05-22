'use client'

import { useState, useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import styles from './AppTopbar.module.css'
import { TbBell } from 'react-icons/tb'
import { FaUser } from 'react-icons/fa6'
import { LuLogOut } from 'react-icons/lu'
import { IoIosArrowBack } from 'react-icons/io'
import { TbSettings, TbMessage2Question } from 'react-icons/tb'
import { Logout } from '@/components/ui'
import { useAuth } from '@/contexts/AuthContext'
import { fetchCurrentAdminProfile } from '@/features/admin/settings/adminProfile'
import { relativeNotificationTime } from '@/lib/notifications/useInAppNotificationFeed'
import { usePortalInAppNotificationFeed } from '@/contexts/PortalInAppNotificationFeedContext'

const TOPBAR_CONFIG = {
  admin: {
    notificationsHref: '/admin/notifications',
    defaultDisplayName: 'Admin',
    avatarAlt: 'Admin avatar',
    profileMenuItems: [
      { href: '/admin/settings/account', label: 'Settings', icon: TbSettings },
      { href: '/admin/help', label: 'Help Center', icon: TbMessage2Question },
    ],
  },
  seller: {
    notificationsHref: '/seller/notifications',
    defaultDisplayName: 'Seller',
    avatarAlt: 'Seller avatar',
    profileMenuItems: [
      { href: '/seller/settings/profile', label: 'Settings', icon: TbSettings },
      { href: '/seller/help', label: 'Help Center', icon: TbMessage2Question },
    ],
  },
}

const PAGE_TITLES = {
  admin: {
    '/admin': 'Dashboard',
    '/admin/payouts': 'Payouts',
    '/admin/earnings': 'Platform earnings',
    '/admin/analytics': 'Analytics',
    '/admin/disputes': 'Disputes',
    '/admin/buyers': 'Buyers',
    '/admin/sellers': 'Sellers',
    '/admin/listings/browse': 'Browse listings',
    '/admin/listings/approvals': 'Listing approvals',
    '/admin/settings': 'Settings',
    '/admin/settings/account': 'Account',
    '/admin/settings/password': 'Password',
    '/admin/settings/notifications': 'Notification',
    '/admin/settings/billing': 'Platform billing',
    '/admin/settings/site-content': 'Site content',
    '/admin/profile': 'Profile',
    '/admin/help': 'Help Center',
    '/admin/notifications': 'Notifications',
  },
  seller: {
    '/seller': 'Dashboard',
    '/seller/orders': 'Orders',
    '/seller/wallet': 'Wallet',
    '/seller/listings': 'Listings',
    '/seller/listings/services': 'Services',
    '/seller/listings/packages': 'Packages',
    '/seller/listings/products': 'Products',
    '/seller/listings/catalog': 'Catalog',
    '/seller/listings/archive': 'Archived',
    '/seller/listings/new-listing': 'Add New Listing',
    '/seller/customers': 'Customers',
    '/seller/reviews': 'Reviews',
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
    '/seller/settings/profile': 'Profile',
    '/seller/settings/password': 'Password',
    '/seller/settings/shop-information': 'Shop information',
    '/seller/settings/payouts': 'Payouts',
    '/seller/settings/documents': 'Documents',
    '/seller/settings/notifications': 'Notifications',
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

export default function AppTopbar({ variant, onLogout, isMobile, sidebarCollapsed }) {
  const { user, profile } = useAuth()
  const [showLogout, setShowLogout] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [adminProfile, setAdminProfile] = useState(null)
  const profileWrapRef = useRef(null)
  const notifWrapRef = useRef(null)
  const pathname = usePathname()

  const {
    notifications: portalNotifRows,
    unreadCount: topbarUnreadCount,
    markRead: markTopbarNotifRead,
  } = usePortalInAppNotificationFeed()

  const topbarNotifRows = portalNotifRows.slice(0, 8)

  const topbarNotifications = topbarNotifRows.map((n) => ({
    id: n.id,
    title: n.title || 'Notification',
    message: n.body || '',
    time: relativeNotificationTime(n.createdAt),
    unread: !n.readAt,
  }))

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

  useEffect(() => {
    if (variant !== 'admin') return
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
  }, [variant])

  const config = TOPBAR_CONFIG[variant]
  if (!config) return null

  const isAdmin = variant === 'admin'
  const pageTitle = getPageTitle(variant, pathname)
  const isAdminHome =
    isAdmin && pathname && pathname.split(/[?#]/)[0] === '/admin'
  const heading = isAdminHome && isMobile ? 'Home' : pageTitle

  const cleanPathname = pathname?.split(/[?#]/)[0] || ''
  const isAdminSettingsSubpage =
    isAdmin &&
    cleanPathname.startsWith('/admin/settings/') &&
    Boolean(PAGE_TITLES.admin[cleanPathname])
  const showAdminSettingsBreadcrumb = !isMobile && isAdminSettingsSubpage
  const adminSettingsSectionTitle = showAdminSettingsBreadcrumb
    ? PAGE_TITLES.admin[cleanPathname]
    : ''
  const isSettingsPage = isMobile && (
    cleanPathname === '/admin/settings' ||
    cleanPathname.startsWith('/admin/settings/') ||
    cleanPathname === '/admin/profile' ||
    cleanPathname === '/seller/settings' ||
    cleanPathname.startsWith('/seller/settings/')
  )

  const isNotificationsPage = isMobile && (
    cleanPathname === '/admin/notifications' || cleanPathname === '/seller/notifications'
  )

  const isProfileSectionPage = isMobile && (
    cleanPathname === '/admin/settings/notifications' ||
    cleanPathname === '/admin/settings/billing' ||
    cleanPathname === '/admin/settings/site-content'
  )

  const isSellerSettingsSectionPage =
    isMobile &&
    variant === 'seller' &&
    cleanPathname.startsWith('/seller/settings/') &&
    Boolean(PAGE_TITLES.seller[cleanPathname])

  const isCenteredPage =
    isSettingsPage || isNotificationsPage || isProfileSectionPage || isSellerSettingsSectionPage
  const centeredTitle = isProfileSectionPage
    ? (PAGE_TITLES.admin[cleanPathname] || pageTitle)
    : isSellerSettingsSectionPage
      ? (PAGE_TITLES.seller[cleanPathname] || pageTitle)
    : isSettingsPage ? 'Profile'
    : isNotificationsPage ? 'Notifications'
    : ''

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
    if (typeof onLogout === 'function') await onLogout()
    setShowLogout(false)
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
            {isSellerSettingsSectionPage && (
              <Link href="/seller/more" className={styles.topbarBackBtn} aria-label="Back to more">
                <IoIosArrowBack />
              </Link>
            )}
            <h1 className={styles.pageTitleCentered}>{centeredTitle}</h1>
          </>
        ) : (<>
        <div className={styles.left}>
          {showAdminSettingsBreadcrumb ? (
            <nav className={styles.pageTitleBreadcrumb} aria-label="Breadcrumb">
              <Link href="/admin/settings/account" className={styles.breadcrumbLink}>
                Settings
              </Link>
              <span className={styles.breadcrumbSeparator} aria-hidden="true">
                &gt;
              </span>
              <span className={styles.breadcrumbCurrent} aria-current="page">
                {adminSettingsSectionTitle}
              </span>
            </nav>
          ) : (
            heading && <h1 className={styles.pageTitle}>{heading}</h1>
          )}
        </div>

        <div className={styles.right}>
          <div
            ref={notifWrapRef}
            className={`${styles.notifWrap} ${notifOpen ? styles.notifWrapOpen : ''}`}
          >
            <button
              type="button"
              className={styles.notifIconBtn}
              aria-label={
                topbarUnreadCount > 0
                  ? `Notifications, ${topbarUnreadCount} unread`
                  : 'Notifications'
              }
              onClick={() => setNotifOpen((o) => !o)}
            >
              <TbBell />
              {topbarUnreadCount > 0 ? (
                <span className={styles.notifUnreadDot} aria-hidden />
              ) : null}
            </button>

            <div className={styles.notifDropdown}>
              <div className={styles.notifDropdownHead}>
                <p className={styles.notifDropdownTitle}>Notifications</p>
                {topbarUnreadCount > 0 && (
                  <span className={styles.notifUnreadCount}>
                    {topbarUnreadCount > 9 ? '9+' : topbarUnreadCount} new
                  </span>
                )}

              </div>
              <ul className={styles.notifList}>
                {topbarNotifications.length === 0 ? (
                  <li className={styles.notifItem}>
                    <div className={styles.notifItemBody}>
                      <p className={styles.notifItemMsg}>No notifications yet.</p>
                    </div>
                  </li>
                ) : (
                  topbarNotifications.map((n) => (
                    <li
                      key={n.id}
                      className={`${styles.notifItem} ${n.unread ? styles.notifItemUnread : ''}`}
                      role="button"
                      tabIndex={0}
                      onClick={() => markTopbarNotifRead(n.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          markTopbarNotifRead(n.id)
                        }
                      }}
                    >
                      <span className={styles.notifDot} data-unread={n.unread} />
                      <div className={styles.notifItemBody}>
                        <p className={styles.notifItemTitle}>{n.title}</p>
                        <p className={styles.notifItemMsg}>{n.message}</p>
                        <p className={styles.notifItemTime}>{n.time}</p>
                      </div>
                    </li>
                  ))
                )}
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
                      sizes="28px"
                    />
                  ) : (
                    <FaUser />
                  )}
                </div>
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
                      sizes="40px"
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