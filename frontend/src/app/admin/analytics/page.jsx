'use client'

import Link from 'next/link'
import layoutStyles from '../admin.module.css'
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

const BAR_COLORS = ['#1F312B', '#2D4A38', '#3D683A', '#4A7C47']
const CHART_ACCENT = '#1F312B'

function formatShortDate(dateStr) {
  const d = new Date(dateStr)
  return `${d.getMonth() + 1}/${d.getDate()}`
}

export default function AdminAnalyticsPage() {
  return (
    <div className={layoutStyles.dashWrap}>

      {/* Stat cards — 4 col desktop, 2 col tablet/mobile */}
      <section className={layoutStyles.analyticsStatsGrid}>
        <div className={layoutStyles.statCard}>
          <p className={layoutStyles.statLabel}>Total Sellers</p>
          <p className={layoutStyles.statValue}>{dashboard.stats.totalSellers}</p>
          <p className={layoutStyles.statHint}>Registered sellers</p>
        </div>
        <div className={layoutStyles.statCard}>
          <p className={layoutStyles.statLabel}>Total Users</p>
          <p className={layoutStyles.statValue}>{dashboard.stats.totalUsers}</p>
          <p className={layoutStyles.statHint}>Registered accounts</p>
        </div>
        <div className={layoutStyles.statCard}>
          <p className={layoutStyles.statLabel}>Transactions</p>
          <p className={layoutStyles.statValue}>{dashboard.stats.transactionsLast30Days}</p>
          <p className={layoutStyles.statHint}>Last 30 days (count)</p>
        </div>
        <div className={layoutStyles.statCard}>
          <p className={layoutStyles.statLabel}>Open Disputes</p>
          <p className={layoutStyles.statValue}>{dashboard.stats.openDisputes}</p>
          <p className={layoutStyles.statHint}>Needs review</p>
        </div>
      </section>

      {/* Revenue overview panel */}
      <section className={layoutStyles.panel}>
        <div className={layoutStyles.panelHead}>
          <p className={layoutStyles.panelTitle}>Revenue overview</p>
        </div>
        <p className={layoutStyles.analyticsSubtitle}>
          Platform revenue trends over the last 7 days.
        </p>

        <div className={layoutStyles.analyticsChartGrid}>
          {/* Area chart — last 7 days */}
          <div className={layoutStyles.analyticsChartBlock}>
            <p className={layoutStyles.analyticsChartLabel}>Last 7 days</p>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart
                data={dashboard.revenueByDay}
                margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="analyticsGradient" x1="0" y1="0" x2="0" y2="1">
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
                  fill="url(#analyticsGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Bar chart — by category */}
          <div className={layoutStyles.analyticsChartBlock}>
            <p className={layoutStyles.analyticsChartLabel}>By category</p>
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
                <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={24} label={false}>
                  {dashboard.revenueByCategory.map((_, index) => (
                    <Cell key={index} fill={BAR_COLORS[index % BAR_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      {/* Recent activity — full width, visible on all screen sizes */}
      <section className={`${layoutStyles.panel} ${layoutStyles.homeDesktopOnly}`}>
        <div className={layoutStyles.panelHead}>
          <p className={layoutStyles.panelTitle}>Recent activity</p>
          <Link href="/admin/disputes" className={layoutStyles.smallBtn}>View all</Link>
        </div>
        <div className={layoutStyles.table}>
          <div className={layoutStyles.rowHead}>
            <span>Date</span>
            <span>Type</span>
            <span>Status</span>
          </div>
          {dashboard.recentActivity.map((item) => (
            <div className={layoutStyles.row} key={item.id}>
              <span>{item.date}</span>
              <span>{item.type}</span>
              <span className={layoutStyles.badge}>{item.status}</span>
            </div>
          ))}
        </div>
      </section>

    </div>
  )
}