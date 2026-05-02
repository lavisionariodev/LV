'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { TbSearch, TbUser, TbPhone, TbMail, TbX, TbReceipt } from 'react-icons/tb'
import styles from './customers.module.css'
import { formatCount } from '@/utils/formatCount'
import { useDebouncedEffect } from '@/hooks'
import { readString, replaceUrlQuery } from '@/lib/url/queryParams'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase/client'

function formatDate(dateString) {
  if (!dateString) return '—'
  return new Date(dateString + 'T00:00:00').toLocaleDateString('en-PH', { dateStyle: 'medium' })
}

function sliceServiceDate(order) {
  const raw = order.preferred_date || order.created_at
  if (!raw) return null
  return String(raw).slice(0, 10)
}

function fulfillmentLabel(fulfillmentStatus) {
  switch (fulfillmentStatus) {
    case 'confirmed':
      return 'Confirmed'
    case 'in_progress':
      return 'In progress'
    case 'completed':
      return 'Completed'
    case 'cancelled':
      return 'Cancelled'
    default:
      return 'Pending'
  }
}

function mapOrderToBooking(o) {
  const items = o.order_items ?? []
  const servicePackage =
    items.length === 1
      ? items[0].name
      : items.length > 1
        ? `${items.length} items`
        : 'Booking'
  const displayId = o.order_number || String(o.id).slice(0, 8)
  const dateSlice = sliceServiceDate(o)

  return {
    id: o.id,
    displayId,
    servicePackage,
    dateOfService: dateSlice || '',
    location: o.service_location?.trim() || '—',
    status: fulfillmentLabel(o.fulfillment_status),
  }
}

function aggregateCustomers(rows) {
  const byBuyer = new Map()

  for (const o of rows) {
    if (!o?.buyer_id) continue
    let list = byBuyer.get(o.buyer_id)
    if (!list) {
      list = []
      byBuyer.set(o.buyer_id, list)
    }
    list.push(o)
  }

  const out = []

  for (const [buyerId, orders] of byBuyer) {
    const sortedByCreatedDesc = [...orders].sort((a, b) => {
      const ta = new Date(a.created_at).getTime()
      const tb = new Date(b.created_at).getTime()
      return tb - ta
    })
    const latest = sortedByCreatedDesc[0]
    const name =
      latest.contact_name?.trim() ||
      latest.contact_email?.trim() ||
      'Buyer'
    const phone = latest.contact_phone?.trim() || '—'
    const email = latest.contact_email?.trim() || '—'

    const serviceDateStrs = orders
      .map((order) => sliceServiceDate(order))
      .filter(Boolean)
      .sort()
    const firstServiceDate = serviceDateStrs.length ? serviceDateStrs[0] : null
    const lastServiceDate = serviceDateStrs.length ? serviceDateStrs[serviceDateStrs.length - 1] : null

    const bookings = sortedByCreatedDesc.map(mapOrderToBooking)

    out.push({
      id: buyerId,
      name,
      phone,
      email,
      lastServiceDate,
      firstServiceDate,
      bookings,
    })
  }

  out.sort((a, b) => {
    const ad = (a.lastServiceDate || '').localeCompare(b.lastServiceDate || '')
    return ad ? -ad : a.name.localeCompare(b.name)
  })

  return out
}

