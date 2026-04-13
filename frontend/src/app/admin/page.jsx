'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import styles from './admin.module.css'
import { dashboard, disputes as disputesData } from '@/data/adminSampleData'
import { listSellersForAdmin } from '@/lib/sellers/client'
import { supabase } from '@/lib/supabase/client'
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
import { TbReportSearch, TbUsers, TbSearch, TbTemplate } from 'react-icons/tb'
import { LuUserCheck } from 'react-icons/lu'
import { LuClipboardList, LuPencilLine, LuPlus } from 'react-icons/lu'

// Bar chart: green shades only (values match globals.css --color-green-*)
const BAR_COLORS = ['#1F312B', '#2D4A38', '#3D683A', '#4A7C47']
const CHART_ACCENT = '#1F312B'

const QUICK_LINKS = [
  { id: 'disputes', label: 'Disputes', icon: TbReportSearch },
  { id: 'sellers', label: 'Sellers', icon: LuUserCheck },
  { id: 'buyers', label: 'Buyers', icon: TbUsers },
  { id: 'template', label: 'Template', icon: TbTemplate },
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
  const [activeQuickLink, setActiveQuickLink] = useState('disputes')
  const [sellerPreview, setSellerPreview] = useState({
    total: dashboard.stats.totalSellers,
    active: 0,
    pending: 0,
    recent: [],
  })
  const [buyerPreview, setBuyerPreview] = useState({
    total: dashboard.stats.totalBuyers,
    recent: [],
  })

  useEffect(() => {
    let mounted = true

    const loadPreviewData = async () => {
      try {
        const sellers = await listSellersForAdmin()
        if (mounted && Array.isArray(sellers)) {
          setSellerPreview({
            total: sellers.length,
            active: sellers.filter((s) => s?.status === 'active').length,
            pending: sellers.filter((s) => s?.status === 'pending').length,
            recent: sellers.slice(0, 3),
          })
        }
      } catch (error) {
        console.error('Failed to load seller preview data:', error)
      }

      try {
        const [{ count }, { data: recentBuyers }] = await Promise.all([
          supabase
            .from('users')
            .select('id', { count: 'exact', head: true })
            .eq('role', 'buyer'),
          supabase
            .from('users')
            .select(`
              id,
              email,
              created_at,
              profiles (
                full_name
              )
            `)
            .eq('role', 'buyer')
            .order('created_at', { ascending: false })
            .limit(3),
        ])

        if (!mounted) return

        const mappedRecent = (recentBuyers || []).map((u) => {
          const profile = Array.isArray(u.profiles) ? u.profiles[0] : u.profiles
          return {
            id: u.id,
            name: profile?.full_name || u.email || 'Unnamed buyer',
            email: u.email || 'No email',
            joinedAt: u.created_at ? new Date(u.created_at).toISOString().slice(0, 10) : 'N/A',
          }
        })

        setBuyerPreview({
          total: count ?? mappedRecent.length,
          recent: mappedRecent,
        })
      } catch (error) {
        console.error('Failed to load buyer preview data:', error)
      }
    }

    loadPreviewData()
    return () => {
      mounted = false
    }
  }, [])

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

      {/* Mobile-first home hub: search, quick links, highlight */}
      <section className={styles.quickLinks}>
        <div className={styles.homeSearchWrap}>
          <span className={styles.homeSearchIcon}>
            <TbSearch />
          </span>
          <input
            type="search"
            placeholder="Search buyers, sellers, or orders"
            className={styles.homeSearchInput}
          />
        </div>

        <div className={styles.quickLinksRow} role="tablist">
          {QUICK_LINKS.map(({ id, label, icon: Icon }) => {
            const isActive = activeQuickLink === id
            return (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={isActive}
                className={`${styles.quickLinkCard} ${
                  isActive ? styles.quickLinkCardActive : ''
                }`}
                onClick={() => setActiveQuickLink(id)}
              >
                <span className={styles.quickLinkIcon}>
                  <Icon />
                </span>
                <span className={styles.quickLinkLabel}>{label}</span>
              </button>
            )
          })}
        </div>

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

        <div className={styles.quickLinkContent}>
          {activeQuickLink === 'disputes' && (
            <div className={styles.qlPanel}>
              {/* stat chips */}
              <div className={styles.qlChips}>
                <div className={styles.qlChip}>
                  <span className={styles.qlChipValue}>{disputesData.length}</span>
                  <span className={styles.qlChipLabel}>Total</span>
                </div>
                <div className={styles.qlChip}>
                  <span className={styles.qlChipValue}>
                    {disputesData.filter((d) => d.status === 'open').length}
                  </span>
                  <span className={styles.qlChipLabel}>Open</span>
                </div>
                <div className={styles.qlChip}>
                  <span className={styles.qlChipValue}>
                    {disputesData.filter((d) => d.status === 'under_review').length}
                  </span>
                  <span className={styles.qlChipLabel}>Review</span>
                </div>
                <div className={styles.qlChip}>
                  <span className={styles.qlChipValue}>
                    {disputesData.filter((d) => d.status === 'resolved').length}
                  </span>
                  <span className={styles.qlChipLabel}>Resolved</span>
                </div>
              </div>
              {/* recent rows */}
              <div className={styles.qlRows}>
                {disputesData.slice(0, 3).map((item) => (
                  <div className={styles.qlRow} key={item.id}>
                    <span
                      className={styles.qlDot}
                      style={{ backgroundColor: getStatusDotColor(item.status.replace('_', ' ')) }}
                    />
                    <div className={styles.qlRowMeta}>
                      <span className={styles.qlRowType}>{item.reason}</span>
                      <span className={styles.qlRowDate}>{item.openedAt}</span>
                    </div>
                    <span className={styles.qlBadge}>{item.status.replace('_', ' ')}</span>
                  </div>
                ))}
              </div>
              <Link href="/admin/disputes" className={styles.qlCta}>
                View all disputes →
              </Link>
            </div>
          )}

          {activeQuickLink === 'sellers' && (
            <div className={styles.qlPanel}>
              <div className={styles.qlChips}>
                <div className={styles.qlChip}>
                  <span className={styles.qlChipValue}>{sellerPreview.total}</span>
                  <span className={styles.qlChipLabel}>Total</span>
                </div>
                <div className={styles.qlChip}>
                  <span className={styles.qlChipValue}>{sellerPreview.active}</span>
                  <span className={styles.qlChipLabel}>Active</span>
                </div>
                <div className={styles.qlChip}>
                  <span className={styles.qlChipValue}>{sellerPreview.pending}</span>
                  <span className={styles.qlChipLabel}>Pending</span>
                </div>
              </div>
              <div className={styles.qlRows}>
                {sellerPreview.recent.length > 0 ? (
                  sellerPreview.recent.map((seller) => (
                    <div className={styles.qlRow} key={seller.user_id || seller.id}>
                      <span
                        className={styles.qlDot}
                        style={{ backgroundColor: getStatusDotColor(seller.status) }}
                      />
                      <div className={styles.qlRowMeta}>
                        <span className={styles.qlRowType}>{seller.business_name || 'Unnamed seller'}</span>
                        <span className={styles.qlRowDate}>{seller.email || 'No email'}</span>
                      </div>
                      <span className={styles.qlBadge}>{seller.status || 'unknown'}</span>
                    </div>
                  ))
                ) : (
                  <div className={styles.qlActionRow}>
                    <span className={styles.qlActionIcon}><TbUsers /></span>
                    <span className={styles.qlActionLabel}>No sellers available yet</span>
                  </div>
                )}
              </div>
              <Link href="/admin/sellers" className={styles.qlCta}>
                Manage sellers →
              </Link>
            </div>
          )}

          {activeQuickLink === 'buyers' && (
            <div className={styles.qlPanel}>
              <div className={styles.qlChips}>
                <div className={styles.qlChip}>
                  <span className={styles.qlChipValue}>{buyerPreview.total}</span>
                  <span className={styles.qlChipLabel}>Total</span>
                </div>
                <div className={styles.qlChip}>
                  <span className={styles.qlChipValue}>{buyerPreview.recent.length}</span>
                  <span className={styles.qlChipLabel}>Latest shown</span>
                </div>
              </div>
              <div className={styles.qlRows}>
                {buyerPreview.recent.length > 0 ? (
                  buyerPreview.recent.map((buyer) => (
                    <div className={styles.qlRow} key={buyer.id}>
                      <span
                        className={styles.qlDot}
                        style={{ backgroundColor: getStatusDotColor('active') }}
                      />
                      <div className={styles.qlRowMeta}>
                        <span className={styles.qlRowType}>{buyer.name}</span>
                        <span className={styles.qlRowDate}>{buyer.joinedAt}</span>
                      </div>
                      <span className={styles.qlBadge}>buyer</span>
                    </div>
                  ))
                ) : (
                  <div className={styles.qlActionRow}>
                    <span className={styles.qlActionIcon}><TbUsers /></span>
                    <span className={styles.qlActionLabel}>No buyers available yet</span>
                  </div>
                )}
              </div>
              <Link href="/admin/buyers" className={styles.qlCta}>
                Manage buyers →
              </Link>
            </div>
          )}

          {activeQuickLink === 'template' && (
            <div className={styles.qlPanel}>
              <div className={styles.qlRows}>
                <div className={styles.qlActionRow}>
                  <span className={styles.qlActionIcon}><LuPlus /></span>
                  <span className={styles.qlActionLabel}>Add field</span>
                  <Link href="/admin/seller-template" className={styles.qlActionBtn}>Open</Link>
                </div>
                <div className={styles.qlActionRow}>
                  <span className={styles.qlActionIcon}><LuPencilLine /></span>
                  <span className={styles.qlActionLabel}>Edit field type & placeholder</span>
                  <Link href="/admin/seller-template" className={styles.qlActionBtn}>Go</Link>
                </div>
                <div className={styles.qlActionRow}>
                  <span className={styles.qlActionIcon}><LuClipboardList /></span>
                  <span className={styles.qlActionLabel}>Reorder and delete fields</span>
                  <Link href="/admin/seller-template" className={styles.qlActionBtn}>Go</Link>
                </div>
              </div>
              <Link href="/admin/seller-template" className={styles.qlCta}>
                Manage templates →
              </Link>
            </div>
          )}
        </div>

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
            <Link href="/admin/sellers" className={styles.actionBtn}>
              Add Seller
            </Link>
            <Link href="/admin/listings" className={styles.actionBtn}>
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