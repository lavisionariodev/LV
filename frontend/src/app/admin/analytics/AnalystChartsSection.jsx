'use client'

import { useMemo } from 'react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import layoutStyles from '../admin.module.css'
import analyticsStyles from './analytics.module.css'
import {
  CHART_ACCENT,
  CHART_BAR_COLORS,
  rechartsAxisTick,
  rechartsGridStroke,
  rechartsTooltipStyle,
} from './chartTheme'

function ChartEmpty({ message }) {
  return (
    <div className={analyticsStyles.chartEmpty} role="status">
      {message}
    </div>
  )
}

/**
 * @param {{ monthlyBookings?: { label: string, count: number }[], monthlyRevenue?: { label: string, amount: number }[], revenueMix?: { name: string, value: number }[] }} props
 */
export default function AnalystChartsSection({
  monthlyBookings = [],
  monthlyRevenue = [],
  revenueMix = [],
}) {
  const revenueChartData = useMemo(
    () =>
      monthlyRevenue.map((row) => ({
        label: row.label,
        total: row.amount,
      })),
    [monthlyRevenue],
  )

  const bookingsTotal = monthlyBookings.reduce((s, r) => s + (Number(r.count) || 0), 0)
  const revenueTotal = revenueChartData.reduce((s, r) => s + (Number(r.total) || 0), 0)
  const mixTotal = revenueMix.reduce((s, r) => s + (Number(r.value) || 0), 0)

  const pieData = useMemo(() => {
    if (mixTotal <= 0) return [{ name: '—', value: 1, isPlaceholder: true }]
    return revenueMix.filter((r) => r.value > 0)
  }, [revenueMix, mixTotal])

  return (
    <div className={analyticsStyles.analystChartsGrid}>
      <div className={layoutStyles.analyticsChartBlock}>
        <p className={layoutStyles.analyticsChartLabel}>Monthly bookings</p>
        <p className={layoutStyles.analyticsSubtitle} style={{ marginBottom: 12 }}>
          Paid orders · last 12 months · UTC
        </p>
        {bookingsTotal <= 0 ? (
          <ChartEmpty message="No paid bookings in the last 12 months." />
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={monthlyBookings} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={rechartsGridStroke} />
              <XAxis dataKey="label" tick={rechartsAxisTick} />
              <YAxis allowDecimals={false} tick={rechartsAxisTick} width={32} />
              <Tooltip
                formatter={(value) => [value, 'Bookings']}
                contentStyle={rechartsTooltipStyle}
              />
              <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={28}>
                {monthlyBookings.map((_, index) => (
                  <Cell key={index} fill={CHART_BAR_COLORS[index % CHART_BAR_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className={layoutStyles.analyticsChartBlock}>
        <p className={layoutStyles.analyticsChartLabel}>Revenue trend</p>
        <p className={layoutStyles.analyticsSubtitle} style={{ marginBottom: 12 }}>
          Paid order subtotals · last 12 months · UTC
        </p>
        {revenueTotal <= 0 ? (
          <ChartEmpty message="No paid revenue in the last 12 months." />
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={revenueChartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="analystRevenueGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={CHART_ACCENT} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={CHART_ACCENT} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={rechartsGridStroke} />
              <XAxis dataKey="label" tick={rechartsAxisTick} />
              <YAxis
                tickFormatter={(v) => `₱${(v / 1000).toFixed(0)}k`}
                tick={rechartsAxisTick}
                width={44}
              />
              <Tooltip
                formatter={(value) => [`₱ ${Number(value).toLocaleString()}`, 'Revenue']}
                contentStyle={rechartsTooltipStyle}
              />
              <Area
                type="monotone"
                dataKey="total"
                stroke={CHART_ACCENT}
                strokeWidth={2}
                fill="url(#analystRevenueGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className={`${layoutStyles.analyticsChartBlock} ${analyticsStyles.analystPieBlock}`}>
        <p className={layoutStyles.analyticsChartLabel}>Revenue mix by line item</p>
        <p className={layoutStyles.analyticsSubtitle} style={{ marginBottom: 12 }}>
          Top services · last 12 months
        </p>
        {mixTotal <= 0 ? (
          <ChartEmpty message="No line-item revenue in the last 12 months." />
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={pieData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={48}
                outerRadius={78}
                paddingAngle={2}
              >
                {pieData.map((entry, index) => (
                  <Cell
                    key={`${entry.name}-${index}`}
                    fill={
                      entry.isPlaceholder
                        ? '#e2e8f0'
                        : CHART_BAR_COLORS[index % CHART_BAR_COLORS.length]
                    }
                  />
                ))}
              </Pie>
              <Tooltip
                formatter={(value) => [`₱ ${Number(value).toLocaleString()}`, 'Revenue']}
                contentStyle={rechartsTooltipStyle}
              />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}
