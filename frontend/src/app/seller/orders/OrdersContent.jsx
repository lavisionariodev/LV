'use client'

import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import {
  TbSearch,
  TbX,
  TbEye,
  TbCheck,
  TbCircleX,
  TbEdit,
  TbChevronDown,
  TbReceipt,
  TbPackage,
  TbTools,
  TbTruck,
  TbCircleCheck,
  TbUser,
  TbPhone,
  TbMail,
  TbFileText,
  TbCurrencyDollar,
  TbPhoto,
} from 'react-icons/tb'
import styles from './orders.module.css'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase/client'
import { formatCount } from '@/shared/utils/formatCount'
import { useDebouncedEffect } from '@/shared/hooks'
import { readEnum, readString, replaceUrlQuery } from '@/lib/url/queryParams'

const ORDER_STATUSES = [
  { id: 'all', label: 'All Orders' },
  { id: 'pending', label: 'Pending' },
  { id: 'confirmed', label: 'Confirmed' },
  { id: 'in_progress', label: 'In Progress' },
  { id: 'completed', label: 'Completed' },
  { id: 'cancelled', label: 'Cancelled' },
  { id: 'refunded', label: 'Refunded' },
]

const TIMELINE_STEPS = [
  { id: 'received', label: 'Order Received', icon: TbPackage, description: 'Buyer placed the order and completed payment.' },
  { id: 'confirmed', label: 'Confirmed', icon: TbCheck, description: 'You confirmed the booking. Preparation can begin.' },
  { id: 'preparation', label: 'Preparation', icon: TbTools, description: 'Service is being prepared according to your request.' },
  { id: 'ongoing', label: 'Service Ongoing', icon: TbTruck, description: 'Service is in progress.' },
  { id: 'completed', label: 'Completed', icon: TbCircleCheck, description: 'Service has been completed.' },
]

function getStatusBadgeClass(status) {
  const map = {
    pending: styles.badgePending,
    confirmed: styles.badgeConfirmed,
    in_progress: styles.badgeInProgress,
    completed: styles.badgeCompleted,
    cancelled: styles.badgeCancelled,
    refunded: styles.badgeRefunded,
  }
  return map[status] || styles.badgeStatus
}

function formatPrice(n) {
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', minimumFractionDigits: 0 }).format(n)
}

function formatDate(s) {
  if (!s) return '—'
  return new Date(s + 'T00:00:00').toLocaleDateString('en-PH', { dateStyle: 'medium' })
}

function sellerPaymentBadge(paymentStatus) {
  const ps = String(paymentStatus ?? 'unpaid')
  if (ps === 'refund_pending')
    return { label: 'Refund pending', badgeClass: styles.badgePending }
  if (ps === 'refunded') return { label: 'Refunded', badgeClass: styles.badgeRefunded }
  if (ps === 'paid') return { label: 'Paid', badgeClass: styles.badgePaid }
  return { label: 'Pending', badgeClass: styles.badgePending }
}

/**
 * Token-based AND search across buyer-facing order fields (aligned with seller customers/products).
 */
function orderMatchesSearchQuery(order, rawQuery) {
  const trimmed = String(rawQuery ?? '').trim()
  if (!trimmed) return true
  const tokens = trimmed.toLowerCase().split(/\s+/).filter(Boolean)
  if (!tokens.length) return true

  const addOnText = Array.isArray(order.addOns) ? order.addOns.join(' ') : ''
  const priceFormatted = formatPrice(Number(order.totalPrice) || 0)
  const parts = [
    order.customerName,
    order.displayId,
    order.id,
    order.servicePackage,
    order.location,
    order.customerPhone,
    order.customerEmail,
    order.deceasedName,
    order.dateOfService,
    order.dateOfDeath,
    order.specialRequests,
    order.wakeDuration,
    order.burialLocation,
    addOnText,
    order.paymentStatus,
    order.paymentMethod,
    order.orderStatus,
    priceFormatted,
    String(order.totalPrice ?? ''),
  ]
  const hay = parts.map((x) => String(x ?? '').toLowerCase()).join(' ')
  return tokens.every((t) => hay.includes(t))
}

