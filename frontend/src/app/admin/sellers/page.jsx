'use client'

import { useMemo, useState } from 'react'
import layoutStyles from '../admin.module.css'
import styles from './sellers.module.css'
import { sellers as initialSellers, getEffectiveCommissionForSeller } from '@/data/adminSampleData'

const STATUS_OPTIONS = [
  { value: 'all', label: 'All statuses' },
  { value: 'active', label: 'Active' },
  { value: 'pending', label: 'Pending verification' },
  { value: 'suspended', label: 'Suspended' },
]

export default function AdminSellersPage() {
  const [statusFilter, setStatusFilter] = useState('all')
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    return initialSellers.filter((seller) => {
      if (statusFilter !== 'all' && seller.status !== statusFilter) return false
      if (!search.trim()) return true

      const q = search.trim().toLowerCase()
      return (
        seller.businessName.toLowerCase().includes(q) ||
        seller.contactName.toLowerCase().includes(q) ||
        seller.email.toLowerCase().includes(q)
      )
    })
  }, [statusFilter, search])

  return (
    <div className={layoutStyles.dashWrap}>
      <section className={layoutStyles.panel}>
        <div className={layoutStyles.panelHead}>
          <p className={layoutStyles.panelTitle}>Sellers</p>

          <div className={styles.toolbar}>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className={layoutStyles.smallBtn}
              aria-label="Filter sellers by status"
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>

            <input
              type="search"
              placeholder="Search by name or email"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={`${layoutStyles.searchInput} ${styles.searchInputWrap}`}
            />
          </div>
        </div>

        <div className={layoutStyles.table}>
          <div className={layoutStyles.rowHead}>
            <span>Seller</span>
            <span>Contact</span>
            <span>Listings</span>
            <span>Commission</span>
          </div>

          {filtered.map((seller) => {
            const commissionInfo = getEffectiveCommissionForSeller(seller.id)
            const isOverride = commissionInfo.source === 'override'

            return (
              <div className={layoutStyles.row} key={seller.id}>
                <span>
                  <strong>{seller.businessName}</strong>
                  <br />
                  <span className={styles.meta}>
                    ID: {seller.id} · Since {seller.registeredAt}
                  </span>
                </span>

                <span>
                  <strong>{seller.contactName}</strong>
                  <br />
                  <span className={styles.meta}>{seller.email}</span>
                  <br />
                  <span className={styles.meta}>{seller.phone}</span>
                </span>

                <span>
                  <strong>{seller.listingCount}</strong> listings
                  <br />
                  <span className={styles.meta}>
                    Status: {seller.status}
                  </span>
                </span>

                <span>
                  <span className={layoutStyles.badge}>
                    {commissionInfo.percentage}% {isOverride ? '(custom)' : '(default)'}
                  </span>
                  <br />
                  {isOverride && (
                    <span className={styles.meta}>
                      Override rule: {commissionInfo.ruleId}
                    </span>
                  )}
                </span>
              </div>
            )
          })}

          {filtered.length === 0 && (
            <div className={styles.empty}>
              No sellers match the current filters.
            </div>
          )}
        </div>
      </section>
    </div>
  )
}

