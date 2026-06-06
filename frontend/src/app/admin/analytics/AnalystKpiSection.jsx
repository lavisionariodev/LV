import layoutStyles from '../admin.module.css'
import analyticsStyles from './analytics.module.css'
import { formatCount, formatPHP } from '@/shared/utils'
import { TbChartLine, TbCoins, TbShoppingCart, TbTrendingUp, TbUsers } from 'react-icons/tb'

const EMPTY_SUMMARY = {
  totalPaidOrders: 0,
  bookingsThisMonth: 0,
  revenueThisMonth: 0,
  newCustomersThisMonth: 0,
  bookingGrowthRate: { text: '—', up: true },
}

/**
 * @param {{ analystSummary?: typeof EMPTY_SUMMARY }} props
 */
export default function AnalystKpiSection({ analystSummary = EMPTY_SUMMARY }) {
  const growth = analystSummary.bookingGrowthRate ?? { text: '—', up: true }
  const growthClass = growth.up
    ? analyticsStyles.kpiDeltaPositive
    : analyticsStyles.kpiDeltaNegative

  const cards = [
    {
      key: 'total',
      label: 'Total paid orders',
      value: formatCount(analystSummary.totalPaidOrders ?? 0, { desktop: true }),
      hint: 'All time',
      icon: TbShoppingCart,
    },
    {
      key: 'bookings',
      label: 'Bookings this month',
      value: formatCount(analystSummary.bookingsThisMonth ?? 0, { desktop: true }),
      hint: 'Current UTC month',
      icon: TbChartLine,
    },
    {
      key: 'revenue',
      label: 'Revenue this month',
      value: formatPHP(analystSummary.revenueThisMonth ?? 0),
      hint: 'Paid order subtotals',
      icon: TbCoins,
    },
    {
      key: 'customers',
      label: 'New customers',
      value: formatCount(analystSummary.newCustomersThisMonth ?? 0, { desktop: true }),
      hint: 'First paid order this month',
      icon: TbUsers,
    },
    {
      key: 'growth',
      label: 'Booking growth',
      value: growth.text,
      hint: 'vs previous month',
      icon: TbTrendingUp,
      valueClass: growthClass,
    },
  ]

  return (
    <section className={analyticsStyles.analyticsStatsGridFive} aria-label="Analyst KPIs">
      {cards.map((card) => {
        const Icon = card.icon
        return (
          <article key={card.key} className={layoutStyles.statCard}>
            <div className={layoutStyles.statCardTop}>
              <p className={layoutStyles.statLabel}>{card.label}</p>
            </div>
            <div className={layoutStyles.statCardBody}>
              <span className={layoutStyles.statCardIcon} aria-hidden>
                <Icon />
              </span>
              <div className={layoutStyles.statCardText}>
                <p className={`${layoutStyles.statValue}${card.valueClass ? ` ${card.valueClass}` : ''}`}>
                  {card.value}
                </p>
                <p className={layoutStyles.statHint}>{card.hint}</p>
              </div>
            </div>
          </article>
        )
      })}
    </section>
  )
}
