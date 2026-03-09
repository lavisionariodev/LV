'use client'

import { useState } from 'react'
import Link from 'next/link'
import styles from './admin.module.css'
import { dashboard } from '@/data/adminSampleData'
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
import { TbReportSearch, TbUsers, TbSearch } from 'react-icons/tb'
import { LuUserCheck } from 'react-icons/lu'
import { HiOutlineNewspaper } from 'react-icons/hi'

// Bar chart: green shades only (values match globals.css --color-green-*)
const BAR_COLORS = ['#1F312B', '#2D4A38', '#3D683A', '#4A7C47']
const CHART_ACCENT = '#1F312B'

const QUICK_LINKS = [
  { id: 'disputes', label: 'Disputes', icon: TbReportSearch },
  { id: 'sellers', label: 'Sellers', icon: LuUserCheck },
  { id: 'users', label: 'Users', icon: TbUsers },
  { id: 'content', label: 'Content', icon: HiOutlineNewspaper },
]

function formatShortDate(dateStr) {
  const d = new Date(dateStr)
  return `${d.getMonth() + 1}/${d.getDate()}`
}

export default function AdminDashboardPage() {
  const [activeQuickLink, setActiveQuickLink] = useState('disputes')

  return (
    <div className={styles.dashWrap}>
      {/* Desktop-only summary cards (analytics move to /admin/analytics on mobile) */}
      <section className={`${styles.statsGrid} ${styles.homeDesktopOnly}`}>
        <div className={styles.statCard}>
          <p className={styles.statLabel}>Total Sellers</p>
          <p className={styles.statValue}>{dashboard.stats.totalSellers}</p>
          <p className={styles.statHint}>Registered sellers</p>
        </div>

        <div className={styles.statCard}>
          <p className={styles.statLabel}>Total Users</p>
          <p className={styles.statValue}>{dashboard.stats.totalUsers}</p>
          <p className={styles.statHint}>Registered accounts</p>
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
            placeholder="Search users, sellers, or orders"
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
            <div className={styles.panel}>
              <div className={styles.panelHead}>
                <p className={styles.panelTitle}>Disputes overview</p>
                <Link href="/admin/disputes" className={styles.smallBtn}>
                  View all
                </Link>
              </div>
              <div className={styles.table}>
                <div className={styles.rowHead}>
                  <span>Date</span>
                  <span>Type</span>
                  <span>Status</span>
                </div>
                {dashboard.recentActivity.slice(0, 3).map((item) => (
                  <div className={styles.row} key={item.id}>
                    <span>{item.date}</span>
                    <span>{item.type}</span>
                    <span className={styles.badge}>{item.status}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeQuickLink === 'sellers' && (
            <div className={styles.panel}>
              <div className={styles.panelHead}>
                <p className={styles.panelTitle}>Sellers</p>
                <Link href="/admin/sellers" className={styles.smallBtn}>
                  Manage
                </Link>
              </div>
              <p className={styles.quickLinkBodyText}>
                Total sellers: <strong>{dashboard.stats.totalSellers}</strong>
              </p>
              <p className={styles.quickLinkBodyText}>
                Keep an eye on new and high-performing sellers to ensure a
                healthy marketplace.
              </p>
            </div>
          )}

          {activeQuickLink === 'users' && (
            <div className={styles.panel}>
              <div className={styles.panelHead}>
                <p className={styles.panelTitle}>Users</p>
                <Link href="/admin/users" className={styles.smallBtn}>
                  Manage
                </Link>
              </div>
              <p className={styles.quickLinkBodyText}>
                Total users: <strong>{dashboard.stats.totalUsers}</strong>
              </p>
              <p className={styles.quickLinkBodyText}>
                Watch user growth and retention so you understand how the
                platform is being used.
              </p>
            </div>
          )}

          {activeQuickLink === 'content' && (
            <div className={styles.panel}>
              <div className={styles.panelHead}>
                <p className={styles.panelTitle}>Content</p>
                <Link href="/admin/content" className={styles.smallBtn}>
                  Manage
                </Link>
              </div>
              <p className={styles.quickLinkBodyText}>
                Quickly adjust homepage banners, FAQs, and other key content so
                buyers and sellers always see up-to-date information.
              </p>
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
                <span className={styles.badge}>{item.status}</span>
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
            <Link href="/admin/content" className={styles.actionBtn}>
              Manage Content
            </Link>
            <Link href="/admin/disputes" className={styles.actionBtn}>
              Review Disputes
            </Link>
            <Link href="/admin/settings" className={styles.actionBtn}>
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
                <span className={styles.badge}>{item.status}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
} 