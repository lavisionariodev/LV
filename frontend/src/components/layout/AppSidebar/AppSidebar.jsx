'use client'

import Link from 'next/link'
import { useState, useMemo } from 'react'
import { usePathname } from 'next/navigation'
import {
  TbLayoutSidebarLeftCollapse,
  TbLayoutSidebarLeftExpand,
  TbLayoutDashboardFilled,
  TbReportSearch,
  TbUsers,
  TbChartBar,
  TbClipboardList,
  TbShoppingBag,
  TbPackage,
  TbSpeakerphone,
  TbChevronDown,
  TbChevronRight,
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
    footerItems: [],
  },
  seller: {
    basePath: '/seller',
    brandSub: 'Seller Centre',
    navItems: [
      { href: '/seller', label: 'Dashboard', icon: TbLayoutDashboardFilled },
      {
        label: 'Orders',
        icon: TbShoppingBag,
        defaultHref: '/seller/orders',
        children: [
          { href: '/seller/orders', label: 'All Orders' },
          { href: '/seller/orders/pending', label: 'Pending' },
          { href: '/seller/orders/completed', label: 'Completed' },
        ],
      },
      {
        label: 'Products',
        icon: TbPackage,
        defaultHref: '/seller/products',
        children: [
          { href: '/seller/products/services', label: 'Services' },
          { href: '/seller/products/packages', label: 'Packages' },
          { href: '/seller/products/catalog', label: 'Catalog' },
        ],
      },
      { href: '/seller/customers', label: 'Customers', icon: TbUsers },
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
      {
        label: 'Marketing',
        icon: TbSpeakerphone,
        defaultHref: '/seller/marketing',
        children: [
          { href: '/seller/marketing/centre', label: 'Marketing Centre' },
          { href: '/seller/marketing/discount', label: 'Discount' },
          { href: '/seller/marketing/vouchers', label: 'Vouchers' },
          { href: '/seller/marketing/campaign', label: 'Campaign' },
        ],
      },
    ],
    footerItems: [
      { href: '/seller/onboarding', label: 'Onboarding', icon: TbClipboardList },
    ],
  },
}

function isLinkItem(item) {
  return 'href' in item && !('children' in item)
}

export default function AppSidebar({ variant, collapsed, onToggle }) {
  const pathname = usePathname()
  const [internalCollapsed, setInternalCollapsed] = useState(false)
  const [openGroups, setOpenGroups] = useState(() => ({}))

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

  const isGroupActive = (item) => {
    if (!item.children) return false
    return item.children.some((c) => isActive(c.href))
  }

  const toggleGroup = (label) => {
    setOpenGroups((prev) => ({ ...prev, [label]: !prev[label] }))
  }

  const sellerNavItems = config.navItems
  const hasGroups = variant === 'seller' && sellerNavItems.some((item) => !isLinkItem(item))

  const expandedGroups = useMemo(() => {
    if (!hasGroups) return {}
    const out = {}
    sellerNavItems.forEach((item) => {
      if (!isLinkItem(item) && item.children) {
        const childActive = item.children.some((c) => isActive(c.href))
        out[item.label] = openGroups[item.label] !== undefined ? openGroups[item.label] : childActive
      }
    })
    return out
  }, [hasGroups, sellerNavItems, pathname, openGroups])

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
        {config.navItems.map((item) => {
          if (isLinkItem(item)) {
            const { href, label, icon: Icon } = item
            return (
              <Link
                key={href}
                href={href}
                className={`${styles.link} ${isActive(href) ? styles.active : ''}`}
                title={isCollapsed ? label : undefined}
              >
                <span className={styles.iconWrap}>
                  <Icon className={styles.navIcon} />
                </span>
                <span className={styles.linkText}>{label}</span>
              </Link>
            )
          }

          const { label, icon: Icon, defaultHref, children } = item
          const expanded = isCollapsed ? false : expandedGroups[label]
          const groupActive = isGroupActive(item)

          if (isCollapsed) {
            return (
              <Link
                key={label}
                href={defaultHref}
                className={`${styles.link} ${groupActive ? styles.active : ''}`}
                title={label}
              >
                <span className={styles.iconWrap}>
                  <Icon className={styles.navIcon} />
                </span>
              </Link>
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
                  {children.map((sub) => (
                    <Link
                      key={sub.href}
                      href={sub.href}
                      className={`${styles.subLink} ${isActive(sub.href) ? styles.active : ''}`}
                    >
                      {sub.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </nav>

      <div className={styles.footerNav}>
        {config.footerItems.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={`${styles.footerLink} ${isActive(href) ? styles.active : ''}`}
            title={isCollapsed ? label : undefined}
          >
            <span className={styles.iconWrap}>
              <Icon className={styles.navIcon} />
            </span>
            <span className={styles.linkText}>{label}</span>
          </Link>
        ))}
      </div>
    </aside>
  )
}
