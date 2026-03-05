'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { useCart } from '@/contexts/CartContext'
import { signOut } from '@/lib/auth/session'
import LogoutModal from '@/components/ui/Modal/Logout'
import styles from './PublicNavbar.module.css'
import { useAuth } from '@/contexts/AuthContext'

export default function PublicNavbar() {
  const { cartCount } = useCart()
  const { user, profile, role, isBuyer, isSeller } = useAuth()
  const [query, setQuery] = useState('')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [mobileHowItWorksOpen, setMobileHowItWorksOpen] = useState(false)
  const [mobileAboutUsOpen, setMobileAboutUsOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [howItWorksOpen, setHowItWorksOpen] = useState(false)
  const [aboutUsOpen, setAboutUsOpen] = useState(false)
  const [profileMenuOpen, setProfileMenuOpen] = useState(false)
  const [logoutOpen, setLogoutOpen] = useState(false)
  const router = useRouter()
  const pathname = usePathname()
  const searchRef = useRef(null)
  const profileRef = useRef(null)

  const howItWorksItems = [
    { label: 'Step-by-Step Process', sectionId: 'step-by-step-process' },
    { label: 'Compare Packages', sectionId: 'compare-packages' },
    { label: 'Book a Service', sectionId: 'book-a-service' },
    { label: 'Payment & Support', sectionId: 'payment-support' }
  ]

  const aboutUsItems = [
    { label: 'Our Story', sectionId: 'our-story' },
    { label: 'Mission & Vision', sectionId: 'mission-vision' },
    { label: 'Why La Visionario', sectionId: 'why-la-visionario' },
    { label: 'Partners', sectionId: 'partners' },
    { label: 'Testimonials', sectionId: 'testimonials' }
  ]

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setSearchOpen(false)
      }
    }

    if (searchOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [searchOpen])

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setProfileMenuOpen(false)
      }
    }

    if (profileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [profileMenuOpen])

  const isAuthenticated = !!user
  const isOnSellerPortal = isSeller && pathname?.startsWith('/seller')

  const displayName =
    (profile && profile.full_name) || user?.user_metadata?.full_name || ''

  const openLogoutModal = () => {
    setMobileMenuOpen(false)
    setProfileMenuOpen(false)
    setLogoutOpen(true)
  }

  const handleConfirmLogout = async () => {
    await signOut()
    setLogoutOpen(false)
    setProfileMenuOpen(false)
    setMobileMenuOpen(false)
    router.push('/')
  }

  const handleCancelLogout = () => {
    setLogoutOpen(false)
  }

  return (
    <header className={styles.header}>
      {/* Top Bar with Social & User */}
      <div className={styles.topBar}>
        <div className={styles.topBarInner}>
          <div className={styles.topLeft}>
            <div className={styles.followText}>
              <Link href="/seller/signup" className={styles.topLink}>
                Become a Seller
              </Link>
              <span className={styles.divider}>|</span>
              <Link href="/seller/login" className={styles.topLink}>
                Seller Centre
              </Link>
              <span className={styles.divider}>|</span>
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
          </div>

          <div className={styles.topRight}>
            {!isAuthenticated ? (
              <button
                onClick={() => {
                  const target = pathname || '/'
                  router.push(`/buyer/login?redirect=${encodeURIComponent(target)}`)
                }}
                className={styles.userLink}
                aria-label="Sign in"
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
                <span>Sign In</span>
              </button>
            ) : (
              <button
                type="button"
                className={styles.userLink}
                aria-label="Notifications"
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
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Navigation */}
      <div className={styles.mainNav}>
        <div className={styles.mainNavInner}>
          <Link href="/" className={styles.logo} aria-label="La Visionario home">
            <span className={styles.logoIcon}><span className={styles.logoLetter}>L</span></span>
            <span className={styles.logoText}>Lavisionario</span>
          </Link>

          <nav className={styles.navMenu}>
            {isOnSellerPortal ? (
              <>
                <div className={styles.navItem}>
                  <Link href="/seller" className={styles.navLink}>
                    Overview
                  </Link>
                </div>
                <div className={styles.navItem}>
                  <Link href="/seller/my-sales" className={styles.navLink}>
                    My Sales
                  </Link>
                </div>
                <div className={styles.navItem}>
                  <Link href="/seller/shop-performance" className={styles.navLink}>
                    My Performance
                  </Link>
                </div>
                <div className={styles.navItem}>
                  <Link href="/seller/my-services" className={styles.navLink}>
                    My Services
                  </Link>
                </div>
              </>
            ) : (
              <>
                <div className={styles.navItem}>
                  <Link href="/" className={styles.navLink}>HOME</Link>
                </div>

                <div className={styles.navItem}>
                  <Link href="/shop" className={styles.navLink}>SHOP</Link>
                </div>

                <div className={styles.navItem}>
                  <Link href="/partners" className={styles.navLink}>FUNERAL HOMES / PARTNERS</Link>
                </div>

                <div 
                  className={styles.navItem}
                  onMouseEnter={() => setHowItWorksOpen(true)}
                  onMouseLeave={() => setHowItWorksOpen(false)}
                >
                  <button className={styles.navLinkDropdown}>
                    HOW IT WORKS
                    <svg className={styles.dropdownIcon} xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="6 9 12 15 18 9"></polyline>
                    </svg>
                  </button>
                  {howItWorksOpen && (
                    <div className={styles.dropdownMenu}>
                      {howItWorksItems.map((item, index) => (
                        <Link
                          key={index}
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
                  <button className={styles.navLinkDropdown}>
                    ABOUT US
                    <svg className={styles.dropdownIcon} xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="6 9 12 15 18 9"></polyline>
                    </svg>
                  </button>
                  {aboutUsOpen && (
                    <div className={styles.dropdownMenu}>
                      {aboutUsItems.map((item, index) => (
                        <Link key={index} href={`/about#${item.sectionId}`} className={styles.dropdownItem}>
                          {item.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </nav>

          <div className={styles.navActions}>
            <div className={styles.searchContainer}>
              {!isSeller && (
                <span className={styles.cartBtnWrap}>
                  <button 
                    className={styles.searchBtn} 
                    aria-label="Cart"
                    onClick={() => {
                      if (!isAuthenticated) {
                        router.push(`/buyer/login?redirect=${encodeURIComponent('/cart')}`)
                        return
                      }
                      router.push('/cart')
                    }}
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
              )}
            </div>
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
                  {profile.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt={displayName || 'User avatar'}
                      className={styles.profileAvatar}
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
                  {displayName && (
                    <span className={styles.profileName}>{displayName}</span>
                  )}
                </button>
                {profileMenuOpen && user && (
                  <div className={styles.profileDropdown} role="menu">
                    {isSeller ? (
                      <>
                        {!isOnSellerPortal && (
                          <button
                            type="button"
                            className={styles.profileDropdownItem}
                            onClick={() => {
                              setProfileMenuOpen(false)
                              router.push('/seller')
                            }}
                          >
                            Back to Seller Dashboard
                          </button>
                        )}
                        <button
                          type="button"
                          className={styles.profileDropdownItem}
                          onClick={() => {
                            setProfileMenuOpen(false)
                            router.push('/seller/my-account')
                          }}
                        >
                          My Account
                        </button>
                        <button
                          type="button"
                          className={styles.profileDropdownItem}
                          onClick={openLogoutModal}
                        >
                          Logout
                        </button>
                      </>
                    ) : (
                      <>
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
                      </>
                    )}
                  </div>
                )}
              </div>
            )}
            <button 
              className={styles.mobileToggle}
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle Menu"
            >
              <span></span>
              <span></span>
              <span></span>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className={styles.mobileMenu} onClick={() => setMobileMenuOpen(false)} role="presentation">
          <Link href="/" className={styles.mobileLink}>HOME</Link>
          <Link href="/shop" className={styles.mobileLink}>SHOP</Link>

          <Link href="/partners" className={styles.mobileLink}>FUNERAL HOMES / PARTNERS</Link>

          <div className={styles.mobileSubsection}>
            <button
              type="button"
              className={styles.mobileSubsectionToggle}
              onClick={(e) => { e.stopPropagation(); setMobileHowItWorksOpen((o) => !o) }}
              aria-expanded={mobileHowItWorksOpen}
              aria-controls="mobile-how-it-works-links"
            >
              <span className={styles.mobileSubsectionTitle}>HOW IT WORKS</span>
              <span className={`${styles.mobileSubsectionArrow} ${mobileHowItWorksOpen ? styles.mobileSubsectionArrowOpen : ''}`} aria-hidden>
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </span>
            </button>
            <div id="mobile-how-it-works-links" className={`${styles.mobileSubsectionContent} ${mobileHowItWorksOpen ? styles.mobileSubsectionContentOpen : ''}`}>
              <Link href="/how-it-works" className={styles.mobileLink}>Overview</Link>
              {howItWorksItems.map((item, index) => (
                <Link
                  key={index}
                  href={`/how-it-works#${item.sectionId}`}
                  className={styles.mobileLink}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>

          <div className={styles.mobileSubsection}>
            <button
              type="button"
              className={styles.mobileSubsectionToggle}
              onClick={(e) => { e.stopPropagation(); setMobileAboutUsOpen((o) => !o) }}
              aria-expanded={mobileAboutUsOpen}
              aria-controls="mobile-about-us-links"
            >
              <span className={styles.mobileSubsectionTitle}>ABOUT US</span>
              <span className={`${styles.mobileSubsectionArrow} ${mobileAboutUsOpen ? styles.mobileSubsectionArrowOpen : ''}`} aria-hidden>
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </span>
            </button>
            <div id="mobile-about-us-links" className={`${styles.mobileSubsectionContent} ${mobileAboutUsOpen ? styles.mobileSubsectionContentOpen : ''}`}>
              <Link href="/about" className={styles.mobileLink}>About</Link>
              {aboutUsItems.map((item, index) => (
                <Link key={index} href={`/about#${item.sectionId}`} className={styles.mobileLink}>
                  {item.label}
                </Link>
              ))}
            </div>
          </div>

          <div className={styles.mobileDivider}></div>

          {!user ? (
            <Link href="/buyer/login?redirect=/profile" className={styles.mobileLink}>
              Sign In
            </Link>
          ) : isSeller ? (
            <>
              <Link href="/seller" className={styles.mobileLink}>
                Overview
              </Link>
              <Link href="/seller/my-sales" className={styles.mobileLink}>
                My Sales
              </Link>
              <Link href="/seller/shop-performance" className={styles.mobileLink}>
                My Performance
              </Link>
              <Link href="/seller/my-services" className={styles.mobileLink}>
                My Services
              </Link>
              <Link href="/seller/my-account" className={styles.mobileLink}>
                My Account
              </Link>
              <button
                type="button"
                className={styles.mobileLinkButton}
                onClick={openLogoutModal}
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link href="/profile" className={styles.mobileLink}>
                Profile
              </Link>
              <button
                type="button"
                className={styles.mobileLinkButton}
                onClick={openLogoutModal}
              >
                Logout
              </button>
            </>
          )}
        </div>
      )}

      <LogoutModal open={logoutOpen} onConfirm={handleConfirmLogout} onCancel={handleCancelLogout} />

      {/* Mobile Bottom Navigation Bar */}
      <nav className={styles.bottomNav} aria-label="Mobile navigation">
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

        <Link
          href="/how-it-works"
          className={`${styles.bottomNavItem} ${pathname?.startsWith('/how-it-works') ? styles.bottomNavItemActive : ''}`}
          aria-label="How it works"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
            <line x1="12" y1="17" x2="12.01" y2="17"></line>
          </svg>
          <span className={styles.bottomNavLabel}>How It Works</span>
        </Link>

        {!isSeller && (
          <button
            type="button"
            className={`${styles.bottomNavItem} ${pathname === '/cart' ? styles.bottomNavItemActive : ''}`}
            aria-label="Cart"
            onClick={() => {
              if (!isAuthenticated) {
                router.push(`/buyer/login?redirect=${encodeURIComponent('/cart')}`)
                return
              }
              router.push('/cart')
            }}
          >
            <span className={styles.bottomNavCartWrap}>
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="9" cy="21" r="1"></circle>
                <circle cx="20" cy="21" r="1"></circle>
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
              </svg>
              {cartCount > 0 && (
                <span className={styles.bottomNavBadge} aria-label={`${cartCount} items in cart`}>
                  {cartCount > 99 ? '99+' : cartCount}
                </span>
              )}
            </span>
            <span className={styles.bottomNavLabel}>Cart</span>
          </button>
        )}

        {isAuthenticated ? (
          <button
            type="button"
            className={`${styles.bottomNavItem} ${pathname?.startsWith('/profile') || pathname?.startsWith('/seller/my') ? styles.bottomNavItemActive : ''}`}
            aria-label="Profile"
            onClick={() => {
              if (isSeller) {
                router.push('/seller/my-account')
              } else {
                router.push('/profile/account')
              }
            }}
          >
            {profile?.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={displayName || 'User avatar'}
                className={styles.bottomNavAvatar}
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
            aria-label="Sign In"
            onClick={() => {
              const target = pathname || '/'
              router.push(`/buyer/login?redirect=${encodeURIComponent(target)}`)
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>
            <span className={styles.bottomNavLabel}>Sign In</span>
          </button>
        )}
      </nav>
    </header>
  )
}