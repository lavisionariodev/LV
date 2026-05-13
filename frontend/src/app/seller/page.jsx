'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import styles from './seller.module.css'
import { useSellerAnalyticsData } from '@/lib/seller/useSellerAnalyticsData'
import {
  buildSmartAlerts,
  newBuyersPreviousMonthCount,
  newBuyersThisMonthCount,
  orderStatusLabel,
  orderSubtotal,
  orderTabForUrl,
  ordersCountLast30Days,
  ordersCountPrevious30Days,
  paidOrdersLast30Days,
  paidOrdersPrevious30Days,
  paidRevenueByLastNDays,
  paidRevenueByLastNMonths,
  paidRevenueByLastNWeeks,
  paidRevenueLast7DaysTotal,
  paidRevenuePrevious7DaysTotal,
  pendingFulfillmentCount,
  percentChange,
  topPackagesByPaidRevenue,
  totalPaidRevenueAllTime,
  fulfillmentStatus,
} from '@/lib/seller/sellerOrderAnalytics'

const quickActions = [
  { label: 'Add New Listing', href: '/seller/products/new-listing', icon: 'add' },
  { label: 'Manage Orders', href: '/seller/orders', icon: 'orders' },
  { label: 'Create Promotion', href: '/seller/marketing/campaign', icon: 'promo' },
  { label: 'View Messages', href: '/seller/notifications', icon: 'messages' },
]

function formatPhp(n) {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n)
}

function getStatusClassFromOrder(row) {
  const rs = String(row.refund_status || '').toLowerCase()
  if (rs === 'requested' || rs === 'processing') return styles.statusHold
  const f = fulfillmentStatus(row)
  if (f === 'completed') return styles.statusCompleted
  if (f === 'confirmed' || f === 'in_progress') return styles.statusProcessing
  if (f === 'cancelled') return styles.statusHold
  return styles.statusPending
}

