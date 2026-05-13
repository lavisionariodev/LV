'use client'

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { TbSearch, TbUser, TbPhone, TbMail, TbX, TbReceipt } from 'react-icons/tb'
import styles from './customers.module.css'
import { formatCount } from '@/shared/utils/formatCount'
import { useDebouncedEffect } from '@/shared/hooks'
import { readString, replaceUrlQuery } from '@/lib/url/queryParams'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase/client'
import {
  aggregateSellerCustomers,
  SELLER_CUSTOMER_ORDER_SELECT,
} from '@/lib/seller/sellerOrderAnalytics'

function formatDate(dateString) {
  if (!dateString) return '—'
  return new Date(dateString + 'T00:00:00').toLocaleDateString('en-PH', { dateStyle: 'medium' })
}

/**
 * Token-based AND search (same idea as seller products): name, contact, booking IDs, packages, locations.
 */
function customerMatchesSearchQuery(customer, rawQuery) {
  const trimmed = String(rawQuery ?? '').trim()
  if (!trimmed) return true
  const tokens = trimmed.toLowerCase().split(/\s+/).filter(Boolean)
  if (tokens.length === 0) return true

  const bookingBits = (customer.bookings ?? []).flatMap((b) => [
    b.displayId,
    b.servicePackage,
    b.location,
    b.status,
    b.dateOfService,
  ])
  const parts = [
    customer.name,
    customer.email,
    customer.phone,
    customer.firstServiceDate,
    customer.lastServiceDate,
    ...bookingBits,
  ]
  const hay = parts.map((x) => String(x ?? '').toLowerCase()).join(' ')
  return tokens.every((t) => hay.includes(t))
}

function customerOrdersSearchQuery(customer) {
  const email = String(customer?.email ?? '').trim()
  if (email && email !== '-') return email
  const name = String(customer?.name ?? '').trim()
  if (name) return name
  const phone = String(customer?.phone ?? '').trim()
  return phone && phone !== '-' ? phone : ''
}

