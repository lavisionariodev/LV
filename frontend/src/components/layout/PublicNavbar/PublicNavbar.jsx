'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import styles from './PublicNavbar.module.css'

export default function PublicNavbar() {
  const [query, setQuery] = useState('')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [shopOpen, setShopOpen] = useState(false)
  const [howItWorksOpen, setHowItWorksOpen] = useState(false)
  const [aboutUsOpen, setAboutUsOpen] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const router = useRouter()
  const searchRef = useRef(null)

  const shopItems = [
    { label: 'Service Listings', href: '/services' },
    { label: 'Custom Packages', href: '/packages' },
    { label: 'Marketplace Products', href: '/marketplace' }
  ]

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

  const handleSearch = (e) => {
    e.preventDefault()
    if (!query.trim()) return
    router.push(`/search?q=${encodeURIComponent(query)}`)
    setQuery('')
    setSearchOpen(false)
  }

  const handleUserIconClick = () => {
    if (!isAuthenticated) {
      router.push('/buyer/login')
    } else {
      router.push('/profile')
    }
  }

  return (
    <header className={styles.header}>
      {/* Top Bar with Social & User */}
      <div className={styles.topBar}>
        <div className={styles.topBarInner}>
          <div className={styles.topLeft}>
            <div className={styles.followText}>
              <Link href="/seller/login" className={styles.topLink}>
                Become a Seller
              </Link>
              <span className={styles.divider}>|</span>
              <Link href="/seller/centre" className={styles.topLink}>
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
            <button onClick={handleUserIconClick} className={styles.userLink} aria-label="User Account">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
              <span>Sign In</span>
            </button>
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
            <div className={styles.navItem}>
              <Link href="/" className={styles.navLink}>HOME</Link>
            </div>
            
            <div 
              className={styles.navItem}
              onMouseEnter={() => setShopOpen(true)}
              onMouseLeave={() => setShopOpen(false)}
            >
              <button className={styles.navLinkDropdown}>
                SHOP
                <svg className={styles.dropdownIcon} xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </button>
              {shopOpen && (
                <div className={styles.dropdownMenu}>
                  {shopItems.map((item, index) => (
                    <Link key={index} href={item.href} className={styles.dropdownItem}>
                      {item.label}
                    </Link>
                  ))}
                </div>
              )}
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

            <div className={styles.navItem}>
              <Link href="/book-now" className={styles.navLink}>BOOK NOW</Link>
            </div>
          </nav>

          <div className={styles.navActions}>
            <div className={styles.searchContainer}>
              <button 
                className={styles.searchBtn} 
                aria-label="Cart"
                onClick={() => router.push('/cart')}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="9" cy="21" r="1"></circle>
                  <circle cx="20" cy="21" r="1"></circle>
                  <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
                </svg>
              </button>
            </div>
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
        <div className={styles.mobileMenu}>
          <Link href="/" className={styles.mobileLink}>HOME</Link>
          <div className={styles.mobileSubsection}>
            <span className={styles.mobileSubsectionTitle}>SHOP</span>
            <Link href="/services" className={styles.mobileLink}>Service Listings</Link>
            <Link href="/packages" className={styles.mobileLink}>Custom Packages</Link>
            <Link href="/marketplace" className={styles.mobileLink}>Marketplace Products</Link>
          </div>
          <Link href="/partners" className={styles.mobileLink}>FUNERAL HOMES / PARTNERS</Link>
          <div className={styles.mobileSubsection}>
            <span className={styles.mobileSubsectionTitle}>HOW IT WORKS</span>
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
          <div className={styles.mobileSubsection}>
            <span className={styles.mobileSubsectionTitle}>ABOUT US</span>
            <Link href="/about" className={styles.mobileLink}>About</Link>
            {aboutUsItems.map((item, index) => (
              <Link key={index} href={`/about#${item.sectionId}`} className={styles.mobileLink}>
                {item.label}
              </Link>
            ))}
          </div>
          <Link href="/book-now" className={styles.mobileLink}>BOOK NOW</Link>
          
          <div className={styles.mobileDivider}></div>
          
          <Link href="/buyer/login" className={styles.mobileLink}>Sign In</Link>
        </div>
      )}
    </header>
  )
}