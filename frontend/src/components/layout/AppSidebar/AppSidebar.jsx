'use client'

import Link from 'next/link'
import { useState, useMemo, useEffect, useLayoutEffect, useRef, useSyncExternalStore } from 'react'
import { createPortal } from 'react-dom'
import { usePathname, useSearchParams } from 'next/navigation'
import {
  TbLayoutSidebarLeftCollapse,
  TbLayoutSidebarLeftExpand,
  TbLayoutDashboardFilled,
  TbReportSearch,
  TbUsers,
  TbChartBar,
  TbShoppingBag,
  TbPackage,
  TbSpeakerphone,
  TbChevronDown,
  TbChevronRight,
  TbMenu2,
  TbAddressBook,
  TbLayoutGrid,
  TbClipboardCheck,
  TbMessageStar,
} from 'react-icons/tb'
import { LuUserCheck } from 'react-icons/lu'
import { BsPerson } from 'react-icons/bs'
import styles from './AppSidebar.module.css'
import { useSiteContent } from '@/lib/siteContent/client'
import { useAdminAttentionCount } from '@/lib/admin/useAdminAttentionCount'

/** Stable empty list when sidebar config is absent (avoid new [] each render). */
const EMPTY_NAV_ITEMS = []

function isLinkItem(item) {
  return 'href' in item && !('children' in item)
}

function collapsedFlyoutId(label) {
  return label.replace(/\s+/g, '-').toLowerCase()
}

function isHrefActive(href, pathname, searchParams, basePath) {
  if (!pathname) return false
  if (href.includes('?')) {
    const [path, query] = href.split('?')
    if (pathname !== path) return false
    const wanted = new URLSearchParams(query)
    for (const [key, value] of wanted.entries()) {
      if (searchParams.get(key) !== value) return false
    }
    return true
  }
  if (href === basePath) return pathname === basePath
  return pathname === href || pathname.startsWith(`${href}/`)
}

/** For bottom nav: flatten to { href, label, icon } (groups use defaultHref). Optional limit for mobile (e.g. 4). */
function getBottomNavItems(navItems, limit) {
  const items = navItems.map((item) => {
    if (isLinkItem(item)) {
      return { href: item.href, label: item.label, icon: item.icon }
    }
    return {
      href: item.defaultHref,
      label: item.label,
      icon: item.icon,
    }
  })
  return limit != null ? items.slice(0, limit) : items
}

const SIDEBAR_CONFIG = {
  admin: {
    basePath: '/admin',
    brandSub: 'Admin Portal',
    navItems: [
      { href: '/admin', label: 'Dashboard', icon: TbLayoutDashboardFilled },
      { href: '/admin/payouts', label: 'Payouts', icon: TbReportSearch },
      {
        label: 'Accounts',
        icon: TbAddressBook,
        defaultHref: '/admin/sellers',
        children: [
          { href: '/admin/sellers', label: 'Sellers', icon: LuUserCheck },
          { href: '/admin/buyers', label: 'Buyers', icon: TbUsers },
        ],
      },
      {
        label: 'Listings',
        icon: TbPackage,
        defaultHref: '/admin/listings/browse',
        children: [
          { href: '/admin/listings/browse', label: 'Browse', icon: TbLayoutGrid },
          { href: '/admin/listings/approvals', label: 'Approvals', icon: TbClipboardCheck },
        ],
      },
      { href: '/admin/disputes', label: 'Disputes', icon: TbReportSearch },
    ],
  },
  seller: {
    basePath: '/seller',
    brandSub: 'Seller Centre',
    navItems: [
      { href: '/seller', label: 'Dashboard', icon: TbLayoutDashboardFilled },
      { href: '/seller/orders', label: 'Orders', icon: TbShoppingBag },
      {
        label: 'Products',
        icon: TbPackage,
        defaultHref: '/seller/products/catalog',
        children: [
          { href: '/seller/products/services', label: 'Services' },
          { href: '/seller/products/packages', label: 'Packages' },
          { href: '/seller/products/catalog', label: 'Catalog' },
          { href: '/seller/products/new-listing', label: 'Add New Listing' },
        ],
      },
      { href: '/seller/customers', label: 'Customers', icon: TbUsers },
      { href: '/seller/reviews', label: 'Reviews', icon: TbMessageStar },
      {
        label: 'Analytics',
        icon: TbChartBar,
        defaultHref: '/seller/analytics',
        children: [
          { href: '/seller/analytics/sales-overview', label: 'Sales Overview' },
          { href: '/seller/analytics/revenue-reports', label: 'Revenue Reports' },
          { href: '/seller/analytics/product-performance', label: 'Product Performance' },
          { href: '/seller/analytics/customer-insights', label: 'Customer Insights' },
        ],
      },
      { href: '/seller/marketing/centre', label: 'Marketing Centre', icon: TbSpeakerphone },
    ],
  },
}