function SellerCustomersPageContent() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { user, authLoading, isSeller } = useAuth()
  const userId = user?.id

  const [customers, setCustomers] = useState([])
  const [customersLoading, setCustomersLoading] = useState(true)
  const [customersError, setCustomersError] = useState(null)
  const hasLoadedOnce = useRef(false)

  const [searchQuery, setSearchQuery] = useState(() => readString(searchParams, 'q', ''))
  const [selectedCustomer, setSelectedCustomer] = useState(null)

  const loadCustomers = useCallback(
    async ({ signal, showLoading = false } = {}) => {
      if (!userId || !isSeller) return

      if (showLoading) setCustomersLoading(true)
      setCustomersError(null)

      const { data, error } = await supabase
        .from('orders')
        .select(SELLER_CUSTOMER_ORDER_SELECT)
        .eq('seller_user_id', userId)
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

      const next = aggregateSellerCustomers(data ?? [])
      setCustomers(next)
      hasLoadedOnce.current = true
      setCustomersLoading(false)

      setSelectedCustomer((prev) => (prev ? next.find((c) => c.id === prev.id) ?? prev : null))
    },
    [userId, isSeller],
  )

  useEffect(() => {
    if (authLoading) return
    const controller = new AbortController()

    if (!userId || !isSeller) {
      queueMicrotask(() => {
        setCustomers([])
        setCustomersLoading(false)
        setCustomersError(null)
        hasLoadedOnce.current = false
      })
      return () => controller.abort()
    }

    queueMicrotask(() => {
      if (!controller.signal.aborted) {
        loadCustomers({ signal: controller.signal, showLoading: true })
      }
    })

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
  }, [authLoading, userId, isSeller, loadCustomers])

  useEffect(() => {
    const nextQ = readString(searchParams, 'q', '')
    if (nextQ !== searchQuery) {
      queueMicrotask(() => setSearchQuery(nextQ))
    }
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
    return customers.filter((c) => customerMatchesSearchQuery(c, trimmedQuery))
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
      ? null
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
            placeholder="Search by name, email, phone, order ID, booking, or location"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Search customers"
            autoComplete="off"
            spellCheck={false}
          />
        </form>
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
              {customersLoading && customers.length === 0 ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={`cust-sk-${i}`} className={styles.customersSkRow}>
                    <td>
                      <div className={styles.customerNameCell}>
                        <span
                          className={styles.customersSkBar}
                          style={{ width: 32, height: 32, borderRadius: 999, flexShrink: 0 }}
                        />
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <span className={styles.customersSkBar} style={{ width: '55%', maxWidth: 160 }} />
                          <span className={styles.customersSkBar} style={{ width: '42%', maxWidth: 120, marginTop: 8 }} />
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={styles.customersSkBar} style={{ width: '72%', maxWidth: 140 }} />
                    </td>
                    <td>
                      <span className={styles.customersSkBar} style={{ width: '88%', maxWidth: 200 }} />
                    </td>
                    <td>
                      <span className={styles.customersSkBar} style={{ width: 36, margin: '0 auto' }} />
                    </td>
                    <td>
                      <span className={styles.customersSkBar} style={{ width: '62%', maxWidth: 120 }} />
                    </td>
                    <td>
                      <span className={styles.customersSkBar} style={{ width: 72, marginLeft: 'auto' }} />
                    </td>
                  </tr>
                ))
              ) : tablePlaceholder !== null ? (
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
                            onClick={() => {
                              const q = customerOrdersSearchQuery(customer)
                              router.push(
                                q
                                  ? `/seller/orders?q=${encodeURIComponent(q)}`
                                  : '/seller/orders',
                              )
                            }}
                            aria-label="View orders"
                          >
                            <TbReceipt size={16} />
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
                            <Link
                              href={`/seller/orders?orderId=${encodeURIComponent(booking.id)}&action=view`}
                              className={styles.bookingService}
                            >
                              {booking.servicePackage}
                            </Link>
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

function SellerCustomersShellSkeleton() {
  return (
    <div
      className={styles.pageWrap}
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label="Loading customers"
    >
      <section className={styles.filtersRow} aria-hidden>
        <span className={`${styles.customersSkBar} ${styles.customersSkSearchBar}`} />
      </section>
      <section className={styles.statsStrip} aria-hidden>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className={styles.statCard}>
            <span className={styles.customersSkBar} style={{ width: '58%', height: 10 }} />
            <span className={styles.customersSkBar} style={{ width: '36%', height: 20, marginTop: 8 }} />
            <span className={styles.customersSkBar} style={{ width: '74%', height: 9, marginTop: 8 }} />
          </div>
        ))}
      </section>
      <section className={styles.customersSection} aria-hidden>
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
              {Array.from({ length: 6 }).map((_, i) => (
                <tr key={`sk-${i}`} className={styles.customersSkRow}>
                  <td>
                    <span className={styles.customersSkBar} style={{ width: '62%', maxWidth: 180 }} />
                  </td>
                  <td>
                    <span className={styles.customersSkBar} style={{ width: '72%' }} />
                  </td>
                  <td>
                    <span className={styles.customersSkBar} style={{ width: '80%' }} />
                  </td>
                  <td>
                    <span className={styles.customersSkBar} style={{ width: 40, margin: '0 auto' }} />
                  </td>
                  <td>
                    <span className={styles.customersSkBar} style={{ width: '58%' }} />
                  </td>
                  <td>
                    <span className={styles.customersSkBar} style={{ width: 72, marginLeft: 'auto' }} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

function SellerCustomersPageFallback() {
  return <SellerCustomersShellSkeleton />
}

export default function SellerCustomersPage() {
  return (
    <Suspense fallback={<SellerCustomersPageFallback />}>
      <SellerCustomersPageContent />
    </Suspense>
  )
}
