'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
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
import { formatCount } from '@/utils/formatCount'
import { useDebouncedEffect } from '@/hooks'
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
  { id: 'received', label: 'Order Received', icon: TbPackage, description: 'Order was placed and is awaiting confirmation.' },
  { id: 'confirmed', label: 'Confirmed', icon: TbCheck, description: 'Order has been accepted. Preparation will begin soon.' },
  { id: 'preparation', label: 'Preparation', icon: TbTools, description: 'Service is being prepared according to your request.' },
  { id: 'ongoing', label: 'Service Ongoing', icon: TbTruck, description: 'Service is in progress.' },
  { id: 'completed', label: 'Completed', icon: TbCircleCheck, description: 'Service has been completed.' },
]

const MOCK_ORDERS = [
  {
    id: 'LV-2024-0847',
    customerName: 'Maria Santos',
    servicePackage: 'Traditional Full Service',
    dateOfService: '2025-03-10',
    location: 'Manila Memorial Chapel',
    totalPrice: 185000,
    paymentStatus: 'paid',
    orderStatus: 'pending',
    isUrgent: true,
    customerPhone: '+63 912 345 6789',
    customerEmail: 'maria.santos@email.com',
    deceasedName: 'Roberto Santos',
    dateOfDeath: '2025-03-08',
    religion: 'Roman Catholic',
    specialRequests: 'Floral tributes only; no photography during service.',
    addOns: ['Flowers', 'Chapel (4 hrs)', 'Transportation'],
    wakeDuration: '3 days',
    burialLocation: 'Manila Memorial Park',
    paymentMethod: 'Bank Transfer',
    refundRequested: true,
    refundReason: 'Family requested a full refund due to scheduling conflict.',
    refundAttachments: [
      { type: 'receipt', label: 'Official receipt #A-1023 (PDF)' },
      { type: 'photo', label: 'Payment screenshot.png' },
    ],
  },
  {
    id: 'LV-2024-0843',
    customerName: 'Luis Ramirez',
    servicePackage: 'Cremation Package',
    dateOfService: '2025-02-28',
    location: 'San Juan Crematorium',
    totalPrice: 88000,
    paymentStatus: 'paid',
    orderStatus: 'refunded',
    isUrgent: false,
    customerPhone: '+63 917 555 8899',
    customerEmail: 'luis.ramirez@email.com',
    deceasedName: 'Andrea Ramirez',
    dateOfDeath: '2025-02-26',
    religion: 'Catholic',
    specialRequests: 'Small, private ceremony only.',
    addOns: ['Urn (premium)', 'Memorial service'],
    wakeDuration: '1 day',
    burialLocation: 'N/A – Cremation',
    paymentMethod: 'Credit Card',
    refundRequested: false,
    refundReason: 'Approved refund after customer requested schedule change.',
    refundAttachments: [{ type: 'receipt', label: 'Original receipt (PDF)' }],
  },
  {
    id: 'LV-2024-0846',
    customerName: 'Juan Dela Cruz',
    servicePackage: 'Cremation Package',
    dateOfService: '2025-03-12',
    location: 'Quezon City Crematorium',
    totalPrice: 95000,
    paymentStatus: 'paid',
    orderStatus: 'confirmed',
    isUrgent: false,
    customerPhone: '+63 917 876 5432',
    customerEmail: 'juan.dc@email.com',
    deceasedName: 'Rosa Dela Cruz',
    dateOfDeath: '2025-03-09',
    religion: null,
    specialRequests: null,
    addOns: ['Urn (standard)', 'Memorial service'],
    wakeDuration: '1 day',
    burialLocation: 'N/A – Cremation',
    paymentMethod: 'Credit Card',
  },
  {
    id: 'LV-2024-0845',
    customerName: 'Ana Reyes',
    servicePackage: 'Simple Wake & Burial',
    dateOfService: '2025-03-15',
    location: 'St. Peter Chapel',
    totalPrice: 120000,
    paymentStatus: 'pending',
    orderStatus: 'pending',
    isUrgent: false,
    customerPhone: '+63 918 111 2233',
    customerEmail: 'ana.reyes@email.com',
    deceasedName: 'Pedro Reyes',
    dateOfDeath: '2025-03-11',
    religion: 'Christian',
    specialRequests: 'Quiet ceremony; family only.',
    addOns: ['Basic flowers', 'Chapel (2 hrs)'],
    wakeDuration: '2 days',
    burialLocation: 'Loyola Memorial Park',
    paymentMethod: 'Bank Transfer',
  },
  {
    id: 'LV-2024-0844',
    customerName: 'Carlos Mendoza',
    servicePackage: 'Traditional Full Service',
    dateOfService: '2025-03-05',
    location: 'Manila Memorial Chapel',
    totalPrice: 195000,
    paymentStatus: 'paid',
    orderStatus: 'completed',
    isUrgent: false,
    customerPhone: '+63 919 444 5566',
    customerEmail: 'carlos.m@email.com',
    deceasedName: 'Elena Mendoza',
    dateOfDeath: '2025-03-01',
    religion: 'Roman Catholic',
    specialRequests: null,
    addOns: ['Premium flowers', 'Chapel (6 hrs)', 'Transportation', 'Catering'],
    wakeDuration: '4 days',
    burialLocation: 'Manila Memorial Park',
    paymentMethod: 'Credit Card',
  },
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

export default function OrdersContent({ initialTab, initialOrderId, initialAction }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { user, authLoading, isSeller } = useAuth()
  const allowedTabs = ORDER_STATUSES.map((t) => t.id)
  const defaultTab = initialTab && allowedTabs.includes(initialTab) ? initialTab : 'all'
  const [activeTab, setActiveTab] = useState(() => readEnum(searchParams, 'tab', allowedTabs, defaultTab))
  const [searchQuery, setSearchQuery] = useState(() => readString(searchParams, 'q', ''))
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [orderForUpdateStatus, setOrderForUpdateStatus] = useState(null)
  const [showUpdateStatus, setShowUpdateStatus] = useState(false)
  const [orders, setOrders] = useState([])
  const [filterDropdownOpen, setFilterDropdownOpen] = useState(false)
  const [previewAttachment, setPreviewAttachment] = useState(null)
  const filterDropdownRef = useRef(null)

  const loadOrders = async ({ signal } = {}) => {
    if (!user?.id || !isSeller) return
    const { data, error } = await supabase
      .from('orders')
      .select(
        'id,order_number,status,fulfillment_status,payment_status,subtotal,created_at,preferred_date,contact_name,contact_email,contact_phone,notes,service_location,deceased_name,date_of_death,wake_duration_days,order_items(name,quantity)',
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
          refundRequested: false,
          refundReason: null,
          refundAttachments: [],
        }
      })

    setOrders(mapped)
  }

  useEffect(() => {
    if (authLoading) return
    const controller = new AbortController()
    loadOrders({ signal: controller.signal })

    // Keep payment status in sync after PayMongo webhooks update the DB.
    const onFocus = () => loadOrders({ signal: controller.signal })
    window.addEventListener('focus', onFocus)

    const interval = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        loadOrders({ signal: controller.signal })
      }
    }, 12_000)

    return () => {
      controller.abort()
      window.removeEventListener('focus', onFocus)
      window.clearInterval(interval)
    }
  }, [user?.id, authLoading, isSeller])

  useEffect(() => {
    // Back-compat: if parent route supplies initialTab, respect it.
    if (initialTab && ORDER_STATUSES.some((t) => t.id === initialTab)) setActiveTab(initialTab)
  }, [initialTab])

  // Sync state <- URL (back/forward, shared links)
  useEffect(() => {
    const nextTab = readEnum(searchParams, 'tab', allowedTabs, defaultTab)
    const nextQ = readString(searchParams, 'q', '')
    if (nextTab !== activeTab) setActiveTab(nextTab)
    if (nextQ !== searchQuery) setSearchQuery(nextQ)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  // Sync URL <- state (debounce typing; keep tab in URL too)
  useDebouncedEffect(() => {
    replaceUrlQuery(router, pathname, searchParams, {
      tab: { value: activeTab, omitIf: defaultTab },
      q: searchQuery,
    })
  }, [activeTab, searchQuery, router, pathname, searchParams], 300)

  useEffect(() => {
    if (!initialOrderId) return
    const matchedOrder = orders.find((order) => order.id === initialOrderId)
    if (!matchedOrder) return

    setSelectedOrder(matchedOrder)
    if (initialAction === 'process') {
      setOrderForUpdateStatus(matchedOrder)
      setShowUpdateStatus(true)
    }
  }, [initialOrderId, initialAction, orders])

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
      const q = searchQuery.toLowerCase()
      list = list.filter(
        (o) =>
          o.customerName.toLowerCase().includes(q) ||
          String(o.displayId || o.id).toLowerCase().includes(q),
      )
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
        if (!res.ok) return
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

  const handleMarkCompleted = (order) => {
    handleUpdateStatus(order, 'completed')
  }

  const handleApproveRefund = (order) => {
    setOrders((prev) =>
      prev.map((o) =>
        o.id === order.id ? { ...o, orderStatus: 'refunded', refundRequested: false } : o
      )
    )
    setSelectedOrder((prev) =>
      prev?.id === order.id ? { ...prev, orderStatus: 'refunded', refundRequested: false } : prev
    )
  }

  const handleDeclineRefund = (order) => {
    setOrders((prev) =>
      prev.map((o) =>
        o.id === order.id ? { ...o, refundRequested: false } : o
      )
    )
    setSelectedOrder((prev) =>
      prev?.id === order.id ? { ...prev, refundRequested: false } : prev
    )
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

  return (
    <div className={styles.pageWrap}>
      <div className={styles.filtersRow}>
        <div className={styles.searchWrap}>
          <TbSearch className={styles.searchIcon} size={18} />
          <input
            type="search"
            className={styles.searchBox}
            placeholder="Search by name or order ID"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Search orders"
          />
        </div>
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
          <div className={styles.statCardDesc}>Waiting for your confirmation</div>
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
                    <button
                      type="button"
                      className={`${styles.btnText} ${styles.btnAccept}`}
                      onClick={() => handleApproveRefund(order)}
                    >
                      Approve refund
                    </button>
                    <button
                      type="button"
                      className={`${styles.btnText} ${styles.btnDecline}`}
                      onClick={() => handleDeclineRefund(order)}
                    >
                      Decline
                    </button>
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
              filteredOrders.map((order) => (
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
                    <span className={`${styles.badge} ${order.paymentStatus === 'paid' ? styles.badgePaid : styles.badgePending}`}>
                      {order.paymentStatus === 'paid' ? 'Paid' : 'Pending'}
                    </span>
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
                      {order.orderStatus === 'pending' && (
                        <>
                          <button
                            type="button"
                            className={`${styles.btnIcon} ${styles.btnIconAccept} ${styles.hideOnMobile}`}
                            onClick={() => handleAcceptOrder(order)}
                            title="Accept Order"
                          >
                            <TbCheck size={16} />
                          </button>
                          <button
                            type="button"
                            className={`${styles.btnIcon} ${styles.btnIconDecline} ${styles.hideOnMobile}`}
                            onClick={() => handleDeclineOrder(order)}
                            title="Decline Order"
                          >
                            <TbCircleX size={16} />
                          </button>
                        </>
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
              ))
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
                      <span className={`${styles.badge} ${selectedOrder.paymentStatus === 'paid' ? styles.badgePaid : styles.badgePending}`}>
                        {selectedOrder.paymentStatus === 'paid' ? 'Paid' : 'Pending'}
                      </span>
                    </span>
                  </div>
                </div>
                </div>
              </div>

              {selectedOrder.refundRequested && selectedOrder.orderStatus !== 'refunded' && (
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
                      <button
                        type="button"
                        className={`${styles.btnText} ${styles.btnAccept}`}
                        onClick={() => handleApproveRefund(selectedOrder)}
                      >
                        Approve refund
                      </button>
                      <button
                        type="button"
                        className={`${styles.btnText} ${styles.btnDecline}`}
                        onClick={() => handleDeclineRefund(selectedOrder)}
                      >
                        Decline refund
                      </button>
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