const BOTTOM_NAV_MAIN_ITEMS = 4

/** Mobile bottom bar (fixed). Page content uses bottom padding so it clears this bar when the document scrolls. */
export function AppMobileBottomNav({ variant, onMobileClose }) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const config = SIDEBAR_CONFIG[variant]
  if (!config) return null

  const basePath = config.basePath

  const isActive = (href) => isHrefActive(href, pathname, searchParams, basePath)

  return (
    <nav className={styles.bottomNav} aria-label="Main navigation" data-bottom-nav>
      {(
        variant === 'admin'
          ? [
              {
                href: '/admin',
                label: 'Home',
                icon: TbLayoutDashboardFilled,
              },
              {
                href: '/admin/payouts',
                label: 'Payouts',
                icon: TbReportSearch,
              },
              {
                href: '/admin/listings/browse',
                label: 'Listings',
                icon: TbPackage,
                activePrefix: '/admin/listings',
              },
              {
                href: '/admin/analytics',
                label: 'Analytics',
                icon: TbChartBar,
              },
              {
                href: '/admin/profile',
                label: 'Profile',
                icon: BsPerson,
              },
            ]
          : getBottomNavItems(
              config.navItems,
              variant === 'seller' ? BOTTOM_NAV_MAIN_ITEMS : undefined,
            )
      ).map((item) => {
        const active =
          item.activePrefix && pathname
            ? pathname.startsWith(item.activePrefix)
            : isActive(item.href)
        const Icon = item.icon
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`${styles.bottomNavLink} ${active ? styles.bottomNavLinkActive : ''}`}
            onClick={onMobileClose}
            aria-current={active ? 'page' : undefined}
          >
            <span className={styles.bottomNavIcon}>
              <Icon size={22} aria-hidden />
            </span>
            <span className={styles.bottomNavLabel}>{item.label}</span>
          </Link>
        )
      })}
      {variant === 'seller' && (
        <Link
          href="/seller/more"
          className={`${styles.bottomNavLink} ${
            pathname?.startsWith('/seller/more') ||
            pathname?.startsWith('/seller/reviews') ||
            pathname?.startsWith('/seller/notifications') ||
            pathname?.startsWith('/seller/help') ||
            pathname?.startsWith('/seller/settings')
              ? styles.bottomNavLinkActive
              : ''
          }`}
          aria-current={
            pathname?.startsWith('/seller/more') ||
            pathname?.startsWith('/seller/reviews') ||
            pathname?.startsWith('/seller/notifications') ||
            pathname?.startsWith('/seller/help') ||
            pathname?.startsWith('/seller/settings')
              ? 'page'
              : undefined
          }
        >
          <span className={styles.bottomNavIcon}>
            <TbMenu2 size={22} aria-hidden />
          </span>
          <span className={styles.bottomNavLabel}>More</span>
        </Link>
      )}
    </nav>
  )
}

