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
  TbPhoto,
} from 'react-icons/tb'
import styles from './orders.module.css'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase/client'
import { formatCount } from '@/shared/utils/formatCount'
import { useDebouncedEffect } from '@/shared/hooks'
import { readEnum, readString, replaceUrlQuery } from '@/shared/utils/queryParams'
import {
  mapSellerOrderForOrdersPage,
  SELLER_ORDER_DETAIL_SELECT,
} from '@/lib/seller/sellerOrderAnalytics'
import {
  canCancelUnpaidBooking,
  canDeclinePaidBooking,
  fulfillmentStatusFromOrder,
  fulfillmentStatusLabel,
  getFulfillmentBlockedReason,
  getSellerAdvanceAction,
  getSellerCancellationAction,
  getTimelineProgressForStatus,
  hasSellerFulfillmentActions,
} from '@/lib/orders/fulfillmentTransitions'

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

function formatDateTime(s) {
  if (!s) return '—'
  return new Date(s).toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' })
}

function sellerPaymentBadge(paymentStatus) {
  const ps = String(paymentStatus ?? 'unpaid')
  if (ps === 'refund_pending')
    return { label: 'Refund pending', badgeClass: styles.badgePending }
  if (ps === 'refunded') return { label: 'Refunded', badgeClass: styles.badgeRefunded }
  if (ps === 'paid') return { label: 'Paid', badgeClass: styles.badgePaid }
  return { label: 'Pending', badgeClass: styles.badgePending }
}

function paymentMethodLabel(payment) {
  const provider = String(payment?.provider || '').trim()
  const status = String(payment?.status || '').trim()
  const reference = String(payment?.paymongo_reference || '').trim()
  const label = provider
    ? provider.charAt(0).toUpperCase() + provider.slice(1)
    : status || reference
      ? 'Payment provider'
      : '—'
  return reference ? `${label} · ${reference}` : label
}

const IMAGE_EXT_RE = /\.(png|jpe?g|webp|gif)$/i
const PDF_EXT_RE = /\.pdf$/i

function fileNameFromPath(path) {
  const s = String(path || '').split('?')[0]
  return s.split('/').filter(Boolean).pop() || 'Attachment'
}

function attachmentKind(name) {
  if (IMAGE_EXT_RE.test(name)) return 'photo'
  if (PDF_EXT_RE.test(name)) return 'pdf'
  return 'file'
}

