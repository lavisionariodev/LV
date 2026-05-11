'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import styles from './admin.module.css'
import { formatCount, formatPHPMobile } from '@/shared/utils/formatCount'
import { fetchCurrentAdminProfile } from '@/features/admin/settings/getAdminProfile'
import { searchSellersForAdmin } from '@/lib/sellers/client'
import { listSellerListingsForAdmin } from '@/lib/seller-listings/client'
import { hasPendingSellerChanges } from '@/lib/seller-listings/pendingChanges'
import { formatPHP } from '@/shared/utils/adminPayouts'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { TbReportSearch, TbUsers, TbSearch, TbCreditCard, TbX } from 'react-icons/tb'
import { LuUserCheck } from 'react-icons/lu'
import { MdArrowOutward } from 'react-icons/md'

const CHART_ACCENT = '#1F312B'

const NAV_ACTIONS = [
  { id: 'sellers',  label: 'Sellers',  icon: LuUserCheck,    href: '/admin/sellers' },
  { id: 'buyers',   label: 'Buyers',   icon: TbUsers,        href: '/admin/buyers' },
  { id: 'billing',  label: 'Billing',  icon: TbCreditCard,   href: '/admin/profile/billing' },
  { id: 'disputes', label: 'Disputes', icon: TbReportSearch, href: '/admin/disputes' },
]

const MOBILE_STAT_CARDS = [
  {
    id: 'pendingPayouts',
    title: 'Pending release',
    value: (metrics) => metrics.pendingPayoutAmt,
    subtitle: 'Escrow pending release · on hold',
    icon: TbCreditCard,
    href: '/admin/payouts',
    actionLabel: 'Review',
    format: 'php',
  },
  {
    id: 'activeSellers',
    title: 'Sellers',
    value: (metrics) => metrics.activeSellerCount,
    subtitle: 'Active sellers',
    icon: LuUserCheck,
    href: '/admin/sellers',
    actionLabel: 'View',
    format: 'count',
  },
  {
    id: 'disputesAttention',
    title: 'Disputes',
    value: (metrics) => metrics.disputesNeedingAttention,
    subtitle: 'Needs attention',
    icon: TbReportSearch,
    href: '/admin/disputes',
    actionLabel: 'Review',
    format: 'count',
  },
  {
    id: 'listingsPending',
    title: 'Listings',
    value: (metrics) => metrics.listingsPendingReview,
    subtitle: 'Pending review',
    icon: TbReportSearch,
    href: '/admin/listings/approvals',
    actionLabel: 'Review',
    format: 'count',
  },
]

function utcLast7DaysSeriesZeros() {
  const out = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setUTCHours(0, 0, 0, 0)
    d.setUTCDate(d.getUTCDate() - i)
    out.push({ date: d.toISOString().slice(0, 10), total: 0 })
  }
  return out
}

function formatShortDate(dateStr) {
  const d = new Date(`${String(dateStr)}T12:00:00Z`)
  return `${d.getUTCMonth() + 1}/${d.getUTCDate()}`
}

function getStatusDotColor(status) {
  const s = String(status).toLowerCase()
  if (s.includes('pending')) return '#f59e0b'
  if (s.includes('open')) return '#0284c7'
  if (s.includes('resolved') || s.includes('completed')) return '#15803d'
  return '#94a3b8'
}

