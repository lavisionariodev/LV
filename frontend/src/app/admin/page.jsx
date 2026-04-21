'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import styles from './admin.module.css'
import { dashboard } from '@/data/adminSampleData'
import { fetchCurrentAdminProfile } from '@/features/admin/settings/getAdminProfile'
import { searchSellersForAdmin } from '@/lib/sellers/client'
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { TbReportSearch, TbUsers, TbSearch, TbCreditCard, TbX } from 'react-icons/tb'
import { LuUserCheck } from 'react-icons/lu'

// Bar chart: green shades only (values match globals.css --color-green-*)
const BAR_COLORS = ['#1F312B', '#2D4A38', '#3D683A', '#4A7C47']
const CHART_ACCENT = '#1F312B'

const NAV_ACTIONS = [
  { id: 'sellers',  label: 'Sellers',  icon: LuUserCheck,    href: '/admin/sellers' },
  { id: 'buyers',   label: 'Buyers',   icon: TbUsers,        href: '/admin/buyers' },
  { id: 'billing',  label: 'Billing',  icon: TbCreditCard,   href: '/admin/profile/billing' },
  { id: 'disputes', label: 'Disputes', icon: TbReportSearch, href: '/admin/disputes' },
]

const MOBILE_STAT_CARDS = [
  {
    id: 'totalSellers',
    title: 'Sellers',
    value: (stats) => stats.totalSellers,
    subtitle: 'Registered sellers',
    icon: LuUserCheck,
    href: '/admin/sellers',
    actionLabel: 'View',
  },
  {
    id: 'totalBuyers',
    title: 'Buyers',
    value: (stats) => stats.totalBuyers,
    subtitle: 'Buyer accounts',
    icon: TbUsers,
    href: '/admin/buyers',
    actionLabel: 'View',
  },
  {
    id: 'transactions',
    title: 'Transactions',
    value: (stats) => stats.transactionsLast30Days,
    subtitle: 'Last 30 days',
    icon: TbCreditCard,
    href: '/admin/payouts',
    actionLabel: 'View',
  },
  {
    id: 'openDisputes',
    title: 'Disputes',
    value: (stats) => stats.openDisputes,
    subtitle: 'Open cases',
    icon: TbReportSearch,
    href: '/admin/disputes',
    actionLabel: 'Review',
  },
]

function formatShortDate(dateStr) {
  const d = new Date(dateStr)
  return `${d.getMonth() + 1}/${d.getDate()}`
}

function getStatusDotColor(status) {
  const s = String(status).toLowerCase()
  if (s.includes('pending')) return '#f59e0b'
  if (s.includes('open')) return '#0284c7'
  if (s.includes('resolved') || s.includes('completed')) return '#15803d'
  return '#94a3b8'
}