export default function OrdersContent({ initialTab, initialOrderId, initialAction }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { user, authLoading, isSeller } = useAuth()
  const allowedTabs = useMemo(() => ORDER_STATUSES.map((t) => t.id), [])
  /** Route-level default only (from path segments like /orders/pending). Do not derive from URL ?tab= here — that caused omitIf / defaultTab to flip when the URL changed and made params flicker. */
  const routeDefaultTab = initialTab && allowedTabs.includes(initialTab) ? initialTab : 'all'
  const [activeTab, setActiveTab] = useState(() =>
    readEnum(searchParams, 'tab', allowedTabs, routeDefaultTab),
  )
  const [searchQuery, setSearchQuery] = useState(() => readString(searchParams, 'q', ''))
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [orderForUpdateStatus, setOrderForUpdateStatus] = useState(null)
  const [showUpdateStatus, setShowUpdateStatus] = useState(false)
  const [orders, setOrders] = useState([])
  const [filterDropdownOpen, setFilterDropdownOpen] = useState(false)
  const [previewAttachment, setPreviewAttachment] = useState(null)
  const filterDropdownRef = useRef(null)

  const loadOrders = useCallback(async ({ signal } = {}) => {
    if (!user?.id || !isSeller) return
    const { data, error } = await supabase
      .from('orders')
      .select(
        'id,order_number,status,fulfillment_status,payment_status,subtotal,created_at,preferred_date,refund_status,refund_requested_at,contact_name,contact_email,contact_phone,notes,service_location,deceased_name,date_of_death,wake_duration_days,order_items(name,quantity)',
      )
      .eq('seller_user_id', user.id)
      .order('created_at', { ascending: false })
      .abortSignal?.(signal)

    if (signal?.aborted) return
    if (error) {
      setOrders([])
      return
    }

    const mapped = (data ?? []).map((o) => {
        const items = o.order_items ?? []
        const servicePackage =
          items.length === 1
            ? items[0].name
            : items.length > 1
              ? `${items.length} items`
              : 'Booking'

        const paymentStatus =
          o.payment_status ||
          (o.status === 'paid' ? 'paid' : o.status === 'failed' ? 'failed' : 'unpaid')

        const fulfillmentStatus = o.fulfillment_status || 'pending'

        const orderStatus =
          fulfillmentStatus === 'confirmed'
            ? 'confirmed'
            : fulfillmentStatus === 'in_progress'
              ? 'in_progress'
              : fulfillmentStatus === 'completed'
                ? 'completed'
                : fulfillmentStatus === 'cancelled'
                  ? 'cancelled'
                  : 'pending'

        const rs = o.refund_status ? String(o.refund_status) : ''
        const refundStage =
          rs === 'requested' || rs === 'processing'
            ? /** @type {'requested' | 'processing'} */ (rs)
            : null
        const refundRequested = Boolean(refundStage)
        const refundReason =
          refundStage === 'processing'
            ? 'Buyer cancelled before you confirmed this booking. Refund approved — mark completed once the buyer has received the refund (typically about 5–15 business days).'
            : refundStage === 'requested'
              ? 'Buyer cancelled before you confirmed this booking. Approve to start processing the refund, or decline to reopen the booking as paid.'
              : null

        return {
          id: o.id,
          displayId: o.order_number || o.id,
          customerName: o.contact_name || 'Buyer',
          servicePackage,
          dateOfService: (o.preferred_date || o.created_at || '').slice(0, 10),
          location: o.service_location || '—',
          totalPrice: Number(o.subtotal) || 0,
          paymentStatus,
          orderStatus,
          isUrgent: false,
          customerPhone: o.contact_phone || '—',
          customerEmail: o.contact_email || '—',
          deceasedName: o.deceased_name || null,
          dateOfDeath: o.date_of_death ? String(o.date_of_death) : null,
          religion: null,
          specialRequests: o.notes || null,
          addOns: items.map((it) => `${it.name} ×${it.quantity ?? 1}`),
          wakeDuration:
            typeof o.wake_duration_days === 'number'
              ? `${o.wake_duration_days} day${o.wake_duration_days === 1 ? '' : 's'}`
              : '—',
          burialLocation: o.service_location || '—',
          paymentMethod: 'PayMongo',
          refundRequested,
          refundStage,
          refundRequestedAt: o.refund_requested_at ? String(o.refund_requested_at) : null,
          refundReason,
          refundAttachments: [],
        }
      })

    setOrders(mapped)
  }, [user, isSeller])

  useEffect(() => {
    if (authLoading) return
    const controller = new AbortController()
    let cancelled = false
    queueMicrotask(() => {
      if (!cancelled) loadOrders({ signal: controller.signal })
    })

    // Keep payment status in sync after PayMongo webhooks update the DB.
    const onFocus = () => loadOrders({ signal: controller.signal })
    window.addEventListener('focus', onFocus)

    const interval = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        loadOrders({ signal: controller.signal })
      }
    }, 12_000)

    return () => {
      cancelled = true
      controller.abort()
      window.removeEventListener('focus', onFocus)
      window.clearInterval(interval)
    }
  }, [authLoading, loadOrders, isSeller])

  useEffect(() => {
    // Back-compat: if parent route supplies initialTab, respect it.
    if (initialTab && ORDER_STATUSES.some((t) => t.id === initialTab)) {
      queueMicrotask(() => setActiveTab(initialTab))
    }
  }, [initialTab])

  // Sync state <- URL (back/forward, shared links)
  useEffect(() => {
    const nextTab = readEnum(searchParams, 'tab', allowedTabs, routeDefaultTab)
    const nextQ = readString(searchParams, 'q', '')
    queueMicrotask(() => {
      setActiveTab((prev) => (nextTab !== prev ? nextTab : prev))
      setSearchQuery((prev) => (nextQ !== prev ? nextQ : prev))
    })
  }, [allowedTabs, routeDefaultTab, searchParams])

  // Sync URL <- state (debounce typing; keep tab in URL too).
  // omitIf uses routeDefaultTab (stable per route). Main /seller/orders must not pass URL-derived initialTab — that flipped omitIf whenever ?tab= was omitted and caused param flicker.
  useDebouncedEffect(() => {
    replaceUrlQuery(router, pathname, searchParams, {
      tab: { value: activeTab, omitIf: routeDefaultTab },
      q: searchQuery,
    })
  }, [activeTab, searchQuery, router, pathname, searchParams, routeDefaultTab], 300)

  useEffect(() => {
    if (!initialOrderId) return
    const matchedOrder = orders.find((order) => order.id === initialOrderId)
    if (!matchedOrder) return

    queueMicrotask(() => {
      setSelectedOrder(matchedOrder)
      if (initialAction === 'process') {
        setOrderForUpdateStatus(matchedOrder)
        setShowUpdateStatus(true)
      }
    })
  }, [initialAction, initialOrderId, orders])

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (filterDropdownRef.current && !filterDropdownRef.current.contains(e.target)) {
        setFilterDropdownOpen(false)
      }
    }
    if (filterDropdownOpen) {
      document.addEventListener('click', handleClickOutside)
      return () => document.removeEventListener('click', handleClickOutside)
    }
  }, [filterDropdownOpen])

  const filteredOrders = useMemo(() => {
    let list = [...orders]
    if (activeTab && activeTab !== 'all') {
      list = list.filter((o) => o.orderStatus === activeTab)
    }
    if (searchQuery.trim()) {
      list = list.filter((o) => orderMatchesSearchQuery(o, searchQuery))
    }
    return list
  }, [orders, activeTab, searchQuery])

  const refundRequests = useMemo(
    () => orders.filter((o) => o.refundRequested),
    [orders]
  )

  const handleAcceptOrder = async (order) => {
    try {
      const res = await fetch('/api/seller/orders/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: order.id }),
      })
      if (!res.ok) return
      await loadOrders()
      setSelectedOrder((prev) => (prev?.id === order.id ? { ...prev, orderStatus: 'confirmed' } : prev))
    } catch {
      // ignore UI update on network error
    }
  }

  const handleDeclineOrder = (order) => {
    handleUpdateStatus(order, 'cancelled')
  }

  const handleUpdateStatus = async (order, newStatus) => {
    try {
      // Only fulfillment statuses are persisted. "refunded" is currently UI-only.
      if (['pending', 'confirmed', 'in_progress', 'completed', 'cancelled'].includes(newStatus)) {
        const res = await fetch('/api/seller/orders/update-fulfillment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderId: order.id, fulfillment_status: newStatus }),
        })
        if (!res.ok) {
          const body = await res.json().catch(() => null)
          window.alert(typeof body?.error === 'string' ? body.error : 'Could not update order status.')
          return
        }
        await loadOrders()
      } else {
        setOrders((prev) => prev.map((o) => (o.id === order.id ? { ...o, orderStatus: newStatus } : o)))
      }

      setSelectedOrder((prev) => (prev?.id === order.id ? { ...prev, orderStatus: newStatus } : prev))
      setShowUpdateStatus(false)
      setOrderForUpdateStatus(null)
    } catch {
      // ignore
    }
  }

  const handleRefundDecision = async (order, decision) => {
    try {
      const res = await fetch('/api/seller/orders/refund', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: order.id, decision }),
      })
      const body = await res.json().catch(() => null)
      if (!res.ok) {
        window.alert(typeof body?.error === 'string' ? body.error : 'Could not update refund.')
        return
      }
      await loadOrders()
      setSelectedOrder(null)
    } catch {
      window.alert('Network error.')
    }
  }

  const getTimelineProgress = (order) => {
    const statusOrder = ['pending', 'confirmed', 'in_progress', 'completed']
    const idx = statusOrder.indexOf(order?.orderStatus)
    if (idx < 0) return { received: true, confirmed: false, preparation: false, ongoing: false, completed: false }
    return {
      received: true,
      confirmed: idx >= 1,
      preparation: idx >= 2,
      ongoing: idx >= 3,
      completed: idx >= 4,
    }
  }

  const STEP_TIMES = ['10:11 PM', '10:30 PM', '10:45 PM', '11:00 AM', '11:30 AM']
  const getStepTime = (stepIndex) => STEP_TIMES[stepIndex] ?? '—'

  const timelineProgress = selectedOrder ? getTimelineProgress(selectedOrder) : {}
  const selectedPaymentBadge = selectedOrder
    ? sellerPaymentBadge(selectedOrder.paymentStatus)
    : null

  return (
    <div className={styles.pageWrap}>
      <div className={styles.filtersRow}>
        <form
          className={styles.searchWrap}
          role="search"
          onSubmit={(e) => {
            e.preventDefault()
          }}
        >
          <TbSearch className={styles.searchIcon} size={18} aria-hidden />
          <input
            type="search"
            name="q"
            className={styles.searchBox}
            placeholder="Search name, order #, package, location, contact, notes…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Search orders"
            autoComplete="off"
            spellCheck={false}
          />
        </form>
        <div className={`${styles.filterDropdownWrap} ${filterDropdownOpen ? styles.filterDropdownOpen : ''}`} ref={filterDropdownRef}>
          <button
            type="button"
            className={styles.filterDropdownTrigger}
            onClick={() => setFilterDropdownOpen((o) => !o)}
            aria-haspopup="listbox"
            aria-expanded={filterDropdownOpen}
            aria-label="Filter by status"
          >
            <span className={styles.filterDropdownLabel}>
              {ORDER_STATUSES.find((t) => t.id === activeTab)?.label ?? 'All Orders'}
            </span>
            <TbChevronDown className={styles.filterDropdownChevron} size={18} aria-hidden />
          </button>
          {filterDropdownOpen && (
            <div
              className={styles.filterDropdownPanel}
              role="listbox"
              aria-label="Order status options"
            >
              {ORDER_STATUSES.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  role="option"
                  aria-selected={activeTab === tab.id}
                  className={`${styles.filterDropdownOption} ${activeTab === tab.id ? styles.filterDropdownOptionSelected : ''}`}
                  onClick={() => {
                    setActiveTab(tab.id)
                    setFilterDropdownOpen(false)
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Metric cards (stats strip) */}
      <div className={styles.statsStrip}>
        <div className={`${styles.statCard} ${styles.statCardTotal}`}>
          <div className={styles.statCardTitle}>Total orders</div>
          <div className={styles.statCardValue}>{formatCount(orders.length)}</div>
          <div className={styles.statCardDesc}>All time (sample data)</div>
        </div>
        <div className={`${styles.statCard} ${styles.statCardPending}`}>
          <div className={styles.statCardTitle}>Pending approvals</div>
          <div className={styles.statCardValue}>
            {formatCount(orders.filter((o) => o.orderStatus === 'pending').length)}
          </div>
          <div className={styles.statCardDesc}>Unpaid declines · paid awaits your confirmation</div>
        </div>
        <div className={`${styles.statCard} ${styles.statCardInProgress}`}>
          <div className={styles.statCardTitle}>In progress</div>
          <div className={styles.statCardValue}>
            {formatCount(orders.filter((o) => o.orderStatus === 'in_progress' || o.orderStatus === 'confirmed').length)}
          </div>
          <div className={styles.statCardDesc}>Preparation or service ongoing</div>
        </div>
        <div className={`${styles.statCard} ${styles.statCardCompleted}`}>
          <div className={styles.statCardTitle}>Completed (P)</div>
          <div className={styles.statCardValue}>
            {formatPrice(
              orders
                .filter((o) => o.orderStatus === 'completed')
                .reduce((sum, o) => sum + o.totalPrice, 0)
            )}
          </div>
          <div className={styles.statCardDesc}>Total from completed orders</div>
        </div>
      </div>

      {refundRequests.length > 0 && (
        <section className={styles.refundListSection}>
          <div className={styles.refundListHeader}>
            <h2 className={styles.refundListTitle}>Refund requests</h2>
            <span className={styles.refundListCount}>{formatCount(refundRequests.length)} pending</span>
          </div>
          <div className={styles.refundCards}>
            {refundRequests.map((order) => (
              <article key={order.id} className={styles.refundCard}>
                <header className={styles.refundCardHeader}>
                  <div>
                    <div className={styles.refundOrderId}>{order.id}</div>
                    <div className={styles.refundCustomerName}>{order.customerName}</div>
                  </div>
                  <div className={styles.refundMeta}>
                    <span>{formatDate(order.dateOfService)}</span>
                    <span>&middot;</span>
                    <span>{order.location}</span>
                  </div>
                </header>
                <div className={styles.refundBody}>
                  <div className={styles.refundDetailRow}>
                    <span className={styles.detailLabel}>Reason</span>
                    <span className={styles.detailValue}>
                      {order.refundReason || 'No reason provided.'}
                    </span>
                  </div>
                  <div className={styles.refundDetailRow}>
                    <span className={styles.detailLabel}>Buyer contact</span>
                    <span className={styles.detailValue}>
                      {order.customerName} &mdash; {order.customerPhone} &middot; {order.customerEmail}
                    </span>
                  </div>
                  {order.refundAttachments?.length > 0 && (
                    <div className={styles.refundAttachmentsRow}>
                      <span className={styles.detailLabel}>Proof of purchase</span>
                      <div className={styles.refundAttachments}>
                        {order.refundAttachments.map((file) => {
                          const Icon = file.type === 'photo' ? TbPhoto : TbReceipt
                          return (
                            <button
                              key={file.label}
                              type="button"
                              className={styles.attachmentChip}
                                  onClick={() =>
                                    setPreviewAttachment({
                                      orderId: order.id,
                                      ...file,
                                    })
                                  }
                            >
                              <Icon size={14} />
                              <span>{file.label}</span>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
                <footer className={styles.refundFooter}>
                  <button
                    type="button"
                    className={`${styles.btnTextSecondary}`}
                    onClick={() => setSelectedOrder(order)}
                  >
                    Review details
                  </button>
                  <div className={styles.refundQuickActions}>
                    {order.refundStage === 'requested' && (
                      <>
                        <button
                          type="button"
                          className={`${styles.btnText} ${styles.btnAccept}`}
                          onClick={() => handleRefundDecision(order, 'approve')}
                        >
                          Approve refund
                        </button>
                        <button
                          type="button"
                          className={`${styles.btnText} ${styles.btnDecline}`}
                          onClick={() => handleRefundDecision(order, 'decline')}
                        >
                          Decline
                        </button>
                      </>
                    )}
                    {order.refundStage === 'processing' && (
                      <button
                        type="button"
                        className={`${styles.btnText} ${styles.btnAccept}`}
                        onClick={() => handleRefundDecision(order, 'complete')}
                      >
                        Mark refund completed
                      </button>
                    )}
                  </div>
                </footer>
              </article>
            ))}
          </div>
        </section>
      )}

      <div className={styles.tableWrap}>
        <table className={styles.ordersTable}>
          <thead>
            <tr>
              <th>Order ID</th>
              <th>Customer Name</th>
              <th>Service Package</th>
              <th>Date of Service</th>
              <th>Location</th>
              <th>Total Price</th>
              <th>Payment Status</th>
              <th>Order Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredOrders.length === 0 ? (
              <tr>
                <td colSpan={9} className={styles.emptyState}>
                  <div className={styles.emptyStateIcon}>
                    <TbReceipt size={40} />
                  </div>
                  No orders match your filters. Try adjusting search or filters.
                </td>
              </tr>
            ) : (
              filteredOrders.map((order) => {
                const paymentBadge = sellerPaymentBadge(order.paymentStatus)
                return (
                <tr key={order.id} className={styles.orderRow}>
                  <td className={styles.cellOrderId} data-label="Order ID">
                    <span className={styles.orderId}>{order.displayId || order.id}</span>
                    {order.isUrgent && <span className={`${styles.badge} ${styles.badgeUrgent}`}>Urgent</span>}
                  </td>
                  <td data-label="Customer">{order.customerName}</td>
                  <td data-label="Package">{order.servicePackage}</td>
                  <td data-label="Date">{formatDate(order.dateOfService)}</td>
                  <td data-label="Location">{order.location}</td>
                  <td data-label="Total">{formatPrice(order.totalPrice)}</td>
                  <td data-label="Payment">
                    <span className={`${styles.badge} ${paymentBadge.badgeClass}`}>{paymentBadge.label}</span>
                  </td>
                  <td data-label="Status">
                    <span className={`${styles.badge} ${getStatusBadgeClass(order.orderStatus)}`}>
                      {order.orderStatus.replace('_', ' ')}
                    </span>
                  </td>
                  <td data-label="Actions">
                    <div className={styles.cellActions}>
                      <button
                        type="button"
                        className={`${styles.btnIcon} ${styles.btnIconView}`}
                        onClick={() => setSelectedOrder(order)}
                        title="View Details"
                      >
                        <TbEye size={16} />
                      </button>
                      {order.orderStatus === 'pending' && order.paymentStatus === 'paid' && (
                        <button
                          type="button"
                          className={`${styles.btnIcon} ${styles.btnIconAccept} ${styles.hideOnMobile}`}
                          onClick={() => handleAcceptOrder(order)}
                          title="Confirm booking"
                        >
                          <TbCheck size={16} />
                        </button>
                      )}
                      {order.orderStatus === 'pending' && order.paymentStatus !== 'paid' && (
                        <button
                          type="button"
                          className={`${styles.btnIcon} ${styles.btnIconDecline} ${styles.hideOnMobile}`}
                          onClick={() => handleDeclineOrder(order)}
                          title="Decline unpaid order"
                        >
                          <TbCircleX size={16} />
                        </button>
                      )}
                      <button
                        type="button"
                        className={`${styles.btnIcon} ${styles.btnIconUpdate}`}
                        onClick={() => {
                          setOrderForUpdateStatus(order)
                          setShowUpdateStatus(true)
                        }}
                        title="Edit"
                      >
                        <TbEdit size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {selectedOrder && (
        <div
          className={styles.modalOverlay}
          role="dialog"
          aria-modal="true"
          aria-labelledby="order-details-title"
          onClick={() => !showUpdateStatus && setSelectedOrder(null)}
        >
          <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 id="order-details-title" className={styles.modalTitle}>
                Order {selectedOrder.displayId || selectedOrder.id}
                {selectedOrder.isUrgent && <span className={`${styles.badge} ${styles.badgeUrgent}`}>Urgent</span>}
              </h2>
              <button
                type="button"
                className={styles.modalClose}
                onClick={() => { setSelectedOrder(null); setShowUpdateStatus(false) }}
                aria-label="Close"
              >
                <TbX size={22} />
              </button>
            </div>

            <div className={styles.modalBody}>
              <div className={styles.section}>
                <h3 className={styles.sectionTitle}>Progress</h3>
                <div className={styles.timelineWrap}>
                  <div className={styles.timeline}>
                    {TIMELINE_STEPS.map((step, i) => {
                      const isDone = timelineProgress[step.id]
                      const Icon = step.icon
                      return (
                        <div key={step.id} className={styles.timelineStep}>
                          {isDone && (
                            <span className={styles.timelineStepTime}>{getStepTime(i)}</span>
                          )}
                          {!isDone && <span className={styles.timelineStepTimePlaceholder} aria-hidden />}
                          <div
                            className={`${styles.timelineStepIcon} ${isDone ? styles.timelineStepIconActive : ''}`}
                            aria-hidden
                          >
                            {isDone ? <TbCheck size={16} /> : <Icon size={16} />}
                          </div>
                          <div className={styles.timelineStepContent}>
                            <span
                              className={`${styles.timelineStepLabel} ${isDone ? (step.id === 'completed' && timelineProgress.completed ? styles.timelineStepDone : styles.timelineStepActive) : ''}`}
                            >
                              {step.label}
                            </span>
                            {step.description && (
                              <span className={styles.timelineStepDesc}>{step.description}</span>
                            )}
                          </div>
                          {i < TIMELINE_STEPS.length - 1 && (
                            <span
                              className={`${styles.timelineConnector} ${isDone ? styles.timelineConnectorDone : ''}`}
                            />
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>

              <div className={styles.section}>
                <h3 className={styles.sectionTitle}>Customer</h3>
                <div className={`${styles.detailList} ${styles.customerInfoGrid} ${styles.customerInfoCard}`}>
                  <div className={styles.customerDetailItem}>
                    <span className={styles.customerDetailIcon}>
                      <TbUser size={18} />
                    </span>
                    <div className={styles.customerDetailContent}>
                      <span className={styles.detailLabel}>Name</span>
                      <span className={styles.detailValue}>{selectedOrder.customerName}</span>
                    </div>
                  </div>
                  <div className={styles.customerDetailItem}>
                    <span className={styles.customerDetailIcon}>
                      <TbPhone size={18} />
                    </span>
                    <div className={styles.customerDetailContent}>
                      <span className={styles.detailLabel}>Phone</span>
                      <span className={styles.detailValue}>{selectedOrder.customerPhone}</span>
                    </div>
                  </div>
                  <div className={styles.customerDetailItem}>
                    <span className={styles.customerDetailIcon}>
                      <TbMail size={18} />
                    </span>
                    <div className={styles.customerDetailContent}>
                      <span className={styles.detailLabel}>Email</span>
                      <span className={styles.detailValue}>{selectedOrder.customerEmail}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className={styles.section}>
                <h3 className={styles.sectionTitle}>Deceased</h3>
                <div className={styles.sectionBlock}>
                <div className={styles.detailList}>
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>Name</span>
                    <span className={styles.detailValue}>{selectedOrder.deceasedName}</span>
                  </div>
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>Date of death</span>
                    <span className={styles.detailValue}>{formatDate(selectedOrder.dateOfDeath)}</span>
                  </div>
                  {selectedOrder.religion && (
                    <div className={styles.detailItem}>
                      <span className={styles.detailLabel}>Religion</span>
                      <span className={styles.detailValue}>{selectedOrder.religion}</span>
                    </div>
                  )}
                  {(selectedOrder.specialRequests != null && selectedOrder.specialRequests !== '') && (
                    <div className={styles.detailItem}>
                      <span className={styles.detailLabel}>Special requests</span>
                      <span className={styles.detailValue}>{selectedOrder.specialRequests}</span>
                    </div>
                  )}
                </div>
                </div>
              </div>

              <div className={styles.section}>
                <h3 className={styles.sectionTitle}>Service</h3>
                <div className={styles.sectionBlock}>
                <div className={styles.detailList}>
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>Package</span>
                    <span className={styles.detailValue}>{selectedOrder.servicePackage}</span>
                  </div>
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>Wake duration</span>
                    <span className={styles.detailValue}>{selectedOrder.wakeDuration}</span>
                  </div>
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>Location</span>
                    <span className={styles.detailValue}>{selectedOrder.burialLocation}</span>
                  </div>
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>Add-ons</span>
                    <span className={styles.detailValue}>{selectedOrder.addOns?.length ? selectedOrder.addOns.join(', ') : 'None'}</span>
                  </div>
                </div>
                </div>
              </div>

              <div className={styles.section}>
                <h3 className={styles.sectionTitle}>Payment</h3>
                <div className={styles.sectionBlock}>
                <div className={styles.detailList}>
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>Total</span>
                    <span className={styles.detailValue}>{formatPrice(selectedOrder.totalPrice)}</span>
                  </div>
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>Method</span>
                    <span className={styles.detailValue}>{selectedOrder.paymentMethod}</span>
                  </div>
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>Status</span>
                    <span className={styles.detailValue}>
                      {selectedPaymentBadge && (
                        <span
                          className={`${styles.badge} ${selectedPaymentBadge.badgeClass}`}
                        >
                          {selectedPaymentBadge.label}
                        </span>
                      )}
                    </span>
                  </div>
                </div>
                </div>
              </div>

              {selectedOrder.refundRequested && (
                <div className={styles.section}>
                  <h3 className={styles.sectionTitle}>Refund request</h3>
                  <div className={styles.sectionBlock}>
                    <div className={styles.detailList}>
                      <div className={styles.detailItem}>
                        <span className={styles.detailLabel}>Reason</span>
                        <span className={styles.detailValue}>
                          {selectedOrder.refundReason || 'No reason provided.'}
                        </span>
                      </div>
                    </div>
                    <div className={styles.refundActions}>
                      {selectedOrder.refundStage === 'requested' && (
                        <>
                          <button
                            type="button"
                            className={`${styles.btnText} ${styles.btnAccept}`}
                            onClick={() => handleRefundDecision(selectedOrder, 'approve')}
                          >
                            Approve refund
                          </button>
                          <button
                            type="button"
                            className={`${styles.btnText} ${styles.btnDecline}`}
                            onClick={() => handleRefundDecision(selectedOrder, 'decline')}
                          >
                            Decline refund
                          </button>
                        </>
                      )}
                      {selectedOrder.refundStage === 'processing' && (
                        <button
                          type="button"
                          className={`${styles.btnText} ${styles.btnAccept}`}
                          onClick={() => handleRefundDecision(selectedOrder, 'complete')}
                        >
                          Mark refund completed
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div className={styles.documentsSection}>
                <h3 className={styles.documentsSectionTitle}>Documents</h3>
                <div className={styles.documentsList}>
                  <a href="#" className={styles.documentChip} onClick={(e) => e.preventDefault()}>
                    <span className={styles.documentChipIcon}><TbFileText size={16} /></span>
                    <span>Invoice</span>
                  </a>
                  <a href="#" className={styles.documentChip} onClick={(e) => e.preventDefault()}>
                    <span className={styles.documentChipIcon}><TbReceipt size={16} /></span>
                    <span>Receipt</span>
                  </a>
                  <a href="#" className={styles.documentChip} onClick={(e) => e.preventDefault()}>
                    <span className={styles.documentChipIcon}><TbFileText size={16} /></span>
                    <span>Summary</span>
                  </a>
                  <a href="#" className={styles.documentChip} onClick={(e) => e.preventDefault()}>
                    <span className={styles.documentChipIcon}><TbFileText size={16} /></span>
                    <span>Contract</span>
                  </a>
                </div>
              </div>

              <div className={styles.modalActions}>
                {selectedOrder.orderStatus !== 'completed' && selectedOrder.orderStatus !== 'cancelled' && (
                  <button type="button" className={`${styles.btnText} ${styles.btnUpdateStatus}`} onClick={() => { setOrderForUpdateStatus(selectedOrder); setShowUpdateStatus(true) }}>Update status</button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {showUpdateStatus && orderForUpdateStatus && (
        <div
          className={styles.updateStatusWrap}
          onClick={() => { setShowUpdateStatus(false); setOrderForUpdateStatus(null) }}
        >
          <div
            className={styles.updateStatusCard}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.updateStatusHeader}>
              <h2 className={styles.updateStatusTitle}>Update order status</h2>
              <button
                type="button"
                className={styles.modalClose}
                onClick={() => { setShowUpdateStatus(false); setOrderForUpdateStatus(null) }}
                aria-label="Close"
              >
                <TbX size={22} />
              </button>
            </div>
            <div className={styles.updateStatusBody}>
              <p className={styles.updateStatusPrompt}>
                Choose new status for order <span className={styles.updateStatusOrderId}>{orderForUpdateStatus.id}</span>.
              </p>
              <div className={styles.updateStatusOptions}>
                {[
                  { status: 'confirmed', label: 'Confirm', icon: TbCheck, iconClass: styles.updateStatusBtnIconConfirmed, btnClass: styles.updateStatusBtnConfirmed },
                  { status: 'in_progress', label: 'In progress', icon: TbTools, iconClass: styles.updateStatusBtnIconInProgress, btnClass: styles.updateStatusBtnInProgress },
                  { status: 'completed', label: 'Completed', icon: TbCircleCheck, iconClass: styles.updateStatusBtnIconCompleted, btnClass: styles.updateStatusBtnCompleted },
                  { status: 'refunded', label: 'Refunded', icon: TbCurrencyDollar, iconClass: styles.updateStatusBtnIconRefund, btnClass: styles.updateStatusBtnRefund },
                  { status: 'cancelled', label: 'Decline', icon: TbCircleX, iconClass: styles.updateStatusBtnIconDecline, btnClass: styles.updateStatusBtnDecline },
                ].map(({ status, label, icon: Icon, iconClass, btnClass }) => (
                  <button
                    key={status}
                    type="button"
                    className={`${styles.updateStatusBtn} ${btnClass}`}
                    onClick={() => handleUpdateStatus(orderForUpdateStatus, status)}
                  >
                    <span className={`${styles.updateStatusBtnIcon} ${iconClass}`}>
                      <Icon size={18} />
                    </span>
                    <span className={styles.updateStatusBtnLabel}>{label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {previewAttachment && (
        <div
          className={styles.modalOverlay}
          role="dialog"
          aria-modal="true"
          aria-labelledby="attachment-preview-title"
          onClick={() => setPreviewAttachment(null)}
        >
          <div
            className={styles.attachmentPreviewCard}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.attachmentPreviewHeader}>
              <h2 id="attachment-preview-title" className={styles.attachmentPreviewTitle}>
                {previewAttachment.label}
              </h2>
              <button
                type="button"
                className={styles.modalClose}
                onClick={() => setPreviewAttachment(null)}
                aria-label="Close preview"
              >
                <TbX size={22} />
              </button>
            </div>
            <div className={styles.attachmentPreviewBody}>
              <div className={styles.attachmentPreviewMeta}>
                <span className={styles.detailLabel}>Order</span>
                <span className={styles.detailValue}>{previewAttachment.orderId}</span>
              </div>
              <div className={styles.attachmentPreviewContent}>
                <p>
                  This is a mock preview for <strong>{previewAttachment.label}</strong>. In a real
                  implementation, this area would show the actual image or PDF viewer for the
                  uploaded file.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export function SellerOrdersLoadingFallback() {
  return (
    <div className={styles.pageWrap} role="status" aria-live="polite">
      <p style={{ margin: 0, color: '#64748b', fontSize: '0.95rem' }}>Loading orders…</p>
    </div>
  )
}
