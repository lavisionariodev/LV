'use client'

import { useState, useMemo, useEffect } from 'react'
import {
  TbSearch,
  TbX,
  TbEye,
  TbCheck,
  TbCircleX,
  TbEdit,
  TbMessage,
  TbUpload,
  TbDownload,
  TbReceipt,
  TbFileDescription,
  TbFileText,
} from 'react-icons/tb'
import styles from './orders.module.css'

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
  { id: 'received', label: 'Order Received' },
  { id: 'confirmed', label: 'Confirmed' },
  { id: 'preparation', label: 'Preparation' },
  { id: 'ongoing', label: 'Service Ongoing' },
  { id: 'completed', label: 'Completed' },
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
    pending: styles.badgeStatus,
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

export default function OrdersContent({ initialTab }) {
  const [activeTab, setActiveTab] = useState(initialTab || 'all')
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterDateFrom, setFilterDateFrom] = useState('')
  const [filterDateTo, setFilterDateTo] = useState('')
  const [filterServiceType, setFilterServiceType] = useState('')
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [showUpdateStatus, setShowUpdateStatus] = useState(false)
  const [orders, setOrders] = useState(MOCK_ORDERS)

  useEffect(() => {
    if (initialTab && ORDER_STATUSES.some((t) => t.id === initialTab)) {
      setActiveTab(initialTab)
    }
  }, [initialTab])

  const filteredOrders = useMemo(() => {
    let list = [...orders]
    if (activeTab && activeTab !== 'all') {
      list = list.filter((o) => o.orderStatus === activeTab)
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      list = list.filter((o) => o.customerName.toLowerCase().includes(q) || o.id.toLowerCase().includes(q))
    }
    if (filterStatus) {
      list = list.filter((o) => o.orderStatus === filterStatus)
    }
    if (filterDateFrom) {
      list = list.filter((o) => o.dateOfService >= filterDateFrom)
    }
    if (filterDateTo) {
      list = list.filter((o) => o.dateOfService <= filterDateTo)
    }
    if (filterServiceType) {
      list = list.filter((o) => o.servicePackage.toLowerCase().includes(filterServiceType.toLowerCase()))
    }
    return list
  }, [orders, activeTab, searchQuery, filterStatus, filterDateFrom, filterDateTo, filterServiceType])

  const handleAcceptOrder = (order) => {
    setOrders((prev) => prev.map((o) => (o.id === order.id ? { ...o, orderStatus: 'confirmed' } : o)))
    setSelectedOrder((prev) => (prev?.id === order.id ? { ...prev, orderStatus: 'confirmed' } : prev))
  }

  const handleDeclineOrder = (order) => {
    setOrders((prev) => prev.map((o) => (o.id === order.id ? { ...o, orderStatus: 'cancelled' } : o)))
    setSelectedOrder(null)
  }

  const handleUpdateStatus = (order, newStatus) => {
    setOrders((prev) => prev.map((o) => (o.id === order.id ? { ...o, orderStatus: newStatus } : o)))
    setSelectedOrder((prev) => (prev?.id === order.id ? { ...prev, orderStatus: newStatus } : prev))
    setShowUpdateStatus(false)
  }

  const handleMarkCompleted = (order) => {
    handleUpdateStatus(order, 'completed')
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

  const timelineProgress = selectedOrder ? getTimelineProgress(selectedOrder) : {}

  return (
    <div className={styles.pageWrap}>
      {/* Metric cards (alert strip) */}
      <div className={styles.statsStrip}>
        <div className={styles.statCard}>
          <div className={styles.statCardTitle}>Total orders</div>
          <div className={styles.statCardValue}>{orders.length}</div>
          <div className={styles.statCardDesc}>All time (sample data)</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statCardTitle}>Pending approvals</div>
          <div className={styles.statCardValue}>
            {orders.filter((o) => o.orderStatus === 'pending').length}
          </div>
          <div className={styles.statCardDesc}>Waiting for your confirmation</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statCardTitle}>In progress</div>
          <div className={styles.statCardValue}>
            {orders.filter((o) => o.orderStatus === 'in_progress' || o.orderStatus === 'confirmed').length}
          </div>
          <div className={styles.statCardDesc}>Preparation or service ongoing</div>
        </div>
        <div className={styles.statCard}>
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

      <div className={styles.tabsWrap}>
        {ORDER_STATUSES.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`${styles.tab} ${activeTab === tab.id ? styles.tabActive : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className={styles.filtersRow}>
        <div className={styles.searchWrap}>
          <TbSearch className={styles.searchIcon} size={18} />
          <input
            type="search"
            className={styles.searchBox}
            placeholder="Search by customer name or order ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Search orders"
          />
        </div>
        <select
          className={styles.filterSelect}
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          aria-label="Filter by status"
        >
          <option value="">All statuses</option>
          {ORDER_STATUSES.filter((t) => t.id !== 'all').map((t) => (
            <option key={t.id} value={t.id}>
              {t.label}
            </option>
          ))}
        </select>
        <input
          type="date"
          className={styles.filterSelect}
          value={filterDateFrom}
          onChange={(e) => setFilterDateFrom(e.target.value)}
          aria-label="Date from"
          style={{ minWidth: '140px' }}
        />
        <input
          type="date"
          className={styles.filterSelect}
          value={filterDateTo}
          onChange={(e) => setFilterDateTo(e.target.value)}
          aria-label="Date to"
          style={{ minWidth: '140px' }}
        />
        <select
          className={styles.filterSelect}
          value={filterServiceType}
          onChange={(e) => setFilterServiceType(e.target.value)}
          aria-label="Filter by service type"
        >
          <option value="">All service types</option>
          <option value="Traditional">Traditional</option>
          <option value="Cremation">Cremation</option>
          <option value="Simple">Simple</option>
        </select>
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
                <tr key={order.id}>
                  <td>
                    <span className={styles.orderId}>{order.id}</span>
                    {order.isUrgent && <span className={styles.badgeUrgent}>Urgent</span>}
                  </td>
                  <td>{order.customerName}</td>
                  <td>{order.servicePackage}</td>
                  <td>{formatDate(order.dateOfService)}</td>
                  <td>{order.location}</td>
                  <td>{formatPrice(order.totalPrice)}</td>
                  <td>
                    <span className={order.paymentStatus === 'paid' ? styles.badgePaid : styles.badgePending}>
                      {order.paymentStatus === 'paid' ? 'Paid' : 'Pending'}
                    </span>
                  </td>
                  <td>
                    <span className={getStatusBadgeClass(order.orderStatus)}>
                      {order.orderStatus.replace('_', ' ')}
                    </span>
                  </td>
                  <td>
                    <div className={styles.cellActions}>
                      <button
                        type="button"
                        className={styles.btnIcon}
                        onClick={() => setSelectedOrder(order)}
                        title="View Details"
                      >
                        <TbEye size={16} />
                      </button>
                      {order.orderStatus === 'pending' && (
                        <>
                          <button
                            type="button"
                            className={styles.btnIcon}
                            onClick={() => handleAcceptOrder(order)}
                            title="Accept Order"
                          >
                            <TbCheck size={16} />
                          </button>
                          <button
                            type="button"
                            className={`${styles.btnIcon} ${styles.btnIconDanger}`}
                            onClick={() => handleDeclineOrder(order)}
                            title="Decline Order"
                          >
                            <TbCircleX size={16} />
                          </button>
                        </>
                      )}
                      <button
                        type="button"
                        className={styles.btnIcon}
                        onClick={() => {
                          setSelectedOrder(order)
                          setShowUpdateStatus(true)
                        }}
                        title="Update Status"
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
                Order {selectedOrder.id}
                {selectedOrder.isUrgent && <span className={styles.badgeUrgent}>Urgent</span>}
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
                <h3 className={styles.sectionTitle}>Order progress</h3>
                <div className={styles.timelineWrap}>
                  <div className={styles.timeline}>
                    {TIMELINE_STEPS.map((step, i) => (
                      <div key={step.id} className={styles.timelineStep}>
                        <span
                          className={
                            timelineProgress[step.id]
                              ? step.id === 'completed' && timelineProgress.completed
                                ? styles.timelineStepDone
                                : styles.timelineStepActive
                              : ''
                          }
                        >
                          {step.label}
                        </span>
                        {i < TIMELINE_STEPS.length - 1 && (
                          <span
                            className={`${styles.timelineConnector} ${timelineProgress[step.id] ? styles.timelineConnectorDone : ''}`}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className={styles.section}>
                <h3 className={styles.sectionTitle}>Customer information</h3>
                <div className={styles.detailGrid}>
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>Name</span>
                    <span className={styles.detailValue}>{selectedOrder.customerName}</span>
                  </div>
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>Contact</span>
                    <span className={styles.detailValue}>{selectedOrder.customerPhone}</span>
                  </div>
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>Email</span>
                    <span className={styles.detailValue}>{selectedOrder.customerEmail}</span>
                  </div>
                </div>
              </div>

              <div className={styles.section}>
                <h3 className={styles.sectionTitle}>Deceased information</h3>
                <div className={styles.detailGrid}>
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
                  {(selectedOrder.specialRequests != null) && (
                    <div className={styles.detailItem} style={{ gridColumn: '1 / -1' }}>
                      <span className={styles.detailLabel}>Special requests</span>
                      <span className={styles.detailValue}>{selectedOrder.specialRequests || 'None'}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className={styles.section}>
                <h3 className={styles.sectionTitle}>Service details</h3>
                <div className={styles.detailGrid}>
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>Package</span>
                    <span className={styles.detailValue}>{selectedOrder.servicePackage}</span>
                  </div>
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>Wake duration</span>
                    <span className={styles.detailValue}>{selectedOrder.wakeDuration}</span>
                  </div>
                  <div className={styles.detailItem} style={{ gridColumn: '1 / -1' }}>
                    <span className={styles.detailLabel}>Burial / cremation location</span>
                    <span className={styles.detailValue}>{selectedOrder.burialLocation}</span>
                  </div>
                  <div className={styles.detailItem} style={{ gridColumn: '1 / -1' }}>
                    <span className={styles.detailLabel}>Add-ons</span>
                    <span className={styles.detailValue}>
                      {selectedOrder.addOns?.length ? selectedOrder.addOns.join(', ') : 'None'}
                    </span>
                  </div>
                </div>
              </div>

              <div className={styles.section}>
                <h3 className={styles.sectionTitle}>Payment information</h3>
                <div className={styles.detailGrid}>
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
                    <span
                      className={
                        selectedOrder.paymentStatus === 'paid' ? styles.badgePaid : styles.badgePending
                      }
                    >
                      {selectedOrder.paymentStatus === 'paid' ? 'Paid' : 'Pending'}
                    </span>
                  </div>
                </div>
              </div>

              <div className={styles.section}>
                <h3 className={styles.sectionTitle}>Documents</h3>
                <div className={styles.downloadRow}>
                  <a href="#" className={styles.downloadLink} onClick={(e) => e.preventDefault()}>
                    <TbDownload size={16} /> Invoice
                  </a>
                  <a href="#" className={styles.downloadLink} onClick={(e) => e.preventDefault()}>
                    <TbDownload size={16} /> Receipt
                  </a>
                  <a href="#" className={styles.downloadLink} onClick={(e) => e.preventDefault()}>
                    <TbFileDescription size={16} /> Order Summary
                  </a>
                  <a href="#" className={styles.downloadLink} onClick={(e) => e.preventDefault()}>
                    <TbFileText size={16} /> Service Contract
                  </a>
                </div>
              </div>

              <div className={styles.modalActions}>
                {selectedOrder.orderStatus === 'pending' && (
                  <>
                    <button
                      type="button"
                      className={`${styles.btnText} ${styles.btnPrimary}`}
                      onClick={() => handleAcceptOrder(selectedOrder)}
                    >
                      Accept Order
                    </button>
                    <button
                      type="button"
                      className={styles.btnText}
                      onClick={() => handleDeclineOrder(selectedOrder)}
                      style={{ borderColor: '#b43c32', color: '#b43c32' }}
                    >
                      Decline Order
                    </button>
                  </>
                )}
                <button
                  type="button"
                  className={styles.btnText}
                  onClick={() => setShowUpdateStatus(true)}
                >
                  Update Status
                </button>
                <button type="button" className={styles.btnText} onClick={() => {}}>
                  <TbMessage size={16} /> Message Customer
                </button>
                <button type="button" className={styles.btnText} onClick={() => {}}>
                  <TbUpload size={16} /> Upload Documents
                </button>
                {selectedOrder.orderStatus !== 'completed' && selectedOrder.orderStatus !== 'cancelled' && (
                  <button
                    type="button"
                    className={`${styles.btnText} ${styles.btnPrimary}`}
                    onClick={() => handleMarkCompleted(selectedOrder)}
                  >
                    Mark as Completed
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {showUpdateStatus && selectedOrder && (
        <div
          className={styles.modalOverlay}
          style={{ background: 'rgba(0,0,0,0.5)' }}
          onClick={() => setShowUpdateStatus(false)}
        >
          <div
            className={styles.modalCard}
            style={{ maxWidth: 360 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>Update order status</h2>
              <button
                type="button"
                className={styles.modalClose}
                onClick={() => setShowUpdateStatus(false)}
                aria-label="Close"
              >
                <TbX size={22} />
              </button>
            </div>
            <div className={styles.modalBody}>
              <p className={styles.pageSubtitle} style={{ marginBottom: '1rem' }}>
                Choose new status for order {selectedOrder.id}.
              </p>
              <div className={styles.detailGrid} style={{ gridTemplateColumns: '1fr' }}>
                {['confirmed', 'in_progress', 'completed'].map((status) => (
                  <button
                    key={status}
                    type="button"
                    className={styles.btnText}
                    style={{ justifyContent: 'center' }}
                    onClick={() => handleUpdateStatus(selectedOrder, status)}
                  >
                    {status.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