function formatCompactValue(value) {
  if (value >= 1000) return `${(value / 1000).toFixed(1)}k`
  return `${Math.round(value)}`
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

function weekdayShort(ymd) {
  const [y, m, d] = ymd.split('-').map((x) => Number(x))
  if (!y || !m || !d) return ''
  const dt = new Date(y, m - 1, d)
  return dt.toLocaleDateString('en-PH', { weekday: 'short' })
}

function SellerDashboardSkeleton() {
  const chartHeights = [44, 62, 38, 55, 48, 70, 52]
  return (
    <div
      className={`${styles.pageWrap} ${styles.dashboardPage}`}
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label="Loading seller dashboard"
    >
      <div className={styles.sellerDashSkWrap}>
        <section className={styles.hero}>
          <div className={styles.heroInner}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }} aria-hidden>
              <span className={`${styles.sellerSkBarInverse} ${styles.sellerDashSkHeroLineSm}`} />
              <span className={`${styles.sellerSkBarInverse} ${styles.sellerDashSkHeroLineMd}`} />
              <span className={`${styles.sellerSkBarInverse} ${styles.sellerDashSkHeroLineLg}`} />
            </div>
          </div>
        </section>

        <section className={styles.sellerDashSkMetrics} aria-hidden>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className={styles.sellerDashSkMetric}>
              <span className={`${styles.sellerSkBar} ${styles.sellerDashSkMetricLineA}`} />
              <span className={`${styles.sellerSkBar} ${styles.sellerDashSkMetricLineB}`} />
              <span className={`${styles.sellerSkBar} ${styles.sellerDashSkMetricLineC}`} />
            </div>
          ))}
        </section>

        <section className={styles.panel}>
          <div className={styles.sellerDashSkPanel} aria-hidden>
            <span className={`${styles.sellerSkBar} ${styles.sellerDashSkPanelTitle}`} />
            <div className={styles.sellerDashSkQuickGrid}>
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className={styles.sellerDashSkQuickTile}>
                  <span className={`${styles.sellerSkBar} ${styles.sellerDashSkQuickIcon}`} />
                  <span className={`${styles.sellerSkBar} ${styles.sellerDashSkQuickLabel}`} />
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className={styles.panel}>
          <div className={styles.sellerDashSkPanel} aria-hidden>
            <span className={`${styles.sellerSkBar} ${styles.sellerDashSkPanelTitle}`} style={{ width: '48%' }} />
            <div className={styles.sellerDashSkChart}>
              <div className={styles.sellerDashSkChartBars}>
                {chartHeights.map((h, idx) => (
                  <span
                    key={idx}
                    className={`${styles.sellerSkBar} ${styles.sellerDashSkBar}`}
                    style={{ height: `${h}%` }}
                  />
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className={styles.twoColumnGrid}>
          {[0, 1].map((col) => (
            <article key={col} className={styles.panel}>
              <div className={styles.sellerDashSkPanel} style={{ minHeight: 200 }} aria-hidden>
                <span className={`${styles.sellerSkBar} ${styles.sellerDashSkPanelTitle}`} />
                <div className={styles.sellerDashSkList}>
                  {[0, 1, 2, 3].map((row) => (
                    <div key={row} className={styles.sellerDashSkListRow}>
                      <span className={styles.sellerSkBar} style={{ height: 12, width: '42%' }} />
                      <span className={styles.sellerSkBar} style={{ height: 12, width: '22%' }} />
                    </div>
                  ))}
                </div>
              </div>
            </article>
          ))}
        </section>

        <section className={styles.panel}>
          <div className={styles.sellerDashSkPanel} style={{ minHeight: 140 }} aria-hidden>
            <span className={`${styles.sellerSkBar} ${styles.sellerDashSkPanelTitle}`} />
            <div className={styles.sellerDashSkList}>
              {[0, 1, 2].map((row) => (
                <div key={row} className={styles.sellerDashSkAlertRow}>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <span className={styles.sellerSkBar} style={{ height: 11, width: '28%' }} />
                    <span className={styles.sellerSkBar} style={{ height: 12, width: '92%' }} />
                  </div>
                  <span className={styles.sellerSkBar} style={{ height: 32, width: 72, borderRadius: 8 }} />
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}

export default function SellerDashboardPage() {
  const { user } = useAuth()
  const { orders, listings, loading, error } = useSellerAnalyticsData()
  const displayEmail = user?.email || ''
  const [chartFilter, setChartFilter] = useState('weekly')
  const [dismissedAlertIds, setDismissedAlertIds] = useState(() => new Set())
  const [dashboardAlertRows, setDashboardAlertRows] = useState([])
  const [activeAlert, setActiveAlert] = useState(null)
  const [activeDetailAlert, setActiveDetailAlert] = useState(null)
  const [resolveNote, setResolveNote] = useState('')

  const rawAlerts = useMemo(() => buildSmartAlerts(orders, listings).slice(0, 5), [orders, listings])

  const alertNotificationById = useMemo(() => {
    const map = new Map()
    for (const row of dashboardAlertRows) {
      const alertId = row?.metadata?.alertId
      if (alertId) map.set(String(alertId), row)
    }
    return map
  }, [dashboardAlertRows])

  const alerts = useMemo(() => {
    return rawAlerts.filter((a) => {
      const row = alertNotificationById.get(a.id)
      return !dismissedAlertIds.has(a.id) && !row?.resolved_at && !row?.resolvedAt
    })
  }, [rawAlerts, dismissedAlertIds, alertNotificationById])

  useEffect(() => {
    if (loading || error || rawAlerts.length === 0) return
    let cancelled = false
    async function syncAlerts() {
      try {
        const res = await fetch('/api/seller/dashboard-alerts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ alerts: rawAlerts }),
        })
        const body = await res.json().catch(() => null)
        if (!cancelled && res.ok) {
          setDashboardAlertRows(Array.isArray(body?.notifications) ? body.notifications : [])
        }
      } catch {
        // Dashboard alerts still render locally if notification sync is temporarily unavailable.
      }
    }
    syncAlerts()
    return () => {
      cancelled = true
    }
  }, [loading, error, rawAlerts])

  const metricCards = useMemo(() => {
    const totalRev = totalPaidRevenueAllTime(orders)
    const rev30 = paidOrdersLast30Days(orders).reduce((s, o) => s + orderSubtotal(o), 0)
    const revPrev30 = paidOrdersPrevious30Days(orders).reduce((s, o) => s + orderSubtotal(o), 0)
    const revTrend = percentChange(rev30, revPrev30)

    const ord30 = ordersCountLast30Days(orders)
    const ordPrev30 = ordersCountPrevious30Days(orders)
    const ordTrend = percentChange(ord30, ordPrev30)

    const pending = pendingFulfillmentCount(orders)
    const newThis = newBuyersThisMonthCount(orders)
    const newPrev = newBuyersPreviousMonthCount(orders)
    const newTrend = percentChange(newThis, newPrev)

    return [
      {
        label: 'Total revenue (paid)',
        value: formatPhp(totalRev),
        trend: revTrend.text,
        trendUp: revTrend.up,
      },
      {
        label: 'Orders (last 30 days)',
        value: `${ord30}`,
        trend: ordTrend.text,
        trendUp: ordTrend.up,
      },
      {
        label: 'Pending confirmation',
        value: `${pending}`,
        trend: null,
        trendUp: true,
      },
      {
        label: 'New families (this month)',
        value: `${newThis}`,
        trend: newTrend.text,
        trendUp: newTrend.up,
      },
    ]
  }, [orders])

  const chartSeries = useMemo(() => {
    const daily = paidRevenueByLastNDays(orders, 7).map((x) => x.total)
    const weekly = paidRevenueByLastNWeeks(orders, 7).map((x) => x.total)
    const monthly = paidRevenueByLastNMonths(orders, 7).map((x) => x.total)
    return { daily, weekly, monthly }
  }, [orders])

  const chartLabels = useMemo(() => {
    const keys = paidRevenueByLastNDays(orders, 7).map((x) => x.date)
    const daily = keys.map((k) => weekdayShort(k))
    const weekly = paidRevenueByLastNWeeks(orders, 7).map((x) => x.label)
    const monthly = paidRevenueByLastNMonths(orders, 7).map((x) => x.label)
    return { daily, weekly, monthly }
  }, [orders])

  const maxChartValue = useMemo(() => {
    const values = chartSeries[chartFilter]
    return Math.max(...values, 1)
  }, [chartFilter, chartSeries])

  const yAxisTicks = useMemo(() => {
    const raw = [1, 0.75, 0.5, 0.25, 0].map((step) => Math.round(maxChartValue * step))
    const out = []
    const seen = new Set()
    for (const v of raw) {
      if (!seen.has(v)) {
        seen.add(v)
        out.push(v)
      }
    }
    return out
  }, [maxChartValue])

  const recentOrders = useMemo(() => {
    return [...orders].slice(0, 5).map((o) => ({
      id: o.id,
      displayId: o.order_number || String(o.id).slice(0, 8),
      customer: o.contact_name?.trim() || 'Buyer',
      status: orderStatusLabel(o),
      total: formatPhp(orderSubtotal(o)),
      tab: orderTabForUrl(o),
      statusClass: getStatusClassFromOrder(o),
    }))
  }, [orders])

  const bestSellingProducts = useMemo(() => {
    return topPackagesByPaidRevenue(orders, 4).map((p) => ({
      name: p.name,
      units: p.units,
      revenue: formatPhp(p.revenue),
    }))
  }, [orders])

  const handleOpenResolve = (alert) => {
    setActiveAlert(alert)
    setResolveNote('')
  }

  const handleResolve = async () => {
    if (!activeAlert) return
    const row = alertNotificationById.get(activeAlert.id)
    if (row?.id) {
      const res = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: row.id, resolve: true, resolutionNote: resolveNote }),
      })
      if (!res.ok) return
      const nowIso = new Date().toISOString()
      setDashboardAlertRows((prev) =>
        prev.map((r) =>
          r.id === row.id
            ? {
                ...r,
                read_at: r.read_at || nowIso,
                resolved_at: nowIso,
                metadata: {
                  ...(r.metadata || {}),
                  ...(resolveNote.trim()
                    ? { resolutionNote: resolveNote.trim(), resolutionNoteAt: nowIso }
                    : {}),
                },
              }
            : r,
        ),
      )
    }
    setDismissedAlertIds((prev) => new Set([...prev, activeAlert.id]))
    setActiveAlert(null)
    setResolveNote('')
  }

  const rev7 = paidRevenueLast7DaysTotal(orders)
  const rev7prev = paidRevenuePrevious7DaysTotal(orders)
  const rev7Hint = percentChange(rev7, rev7prev)

  if (loading && !error) {
    return <SellerDashboardSkeleton />
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
            {error ? <p className={styles.signedIn}>{error}</p> : null}
          </div>
        </div>
      </section>

      <section className={styles.metricsGrid}>
        {metricCards.map((card) => (
          <article key={card.label} className={styles.metricCard}>
            <p className={styles.metricLabel}>{card.label}</p>
            <p className={styles.metricValue}>{card.value}</p>
            {card.trend != null ? (
              <p className={`${styles.metricTrend} ${card.trendUp ? styles.trendUp : styles.trendDown}`}>
                <span aria-hidden>{card.trendUp ? '▲' : '▼'}</span> {card.trend}
              </p>
            ) : (
              <p className={styles.metricTrend} style={{ opacity: 0.65 }}>
                Paid bookings awaiting confirmation
              </p>
            )}
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
            <p className={styles.sectionSubtitle}>
              Paid booking value by period (PHP). Last 7 days vs prior week: {rev7Hint.text}.
            </p>
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
          <div className={styles.chartYAxisTitleWrap}>
            <span className={styles.yAxisTitle}>Paid revenue (PHP)</span>
          </div>
          <div className={styles.yAxis}>
            {yAxisTicks.map((tickValue, tickIdx) => (
              <span key={`${chartFilter}-y-${tickIdx}`} className={styles.yAxisLabel}>
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
                  aria-label={`Paid revenue ${formatPhp(value)}`}
                />
                <span className={styles.chartLabel}>{chartLabels[chartFilter][idx]}</span>
              </div>
            ))}
          </div>
          <div className={styles.xAxisTitle}>Time Period</div>
        </div>
      </section>

      <section className={styles.twoColumnGrid}>
        <article className={styles.panel}>
          <div className={styles.panelHeader}>
            <h2 className={styles.sectionTitle}>Recent Orders</h2>
          </div>
          <div className={styles.ordersList}>
            {recentOrders.length === 0 && !loading ? (
              <p className={styles.emptyState}>No orders yet.</p>
            ) : (
              recentOrders.map((order) => (
                <div key={order.id} className={styles.orderItem}>
                  <div className={styles.orderMain}>
                    <p className={styles.orderId}>{order.displayId}</p>
                    <p className={styles.orderCustomer}>{order.customer}</p>
                  </div>
                  <div className={styles.orderMeta}>
                    <span className={`${styles.orderStatus} ${order.statusClass}`}>
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
              ))
            )}
          </div>
        </article>

        <article className={styles.panel}>
          <div className={styles.panelHeader}>
            <h2 className={styles.sectionTitle}>Best-Selling Products</h2>
          </div>
          <div className={styles.productList}>
            {bestSellingProducts.length === 0 && !loading ? (
              <p className={styles.emptyState}>No paid bookings to rank yet.</p>
            ) : (
              bestSellingProducts.map((product) => (
                <div key={product.name} className={styles.productItem}>
                  <p className={styles.productName}>{product.name}</p>
                  <div className={styles.productMeta}>
                    <span>{product.units} units (paid)</span>
                    <strong>{product.revenue}</strong>
                  </div>
                </div>
              ))
            )}
          </div>
        </article>
      </section>

      <section className={styles.panel}>
        <div className={styles.panelHeader}>
          <h2 className={styles.sectionTitle}>Notifications & Alerts</h2>
        </div>
        <div className={styles.alertList}>
          {alerts.length === 0 ? (
            <p className={styles.emptyState}>No actionable alerts right now.</p>
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
                <span className={styles.alertDetailValue}>
                  {activeDetailAlert.priority === 'high' ? 'High' : activeDetailAlert.priority === 'medium' ? 'Medium' : 'Standard'}
                </span>
              </div>
              <div className={styles.alertDetailItem}>
                <span className={styles.alertDetailLabel}>Suggested action</span>
                <span className={styles.alertDetailValue}>
                  Follow the linked workflow in Orders or Products, then mark this reminder as resolved.
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