export default function AdminDashboardPage() {
  const router = useRouter()
  const [adminProfile, setAdminProfile] = useState(null)
  const [adminProfileLoading, setAdminProfileLoading] = useState(true)

  const [sellerQuery, setSellerQuery] = useState('')
  const [sellerResults, setSellerResults] = useState([])
  const [sellerLoading, setSellerLoading] = useState(false)
  const [sellerOpen, setSellerOpen] = useState(false)
  const searchWrapRef = useRef(null)
  const searchInputRef = useRef(null)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      if (!cancelled) setAdminProfileLoading(true)
      try {
        const data = await fetchCurrentAdminProfile()
        if (!cancelled) setAdminProfile(data)
      } catch {
        if (!cancelled) setAdminProfile(null)
      } finally {
        if (!cancelled) setAdminProfileLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  const avatarUrl = adminProfile?.avatarUrl || ''
  const avatarFallback = (adminProfile?.fullName || '').trim().charAt(0).toUpperCase()
  const greetingName =
    adminProfile?.firstName?.trim() ||
    (adminProfile?.fullName || '').trim().split(' ')[0] ||
    ''

  useEffect(() => {
    const q = sellerQuery.trim()
    if (q.length < 2) {
      setSellerResults([])
      setSellerLoading(false)
      return
    }

    let cancelled = false
    setSellerLoading(true)
    const t = setTimeout(async () => {
      try {
        const rows = await searchSellersForAdmin(q, 6)
        if (!cancelled) setSellerResults(Array.isArray(rows) ? rows : [])
      } finally {
        if (!cancelled) setSellerLoading(false)
      }
    }, 300)

    return () => {
      cancelled = true
      clearTimeout(t)
    }
  }, [sellerQuery])

  useEffect(() => {
    if (!sellerOpen) return
    const onDown = (e) => {
      if (searchWrapRef.current && !searchWrapRef.current.contains(e.target)) {
        setSellerOpen(false)
      }
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [sellerOpen])

  const goSeller = (seller) => {
    const id = seller?.user_id || seller?.id
    if (!id) return
    const q = sellerQuery.trim()
    const params = new URLSearchParams()
    params.set('highlight', id)
    if (q) params.set('q', q)
    router.push(`/admin/sellers?${params.toString()}`)
    setSellerOpen(false)
  }

  if (adminProfileLoading) {
    return (
      <div className={styles.dashLoadingScreen} role="status" aria-label="Loading dashboard">
        <span className={styles.dashSpinner} aria-hidden="true" />
      </div>
    )
  }

  return (
    <div className={styles.dashWrap}>
      {/* ── Welcome banner ── */}
      <section className={styles.welcomeBanner}>
        <div className={styles.welcomeLeft}>
          <div className={styles.welcomeIcon}>
            {/* swap for your logo mark if you like */}
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"
                strokeLinecap="round" strokeLinejoin="round" width="22" height="22">
              <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
              <polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
          </div>
          <div>
            <p className={styles.welcomeGreeting}>Welcome, Admin!</p>
            <p className={styles.welcomeSub}>
              Here's what's happening on your marketplace today — stay on top of
              pending actions and keep things running smoothly.
            </p>
          </div>
        </div>

        <div className={styles.welcomeRight}>
          <div className={styles.welcomePill}>
            <span className={styles.welcomePillDot} />
            All systems operational
          </div>
        </div>
      </section>

      {/* Desktop-only summary cards (analytics move to /admin/analytics on mobile) */}
      <section className={`${styles.statsGrid} ${styles.homeDesktopOnly}`}>
        <div className={styles.statCard}>
          <p className={styles.statLabel}>Total Sellers</p>
          <p className={styles.statValue}>{dashboard.stats.totalSellers}</p>
          <p className={styles.statHint}>Registered sellers</p>
        </div>

        <div className={styles.statCard}>
          <p className={styles.statLabel}>Total Buyers</p>
          <p className={styles.statValue}>{dashboard.stats.totalBuyers}</p>
          <p className={styles.statHint}>Buyer accounts</p>
        </div>

        <div className={styles.statCard}>
          <p className={styles.statLabel}>Transactions</p>
          <p className={styles.statValue}>
            {dashboard.stats.transactionsLast30Days}
          </p>
          <p className={styles.statHint}>Last 30 days (count)</p>
        </div>

        <div className={styles.statCard}>
          <p className={styles.statLabel}>Open Disputes</p>
          <p className={styles.statValue}>{dashboard.stats.openDisputes}</p>
          <p className={styles.statHint}>Needs review</p>
        </div>
      </section>

      {/* Mobile-first home hub */}
      <section className={styles.quickLinks}>

        {/* ── BCA-style hero header ── */}
        <div className={styles.mobileHeroHeader}>
          <div className={styles.mobileHeroTop}>
            <div className={styles.mobileHeroLogo}>
              <div className={styles.mobileHeroLogoIcon}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
                    strokeLinecap="round" strokeLinejoin="round" width="17" height="17">
                  <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
                  <polyline points="9 22 9 12 15 12 15 22"/>
                </svg>
              </div>
              <span className={styles.mobileHeroLogoText}>Admin Portal</span>
            </div>
            <div className={styles.mobileHeroAvatar} aria-label="Admin avatar">
              {avatarUrl ? (
                <Image
                  src={avatarUrl}
                  alt="Admin avatar"
                  width={36}
                  height={36}
                  className={styles.mobileHeroAvatarImg}
                  sizes="36px"
                  priority
                />
              ) : (
                avatarFallback
              )}
            </div>
          </div>

          <div className={styles.mobileHeroBalance}>
            <p className={styles.mobileHeroBalanceLabel}>
              {greetingName ? `Welcome back, ${greetingName}` : 'Welcome back'}
            </p>
            <p className={styles.mobileHeroBalanceValue}>
              {dashboard.stats.totalSellers + dashboard.stats.totalBuyers} Users
            </p>
            <p className={styles.mobileHeroBalanceSub}>
              <span className={styles.mobileHeroOnlineDot} />
              All systems operational
            </p>
          </div>
        </div>

        {/* ── Nav action cards ── */}
        <div className={styles.mobileNavCards}>
          {NAV_ACTIONS.map(({ id, label, icon: Icon, href }) => (
            <Link key={id} href={href} className={styles.mobileNavCard}>
              <span className={styles.mobileNavCardTile} aria-hidden="true">
                <span className={styles.mobileNavCardIcon}>
                  <Icon />
                </span>
              </span>
              <span className={styles.mobileNavCardLabel}>{label}</span>
            </Link>
          ))}
        </div>

        {/* ── Body content with padding ── */}
        <div className={styles.mobileBody}>

          {/* Search bar */}
          <div className={styles.homeSearchWrap} ref={searchWrapRef}>
            <span className={styles.homeSearchIcon}>
              <TbSearch />
            </span>
            <input
              ref={searchInputRef}
              type="search"
              placeholder="Search sellers by name or email"
              className={styles.homeSearchInput}
              value={sellerQuery}
              onChange={(e) => {
                setSellerQuery(e.target.value)
                setSellerOpen(true)
              }}
              onFocus={() => setSellerOpen(true)}
              autoComplete="off"
            />

            {sellerQuery.trim() ? (
              <button
                type="button"
                className={styles.homeSearchClearBtn}
                onClick={() => {
                  setSellerQuery('')
                  setSellerResults([])
                  setSellerOpen(false)
                  searchInputRef.current?.focus()
                }}
                aria-label="Clear search"
              >
                <TbX aria-hidden />
              </button>
            ) : null}

            {sellerOpen && (sellerQuery.trim().length >= 2) && (
              <div className={styles.homeSearchDropdown} role="listbox" aria-label="Seller results">
                {sellerLoading ? (
                  <div className={styles.homeSearchDropdownEmpty}>Searching…</div>
                ) : sellerResults.length === 0 ? (
                  <div className={styles.homeSearchDropdownEmpty}>No sellers found</div>
                ) : (
                  sellerResults.map((s) => {
                    const id = s.user_id || s.id
                    const name = s.business_name || s.contact_name || s.email || 'Seller'
                    const meta = s.email || s.contact_name || ''
                    const initial = String(name).trim().charAt(0).toUpperCase()
                    return (
                      <button
                        key={id}
                        type="button"
                        className={styles.homeSearchDropdownItem}
                        role="option"
                        onClick={() => goSeller(s)}
                      >
                        <span className={styles.homeSearchResultAvatar} aria-hidden="true">
                          {s.avatarUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={s.avatarUrl} alt="" className={styles.homeSearchResultAvatarImg} />
                          ) : (
                            <span className={styles.homeSearchResultAvatarFallback}>{initial}</span>
                          )}
                        </span>
                        <span className={styles.homeSearchResultText}>
                          <span className={styles.homeSearchResultName}>{name}</span>
                          {meta ? <span className={styles.homeSearchResultMeta}>{meta}</span> : null}
                        </span>
                        <span className={styles.homeSearchResultCta} aria-hidden="true">View</span>
                      </button>
                    )
                  })
                )}
              </div>
            )}
          </div>

          {/* Analytics highlight card */}
          <div className={styles.homeHighlightCard}>
            <p className={styles.homeHighlightTitle}>Keep your marketplace healthy</p>
            <p className={styles.homeHighlightText}>
              Regularly review disputes and pending payouts so buyers and sellers
              stay confident on the platform.
            </p>
            <Link href="/admin/analytics" className={styles.homeHighlightLink}>
              View analytics
            </Link>
          </div>

          {/* Mobile stat cards (dashboard only) */}
          <div className={styles.mobileStatsGrid} aria-label="Admin stats">
            {MOBILE_STAT_CARDS.map(({ id, title, value, subtitle, icon: Icon, href, actionLabel }) => (
              <Link key={id} href={href} className={styles.mobileStatCard}>
                <div className={styles.mobileStatCardTop}>
                  <span className={styles.mobileStatIcon} aria-hidden="true">
                    <Icon />
                  </span>
                  <span className={styles.mobileStatTitle}>{title}</span>
                </div>
                <p className={styles.mobileStatValue}>{Number(value(dashboard.stats)).toLocaleString()}</p>
                <div className={styles.mobileStatFooter}>
                  <span className={styles.mobileStatSubtitle}>{subtitle}</span>
                  <span className={styles.mobileStatAction}>{actionLabel}</span>
                </div>
              </Link>
            ))}
          </div>

        </div>{/* end mobileBody */}

      </section>

      {/* Desktop-only revenue charts (hidden on mobile home) */}
      <section className={`${styles.panel} ${styles.homeDesktopOnly}`}>
        <div className={styles.panelHead}>
          <p className={styles.panelTitle}>Revenue overview (sample data)</p>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1.6fr) minmax(280px, 1fr)',
            gap: 24,
            alignItems: 'stretch',
          }}
        >
          {/* Revenue by day — Area chart */}
          <div style={{ minHeight: 260 }}>
            <p style={{ margin: '0 0 8px', fontWeight: 600, fontSize: 14 }}>
              Last 7 days
            </p>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart
                data={dashboard.revenueByDay}
                margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={CHART_ACCENT} stopOpacity={0.35} />
                    <stop offset="100%" stopColor={CHART_ACCENT} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="date"
                  tickFormatter={formatShortDate}
                  tick={{ fontSize: 11, fill: '#64748b' }}
                />
                <YAxis
                  tickFormatter={(v) => `₱${(v / 1000).toFixed(0)}k`}
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  width={44}
                />
                <Tooltip
                  formatter={(value) => [`₱ ${Number(value).toLocaleString()}`, 'Revenue']}
                  labelFormatter={(label) => `Date: ${label}`}
                  contentStyle={{ fontSize: 12, borderRadius: 8 }}
                />
                <Area
                  type="monotone"
                  dataKey="total"
                  stroke={CHART_ACCENT}
                  strokeWidth={2}
                  fill="url(#revenueGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Revenue by category — Horizontal bar chart */}
          <div style={{ minHeight: 260, minWidth: 0 }}>
            <p style={{ margin: '0 0 8px', fontWeight: 600, fontSize: 14 }}>
              By category
            </p>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart
                data={dashboard.revenueByCategory}
                layout="vertical"
                margin={{ top: 4, right: 8, left: 0, bottom: 4 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
                <XAxis
                  type="number"
                  tickFormatter={(v) => `₱${(v / 1000).toFixed(0)}k`}
                  tick={{ fontSize: 10, fill: '#64748b' }}
                  width={40}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fontSize: 11, fill: '#374151' }}
                  width={100}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  formatter={(value) => [`₱ ${Number(value).toLocaleString()}`, 'Revenue']}
                  contentStyle={{ fontSize: 12, borderRadius: 8 }}
                />
                <Bar
                  dataKey="value"
                  radius={[0, 4, 4, 0]}
                  maxBarSize={24}
                  label={false}
                >
                  {dashboard.revenueByCategory.map((_, index) => (
                    <Cell
                      key={index}
                      fill={BAR_COLORS[index % BAR_COLORS.length]}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      {/* Desktop-only recent activity and quick actions */}
      <section className={`${styles.lowerGrid} ${styles.homeDesktopOnly}`}>
        <div className={styles.panel}>
          <div className={styles.panelHead}>
            <p className={styles.panelTitle}>Recent activity</p>
            <button className={styles.smallBtn} type="button">
              View all
            </button>
          </div>

          <div className={styles.table}>
            <div className={styles.rowHead}>
              <span>Date</span>
              <span>Type</span>
              <span>Status</span>
            </div>

            {dashboard.recentActivity.map((item) => (
              <div className={styles.row} key={item.id}>
                <span>{item.date}</span>
                <span>{item.type}</span>
                <span className={styles.statusLabel}>
                  <span
                    className={styles.statusDot}
                    style={{ backgroundColor: getStatusDotColor(item.status) }}
                  />
                  {item.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className={styles.panel}>
          <div className={styles.panelHead}>
            <p className={styles.panelTitle}>Quick actions</p>
          </div>

          <div className={styles.actions}>
            <Link href="/admin/listings/browse" className={styles.actionBtn}>
              View Listings
            </Link>
            <Link href="/admin/buyers" className={styles.actionBtn}>
              View Buyers
            </Link>
            <Link href="/admin/disputes" className={styles.actionBtn}>
              Review Disputes
            </Link>
            <Link href="/admin/profile" className={styles.actionBtn}>
              Settings
            </Link>
          </div>
        </div>
      </section>

      {/* Mobile-only recent activity (no quick actions) */}
      <section className={styles.recentMobile}>
        <div className={styles.panel}>
          <div className={styles.panelHead}>
            <p className={styles.panelTitle}>Recent activity</p>
          </div>

          <div className={styles.table}>
            <div className={styles.rowHead}>
              <span>Date</span>
              <span>Type</span>
              <span>Status</span>
            </div>

            {dashboard.recentActivity.map((item) => (
              <div className={styles.row} key={item.id}>
                <span>{item.date}</span>
                <span>{item.type}</span>
                <span className={styles.statusLabel}>
                  <span
                    className={styles.statusDot}
                    style={{ backgroundColor: getStatusDotColor(item.status) }}
                  />
                  {item.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}