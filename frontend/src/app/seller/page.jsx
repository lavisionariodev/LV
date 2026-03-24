'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import styles from './seller.module.css'

const metricCards = [
  {
    label: 'Total Revenue',
    value: '$124,580',
    trend: '+12.4%',
    trendUp: true,
  },
  {
    label: 'Orders',
    value: '1,284',
    trend: '+8.2%',
    trendUp: true,
  },
  {
    label: 'Pending Orders',
    value: '26',
    trend: '-3.1%',
    trendUp: false,
  },
  {
    label: 'New Customers',
    value: '312',
    trend: '+5.9%',
    trendUp: true,
  },
]

const chartSeries = {
  daily: [14, 20, 18, 23, 27, 24, 31],
  weekly: [92, 104, 88, 116, 132, 125, 143],
  monthly: [342, 388, 371, 410, 436, 452, 479],
}

const chartLabels = {
  daily: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
  weekly: ['W1', 'W2', 'W3', 'W4', 'W5', 'W6', 'W7'],
  monthly: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'],
}

const recentOrders = [
  { id: 'LV-2024-0847', customer: 'Maria Santos', status: 'Pending', total: 'PHP 185,000', tab: 'pending' },
  {
    id: 'LV-2024-0846',
    customer: 'Juan Dela Cruz',
    status: 'Processing',
    total: 'PHP 95,000',
    tab: 'confirmed',
  },
  {
    id: 'LV-2024-0844',
    customer: 'Carlos Mendoza',
    status: 'Completed',
    total: 'PHP 195,000',
    tab: 'completed',
  },
  { id: 'LV-2024-0845', customer: 'Ana Reyes', status: 'Pending', total: 'PHP 120,000', tab: 'pending' },
  { id: 'LV-2024-0843', customer: 'Luis Ramirez', status: 'On Hold', total: 'PHP 88,000', tab: 'refunded' },
]

const bestSellingProducts = [
  { name: 'Signature Facial Set', units: 142, revenue: '$9,940' },
  { name: 'Hair & Makeup Bundle', units: 118, revenue: '$8,260' },
  { name: 'Premium Nail Care Kit', units: 96, revenue: '$5,760' },
  { name: 'Spa Relax Package', units: 78, revenue: '$7,020' },
]

const initialAlerts = [
  { id: 'ALT-1', type: 'Low Stock', message: 'Premium Nail Care Kit is below 10 units.' },
  { id: 'ALT-2', type: 'New Order', message: 'A new high-value order ORD-9216 needs review.' },
  { id: 'ALT-3', type: 'Customer Concern', message: 'A customer requested urgent delivery support.' },
]

const quickActions = [
  { label: 'Add Product', href: '/seller/products/catalog', icon: 'add' },
  { label: 'Manage Orders', href: '/seller/orders', icon: 'orders' },
  { label: 'Create Promotion', href: '/seller/marketing/campaign', icon: 'promo' },
  { label: 'View Messages', href: '/seller/notifications', icon: 'messages' },
]

function getStatusClass(status) {
  if (status === 'Completed') return styles.statusCompleted
  if (status === 'Processing') return styles.statusProcessing
  if (status === 'On Hold') return styles.statusHold
  return styles.statusPending
}

function formatCompactValue(value) {
  if (value >= 1000) return `${(value / 1000).toFixed(1)}k`
  return `${value}`
}

function QuickActionIcon({ type }) {
  if (type === 'add') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 5v14M5 12h14" />
      </svg>
    )
  }

  if (type === 'orders') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M7 5h10M7 10h10M7 15h7M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" />
      </svg>
    )
  }

  if (type === 'promo') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M20 12l-8 8-8-8 8-8 8 8zM12 8.5h.01" />
      </svg>
    )
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 5h16v10H7l-3 4V5z" />
    </svg>
  )
}