// ── Sparkline ──────────────────────────────────────────────────────────────
// Thin, very light smooth curve. No fill, no dots, no axes.
// Sits on the right side of the stat card body as a decorative trend indicator.
export default function AdminDashboardPage() {
  const router = useRouter()
  const [adminProfile, setAdminProfile] = useState(null)
  const [adminProfileLoading, setAdminProfileLoading] = useState(true)

  const [sellerQuery, setSellerQuery] = useState('')
  const [sellerResults, setSellerResults] = useState([])
  const [sellerLoading, setSellerLoading] = useState(false)
  const [sellerOpen, setSellerOpen] = useState(false)
  const [activeSellerCount, setActiveSellerCount] = useState(0)
  const [listingsPendingReviewCount, setListingsPendingReviewCount] = useState(0)
  const searchWrapRef = useRef(null)
  const searchInputRef = useRef(null)

  const [payoutMetrics, setPayoutMetrics] = useState({
    platformRevenue30d: 0,
    pendingPayoutAmt: 0,
  })

  /** Commission from released escrows by UTC day (7 days); filled from `/api/admin/metrics`. */
  const [commissionChartSeries, setCommissionChartSeries] = useState(() => utcLast7DaysSeriesZeros())
  const [recentActivityRows, setRecentActivityRows] = useState([])
  const [disputesNeedingAttention, setDisputesNeedingAttention] = useState(0)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const res = await fetch('/api/admin/metrics', { credentials: 'include' })
        const body = await res.json().catch(() => null)
        if (cancelled || !res.ok || !body?.payoutSummary) {
          return
        }
        setPayoutMetrics({
          platformRevenue30d: Number(body.payoutSummary.platformRevenue30d) || 0,
          pendingPayoutAmt: Number(body.payoutSummary.pendingPayoutAmt) || 0,
        })
        setActiveSellerCount(Number(body.sellersActive) || 0)
        setDisputesNeedingAttention(Number(body.disputesNeedingAttention) || 0)
        if (Array.isArray(body.dailyReleasedCommission) && body.dailyReleasedCommission.length > 0) {
          setCommissionChartSeries(body.dailyReleasedCommission)
        }
        if (Array.isArray(body.recentActivity))
          setRecentActivityRows(body.recentActivity.slice(0, 4))
      } catch {
        // keep defaults
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

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

  useEffect(() => {
    let cancelled = false
    const loadListingsPending = async () => {
      try {
        const [pendingRes, approvedRes] = await Promise.all([
          listSellerListingsForAdmin({ approvalStatusIn: ['pending'], onlyActive: false }),
          listSellerListingsForAdmin({ statusIn: ['active', 'archived'], approvalStatusIn: ['approved'] }),
        ])

        if (cancelled) return

        const pendingRows = Array.isArray(pendingRes?.data) ? pendingRes.data : []
        const approvedRows = Array.isArray(approvedRes?.data) ? approvedRes.data : []
        const stagedCount = approvedRows.filter((row) => hasPendingSellerChanges(row)).length
        setListingsPendingReviewCount(pendingRows.length + stagedCount)
      } catch {
        if (!cancelled) setListingsPendingReviewCount(0)
      }
    }
    loadListingsPending()
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
      <div className={styles.dashSkWrap} role="status" aria-live="polite" aria-busy="true" aria-label="Loading dashboard">
        <div className={styles.dashSkWelcome}>
          <div className={styles.dashSkWelcomeLeft}>
            <span className={`${styles.adminSkBar} ${styles.dashSkWelcomeIcon}`} />
            <div className={styles.dashSkWelcomeText}>
              <span className={`${styles.adminSkBar} ${styles.dashSkLineLg}`} />
              <span className={`${styles.adminSkBar} ${styles.dashSkLineMd}`} />
            </div>
          </div>
          <span className={`${styles.adminSkBar} ${styles.dashSkPill}`} />
        </div>
        <div className={styles.dashSkDesktopGrid}>
          <div className={styles.dashSkPanel}>
            <span className={`${styles.adminSkBar} ${styles.dashSkPanelTitle}`} />
            <span className={`${styles.adminSkBar} ${styles.dashSkLineMd}`} style={{ maxWidth: 260 }} />
            <span className={`${styles.adminSkBar} ${styles.dashSkChart}`} />
          </div>
          <div className={styles.dashSkStatCol}>
            {[0, 1, 2].map((i) => (
              <div key={i} className={styles.dashSkStatCard}>
                <div className={styles.dashSkStatTop}>
                  <span className={`${styles.adminSkBar} ${styles.dashSkStatLabel}`} />
                  <span className={`${styles.adminSkBar} ${styles.dashSkStatIcon}`} />
                </div>
                <span className={`${styles.adminSkBar} ${styles.dashSkStatValue}`} />
                <span className={`${styles.adminSkBar} ${styles.dashSkStatHint}`} />
              </div>
            ))}
          </div>
        </div>
        <div className={styles.dashSkMobileHub}>
          <div className={styles.dashSkHero}>
            <span className={`${styles.adminSkBar} ${styles.dashSkLineLg}`} style={{ maxWidth: 200 }} />
            <span className={`${styles.adminSkBar} ${styles.dashSkStatValue}`} style={{ width: '72%' }} />
            <span className={`${styles.adminSkBar} ${styles.dashSkLineMd}`} />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
              <span className={`${styles.adminSkBar} ${styles.dashSkStatCard}`} style={{ minHeight: 72, padding: 0 }} />
              <span className={`${styles.adminSkBar} ${styles.dashSkStatCard}`} style={{ minHeight: 72, padding: 0 }} />
            </div>
          </div>
        </div>
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

      {/* Desktop-only: charts (left) + stat cards (right) side by side */}
      <div className={`${styles.desktopDashGrid} ${styles.homeDesktopOnly}`}>

        {/* LEFT — two charts stacked */}
        <div className={styles.desktopChartsCol}>
          {/* Revenue by day — Area chart */}
          <div className={`${styles.panel} ${styles.revenueOverviewPanel}`} style={{ display: 'flex', flexDirection: 'column' }}>
            <div className={styles.panelHead}>
              <p className={styles.panelTitle}>Platform commission</p>
            </div>
            <p style={{ margin: '0 0 8px', fontWeight: 600, fontSize: 14, color: '#374151' }}>
              Last 7 days · released escrows (UTC day)
            </p>
            <div style={{ flex: 1, minHeight: 0 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={commissionChartSeries}
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
                  formatter={(value) => [`₱ ${Number(value).toLocaleString()}`, 'Commission']}
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
          </div>
        </div>

        {/* RIGHT — 4×1 stat cards */}
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <div className={styles.statCardTop}>
              <p className={styles.statLabel}>Platform revenue</p>
              <Link href="/admin/payouts" className={styles.statCardArrow} aria-label="View platform revenue">
                <MdArrowOutward />
              </Link>
            </div>
            <div className={styles.statCardBody}>
              <span className={styles.statCardIcon} aria-hidden="true"><TbCreditCard /></span>
              <div className={styles.statCardText}>
                <p className={styles.statValue}>{formatPHP(payoutMetrics.platformRevenue30d)}</p>
                <p className={styles.statHint}>Last 30 days</p>
              </div>
            </div>
          </div>

          <div className={styles.statCard}>
            <div className={styles.statCardTop}>
              <p className={styles.statLabel}>Pending release</p>
              <Link href="/admin/payouts?tab=transactions&payout=escrowed" className={styles.statCardArrow} aria-label="View escrows awaiting release">
                <MdArrowOutward />
              </Link>
            </div>
            <div className={styles.statCardBody}>
              <span className={styles.statCardIcon} aria-hidden="true"><TbCreditCard /></span>
              <div className={styles.statCardText}>
                <p className={styles.statValue}>{formatPHP(payoutMetrics.pendingPayoutAmt)}</p>
                <p className={styles.statHint}>Escrow awaiting release · on hold</p>
              </div>
            </div>
          </div>

          <div className={styles.statCard}>
            <div className={styles.statCardTop}>
              <p className={styles.statLabel}>Disputes needing attention</p>
              <Link href="/admin/disputes" className={styles.statCardArrow} aria-label="View disputes">
                <MdArrowOutward />
              </Link>
            </div>
            <div className={styles.statCardBody}>
              <span className={styles.statCardIcon} aria-hidden="true"><TbReportSearch /></span>
              <div className={styles.statCardText}>
                <p className={styles.statValue}>{formatCount(disputesNeedingAttention, { desktop: true })}</p>
                <p className={styles.statHint}>Open + under review</p>
              </div>
            </div>
          </div>
        </div>

      </div>{/* end desktopDashGrid */}

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
            <Link
              href="/admin/profile"
              className={styles.mobileHeroAvatar}
              aria-label="Go to profile"
            >
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
            </Link>
          </div>

          <div className={styles.mobileHeroBalance}>
            <p className={styles.mobileHeroBalanceLabel}>
              {greetingName ? `Welcome back, ${greetingName}` : 'Welcome back'}
            </p>
            <p className={styles.mobileHeroBalanceValue}>
              {formatPHPMobile(payoutMetrics.platformRevenue30d)} Revenue
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
                  <div role="status" aria-live="polite" aria-busy="true" aria-label="Searching sellers">
                    {[0, 1, 2].map((i) => (
                      <div key={`seller-sk-${i}`} className={styles.homeSearchDropdownSkItem}>
                        <span
                          className={styles.adminSkBar}
                          style={{ width: 34, height: 34, borderRadius: 12, flexShrink: 0 }}
                          aria-hidden
                        />
                        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 5 }}>
                          <span className={styles.adminSkBar} style={{ height: 12, width: '72%', maxWidth: 200 }} aria-hidden />
                          <span className={styles.adminSkBar} style={{ height: 10, width: '48%', maxWidth: 140 }} aria-hidden />
                        </div>
                      </div>
                    ))}
                  </div>
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
            {MOBILE_STAT_CARDS.map(({ id, title, value, subtitle, icon: Icon, href, actionLabel, format }) => (
              <Link key={id} href={href} className={styles.mobileStatCard}>
                <div className={styles.mobileStatCardTop}>
                  <span className={styles.mobileStatIcon} aria-hidden="true">
                    <Icon />
                  </span>
                  <span className={styles.mobileStatTitle}>{title}</span>
                </div>
                <p className={styles.mobileStatValue}>
                  {format === 'php'
                    ? formatPHPMobile(value({
                        activeSellerCount,
                        platformRevenue30d: payoutMetrics.platformRevenue30d,
                        pendingPayoutAmt: payoutMetrics.pendingPayoutAmt,
                        disputesNeedingAttention,
                        listingsPendingReview: listingsPendingReviewCount,
                      }))
                    : formatCount(value({
                        activeSellerCount,
                        platformRevenue30d: payoutMetrics.platformRevenue30d,
                        pendingPayoutAmt: payoutMetrics.pendingPayoutAmt,
                        disputesNeedingAttention,
                        listingsPendingReview: listingsPendingReviewCount,
                      }))}
                </p>
                <div className={styles.mobileStatFooter}>
                  <span className={styles.mobileStatSubtitle}>{subtitle}</span>
                  <span className={styles.mobileStatAction}>{actionLabel}</span>
                </div>
              </Link>
            ))}
          </div>

        </div>{/* end mobileBody */}

      </section>

      {/* Desktop-only recent activity and quick actions */}
      <section className={`${styles.lowerGrid} ${styles.homeDesktopOnly}`}>
        <div className={styles.panel}>
          <div className={styles.panelHead}>
            <p className={styles.panelTitle}>Recent activity</p>
            <Link href="/admin/analytics" className={styles.smallBtn}>
              View all
            </Link>
          </div>

          <div className={styles.table}>
            <div className={styles.rowHead}>
              <span>Date</span>
              <span>Type</span>
              <span>Status</span>
            </div>

            {recentActivityRows.length === 0 ? (
              <div className={styles.row}>
                <span style={{ gridColumn: '1 / -1', color: '#64748b', fontSize: 13 }}>
                  No recent paid orders yet.
                </span>
              </div>
            ) : (
              recentActivityRows.map((item) => (
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
              ))
            )}
          </div>
        </div>

        <div className={styles.panel}>
          <div className={`${styles.panelHead} ${styles.panelHeadQuickActions}`}>
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

            {recentActivityRows.length === 0 ? (
              <div className={styles.row}>
                <span style={{ gridColumn: '1 / -1', color: '#64748b', fontSize: 13 }}>
                  No recent paid orders yet.
                </span>
              </div>
            ) : (
              recentActivityRows.map((item) => (
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
              ))
            )}
          </div>
        </div>
      </section>
    </div>
  )
}