export default function AppSidebar({
  variant,
  collapsed = false,
  onToggle,
  isMobile,
  mobileOpen,
  onMobileClose,
  omitBottomNav = false,
}) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [openGroups, setOpenGroups] = useState({})
  const [collapsedFlyoutLabel, setCollapsedFlyoutLabel] = useState(null)
  const [collapsedFlyoutPos, setCollapsedFlyoutPos] = useState({ top: 0, left: 0 })
  const navRef = useRef(null)
  const activeCollapsedTriggerRef = useRef(null)
  const collapsedFlyoutPanelRef = useRef(null)
  const { data: siteContent } = useSiteContent()

  const showCollapsed = !isMobile && collapsed
  const showMobileOpen = Boolean(isMobile && mobileOpen)
  const handleNavClose = isMobile ? onMobileClose : undefined

  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  )

  const [prevShowCollapsed, setPrevShowCollapsed] = useState(showCollapsed)
  if (prevShowCollapsed !== showCollapsed) {
    setPrevShowCollapsed(showCollapsed)
    if (!showCollapsed) {
      setCollapsedFlyoutLabel(null)
    }
  }

  useLayoutEffect(() => {
    if (!collapsedFlyoutLabel || !mounted || !showCollapsed) return

    function updateFlyoutPosition() {
      const el = activeCollapsedTriggerRef.current
      if (!el) return
      const r = el.getBoundingClientRect()
      const gap = 8
      let top = r.top
      const panelMaxEstimate = 400
      top = Math.max(12, Math.min(top, window.innerHeight - panelMaxEstimate - 12))
      setCollapsedFlyoutPos({ top, left: r.right + gap })
    }

    updateFlyoutPosition()

    const navEl = navRef.current
    window.addEventListener('resize', updateFlyoutPosition)
    window.addEventListener('scroll', updateFlyoutPosition, true)
    navEl?.addEventListener('scroll', updateFlyoutPosition)
    return () => {
      window.removeEventListener('resize', updateFlyoutPosition)
      window.removeEventListener('scroll', updateFlyoutPosition, true)
      navEl?.removeEventListener('scroll', updateFlyoutPosition)
    }
  }, [collapsedFlyoutLabel, mounted, showCollapsed])

  useEffect(() => {
    if (!collapsedFlyoutLabel) return
    const onKey = (e) => {
      if (e.key === 'Escape') setCollapsedFlyoutLabel(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [collapsedFlyoutLabel])

  useEffect(() => {
    if (!collapsedFlyoutLabel || !mounted || !showCollapsed) return
    const down = (e) => {
      const t = e.target
      if (
        collapsedFlyoutPanelRef.current?.contains(t) ||
        activeCollapsedTriggerRef.current?.contains(t)
      ) {
        return
      }
      setCollapsedFlyoutLabel(null)
    }
    document.addEventListener('pointerdown', down, true)
    return () => document.removeEventListener('pointerdown', down, true)
  }, [collapsedFlyoutLabel, mounted, showCollapsed])

  const { count: adminDisputesAttention, refresh: refreshAdminAttention } =
    useAdminAttentionCount(variant === 'admin')

  useEffect(() => {
    if (variant !== 'admin') return
    refreshAdminAttention()
  }, [variant, pathname, refreshAdminAttention])

  const config = SIDEBAR_CONFIG[variant]
  const sidebarNavItems = config?.navItems ?? EMPTY_NAV_ITEMS
  const hasGroups = sidebarNavItems.some((item) => !isLinkItem(item))

  const expandedGroups = useMemo(() => {
    if (!config || !hasGroups) return {}
    const basePath = config.basePath
    const out = {}
    sidebarNavItems.forEach((item) => {
      if (!isLinkItem(item) && item.children) {
        const childActive = item.children.some((c) =>
          isHrefActive(c.href, pathname, searchParams, basePath),
        )
        out[item.label] =
          openGroups[item.label] !== undefined ? openGroups[item.label] : childActive
      }
    })
    return out
  }, [config, hasGroups, sidebarNavItems, pathname, searchParams, openGroups])

  if (!config) return null

  const basePath = config.basePath

  const isActive = (href) => isHrefActive(href, pathname, searchParams, basePath)

  const isGroupActive = (item) => {
    if (!item.children) return false
    if ('defaultHref' in item && item.defaultHref && isActive(item.defaultHref)) {
      return true
    }
    return item.children.some((c) => isActive(c.href))
  }

  const toggleGroup = (label) => {
    setOpenGroups((prev) => ({ ...prev, [label]: !prev[label] }))
  }

  const showSidebar = !(isMobile && variant === 'seller')

  const showDisputeNewBadge = variant === 'admin' && adminDisputesAttention > 0

  const collapsedFlyoutGroup =
    collapsedFlyoutLabel &&
    config.navItems.find((i) => !isLinkItem(i) && i.label === collapsedFlyoutLabel)

  return (
    <>
      {showSidebar && (
        <>
          {showMobileOpen && (
            <div
              className={styles.backdrop}
              onClick={onMobileClose}
              aria-hidden
              role="presentation"
            />
          )}
          <aside
            className={`${styles.sidebar} ${showCollapsed ? styles.collapsed : ''} ${showMobileOpen ? styles.mobileOpen : ''}`}
          >
        <div className={styles.logoRow}>
          <Link href="/" className={styles.logoLeft} onClick={handleNavClose}>
            <div className={styles.logoMark}>LV</div>
            {!showCollapsed && (
              <div className={styles.logoText}>
                <p className={styles.brand}>{siteContent?.systemName || 'La Visionario'}</p>
                <p className={styles.brandSub}>{config.brandSub}</p>
              </div>
            )}
          </Link>

          {isMobile ? (
            <button
              type="button"
              className={styles.closeBtn}
              onClick={onMobileClose}
              aria-label="Close menu"
            >
              <TbLayoutSidebarLeftCollapse />
            </button>
          ) : (
            <button
              type="button"
              className={styles.collapseBtn}
              onClick={() => onToggle?.()}
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {collapsed ? <TbLayoutSidebarLeftExpand /> : <TbLayoutSidebarLeftCollapse />}
            </button>
          )}
        </div>

      {!showCollapsed && <p className={styles.sectionLabel}>MENU</p>}

      <nav ref={navRef} className={styles.nav}>
        {config.navItems.map((item) => {
          if (isLinkItem(item)) {
            const { href, label, icon: Icon } = item
            const disputeBadge =
              href === '/admin/disputes' && showDisputeNewBadge
            return (
              <Link
                key={href}
                href={href}
                className={`${styles.link} ${isActive(href) ? styles.active : ''} ${disputeBadge ? styles.linkWithBadge : ''}`}
                title={
                  showCollapsed
                    ? disputeBadge
                      ? `${label} — new disputes to review`
                      : label
                    : undefined
                }
                aria-label={
                  disputeBadge ? 'Disputes, new disputes to review' : undefined
                }
                onClick={handleNavClose}
              >
                <span className={styles.iconWrap}>
                  <Icon className={styles.navIcon} />
                </span>
                <span className={styles.linkText}>{label}</span>
                {disputeBadge &&
                  (showCollapsed ? (
                    <span
                      className={styles.navNewBadgeDot}
                      title="New disputes to review"
                      aria-hidden
                    />
                  ) : (
                    <span className={styles.navNewBadge}>New</span>
                  ))}
              </Link>
            )
          }

          const { label, icon: Icon, children } = item
          const expanded = showCollapsed ? false : expandedGroups[label]
          const groupActive = isGroupActive(item)

          if (showCollapsed) {
            const flyoutId = `nav-collapsed-flyout-${collapsedFlyoutId(label)}`
            const flyoutOpen = collapsedFlyoutLabel === label
            return (
              <div key={label} className={styles.collapsedGroupRoot}>
                <button
                  type="button"
                  className={`${styles.link} ${groupActive ? styles.active : ''} ${styles.collapsedGroupBtn}`}
                  aria-expanded={flyoutOpen}
                  aria-haspopup="true"
                  aria-controls={flyoutId}
                  title={`${label}: open submenu`}
                  onClick={(e) => {
                    activeCollapsedTriggerRef.current = e.currentTarget
                    setCollapsedFlyoutLabel((prev) => (prev === label ? null : label))
                  }}
                >
                  <span className={styles.iconWrap}>
                    <Icon className={styles.navIcon} />
                  </span>
                  <span className={styles.collapsedGroupChevron} aria-hidden>
                    <TbChevronRight />
                  </span>
                </button>
              </div>
            )
          }

          return (
            <div key={label} className={styles.groupWrap}>
              <button
                type="button"
                className={`${styles.groupTrigger} ${groupActive ? styles.groupTriggerActive : ''}`}
                onClick={() => toggleGroup(label)}
                aria-expanded={expanded}
              >
                <span className={styles.iconWrap}>
                  <Icon className={styles.navIcon} />
                </span>
                <span className={styles.linkText}>{label}</span>
                <span className={styles.chevron}>
                  {expanded ? <TbChevronDown /> : <TbChevronRight />}
                </span>
              </button>
              {expanded && (
                <div className={styles.subNav}>
                  {children.map((sub) => {
                    const SubIcon = sub.icon
                    return (
                      <Link
                        key={sub.href}
                        href={sub.href}
                        className={`${styles.subLink} ${SubIcon ? styles.subLinkWithIcon : ''} ${isActive(sub.href) ? styles.active : ''}`}
                        onClick={handleNavClose}
                      >
                        {SubIcon ? (
                          <span className={styles.subLinkIconWrap} aria-hidden>
                            <SubIcon className={styles.subLinkIcon} />
                          </span>
                        ) : null}
                        <span className={styles.subLinkLabel}>{sub.label}</span>
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </nav>
    </aside>
          {mounted &&
            typeof document !== 'undefined' &&
            showCollapsed &&
            collapsedFlyoutGroup &&
            createPortal(
              <div
                ref={collapsedFlyoutPanelRef}
                id={`nav-collapsed-flyout-${collapsedFlyoutId(collapsedFlyoutGroup.label)}`}
                className={styles.collapsedFlyoutPanel}
                style={{
                  top: collapsedFlyoutPos.top,
                  left: collapsedFlyoutPos.left,
                }}
                role="group"
                aria-label={collapsedFlyoutGroup.label}
              >
                <div className={styles.collapsedFlyoutHeading}>
                  {collapsedFlyoutGroup.label}
                </div>
                <div className={styles.collapsedFlyoutLinks}>
                  {collapsedFlyoutGroup.defaultHref &&
                    !collapsedFlyoutGroup.children.some(
                      (c) => c.href === collapsedFlyoutGroup.defaultHref,
                    ) && (
                      <Link
                        href={collapsedFlyoutGroup.defaultHref}
                        className={`${styles.collapsedFlyoutLink} ${isActive(collapsedFlyoutGroup.defaultHref) ? styles.collapsedFlyoutLinkActive : ''}`}
                        onClick={() => {
                          setCollapsedFlyoutLabel(null)
                          handleNavClose?.()
                        }}
                      >
                        <span className={styles.collapsedFlyoutLinkLabel}>
                          Overview
                        </span>
                      </Link>
                    )}
                  {collapsedFlyoutGroup.children.map((sub) => {
                    const SubIcon = sub.icon
                    return (
                      <Link
                        key={sub.href}
                        href={sub.href}
                        className={`${styles.collapsedFlyoutLink} ${isActive(sub.href) ? styles.collapsedFlyoutLinkActive : ''}`}
                        onClick={() => {
                          setCollapsedFlyoutLabel(null)
                          handleNavClose?.()
                        }}
                      >
                        {SubIcon ? (
                          <span className={styles.collapsedFlyoutIconWrap} aria-hidden>
                            <SubIcon className={styles.collapsedFlyoutIcon} />
                          </span>
                        ) : null}
                        <span className={styles.collapsedFlyoutLinkLabel}>
                          {sub.label}
                        </span>
                      </Link>
                    )
                  })}
                </div>
              </div>,
              document.body,
            )}
        </>
      )}

      {isMobile && !omitBottomNav && (
        <AppMobileBottomNav variant={variant} onMobileClose={onMobileClose} />
      )}
    </>
  )
}