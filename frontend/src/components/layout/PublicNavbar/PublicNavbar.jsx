'use client'

import { readString, replaceUrlQuery } from '@/shared/utils'
import { useState, useRef, useEffect } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { useCart } from '@/contexts/CartContext'
import { useFavorites } from '@/contexts/FavoritesContext'
import { signOut } from '@/lib/auth/session'
import LogoutModal from '@/components/ui/Modal/Logout'
import styles from './PublicNavbar.module.css'
import { useAuth } from '@/contexts/AuthContext'
import { useSiteContent } from '@/lib/siteContent/client'
import InstallAppControl from '@/components/pwa/InstallAppControl'
import { relativeNotificationTime } from '@/lib/notifications/useInAppNotificationFeed'
import { useBuyerInAppNotificationFeed } from '@/contexts/BuyerInAppNotificationFeedContext'

export default function PublicNavbar() {
  const { cartCount } = useCart()
  const { favoriteCount } = useFavorites()
  const { user, profile, isBuyer, authLoading } = useAuth()
  const [howItWorksOpen, setHowItWorksOpen] = useState(false)
  const [aboutUsOpen, setAboutUsOpen] = useState(false)
  const [profileMenuOpen, setProfileMenuOpen] = useState(false)
  const [logoutOpen, setLogoutOpen] = useState(false)
  const [hydrated, setHydrated] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [desktopSearchOpen, setDesktopSearchOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const {
    notifications: notifRows,
    unreadCount,
    markRead: markNotifRead,
    markAllRead: markAllNotifsRead,
  } = useBuyerInAppNotificationFeed()

  const notifications = notifRows.slice(0, 12).map((n) => ({
    id: n.id,
    message: [n.title, n.body].filter(Boolean).join(' — '),
    timestamp: relativeNotificationTime(n.createdAt),
    read: Boolean(n.readAt),
  }))
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const headerRef = useRef(null)
  const profileRef = useRef(null)
  const notificationsRef = useRef(null)
  const mobileSearchInputRef = useRef(null)
  const desktopSearchRef = useRef(null)
  const desktopSearchInputRef = useRef(null)
  const { data: siteContent } = useSiteContent()

  useEffect(() => {
    queueMicrotask(() => {
      setHydrated(true)
    })
  }, [])

  /** Expose real fixed header height for sticky side panels (cart, checkout, shop). */
  useEffect(() => {
    function syncNavbarHeight() {
      const height = headerRef.current?.getBoundingClientRect().height
      if (!height) return
      const px = `${Math.ceil(height)}px`
      document.documentElement.style.setProperty('--navbar-height', px)
    }
    syncNavbarHeight()
    const ro = new ResizeObserver(syncNavbarHeight)
    if (headerRef.current) ro.observe(headerRef.current)
    window.addEventListener('resize', syncNavbarHeight)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', syncNavbarHeight)
    }
  }, [])

  const qFromShopUrl = readString(searchParams, 'q', '')
  /** While `/shop` has a `q` query param, keep the desktop search UI expanded (ignore outside click). */
  const shopUrlHasQParam = pathname?.startsWith('/shop') && searchParams.has('q')
  const desktopSearchExpanded = desktopSearchOpen || shopUrlHasQParam

  useEffect(() => {
    queueMicrotask(() => {
      if (pathname?.startsWith('/shop')) {
        setSearchQuery(qFromShopUrl)
      }
    })
  }, [pathname, qFromShopUrl])

  const howItWorksItems = [
    { label: 'Step-by-Step Process', sectionId: 'step-by-step-process' },
    { label: 'Compare Packages', sectionId: 'compare-packages' },
    { label: 'Book a Service', sectionId: 'book-a-service' },
    { label: 'Payment & Support', sectionId: 'payment-support' }
  ]

  const aboutUsItems = [
    { label: 'Mission & Vision', sectionId: 'mission-vision' },
    { label: 'About Us', sectionId: 'about-us' },
    { label: 'Why Choose Us', sectionId: 'why-choose-us' },
    { label: 'Testimonials', sectionId: 'testimonials' }
  ]

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setProfileMenuOpen(false)
      }
      if (desktopSearchRef.current && !desktopSearchRef.current.contains(event.target)) {
        if (!shopUrlHasQParam) {
          setDesktopSearchOpen(false)
        }
      }
      if (notificationsRef.current && !notificationsRef.current.contains(event.target)) {
        setNotificationsOpen(false)
      }
    }

    if (profileMenuOpen || desktopSearchOpen || notificationsOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [profileMenuOpen, desktopSearchOpen, notificationsOpen, shopUrlHasQParam])

  // Only buyers count as authenticated on the main site; seller/admin have their own portals.
  const authUiReady = hydrated && !authLoading
  const isAuthenticated = authUiReady && !!user && isBuyer
  const showSellerEntryCtas = !authUiReady || !isBuyer

  const displayName =
    (profile && profile.full_name) || user?.user_metadata?.full_name || ''

  const isHomeActive = pathname === '/'
  const isShopActive = pathname?.startsWith('/shop')
  const isPartnersActive = pathname === '/partners'
  const isHowItWorksActive = pathname?.startsWith('/how-it-works')
  const isAboutUsActive = pathname?.startsWith('/about')
  const cleanPathname = pathname?.split(/[?#]/)[0] || ''
  const isProfilePage = cleanPathname === '/profile' || cleanPathname === '/profile/account'
  const isNotificationsPage = cleanPathname === '/profile/notifications'
  const isPurchasesPage = cleanPathname === '/profile/purchases'

  // Pages that should show a centered title in the navbar on mobile/tablet
  const isMobileTitlePage = isProfilePage || isNotificationsPage || isPurchasesPage
  // Pages that keep top-right actions visible need overlay title centering
  const isMobileOverlayTitlePage = isNotificationsPage || isProfilePage || isPurchasesPage
  // Keep icons but hide mobile search bar on profile/notifications/purchases
  const isMobileHideSearchPage = isNotificationsPage || isProfilePage || isPurchasesPage

  const mobileCenteredTitle = isProfilePage
    ? 'Profile'
    : isNotificationsPage
      ? 'Notifications'
      : isPurchasesPage
        ? 'My Purchases'
        : ''

  const markAllRead = () => {
    markAllNotifsRead()
  }

  const markOneRead = (id) => {
    markNotifRead(id)
  }

  const openLogoutModal = () => {
    setProfileMenuOpen(false)
    setLogoutOpen(true)
  }

  const handleConfirmLogout = async () => {
    await signOut()
    setLogoutOpen(false)
    setProfileMenuOpen(false)
    router.push('/')
  }

  const handleCancelLogout = () => {
    setLogoutOpen(false)
  }

  const handleSearchSubmit = (e) => {
    e.preventDefault()
    const q = searchQuery?.trim()
    if (q) {
      router.push(`/shop?q=${encodeURIComponent(q)}`)
    } else {
      router.push('/shop')
    }
    // Keep desktop search expanded after submit (underline + input stay visible).
    requestAnimationFrame(() => desktopSearchInputRef.current?.focus())
  }

  const openDesktopSearch = () => {
    setDesktopSearchOpen(true)
    setTimeout(() => desktopSearchInputRef.current?.focus(), 100)
  }

  const goToCart = () => {
    if (!isAuthenticated) {
      router.push(`/buyer/login?redirect=${encodeURIComponent('/cart')}`)
      return
    }
    router.push('/cart')
  }

  return (
    <header ref={headerRef} className={styles.header}>
      {/* Top Bar with Social & User */}
      <div className={styles.topBar}>
        <div className={styles.topBarInner}>
          <div className={styles.topLeft}>
            <div className={styles.followText}>
              {showSellerEntryCtas && (
                <>
                  <Link href="/seller/signup" className={styles.topLink}>
                    Become a Seller
                  </Link>
                  <span className={styles.divider}>|</span>
                  <Link href="/seller/login" className={styles.topLink}>
                    Seller Centre
                  </Link>
                  <span className={styles.divider}>|</span>
                </>
              )}
              <span>Follow Us</span>
            </div>

            <div className={styles.socialLinks}>
              <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className={styles.socialIcon}>
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
              </a>
              <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className={styles.socialIcon}>
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                  <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
                </svg>
              </a>
              <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className={styles.socialIcon}>
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M23 3a10.9 10.9 0 01-3.14 1.53 4.48 4.48 0 00-7.86 3v1A10.66 10.66 0 013 4s-4 9 5 13a11.64 11.64 0 01-7 2c9 5 20 0 20-11.5a4.5 4.5 0 00-.08-.83A7.72 7.72 0 0023 3z"></path>
                </svg>
              </a>
            </div>
            <Link
              href="/administrator"
              className={styles.adminPortalLink}
              aria-label="Administrator sign in"
            >
              ·
            </Link>
          </div>

          <div className={styles.topRight}>
            <InstallAppControl />
            {!isAuthenticated ? (
              <div className={styles.authLinks}>
                <button
                  onClick={() => {
                    const target = pathname || '/'
                    router.push(`/buyer/login?redirect=${encodeURIComponent(target)}`)
                  }}
                  className={styles.userLink}
                  aria-label="Log in"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                    <circle cx="12" cy="7" r="4"></circle>
                  </svg>
                  <span>Log In</span>
                </button>
                <span className={styles.authDivider} aria-hidden="true">|</span>
                <Link
                  href="/buyer/signup"
                  className={styles.userLink}
                  aria-label="Sign up"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                    <circle cx="12" cy="7" r="4"></circle>
                  </svg>
                  <span>Sign Up</span>
                </Link>
              </div>
            ) : (
              <div className={styles.notificationsWrap} ref={notificationsRef}>
                <button
                  type="button"
                  className={styles.userLink}
                  aria-label="Notifications"
                  aria-expanded={notificationsOpen}
                  onClick={() => setNotificationsOpen(open => !open)}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"></path>
                    <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                  </svg>
                  {unreadCount > 0 && (
                    <span className={styles.notificationBadge} aria-label={`${unreadCount} unread notifications`}>
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>

                {notificationsOpen && (
                  <div className={styles.notificationsDropdown} role="dialog" aria-label="Notifications">
                    <div className={styles.notificationsHeader}>
                      <span className={styles.notificationsTitle}>Notifications</span>
                      {unreadCount > 0 && (
                        <button
                          type="button"
                          className={styles.markAllReadBtn}
                          onClick={markAllRead}
                        >
                          Mark all as read
                        </button>
                      )}
                    </div>

                    <ul className={styles.notificationsList}>
                      {notifications.length === 0 ? (
                        <li className={styles.notificationsEmpty}>No notifications yet.</li>
                      ) : (
                        notifications.map(n => (
                          <li
                            key={n.id}
                            className={`${styles.notificationItem} ${!n.read ? styles.notificationItemUnread : ''}`}
                            onClick={() => markOneRead(n.id)}
                          >
                            <span className={styles.notificationDot} aria-hidden="true" />
                            <div className={styles.notificationContent}>
                              <p className={styles.notificationMessage}>{n.message}</p>
                              <span className={styles.notificationTime}>{n.timestamp}</span>
                            </div>
                          </li>
                        ))
                      )}
                    </ul>

                    <div className={styles.notificationsFooter}>
                      <button
                        type="button"
                        className={styles.viewAllBtn}
                        onClick={() => {
                          setNotificationsOpen(false)
                          router.push('/profile/notifications')
                        }}
                      >
                        View all notifications
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Navigation */}
      <div className={styles.mainNav}>
        <div className={`${styles.mainNavInner} ${isMobileTitlePage ? styles.mainNavInnerCentered : ''}`}>
          {isMobileTitlePage ? (
            <h1 className={`${styles.mobilePageTitle} ${isMobileOverlayTitlePage ? styles.mobilePageTitleOverlay : ''}`}>{mobileCenteredTitle}</h1>
          ) : (
            <Link
              href="/"
              className={styles.logo}
              aria-label={`${siteContent?.systemName || 'La Visionario'} home`}
            >
              <span className={styles.logoIcon}>
                <span className={styles.logoLetter}>L</span>
              </span>
              <span className={styles.logoText}>{siteContent?.systemName || 'La Visionario'}</span>
            </Link>
          )}

          <nav className={styles.navMenu}>
            <div className={styles.navItem}>
              <Link
                href="/"
                className={`${styles.navLink} ${isHomeActive ? styles.navLinkActive : ''}`}
              >
                HOME
              </Link>
            </div>

            <div className={styles.navItem}>
              <Link
                href="/shop"
                className={`${styles.navLink} ${isShopActive ? styles.navLinkActive : ''}`}
              >
                SHOP
              </Link>
            </div>

            <div className={styles.navItem}>
              <Link
                href="/partners"
                className={`${styles.navLink} ${isPartnersActive ? styles.navLinkActive : ''}`}
              >
                FUNERAL HOMES / PARTNERS
              </Link>
            </div>

            <div 
              className={styles.navItem}
              onMouseEnter={() => setHowItWorksOpen(true)}
              onMouseLeave={() => setHowItWorksOpen(false)}
            >
              <button
                className={`${styles.navLinkDropdown} ${isHowItWorksActive ? styles.navLinkActive : ''}`}
              >
                HOW IT WORKS
                <svg className={styles.dropdownIcon} xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </button>
              {howItWorksOpen && (
                <div className={styles.dropdownMenu}>
                  {howItWorksItems.map((item) => (
                    <Link
                      key={item.sectionId}
                      href={`/how-it-works#${item.sectionId}`}
                      className={styles.dropdownItem}
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>

            <div 
              className={styles.navItem}
              onMouseEnter={() => setAboutUsOpen(true)}
              onMouseLeave={() => setAboutUsOpen(false)}
            >
              <Link
                href="/about"
                className={`${styles.navLinkDropdown} ${isAboutUsActive ? styles.navLinkActive : ''}`}
              >
                ABOUT
                <svg className={styles.dropdownIcon} xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </Link>
              {aboutUsOpen && (
                <div className={styles.dropdownMenu}>
                  {aboutUsItems.map((item) => (
                    <Link key={item.sectionId} href={`/about#${item.sectionId}`} className={styles.dropdownItem}>
                      {item.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </nav>

          <div className={styles.navActions}>
            <div className={styles.navActionsDesktop}>
            {/* Search + Favorites (beside each other) */}
            <div className={styles.searchFavoritesGroup} ref={desktopSearchRef}>
              <div className={styles.desktopSearchWrap}>
                <button
                  type="button"
                  className={styles.desktopSearchIconBtn}
                  onClick={openDesktopSearch}
                  aria-label="Open search"
                  aria-expanded={desktopSearchExpanded}
                  style={{ display: desktopSearchExpanded ? 'none' : 'flex' }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8"></circle>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                  </svg>
                </button>
                <form
                  className={`${styles.desktopSearchForm} ${desktopSearchExpanded ? styles.desktopSearchFormOpen : ''}`}
                  onSubmit={handleSearchSubmit}
                  role="search"
                >
                  <input
                    ref={desktopSearchInputRef}
                    type="search"
                    className={styles.desktopSearchInput}
                    placeholder="Search..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    aria-label="Search"
                  />
                  <button
                    type="button"
                    className={styles.desktopSearchCloseBtn}
                    onClick={() => {
                      setSearchQuery('')
                      setDesktopSearchOpen(false)
                      if (pathname?.startsWith('/shop')) {
                        replaceUrlQuery(router, pathname, searchParams, { q: '' })
                      }
                    }}
                    aria-label="Close search"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18"></line>
                      <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                  </button>
                </form>
              </div>
              {isAuthenticated && (
                <span className={styles.cartBtnWrap}>
                  <button
                    type="button"
                    className={styles.favoritesBtn}
                    aria-label="Favorites"
                    onClick={() => router.push('/favorites')}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                    </svg>
                  </button>
                  {favoriteCount > 0 && (
                    <span className={styles.cartDot} aria-label={`${favoriteCount} saved favorites`}>
                      {favoriteCount > 99 ? '99+' : favoriteCount}
                    </span>
                  )}
                </span>
              )}
            </div>
            <span className={styles.cartBtnWrap}>
              <button
                className={styles.cartBtn}
                aria-label="Cart"
                onClick={goToCart}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="9" cy="21" r="1"></circle>
                  <circle cx="20" cy="21" r="1"></circle>
                  <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
                </svg>
              </button>
              {cartCount > 0 && (
                <span className={styles.cartDot} aria-label={`${cartCount} items in cart`}>
                  {cartCount > 99 ? '99+' : cartCount}
                </span>
              )}
            </span>
            {isAuthenticated && (
              <div
                className={styles.profileMenuWrap}
                ref={profileRef}
                onMouseEnter={() => setProfileMenuOpen(true)}
                onMouseLeave={() => setProfileMenuOpen(false)}
              >
                <button
                  type="button"
                  className={styles.profileBtn}
                  aria-label="User menu"
                  aria-expanded={profileMenuOpen}
                  title={displayName || undefined}
                  onClick={() => {
                    setProfileMenuOpen((open) => !open)
                  }}
                >
                  {profile?.avatar_url ? (
                    <Image
                      src={profile.avatar_url}
                      alt={displayName || 'User avatar'}
                      width={32}
                      height={32}
                      className={styles.profileAvatar}
                      unoptimized
                    />
                  ) : (
                    <span className={styles.profileIcon} aria-hidden="true">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                        <circle cx="12" cy="7" r="4"></circle>
                      </svg>
                    </span>
                  )}
                </button>
                {profileMenuOpen && (
                  <div className={styles.profileDropdown} role="menu">
                    <button
                      type="button"
                      className={styles.profileDropdownItem}
                      onClick={() => {
                        setProfileMenuOpen(false)
                        router.push('/profile/account')
                      }}
                    >
                      My account
                    </button>
                    <button
                      type="button"
                      className={styles.profileDropdownItem}
                      onClick={() => {
                        setProfileMenuOpen(false)
                        router.push('/profile/purchases')
                      }}
                    >
                      Purchases
                    </button>
                    <button
                      type="button"
                      className={styles.profileDropdownItem}
                      onClick={openLogoutModal}
                    >
                      Logout
                    </button>
                  </div>
                )}
              </div>
            )}
            </div>

            {/* Mobile only: search bar + actions (search hidden on profile pages, icons remain visible) */}
            <div className={`${styles.navActionsMobile} ${isMobileHideSearchPage ? styles.navActionsMobileIconsOnly : ''}`}>
              <div className={`${styles.navbarSearchWrap} ${isMobileHideSearchPage ? styles.navbarSearchWrapHidden : ''}`}>
                <form
                  className={styles.navbarSearchForm}
                  onSubmit={handleSearchSubmit}
                  role="search"
                >
                  <span className={styles.navbarSearchIcon} aria-hidden="true">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="11" cy="11" r="8"></circle>
                      <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                    </svg>
                  </span>
                  <input
                    ref={mobileSearchInputRef}
                    type="search"
                    className={styles.navbarSearchInput}
                    placeholder="Search..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    aria-label="Search"
                  />
                </form>
              </div>
              <div className={styles.navActionsMobileButtons}>
                <div className={styles.installAppFloatMobile}>
                  <InstallAppControl />
                </div>
                {isAuthenticated && (
                  <span className={styles.cartBtnWrap}>
                    <button
                      type="button"
                      className={styles.favoritesBtn}
                      aria-label="Favorites"
                      onClick={() => router.push('/favorites')}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                      </svg>
                    </button>
                    {favoriteCount > 0 && (
                      <span className={styles.cartDot} aria-label={`${favoriteCount} saved favorites`}>
                        {favoriteCount > 99 ? '99+' : favoriteCount}
                      </span>
                    )}
                  </span>
                )}
                <span className={styles.cartBtnWrap}>
                  <button
                    className={styles.cartBtn}
                    aria-label="Cart"
                    onClick={goToCart}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="9" cy="21" r="1"></circle>
                      <circle cx="20" cy="21" r="1"></circle>
                      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
                    </svg>
                  </button>
                  {cartCount > 0 && (
                    <span className={styles.cartDot} aria-label={`${cartCount} items in cart`}>
                      {cartCount > 99 ? '99+' : cartCount}
                    </span>
                  )}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <LogoutModal open={logoutOpen} onConfirm={handleConfirmLogout} onCancel={handleCancelLogout} />

      {/* Mobile Bottom Navigation Bar — only rendered in (main) layout; data attr used so body padding applies only when this nav exists */}
      <nav className={styles.bottomNav} aria-label="Mobile navigation" data-bottom-nav>
        <Link
          href="/"
          className={`${styles.bottomNavItem} ${pathname === '/' ? styles.bottomNavItemActive : ''}`}
          aria-label="Home"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
            <polyline points="9 22 9 12 15 12 15 22"></polyline>
          </svg>
          <span className={styles.bottomNavLabel}>Home</span>
        </Link>

        <Link
          href="/shop"
          className={`${styles.bottomNavItem} ${pathname?.startsWith('/shop') ? styles.bottomNavItemActive : ''}`}
          aria-label="Shop"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <path d="M16 10a4 4 0 0 1-8 0"></path>
          </svg>
          <span className={styles.bottomNavLabel}>Shop</span>
        </Link>

        <button
          type="button"
          className={`${styles.bottomNavItem} ${pathname?.startsWith('/profile/notifications') ? styles.bottomNavItemActive : ''}`}
          aria-label="Notifications"
          onClick={() => {
            if (!isAuthenticated) {
              router.push(`/buyer/login?redirect=${encodeURIComponent('/profile/notifications')}`)
              return
            }
            router.push('/profile/notifications')
          }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"></path>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
          </svg>
          <span className={styles.bottomNavLabel}>Notifications</span>
        </button>

        {isAuthenticated ? (
          <button
            type="button"
            className={`${styles.bottomNavItem} ${(pathname?.startsWith('/profile') && !pathname?.startsWith('/profile/notifications')) ? styles.bottomNavItemActive : ''}`}
            aria-label="Profile"
            onClick={() => router.push('/profile')}
          >
            {profile?.avatar_url ? (
              <Image
                src={profile.avatar_url}
                alt={displayName || 'User avatar'}
                width={26}
                height={26}
                className={styles.bottomNavAvatar}
                unoptimized
              />
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
            )}
            <span className={styles.bottomNavLabel}>Profile</span>
          </button>
        ) : (
          <button
            type="button"
            className={styles.bottomNavItem}
            aria-label="Log In"
            onClick={() => {
              const target = pathname || '/'
              router.push(`/buyer/login?redirect=${encodeURIComponent(target)}`)
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>
            <span className={styles.bottomNavLabel}>Log In</span>
          </button>
        )}
      </nav>
    </header>
  )
}