export default function SellerCustomersPage() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { user, authLoading, isSeller } = useAuth()

  const [customers, setCustomers] = useState([])
  const [customersLoading, setCustomersLoading] = useState(true)
  const [customersError, setCustomersError] = useState(null)
  const hasLoadedOnce = useRef(false)

  const [searchQuery, setSearchQuery] = useState(() => readString(searchParams, 'q', ''))
  const [selectedCustomer, setSelectedCustomer] = useState(null)
  const [customerForMessage, setCustomerForMessage] = useState(null)
  const [messageText, setMessageText] = useState('')

  const loadCustomers = useCallback(
    async ({ signal, showLoading = false } = {}) => {
      if (!user?.id || !isSeller) return

      if (showLoading) setCustomersLoading(true)
      setCustomersError(null)

      const { data, error } = await supabase
        .from('orders')
        .select(
          'id,buyer_id,order_number,created_at,preferred_date,fulfillment_status,' +
            'contact_name,contact_email,contact_phone,service_location,order_items(name,quantity)',
        )
        .eq('seller_user_id', user.id)
        .order('created_at', { ascending: false })
        .abortSignal?.(signal)

      if (signal?.aborted) return

      if (error) {
        if (!hasLoadedOnce.current) {
          setCustomers([])
        }
        setCustomersError(error.message || 'Could not load customers.')
        setCustomersLoading(false)
        return
      }

      const next = aggregateCustomers(data ?? [])
      setCustomers(next)
      hasLoadedOnce.current = true
      setCustomersLoading(false)

      setSelectedCustomer((prev) => (prev ? next.find((c) => c.id === prev.id) ?? prev : null))
      setCustomerForMessage((prev) => (prev ? next.find((c) => c.id === prev.id) ?? prev : null))
    },
    [user?.id, isSeller],
  )

  useEffect(() => {
    if (authLoading) return
    const controller = new AbortController()

    if (!user?.id || !isSeller) {
      setCustomers([])
      setCustomersLoading(false)
      setCustomersError(null)
      hasLoadedOnce.current = false
      return () => controller.abort()
    }

    loadCustomers({ signal: controller.signal, showLoading: true })

    const onFocus = () => loadCustomers({ signal: controller.signal, showLoading: false })
    window.addEventListener('focus', onFocus)

    const interval = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        loadCustomers({ signal: controller.signal, showLoading: false })
      }
    }, 12_000)

    return () => {
      controller.abort()
      window.removeEventListener('focus', onFocus)
      window.clearInterval(interval)
    }
  }, [authLoading, user?.id, isSeller, loadCustomers])

  useEffect(() => {
    const nextQ = readString(searchParams, 'q', '')
    if (nextQ !== searchQuery) setSearchQuery(nextQ)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  useDebouncedEffect(() => {
    replaceUrlQuery(router, pathname, searchParams, {
      q: searchQuery,
    })
  }, [searchQuery, router, pathname, searchParams], 300)

  const trimmedQuery = searchQuery.trim()

  const filteredCustomers = useMemo(() => {
    if (!trimmedQuery) return customers
    const q = trimmedQuery.toLowerCase()
    return customers.filter((c) => {
      const name = c.name?.toLowerCase() ?? ''
      const email = c.email?.toLowerCase() ?? ''
      const phone = c.phone?.toLowerCase() ?? ''
      return name.includes(q) || email.includes(q) || phone.includes(q)
    })
  }, [customers, trimmedQuery])

  const { totalCustomers, returningCustomers, newCustomersThisMonth, activeClients } = useMemo(() => {
    const today = new Date()
    const y = today.getFullYear()
    const m = today.getMonth()

    const total = customers.length
    const returning = customers.filter((c) => c.bookings.length > 1).length
    const newThisMonth = customers.filter((c) => {
      if (!c.firstServiceDate) return false
      const d = new Date(c.firstServiceDate + 'T00:00:00')
      return d.getFullYear() === y && d.getMonth() === m
    }).length

    const active = customers.filter((c) => {
      if (!c.lastServiceDate) return false
      const d = new Date(c.lastServiceDate + 'T00:00:00')
      const days = (today.getTime() - d.getTime()) / (1000 * 60 * 60 * 24)
      return days >= 0 && days <= 90
    }).length

    return {
      totalCustomers: total,
      returningCustomers: returning,
      newCustomersThisMonth: newThisMonth,
      activeClients: active,
    }
  }, [customers])

  const showEmptyLedger = !customersLoading && !customersError && trimmedQuery === '' && customers.length === 0
  const showNoSearchMatches =
    !customersLoading && !customersError && trimmedQuery !== '' && filteredCustomers.length === 0

  const tablePlaceholder =
    customersLoading && customers.length === 0
      ? 'Loading customers…'
      : customersError && customers.length === 0
        ? customersError
        : showEmptyLedger
          ? 'No customers yet—when buyers place orders with you, they appear here.'
          : showNoSearchMatches
            ? 'No customers match your search. Try adjusting the details.'
            : null

  return (
    <div className={styles.pageWrap}>
      <section className={styles.filtersRow} aria-label="Search customers">
        <div className={styles.searchWrap}>
          <TbSearch className={styles.searchIcon} size={18} aria-hidden />
          <input
            type="search"
            className={styles.searchBox}
            placeholder="Search by name, email, or contact number"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Search customers"
          />
        </div>
      </section>

      <section className={styles.statsStrip} aria-label="Customer overview">
        <div className={styles.statCard}>
          <p className={styles.statLabel}>Total customers</p>
          <p className={styles.statValue}>{formatCount(totalCustomers)}</p>
          <p className={styles.statHint}>Families on record</p>
        </div>
        <div className={styles.statCard}>
          <p className={styles.statLabel}>Returning customers</p>
          <p className={styles.statValue}>{formatCount(returningCustomers)}</p>
          <p className={styles.statHint}>Booked more than once</p>
        </div>
        <div className={styles.statCard}>
          <p className={styles.statLabel}>New this month</p>
          <p className={styles.statValue}>{formatCount(newCustomersThisMonth)}</p>
          <p className={styles.statHint}>First booking with you this calendar month</p>
        </div>
        <div className={styles.statCard}>
          <p className={styles.statLabel}>Active clients</p>
          <p className={styles.statValue}>{formatCount(activeClients)}</p>
          <p className={styles.statHint}>Service date within the last 90 days</p>
        </div>
      </section>

      {customersError && customers.length > 0 ? (
        <p className={styles.fetchErrorBanner} role="alert">
          {customersError}
        </p>
      ) : null}

      <section className={styles.customersSection} aria-label="Customers list">
        <div className={styles.customersTableWrap}>
          <table className={styles.customersTable}>
            <thead>
              <tr>
                <th>Customer</th>
                <th>Contact Number</th>
                <th>Email</th>
                <th>Total Bookings</th>
                <th>Last Service Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {tablePlaceholder !== null ? (
                <tr>
                  <td colSpan={6} className={styles.emptyState}>
                    {tablePlaceholder}
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((customer) => {
                  const initial = ((customer.name || '').trim().charAt(0) || '?').toUpperCase()
                  return (
                    <tr key={customer.id}>
                      <td>
                        <div className={styles.customerNameCell}>
                          <span className={styles.customerInitial} aria-hidden>
                            {initial}
                          </span>
                          <div>
                            <div className={styles.customerName}>{customer.name}</div>
                            <div className={styles.customerMetaText}>
                              {customer.bookings.length} booking
                              {customer.bookings.length > 1 ? 's' : ''}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td data-label="Contact number">{customer.phone}</td>
                      <td data-label="Email">{customer.email}</td>
                      <td data-label="Total bookings">{customer.bookings.length}</td>
                      <td data-label="Last service date">{formatDate(customer.lastServiceDate)}</td>
                      <td>
                        <div className={styles.rowActions}>
                          <button
                            type="button"
                            className={styles.rowActionPrimary}
                            onClick={() => setSelectedCustomer(customer)}
                            aria-label="View customer profile"
                          >
                            <TbUser size={16} />
                          </button>
                          <button
                            type="button"
                            className={styles.rowActionOrders}
                            onClick={() => router.push('/seller/orders')}
                            aria-label="View orders"
                          >
                            <TbReceipt size={16} />
                          </button>
                          <button
                            type="button"
                            className={styles.rowActionMessage}
                            onClick={() => {
                              setCustomerForMessage(customer)
                              setMessageText('')
                            }}
                            aria-label="Message customer in app"
                          >
                            <TbMail size={16} />
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
      </section>

      {customerForMessage && (
        <div
          className={styles.customerModalOverlay}
          role="dialog"
          aria-modal="true"
          aria-labelledby="message-customer-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setCustomerForMessage(null)
              setMessageText('')
            }
          }}
        >
          <div className={styles.messageModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.messageModalHeader}>
              <div className={styles.messageHeaderMain}>
                <div className={styles.customerHeaderAvatar}>
                  <TbUser size={20} />
                </div>
                <div>
                  <h2 id="message-customer-title" className={styles.messageModalTitle}>
                    Message {customerForMessage.name}
                  </h2>
                  <p className={styles.messageModalSubtitle}>
                    {customerForMessage.phone} · {customerForMessage.email}
                  </p>
                </div>
              </div>
              <button
                type="button"
                className={styles.customerModalClose}
                onClick={() => {
                  setCustomerForMessage(null)
                  setMessageText('')
                }}
                aria-label="Close"
              >
                <TbX size={20} />
              </button>
            </div>

            <div className={styles.messageModalBody}>
              <label className={styles.messageField}>
                <span className={styles.messageLabel}>Message</span>
                <textarea
                  className={styles.messageTextarea}
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  placeholder="Write a thoughtful, concise message for this family…"
                />
              </label>
            </div>

            <div className={styles.messageModalFooter}>
              <button
                type="button"
                className={styles.messageSecondary}
                onClick={() => {
                  setCustomerForMessage(null)
                  setMessageText('')
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                className={styles.messagePrimary}
                onClick={() => {
                  setCustomerForMessage(null)
                  setMessageText('')
                }}
                disabled={!messageText.trim()}
              >
                Send message
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedCustomer && (
        <div
          className={styles.customerModalOverlay}
          role="dialog"
          aria-modal="true"
          aria-labelledby="customer-profile-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedCustomer(null)
          }}
        >
          <div
            className={styles.customerModal}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.customerModalHeader}>
              <div className={styles.customerHeaderMain}>
                <div className={styles.customerHeaderAvatar}>
                  <TbUser size={22} />
                </div>
                <div>
                  <h2 id="customer-profile-title" className={styles.customerModalTitle}>
                    {selectedCustomer.name}
                  </h2>
                  <p className={styles.customerModalSubtitle}>
                    {selectedCustomer.bookings.length} booking
                    {selectedCustomer.bookings.length > 1 ? 's' : ''} · Last service on{' '}
                    {formatDate(selectedCustomer.lastServiceDate)}
                  </p>
                </div>
              </div>
              <button
                type="button"
                className={styles.customerModalClose}
                onClick={() => setSelectedCustomer(null)}
                aria-label="Close"
              >
                <TbX size={20} />
              </button>
            </div>

            <div className={styles.customerModalBody}>
              <div className={styles.customerInfoGrid}>
                <div className={styles.customerInfoCard}>
                  <div className={styles.customerDetailRow}>
                    <span className={styles.customerDetailIcon}>
                      <TbPhone size={18} />
                    </span>
                    <div className={styles.customerDetailContent}>
                      <span className={styles.customerDetailLabel}>Contact number</span>
                      <span className={styles.customerDetailValue}>{selectedCustomer.phone}</span>
                    </div>
                  </div>
                  <div className={styles.customerDetailRow}>
                    <span className={styles.customerDetailIcon}>
                      <TbMail size={18} />
                    </span>
                    <div className={styles.customerDetailContent}>
                      <span className={styles.customerDetailLabel}>Email address</span>
                      <span className={styles.customerDetailValue}>{selectedCustomer.email}</span>
                    </div>
                  </div>
                </div>
                <div className={styles.customerInfoSummaryCard}>
                  <div className={styles.summaryStat}>
                    <span className={styles.summaryStatLabel}>Total bookings</span>
                    <span className={styles.summaryStatValue}>
                      {formatCount(selectedCustomer.bookings.length)}
                    </span>
                  </div>
                  <div className={styles.summaryStat}>
                    <span className={styles.summaryStatLabel}>Last service date</span>
                    <span className={styles.summaryStatValue}>
                      {formatDate(selectedCustomer.lastServiceDate)}
                    </span>
                  </div>
                </div>
              </div>

              <div className={styles.bookingHistorySection}>
                <h3 className={styles.bookingHistoryTitle}>Booking history</h3>
                {selectedCustomer.bookings.length === 0 ? (
                  <p className={styles.bookingHistoryEmpty}>
                    No bookings recorded for this customer yet.
                  </p>
                ) : (
                  <ul className={styles.bookingHistoryList}>
                    {selectedCustomer.bookings.map((booking) => (
                      <li key={booking.id} className={styles.bookingHistoryItem}>
                        <div className={styles.bookingIcon}>
                          <TbReceipt size={18} />
                        </div>
                        <div className={styles.bookingMain}>
                          <div className={styles.bookingHeaderRow}>
                            <span className={styles.bookingService}>{booking.servicePackage}</span>
                            <span className={styles.bookingStatus}>{booking.status}</span>
                          </div>
                          <div className={styles.bookingMetaRow}>
                            <span>{formatDate(booking.dateOfService)}</span>
                            <span className={styles.bookingMetaDivider}>•</span>
                            <span>{booking.location}</span>
                            <span className={styles.bookingMetaDivider}>•</span>
                            <span className={styles.bookingId}>{booking.displayId}</span>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