export default function SellerDashboardPage() {
  const { user } = useAuth()
  const displayEmail = user?.email || ''
  const [chartFilter, setChartFilter] = useState('weekly')
  const [alerts, setAlerts] = useState(initialAlerts)
  const [activeAlert, setActiveAlert] = useState(null)
  const [activeDetailAlert, setActiveDetailAlert] = useState(null)
  const [resolveNote, setResolveNote] = useState('')

  const maxChartValue = useMemo(() => {
    const values = chartSeries[chartFilter]
    return Math.max(...values, 1)
  }, [chartFilter])
  const yAxisTicks = useMemo(() => {
    return [1, 0.75, 0.5, 0.25, 0].map((step) => Math.round(maxChartValue * step))
  }, [maxChartValue])

  const handleOpenResolve = (alert) => {
    setActiveAlert(alert)
    setResolveNote('')
  }

  const handleResolve = () => {
    if (!activeAlert) return
    setAlerts((prev) => prev.filter((item) => item.id !== activeAlert.id))
    setActiveAlert(null)
    setResolveNote('')
  }

  return (
    <div className={`${styles.pageWrap} ${styles.dashboardPage}`}>
      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <div>
            <p className={styles.kicker}>Seller Dashboard</p>
            <h1 className={styles.title}>Performance at a glance</h1>
            <p className={styles.subtitle}>
              Track revenue, orders, customer activity, and alerts in one clean workspace.
            </p>
            {displayEmail && (
              <p className={styles.signedIn}>
                Signed in as <strong>{displayEmail}</strong>
              </p>
            )}
          </div>
        </div>
      </section>

      <section className={styles.metricsGrid}>
        {metricCards.map((card) => (
          <article key={card.label} className={styles.metricCard}>
            <p className={styles.metricLabel}>{card.label}</p>
            <p className={styles.metricValue}>{card.value}</p>
            <p className={`${styles.metricTrend} ${card.trendUp ? styles.trendUp : styles.trendDown}`}>
              <span aria-hidden>{card.trendUp ? '▲' : '▼'}</span> {card.trend}
            </p>
          </article>
        ))}
      </section>

      <section className={styles.panel}>
        <div className={styles.panelHeader}>
          <h2 className={styles.sectionTitle}>Quick Actions</h2>
        </div>
        <div className={styles.quickActionsGrid}>
          {quickActions.map((action) => (
            <Link key={action.href} href={action.href} className={styles.actionButton}>
              <span className={styles.actionIconWrap}>
                <QuickActionIcon type={action.icon} />
              </span>
              <span className={styles.actionLabel}>{action.label}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className={styles.panel}>
        <div className={styles.panelHeader}>
          <div>
            <h2 className={styles.sectionTitle}>Sales Overview</h2>
            <p className={styles.sectionSubtitle}>Compare your sales performance by period.</p>
          </div>
          <div className={styles.filterRow}>
            {['daily', 'weekly', 'monthly'].map((filter) => (
              <button
                key={filter}
                type="button"
                className={`${styles.filterButton} ${
                  chartFilter === filter ? styles.filterButtonActive : ''
                }`}
                onClick={() => setChartFilter(filter)}
              >
                {filter[0].toUpperCase() + filter.slice(1)}
              </button>
            ))}
          </div>
        </div>
        <div className={styles.chartArea}>
          <div className={styles.yAxis}>
            {yAxisTicks.map((tickValue) => (
              <span key={tickValue} className={styles.yAxisLabel}>
                {formatCompactValue(tickValue)}
              </span>
            ))}
          </div>
          <div className={styles.chartBars}>
            {chartSeries[chartFilter].map((value, idx) => (
              <div key={`${chartFilter}-${idx}`} className={styles.chartBarWrap}>
                <div
                  className={styles.chartBar}
                  style={{ height: `${Math.max((value / maxChartValue) * 100, 6)}%` }}
                  aria-label={`Sales value ${value}`}
                />
                <span className={styles.chartLabel}>{chartLabels[chartFilter][idx]}</span>
              </div>
            ))}
          </div>
          <div className={styles.xAxisTitle}>Time Period</div>
          <div className={styles.yAxisTitle}>Sales</div>
        </div>
      </section>

      <section className={styles.twoColumnGrid}>
        <article className={styles.panel}>
          <div className={styles.panelHeader}>
            <h2 className={styles.sectionTitle}>Recent Orders</h2>
          </div>
          <div className={styles.ordersList}>
            {recentOrders.map((order) => (
              <div key={order.id} className={styles.orderItem}>
                <div className={styles.orderMain}>
                  <p className={styles.orderId}>{order.id}</p>
                  <p className={styles.orderCustomer}>{order.customer}</p>
                </div>
                <div className={styles.orderMeta}>
                  <span className={`${styles.orderStatus} ${getStatusClass(order.status)}`}>
                    {order.status}
                  </span>
                  <p className={styles.orderTotal}>{order.total}</p>
                </div>
                <div className={styles.orderActions}>
                  <Link
                    href={`/seller/orders?tab=${order.tab}&orderId=${order.id}&action=view`}
                    className={styles.ghostButton}
                  >
                    View Details
                  </Link>
                  <Link
                    href={`/seller/orders?tab=${order.tab}&orderId=${order.id}&action=process`}
                    className={styles.primaryButton}
                  >
                    Process Order
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className={styles.panel}>
          <div className={styles.panelHeader}>
            <h2 className={styles.sectionTitle}>Best-Selling Products</h2>
          </div>
          <div className={styles.productList}>
            {bestSellingProducts.map((product) => (
              <div key={product.name} className={styles.productItem}>
                <p className={styles.productName}>{product.name}</p>
                <div className={styles.productMeta}>
                  <span>{product.units} sold</span>
                  <strong>{product.revenue}</strong>
                </div>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className={styles.panel}>
        <div className={styles.panelHeader}>
          <h2 className={styles.sectionTitle}>Notifications & Alerts</h2>
        </div>
        <div className={styles.alertList}>
          {alerts.length === 0 ? (
            <p className={styles.emptyState}>All alerts have been resolved.</p>
          ) : (
            alerts.map((alert) => (
              <div key={alert.id} className={styles.alertItem}>
                <div>
                  <p className={styles.alertType}>{alert.type}</p>
                  <p className={styles.alertMessage}>{alert.message}</p>
                </div>
                <div className={styles.alertActions}>
                  <button
                    type="button"
                    className={styles.ghostButton}
                    onClick={() => setActiveDetailAlert(alert)}
                  >
                    View Details
                  </button>
                  <button
                    type="button"
                    className={styles.primaryButton}
                    onClick={() => handleOpenResolve(alert)}
                  >
                    Resolve
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {activeAlert && (
        <div className={styles.modalOverlay} role="dialog" aria-modal="true" aria-labelledby="resolve-title">
          <div className={styles.modalCard}>
            <h3 id="resolve-title" className={styles.modalTitle}>
              Resolve Alert
            </h3>
            <p className={styles.modalSubtitle}>{activeAlert.message}</p>
            <label htmlFor="resolve-note" className={styles.modalLabel}>
              Resolution feedback
            </label>
            <textarea
              id="resolve-note"
              className={styles.modalInput}
              value={resolveNote}
              onChange={(event) => setResolveNote(event.target.value)}
              placeholder="Add completion notes for your records..."
            />
            <div className={styles.modalActions}>
              <button type="button" className={styles.ghostButton} onClick={() => setActiveAlert(null)}>
                Cancel
              </button>
              <button type="button" className={styles.primaryButton} onClick={handleResolve}>
                Mark as Resolved
              </button>
            </div>
          </div>
        </div>
      )}

      {activeDetailAlert && (
        <div className={styles.modalOverlay} role="dialog" aria-modal="true" aria-labelledby="alert-details-title">
          <div className={styles.modalCard}>
            <h3 id="alert-details-title" className={styles.modalTitle}>
              {activeDetailAlert.type}
            </h3>
            <p className={styles.modalSubtitle}>{activeDetailAlert.message}</p>
            <div className={styles.alertDetailGrid}>
              <div className={styles.alertDetailItem}>
                <span className={styles.alertDetailLabel}>Alert ID</span>
                <span className={styles.alertDetailValue}>{activeDetailAlert.id}</span>
              </div>
              <div className={styles.alertDetailItem}>
                <span className={styles.alertDetailLabel}>Priority</span>
                <span className={styles.alertDetailValue}>High</span>
              </div>
              <div className={styles.alertDetailItem}>
                <span className={styles.alertDetailLabel}>Suggested action</span>
                <span className={styles.alertDetailValue}>
                  Review order or stock details and follow up with the affected customer.
                </span>
              </div>
            </div>
            <div className={styles.modalActions}>
              <button type="button" className={styles.ghostButton} onClick={() => setActiveDetailAlert(null)}>
                Close
              </button>
              <button
                type="button"
                className={styles.primaryButton}
                onClick={() => {
                  setActiveDetailAlert(null)
                  handleOpenResolve(activeDetailAlert)
                }}
              >
                Resolve This Alert
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