function mapDisputeAttachmentPaths(dispute) {
  const paths = Array.isArray(dispute?.attachment_paths) ? dispute.attachment_paths : []
  return paths.map((path, idx) => {
    const label = fileNameFromPath(path)
    return {
      id: `${dispute.id}-${idx}`,
      label,
      path,
      disputeId: dispute.id,
      type: attachmentKind(label),
    }
  })
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

function advanceButtonMeta(status) {
  switch (status) {
    case 'in_progress':
      return {
        icon: TbTools,
        iconClass: styles.updateStatusBtnIconInProgress,
        btnClass: styles.updateStatusBtnInProgress,
      }
    case 'completed':
      return {
        icon: TbCircleCheck,
        iconClass: styles.updateStatusBtnIconCompleted,
        btnClass: styles.updateStatusBtnCompleted,
      }
    case 'confirmed':
    default:
      return {
        icon: TbCheck,
        iconClass: styles.updateStatusBtnIconConfirmed,
        btnClass: styles.updateStatusBtnConfirmed,
      }
  }
}

function SellerOrdersTableSkeletonBody() {
  const widths = ['68%', '76%', '84%', '52%', '72%', '48%']
  return (
    <>
      {Array.from({ length: 8 }).map((_, i) => (
        <tr key={`ord-sk-${i}`} className={styles.ordersSkRow}>
          {widths.map((w, j) => (
            <td key={j}>
              <span className={styles.ordersSkBar} style={{ width: w, maxWidth: j === 2 ? 200 : undefined }} />
            </td>
          ))}
          <td>
            <span className={styles.ordersSkBar} style={{ width: 56, margin: '0 auto' }} />
          </td>
          <td>
            <span className={styles.ordersSkBar} style={{ width: 72, margin: '0 auto' }} />
          </td>
          <td>
            <span className={styles.ordersSkBar} style={{ width: 88, marginLeft: 'auto' }} />
          </td>
        </tr>
      ))}
    </>
  )
}

function SellerOrdersShellSkeleton() {
  const statVariants = [
    styles.statCardTotal,
    styles.statCardPending,
    styles.statCardInProgress,
    styles.statCardCompleted,
  ]
  return (
    <div
      className={styles.pageWrap}
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label="Loading orders"
    >
      <div className={styles.filtersRow} aria-hidden style={{ alignItems: 'center', gap: '0.75rem' }}>
        <span className={`${styles.ordersSkBar} ${styles.ordersSkSearchBar}`} />
        <span className={`${styles.ordersSkBar} ${styles.ordersSkFilterBtn}`} />
      </div>
      <div className={styles.statsStrip}>
        {statVariants.map((cls, i) => (
          <div key={i} className={`${styles.statCard} ${cls}`}>
            <span className={styles.ordersSkBar} style={{ width: '62%', height: 10, opacity: 0.85 }} />
            <span className={styles.ordersSkBar} style={{ width: '40%', height: 22, marginTop: 8, opacity: 0.9 }} />
            <span className={styles.ordersSkBar} style={{ width: '76%', height: 9, marginTop: 8, opacity: 0.75 }} />
          </div>
        ))}
      </div>
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
            <SellerOrdersTableSkeletonBody />
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default function OrdersContent({ initialOrderId, initialAction }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { user, authLoading, isSeller } = useAuth()
  const allowedTabs = useMemo(() => ORDER_STATUSES.map((t) => t.id), [])
  const defaultTab = 'all'
  const [activeTab, setActiveTab] = useState(() =>
    readEnum(searchParams, 'tab', allowedTabs, defaultTab),
  )
  const [searchQuery, setSearchQuery] = useState(() => readString(searchParams, 'q', ''))
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [orderForUpdateStatus, setOrderForUpdateStatus] = useState(null)
  const [showUpdateStatus, setShowUpdateStatus] = useState(false)
  const [declineOrder, setDeclineOrder] = useState(null)
  const [declineBusy, setDeclineBusy] = useState(false)
  const [cancelUnpaidOrder, setCancelUnpaidOrder] = useState(null)
  const [cancelUnpaidBusy, setCancelUnpaidBusy] = useState(false)
  const [advanceBusy, setAdvanceBusy] = useState(false)
  const [orders, setOrders] = useState([])
  const [ordersReady, setOrdersReady] = useState(false)
  const [orderNotice, setOrderNotice] = useState(null)
  const [filterDropdownOpen, setFilterDropdownOpen] = useState(false)
  const [previewAttachment, setPreviewAttachment] = useState(null)
  const filterDropdownRef = useRef(null)

  const showOrderNotice = useCallback((type, message) => {
    const text = String(message || '').trim()
    if (!text) return
    setOrderNotice({ id: Date.now(), type, message: text })
  }, [])

  const loadOrders = useCallback(async ({ signal } = {}) => {
    if (!user?.id || !isSeller) return
    try {
      const { data, error } = await supabase
      .from('orders')
      .select(SELLER_ORDER_DETAIL_SELECT)
      .eq('seller_user_id', user.id)
      .order('created_at', { ascending: false })
      .abortSignal?.(signal)

    if (signal?.aborted) return
    if (error) {
      showOrderNotice('error', error.message || 'Failed to load orders.')
      return
    }

    const { data: disputeRows } = await supabase
      .from('disputes')
      .select('id,order_id,reason,description,status,opened_at,resolution_notes,attachment_paths')
      .eq('seller_user_id', user.id)
      .in('status', ['open', 'under_review'])
      .order('opened_at', { ascending: false })
      .abortSignal?.(signal)

    if (signal?.aborted) return

    const orderIds = (data ?? []).map((o) => o.id).filter(Boolean)
    const paymentByOrder = new Map()
    if (orderIds.length) {
      const { data: paymentLinks } = await supabase
        .from('payment_orders')
        .select('order_id,payments(provider,status,paymongo_reference,created_at)')
        .in('order_id', orderIds)
        .abortSignal?.(signal)

      if (signal?.aborted) return
      for (const link of paymentLinks ?? []) {
        const payment = Array.isArray(link.payments) ? link.payments[0] : link.payments
        if (link.order_id && payment && !paymentByOrder.has(link.order_id)) {
          paymentByOrder.set(link.order_id, payment)
        }
      }
    }

    const disputeByOrder = new Map()
    for (const dispute of disputeRows ?? []) {
      if (!disputeByOrder.has(dispute.order_id)) {
        disputeByOrder.set(dispute.order_id, dispute)
      }
    }

    const mapped = (data ?? []).map((o) => {
        const helpRequest = disputeByOrder.get(o.id) ?? null
        const helpAttachments = mapDisputeAttachmentPaths(helpRequest)
        const payment = paymentByOrder.get(o.id) ?? null
        return mapSellerOrderForOrdersPage(o, {
          paymentMethod: paymentMethodLabel(payment),
          helpRequest,
          helpAttachments,
        })
      })

    setOrders(mapped)
    setOrderNotice((prev) => (prev?.type === 'error' ? null : prev))
    } catch (err) {
      if (!signal?.aborted) {
        showOrderNotice('error', err?.message || 'Failed to load orders.')
      }
    } finally {
      if (!signal?.aborted) setOrdersReady(true)
    }
  }, [user, isSeller, showOrderNotice])

  useEffect(() => {
    if (authLoading) return
    if (!user?.id || !isSeller) {
      queueMicrotask(() => setOrdersReady(true))
      return
    }
    queueMicrotask(() => setOrdersReady(false))
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

    const channel = supabase
      .channel(`seller-orders-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `seller_user_id=eq.${user.id}`,
        },
        () => {
          if (!controller.signal.aborted) {
            loadOrders({ signal: controller.signal })
          }
        },
      )
      .subscribe()

    return () => {
      cancelled = true
      controller.abort()
      window.removeEventListener('focus', onFocus)
      window.clearInterval(interval)
      supabase.removeChannel(channel)
    }
  }, [authLoading, loadOrders, isSeller, user?.id])

  // Sync state <- URL (back/forward, shared links)
  useEffect(() => {
    const nextTab = readEnum(searchParams, 'tab', allowedTabs, defaultTab)
    const nextQ = readString(searchParams, 'q', '')
    queueMicrotask(() => {
      setActiveTab((prev) => (nextTab !== prev ? nextTab : prev))
      setSearchQuery((prev) => (nextQ !== prev ? nextQ : prev))
    })
  }, [allowedTabs, searchParams])

  // Sync URL <- state (debounce typing; keep tab in URL too).
  useDebouncedEffect(() => {
    replaceUrlQuery(router, pathname, searchParams, {
      tab: { value: activeTab, omitIf: defaultTab },
      q: searchQuery,
    })
  }, [activeTab, searchQuery, router, pathname, searchParams], 300)

  /** Drop dashboard / email deep-link params so auto-open effects do not run again after refresh or polling. */
  const clearOrderDeepLinkParams = useCallback(() => {
    if (!searchParams?.get('orderId') && !searchParams?.get('action')) return
    replaceUrlQuery(router, pathname, searchParams, {
      orderId: { value: null },
      action: { value: null },
    })
  }, [router, pathname, searchParams])

  useEffect(() => {
    if (!initialOrderId) return
    const matchedOrder = orders.find((order) => order.id === initialOrderId)
    if (!matchedOrder) return

    queueMicrotask(() => {
      setSelectedOrder(matchedOrder)
      if (
        initialAction === 'process' &&
        (hasSellerFulfillmentActions(matchedOrder) || canDeclinePaidBooking(matchedOrder))
      ) {
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
      if (activeTab === 'refunded') {
        list = list.filter(
          (o) =>
            o.paymentStatus === 'refunded' ||
            o.paymentStatus === 'refund_pending' ||
            o.refundStage === 'processing' ||
            o.refundStage === 'requested',
        )
      } else {
        list = list.filter((o) => o.orderStatus === activeTab)
      }
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

  const helpRequests = useMemo(
    () => orders.filter((o) => o.helpRequest),
    [orders]
  )

  const closeAdvanceModal = useCallback(() => {
    clearOrderDeepLinkParams()
    setShowUpdateStatus(false)
    setOrderForUpdateStatus(null)
  }, [clearOrderDeepLinkParams])

  const handleAdvanceOrder = async (order) => {
    const action = getSellerAdvanceAction(order)
    if (!action || advanceBusy) return

    setAdvanceBusy(true)
    try {
      if (action.handlerKind === 'confirm') {
        const res = await fetch('/api/seller/orders/confirm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderId: order.id }),
        })
        const body = await res.json().catch(() => null)
        if (!res.ok) {
          showOrderNotice('error', body?.error || 'Unable to confirm this order. Please try again.')
          return
        }
      } else {
        const res = await fetch('/api/seller/orders/update-fulfillment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderId: order.id, fulfillment_status: action.status }),
        })
        const body = await res.json().catch(() => null)
        if (!res.ok) {
          showOrderNotice('error', body?.error || 'Unable to update this order. Please try again.')
          return
        }
      }

      await loadOrders()
      setSelectedOrder((prev) => (prev?.id === order.id ? { ...prev, orderStatus: action.status } : prev))
      closeAdvanceModal()
      showOrderNotice('success', action.successMessage)
    } catch (err) {
      showOrderNotice('error', err?.message || 'Unable to update this order. Please try again.')
    } finally {
      setAdvanceBusy(false)
    }
  }

  const handleAcceptOrder = async (order) => {
    await handleAdvanceOrder(order)
  }

  const handleDeclineOrder = (order) => {
    if (!canDeclinePaidBooking(order)) {
      showOrderNotice('error', 'Only paid non-completed orders can be declined for automatic refund.')
      return
    }
    closeAdvanceModal()
    setDeclineOrder(order)
  }

  const handleCancelUnpaidOrder = (order) => {
    if (!canCancelUnpaidBooking(order)) {
      showOrderNotice('error', 'Only unpaid bookings that have not started can be cancelled here.')
      return
    }
    closeAdvanceModal()
    setCancelUnpaidOrder(order)
  }

  const handleConfirmCancelUnpaidOrder = async () => {
    if (!cancelUnpaidOrder || cancelUnpaidBusy) return
    setCancelUnpaidBusy(true)
    try {
      const res = await fetch('/api/seller/orders/update-fulfillment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: cancelUnpaidOrder.id, fulfillment_status: 'cancelled' }),
      })
      const body = await res.json().catch(() => null)
      if (!res.ok) {
        showOrderNotice('error', body?.error || 'Unable to cancel this booking. Please try again.')
        return
      }
      await loadOrders()
      setSelectedOrder((prev) => (prev?.id === cancelUnpaidOrder.id ? null : prev))
      setCancelUnpaidOrder(null)
      clearOrderDeepLinkParams()
      showOrderNotice('success', 'Booking cancelled.')
    } catch (err) {
      showOrderNotice('error', err?.message || 'Unable to cancel this booking. Please try again.')
    } finally {
      setCancelUnpaidBusy(false)
    }
  }

  const handleConfirmDeclineOrder = async () => {
    if (!declineOrder || declineBusy) return
    setDeclineBusy(true)
    try {
      const res = await fetch('/api/seller/orders/decline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: declineOrder.id }),
      })
      const body = await res.json().catch(() => null)
      if (!res.ok) {
        showOrderNotice('error', body?.error || 'Unable to decline this order. Please try again.')
        return
      }
      await loadOrders()
      setSelectedOrder((prev) => (prev?.id === declineOrder.id ? null : prev))
      setDeclineOrder(null)
      clearOrderDeepLinkParams()
      showOrderNotice('success', 'Order declined. The buyer refund has been initiated.')
    } catch (err) {
      showOrderNotice('error', err?.message || 'Unable to decline this order. Please try again.')
    } finally {
      setDeclineBusy(false)
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
        showOrderNotice('error', body?.error || 'Unable to update this refund. Please try again.')
        return
      }
      await loadOrders()
      setSelectedOrder(null)
      clearOrderDeepLinkParams()
      showOrderNotice('success', 'Refund request updated.')
    } catch (err) {
      showOrderNotice('error', err?.message || 'Network error. Please check your connection and try again.')
    }
  }

  const handleHelpRequestStatus = async (order, status) => {
    const requestId = order?.helpRequest?.id
    if (!requestId) return
    try {
      const res = await fetch(`/api/seller/disputes/${encodeURIComponent(requestId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      const body = await res.json().catch(() => null)
      if (!res.ok) {
        showOrderNotice('error', body?.error || 'Unable to update this request. Please try again.')
        return
      }
      await loadOrders()
      setSelectedOrder((prev) => (prev?.id === order.id ? null : prev))
      showOrderNotice('success', 'Help request updated.')
    } catch (err) {
      showOrderNotice('error', err?.message || 'Network error. Please check your connection and try again.')
    }
  }

  const handleDownloadDocument = async (order, type) => {
    if (!order?.id || !type) return
    try {
      const res = await fetch(
        `/api/seller/orders/${encodeURIComponent(order.id)}/documents?type=${encodeURIComponent(type)}&format=pdf`,
        { cache: 'no-store' },
      )
      const body = res.ok ? null : await res.json().catch(() => null)
      if (!res.ok) {
        showOrderNotice('error', body?.error || 'Unable to download this document. Please try again.')
        return
      }
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      const label = order.displayId || order.id
      a.href = url
      a.download = `${type}-${String(label).replace(/[^a-zA-Z0-9-_]+/g, '_')}.pdf`
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
      showOrderNotice('success', 'Document download started.')
    } catch (err) {
      showOrderNotice('error', err?.message || 'Could not download this document.')
    }
  }

  const handlePreviewAttachment = async (order, file) => {
    if (!file) return
    const base = { orderId: order?.displayId || order?.id, ...file }
    setPreviewAttachment(base)

    if (file.signedUrl || !file.disputeId) return
    try {
      const res = await fetch(`/api/seller/disputes/${encodeURIComponent(file.disputeId)}`, {
        cache: 'no-store',
      })
      const body = await res.json().catch(() => null)
      if (!res.ok) return
      const match = (body?.dispute?.attachments || []).find((att) => att.path === file.path)
      if (!match?.signedUrl) return
      setPreviewAttachment((prev) =>
        prev?.path === file.path
          ? {
              ...prev,
              signedUrl: match.signedUrl,
              error: match.error || null,
              type: attachmentKind(file.label || match.path),
            }
          : prev,
      )
    } catch {
      // Keep the basic attachment metadata visible; the user can retry by reopening.
    }
  }

  const timelineProgress = selectedOrder
    ? getTimelineProgressForStatus(fulfillmentStatusFromOrder(selectedOrder))
    : {}
  const advanceOrderAction = orderForUpdateStatus ? getSellerAdvanceAction(orderForUpdateStatus) : null
  const cancellationOrderAction = orderForUpdateStatus
    ? getSellerCancellationAction(orderForUpdateStatus)
    : null
  const advanceBlockedReason = orderForUpdateStatus
    ? getFulfillmentBlockedReason(orderForUpdateStatus)
    : null
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

      {orderNotice ? (
        <div
          className={`${styles.orderNotice} ${orderNotice.type === 'success' ? styles.orderNoticeSuccess : styles.orderNoticeError}`}
          role={orderNotice.type === 'error' ? 'alert' : 'status'}
        >
          <span>{orderNotice.message}</span>
          <button
            type="button"
            className={styles.orderNoticeClose}
            onClick={() => setOrderNotice(null)}
            aria-label="Dismiss message"
          >
            <TbX size={16} />
          </button>
        </div>
      ) : null}

      {/* Metric cards (stats strip) */}
      <div className={styles.statsStrip}>
        <div className={`${styles.statCard} ${styles.statCardTotal}`}>
          <div className={styles.statCardTitle}>Total orders</div>
          <div className={styles.statCardValue}>{ordersReady ? formatCount(orders.length) : '—'}</div>
          <div className={styles.statCardDesc}>All orders loaded for your account</div>
        </div>
        <div className={`${styles.statCard} ${styles.statCardPending}`}>
          <div className={styles.statCardTitle}>Pending approvals</div>
          <div className={styles.statCardValue}>
            {ordersReady
              ? formatCount(orders.filter((o) => o.orderStatus === 'pending').length)
              : '—'}
          </div>
          <div className={styles.statCardDesc}>Unpaid declines · paid awaits your confirmation</div>
        </div>
        <div className={`${styles.statCard} ${styles.statCardInProgress}`}>
          <div className={styles.statCardTitle}>In progress</div>
          <div className={styles.statCardValue}>
            {ordersReady
              ? formatCount(
                  orders.filter((o) => o.orderStatus === 'in_progress' || o.orderStatus === 'confirmed').length,
                )
              : '—'}
          </div>
          <div className={styles.statCardDesc}>Preparation or service ongoing</div>
        </div>
        <div className={`${styles.statCard} ${styles.statCardCompleted}`}>
          <div className={styles.statCardTitle}>Completed (P)</div>
          <div className={styles.statCardValue}>
            {ordersReady
              ? formatPrice(
                  orders
                    .filter((o) => o.orderStatus === 'completed')
                    .reduce((sum, o) => sum + o.totalPrice, 0),
                )
              : '—'}
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
                                  onClick={() => handlePreviewAttachment(order, file)}
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
                      <p className={styles.refundProcessingNote}>
                        Refund in progress. Completion is automatic once the payment provider confirms the return
                        of funds, typically within a few business days.
                      </p>
                    )}
                  </div>
                </footer>
              </article>
            ))}
          </div>
        </section>
      )}

      {helpRequests.length > 0 && (
        <section className={styles.refundListSection}>
          <div className={styles.refundListHeader}>
            <h2 className={styles.refundListTitle}>Buyer help requests</h2>
            <span className={styles.refundListCount}>{formatCount(helpRequests.length)} open</span>
          </div>
          <div className={styles.refundCards}>
            {helpRequests.map((order) => (
              <article key={order.helpRequest.id} className={styles.refundCard}>
                <header className={styles.refundCardHeader}>
                  <div>
                    <div className={styles.refundOrderId}>{order.displayId || order.id}</div>
                    <div className={styles.refundCustomerName}>{order.customerName}</div>
                  </div>
                  <div className={styles.refundMeta}>
                    <span>{order.helpRequest.status === 'under_review' ? 'Under review' : 'Open'}</span>
                    <span>&middot;</span>
                    <span>{formatDateTime(order.helpRequest.openedAt)}</span>
                  </div>
                </header>
                <div className={styles.refundBody}>
                  <div className={styles.refundDetailRow}>
                    <span className={styles.detailLabel}>Reason</span>
                    <span className={styles.detailValue}>{order.helpRequest.reason}</span>
                  </div>
                  {order.helpRequest.description ? (
                    <div className={styles.refundDetailRow}>
                      <span className={styles.detailLabel}>Buyer details</span>
                      <span className={styles.detailValue}>{order.helpRequest.description}</span>
                    </div>
                  ) : null}
                  <div className={styles.refundDetailRow}>
                    <span className={styles.detailLabel}>Seller action</span>
                    <span className={styles.detailValue}>
                      Review the concern and contact the buyer if needed. You may mark it under review with notes.
                      Platform admins close cases and handle refunds.
                    </span>
                  </div>
                </div>
                <footer className={styles.refundFooter}>
                  <button
                    type="button"
                    className={`${styles.btnTextSecondary}`}
                    onClick={() => setSelectedOrder(order)}
                  >
                    View order
                  </button>
                  <div className={styles.refundQuickActions}>
                    {order.helpRequest.status === 'open' && (
                      <button
                        type="button"
                        className={`${styles.btnText}`}
                        onClick={() => handleHelpRequestStatus(order, 'under_review')}
                      >
                        Mark under review
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
            {!ordersReady ? (
              <SellerOrdersTableSkeletonBody />
            ) : filteredOrders.length === 0 ? (
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
                    {order.helpRequest && <span className={`${styles.badge} ${styles.badgePending}`}>Help requested</span>}
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
                      {getSellerAdvanceAction(order)?.handlerKind === 'confirm' && (
                        <button
                          type="button"
                          className={`${styles.btnIcon} ${styles.btnIconAccept} ${styles.hideOnMobile}`}
                          onClick={() => handleAcceptOrder(order)}
                          title="Confirm booking"
                        >
                          <TbCheck size={16} />
                        </button>
                      )}
                      {canDeclinePaidBooking(order) && (
                        <button
                          type="button"
                          className={`${styles.btnIcon} ${styles.btnIconDecline} ${styles.hideOnMobile}`}
                          onClick={() => handleDeclineOrder(order)}
                          title="Decline and refund"
                        >
                          <TbCircleX size={16} />
                        </button>
                      )}
                      {hasSellerFulfillmentActions(order) && (
                        <button
                          type="button"
                          className={`${styles.btnIcon} ${styles.btnIconUpdate}`}
                          onClick={() => {
                            setOrderForUpdateStatus(order)
                            setShowUpdateStatus(true)
                          }}
                          title="Advance order"
                        >
                          <TbEdit size={16} />
                        </button>
                      )}
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
          onClick={() => {
            if (!showUpdateStatus) {
              clearOrderDeepLinkParams()
              setSelectedOrder(null)
            }
          }}
        >
          <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 id="order-details-title" className={styles.modalTitle}>
                Order {selectedOrder.displayId || selectedOrder.id}
              </h2>
              <button
                type="button"
                className={styles.modalClose}
                onClick={() => {
                  clearOrderDeepLinkParams()
                  setSelectedOrder(null)
                  setShowUpdateStatus(false)
                  setOrderForUpdateStatus(null)
                }}
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
                        <p className={styles.refundProcessingNote}>
                          Refund in progress. No further action is required. The buyer will be notified once the
                          payment provider confirms the refund.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {selectedOrder.helpRequest && (
                <div className={styles.section}>
                  <h3 className={styles.sectionTitle}>Buyer help request</h3>
                  <div className={styles.sectionBlock}>
                    <div className={styles.detailList}>
                      <div className={styles.detailItem}>
                        <span className={styles.detailLabel}>Status</span>
                        <span className={styles.detailValue}>
                          {selectedOrder.helpRequest.status === 'under_review' ? 'Under review' : 'Open'}
                        </span>
                      </div>
                      <div className={styles.detailItem}>
                        <span className={styles.detailLabel}>Reason</span>
                        <span className={styles.detailValue}>{selectedOrder.helpRequest.reason}</span>
                      </div>
                      <div className={styles.detailItem}>
                        <span className={styles.detailLabel}>Opened</span>
                        <span className={styles.detailValue}>
                          {formatDateTime(selectedOrder.helpRequest.openedAt)}
                        </span>
                      </div>
                      {selectedOrder.helpRequest.description ? (
                        <div className={styles.detailItem}>
                          <span className={styles.detailLabel}>Buyer details</span>
                          <span className={styles.detailValue}>{selectedOrder.helpRequest.description}</span>
                        </div>
                      ) : null}
                      {selectedOrder.helpRequest.attachments?.length > 0 ? (
                        <div className={styles.detailItem}>
                          <span className={styles.detailLabel}>Attachments</span>
                          <span className={styles.detailValue}>
                            <span className={styles.refundAttachments}>
                              {selectedOrder.helpRequest.attachments.map((file) => {
                                const Icon = file.type === 'photo' ? TbPhoto : TbFileText
                                return (
                                  <button
                                    key={file.id || file.path}
                                    type="button"
                                    className={styles.attachmentChip}
                                    onClick={() => handlePreviewAttachment(selectedOrder, file)}
                                  >
                                    <Icon size={14} />
                                    <span>{file.label}</span>
                                  </button>
                                )
                              })}
                            </span>
                          </span>
                        </div>
                      ) : null}
                      <div className={styles.detailItem}>
                        <span className={styles.detailLabel}>Next steps</span>
                        <span className={styles.detailValue}>
                          Mark under review when you are looking into the case. Platform admins close requests and
                          handle refunds.
                        </span>
                      </div>
                    </div>
                    <div className={styles.refundActions}>
                      {selectedOrder.helpRequest.status === 'open' && (
                        <button
                          type="button"
                          className={`${styles.btnText}`}
                          onClick={() => handleHelpRequestStatus(selectedOrder, 'under_review')}
                        >
                          Mark under review
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div className={styles.documentsSection}>
                <h3 className={styles.documentsSectionTitle}>Documents</h3>
                <div className={styles.documentsList}>
                  <button
                    type="button"
                    className={styles.documentChip}
                    onClick={() => handleDownloadDocument(selectedOrder, 'invoice')}
                  >
                    <span className={styles.documentChipIcon}><TbFileText size={16} /></span>
                    <span>Invoice</span>
                  </button>
                  <button
                    type="button"
                    className={styles.documentChip}
                    onClick={() => handleDownloadDocument(selectedOrder, 'receipt')}
                  >
                    <span className={styles.documentChipIcon}><TbReceipt size={16} /></span>
                    <span>Receipt</span>
                  </button>
                  <button
                    type="button"
                    className={styles.documentChip}
                    onClick={() => handleDownloadDocument(selectedOrder, 'summary')}
                  >
                    <span className={styles.documentChipIcon}><TbFileText size={16} /></span>
                    <span>Summary</span>
                  </button>
                  <button
                    type="button"
                    className={styles.documentChip}
                    onClick={() => handleDownloadDocument(selectedOrder, 'contract')}
                  >
                    <span className={styles.documentChipIcon}><TbFileText size={16} /></span>
                    <span>Contract</span>
                  </button>
                </div>
              </div>

              <div className={styles.modalActions}>
                {(hasSellerFulfillmentActions(selectedOrder) || canDeclinePaidBooking(selectedOrder)) && (
                  <button
                    type="button"
                    className={`${styles.btnText} ${styles.btnUpdateStatus}`}
                    onClick={() => {
                      setOrderForUpdateStatus(selectedOrder)
                      setShowUpdateStatus(true)
                    }}
                  >
                    Advance order
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {showUpdateStatus && orderForUpdateStatus && (
        <div
          className={styles.updateStatusWrap}
          role="dialog"
          aria-modal="true"
          aria-labelledby="advance-order-title"
          onClick={closeAdvanceModal}
        >
          <div
            className={styles.updateStatusCard}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.updateStatusHeader}>
              <h2 id="advance-order-title" className={styles.updateStatusTitle}>Advance order</h2>
              <button
                type="button"
                className={styles.modalClose}
                onClick={closeAdvanceModal}
                aria-label="Close"
              >
                <TbX size={22} />
              </button>
            </div>
            <div className={styles.updateStatusBody}>
              <p className={styles.updateStatusPrompt}>
                Next step for order{' '}
                <span className={styles.updateStatusOrderId}>
                  {orderForUpdateStatus.displayId || orderForUpdateStatus.id}
                </span>
                .
              </p>
              <p className={styles.updateStatusCurrent}>
                Current: {fulfillmentStatusLabel(fulfillmentStatusFromOrder(orderForUpdateStatus))}
              </p>
              {advanceOrderAction ? (
                <div className={styles.updateStatusOptions}>
                  {(() => {
                    const { icon: AdvanceIcon, iconClass, btnClass } = advanceButtonMeta(advanceOrderAction.status)
                    return (
                      <button
                        type="button"
                        className={`${styles.updateStatusBtn} ${btnClass}`}
                        onClick={() => handleAdvanceOrder(orderForUpdateStatus)}
                        disabled={advanceBusy}
                      >
                        <span className={`${styles.updateStatusBtnIcon} ${iconClass}`}>
                          <AdvanceIcon size={18} />
                        </span>
                        <span className={styles.updateStatusBtnLabel}>{advanceOrderAction.label}</span>
                      </button>
                    )
                  })()}
                  <p className={styles.updateStatusActionNote}>{advanceOrderAction.description}</p>
                </div>
              ) : advanceBlockedReason ? (
                <p className={styles.updateStatusBlockedNote}>{advanceBlockedReason}</p>
              ) : null}
              {cancellationOrderAction ? (
                <>
                  <div className={styles.updateStatusSectionDivider} aria-hidden />
                  <div className={styles.updateStatusOptions}>
                    <button
                      type="button"
                      className={`${styles.updateStatusBtn} ${styles.updateStatusBtnDecline}`}
                      onClick={() =>
                        cancellationOrderAction.kind === 'declinePaid'
                          ? handleDeclineOrder(orderForUpdateStatus)
                          : handleCancelUnpaidOrder(orderForUpdateStatus)
                      }
                      disabled={advanceBusy}
                    >
                      <span className={`${styles.updateStatusBtnIcon} ${styles.updateStatusBtnIconDecline}`}>
                        <TbCircleX size={18} />
                      </span>
                      <span className={styles.updateStatusBtnLabel}>{cancellationOrderAction.label}</span>
                    </button>
                    <p className={styles.updateStatusNote}>{cancellationOrderAction.description}</p>
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {cancelUnpaidOrder && (
        <div
          className={styles.updateStatusWrap}
          role="dialog"
          aria-modal="true"
          aria-labelledby="cancel-unpaid-order-title"
          onClick={() => {
            if (!cancelUnpaidBusy) setCancelUnpaidOrder(null)
          }}
        >
          <div className={styles.updateStatusCard} onClick={(e) => e.stopPropagation()}>
            <div className={styles.updateStatusHeader}>
              <h2 id="cancel-unpaid-order-title" className={styles.updateStatusTitle}>
                Cancel booking
              </h2>
              <button
                type="button"
                className={styles.modalClose}
                onClick={() => setCancelUnpaidOrder(null)}
                disabled={cancelUnpaidBusy}
                aria-label="Close"
              >
                <TbX size={22} />
              </button>
            </div>
            <div className={styles.updateStatusBody}>
              <p className={styles.updateStatusPrompt}>
                Cancel unpaid booking{' '}
                <span className={styles.updateStatusOrderId}>
                  {cancelUnpaidOrder.displayId || cancelUnpaidOrder.id}
                </span>
                ? No refund is required because payment has not been completed.
              </p>
              <div className={styles.declineConfirmActions}>
                <button
                  type="button"
                  className={styles.declineConfirmSecondary}
                  onClick={() => setCancelUnpaidOrder(null)}
                  disabled={cancelUnpaidBusy}
                >
                  Keep booking
                </button>
                <button
                  type="button"
                  className={styles.declineConfirmDanger}
                  onClick={handleConfirmCancelUnpaidOrder}
                  disabled={cancelUnpaidBusy}
                >
                  {cancelUnpaidBusy ? 'Cancelling...' : 'Cancel booking'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {declineOrder && (
        <div
          className={styles.updateStatusWrap}
          role="dialog"
          aria-modal="true"
          aria-labelledby="decline-order-title"
          onClick={() => {
            if (!declineBusy) setDeclineOrder(null)
          }}
        >
          <div className={styles.updateStatusCard} onClick={(e) => e.stopPropagation()}>
            <div className={styles.updateStatusHeader}>
              <h2 id="decline-order-title" className={styles.updateStatusTitle}>
                Decline and refund order
              </h2>
              <button
                type="button"
                className={styles.modalClose}
                onClick={() => setDeclineOrder(null)}
                disabled={declineBusy}
                aria-label="Close"
              >
                <TbX size={22} />
              </button>
            </div>
            <div className={styles.updateStatusBody}>
              <p className={styles.updateStatusPrompt}>
                Declining order <span className={styles.updateStatusOrderId}>{declineOrder.displayId || declineOrder.id}</span> will cancel the booking, initiate a buyer refund to the original payment method, and prevent seller payout for this order.
              </p>
              <p className={styles.updateStatusNote}>
                Refund completion depends on the payment provider webhook. The order will stay refund pending until PayMongo confirms the refund.
              </p>
              <div className={styles.declineConfirmActions}>
                <button
                  type="button"
                  className={styles.declineConfirmSecondary}
                  onClick={() => setDeclineOrder(null)}
                  disabled={declineBusy}
                >
                  Keep order
                </button>
                <button
                  type="button"
                  className={styles.declineConfirmDanger}
                  onClick={handleConfirmDeclineOrder}
                  disabled={declineBusy}
                >
                  {declineBusy ? 'Starting refund...' : 'Decline and refund buyer'}
                </button>
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
                {previewAttachment.signedUrl ? (
                  previewAttachment.type === 'photo' ? (
                    // eslint-disable-next-line @next/next/no-img-element -- signed Supabase URLs expire quickly.
                    <img
                      src={previewAttachment.signedUrl}
                      alt={previewAttachment.label}
                      className={styles.attachmentPreviewImage}
                    />
                  ) : previewAttachment.type === 'pdf' ? (
                    <iframe
                      title={previewAttachment.label}
                      src={previewAttachment.signedUrl}
                      className={styles.attachmentPreviewFrame}
                    />
                  ) : (
                    <a href={previewAttachment.signedUrl} target="_blank" rel="noreferrer" className={styles.documentChip}>
                      Open attachment
                    </a>
                  )
                ) : (
                  <p>
                    Preparing secure preview for <strong>{previewAttachment.label}</strong>. If it does
                    not appear, close and reopen the attachment.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export function SellerOrdersLoadingFallback() {
  return <SellerOrdersShellSkeleton />
}
