'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { TbSearch, TbUser, TbPhone, TbMail, TbX, TbReceipt } from 'react-icons/tb'
import styles from './customers.module.css'
import { formatCount } from '@/utils/formatCount'

const MOCK_CUSTOMERS = [
  {
    id: 'maria-santos',
    name: 'Maria Santos',
    phone: '+63 912 345 6789',
    email: 'maria.santos@email.com',
    lastServiceDate: '2025-03-10',
    bookings: [
      {
        id: 'LV-2024-0847',
        servicePackage: 'Traditional Full Service',
        dateOfService: '2025-03-10',
        location: 'Manila Memorial Chapel',
        status: 'Completed',
      },
    ],
  },
  {
    id: 'juan-dela-cruz',
    name: 'Juan Dela Cruz',
    phone: '+63 917 876 5432',
    email: 'juan.dc@email.com',
    lastServiceDate: '2025-03-12',
    bookings: [
      {
        id: 'LV-2024-0846',
        servicePackage: 'Cremation Package',
        dateOfService: '2025-03-12',
        location: 'Quezon City Crematorium',
        status: 'Confirmed',
      },
    ],
  },
  {
    id: 'ana-reyes',
    name: 'Ana Reyes',
    phone: '+63 918 111 2233',
    email: 'ana.reyes@email.com',
    lastServiceDate: '2025-03-15',
    bookings: [
      {
        id: 'LV-2024-0845',
        servicePackage: 'Simple Wake & Burial',
        dateOfService: '2025-03-15',
        location: 'St. Peter Chapel',
        status: 'Pending',
      },
    ],
  },
  {
    id: 'carlos-mendoza',
    name: 'Carlos Mendoza',
    phone: '+63 919 444 5566',
    email: 'carlos.m@email.com',
    lastServiceDate: '2025-03-05',
    bookings: [
      {
        id: 'LV-2024-0844',
        servicePackage: 'Traditional Full Service',
        dateOfService: '2025-03-05',
        location: 'Manila Memorial Chapel',
        status: 'Completed',
      },
    ],
  },
]

function formatDate(dateString) {
  if (!dateString) return '—'
  return new Date(dateString + 'T00:00:00').toLocaleDateString('en-PH', { dateStyle: 'medium' })
}

export default function SellerCustomersPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCustomer, setSelectedCustomer] = useState(null)
  const [customerForMessage, setCustomerForMessage] = useState(null)
  const [messageText, setMessageText] = useState('')
  const router = useRouter()

  const totalCustomers = MOCK_CUSTOMERS.length
  const returningCustomers = MOCK_CUSTOMERS.filter((c) => c.bookings.length > 1).length
  const today = new Date()
  const newCustomersThisMonth = MOCK_CUSTOMERS.filter((c) => {
    if (!c.lastServiceDate) return false
    const d = new Date(c.lastServiceDate + 'T00:00:00')
    return d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth()
  }).length
  const activeClients = MOCK_CUSTOMERS.filter((c) => !!c.lastServiceDate).length

  const filteredCustomers = useMemo(() => {
    if (!searchQuery.trim()) return MOCK_CUSTOMERS
    const q = searchQuery.toLowerCase()
    return MOCK_CUSTOMERS.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.phone.toLowerCase().includes(q),
    )
  }, [searchQuery])

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
          <p className={styles.statHint}>First service this month</p>
        </div>
        <div className={styles.statCard}>
          <p className={styles.statLabel}>Active clients</p>
          <p className={styles.statValue}>{formatCount(activeClients)}</p>
          <p className={styles.statHint}>With recent services</p>
        </div>
      </section>

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
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={6} className={styles.emptyState}>
                    No customers match your search. Try adjusting the details.
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((customer) => (
                  <tr key={customer.id}>
                    <td>
                      <div className={styles.customerNameCell}>
                        <span className={styles.customerInitial} aria-hidden>
                          {customer.name.charAt(0)}
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
                ))
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
                  // Placeholder send action
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
                            <span className={styles.bookingId}>{booking.id}</span>
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

