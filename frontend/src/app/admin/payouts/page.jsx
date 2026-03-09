'use client'

import { useMemo, useState } from 'react'
import layoutStyles from '../admin.module.css'
import styles from './payouts.module.css'
import {
  payments as initialPayments,
  calculateCommissionSplit,
} from '@/data/adminSampleData'

const STATUS_LABELS = {
  pending: 'Pending approval',
  approved: 'Approved – ready to transfer',
  transferred: 'Transferred',
  failed: 'Failed',
}

export default function AdminPayoutsPage() {
  const [rows, setRows] = useState(initialPayments)
  const [statusFilter, setStatusFilter] = useState('all')
  const [search, setSearch] = useState('')

  const summary = useMemo(() => {
    const total = rows.length
    const pending = rows.filter((r) => r.status === 'pending').length
    const ready = rows.filter((r) => r.status === 'approved').length
    const transferredAmount = rows
      .filter((r) => r.status === 'transferred')
      .reduce((sum, r) => sum + r.amount, 0)

    return { total, pending, ready, transferredAmount }
  }, [rows])

  const filtered = useMemo(() => {
    return rows.filter((row) => {
      if (statusFilter !== 'all' && row.status !== statusFilter) return false
      if (!search.trim()) return true

      const q = search.trim().toLowerCase()
      return (
        row.id.toLowerCase().includes(q) ||
        row.orderRef.toLowerCase().includes(q) ||
        row.buyerName.toLowerCase().includes(q) ||
        row.sellerName.toLowerCase().includes(q)
      )
    })
  }, [rows, search, statusFilter])

  const updateStatus = (id, nextStatus) => {
    setRows((prev) =>
      prev.map((row) => (row.id === id ? { ...row, status: nextStatus } : row)),
    )
  }

  return (
    <div className={layoutStyles.dashWrap}>
      {/* Summary cards */}
      <section className={styles.statsWrap}>
        <div className={layoutStyles.statCard}>
          <p className={layoutStyles.statLabel}>Total transactions</p>
          <p className={layoutStyles.statValue}>{summary.total}</p>
          <p className={layoutStyles.statHint}>All time (sample data)</p>
        </div>

        <div className={layoutStyles.statCard}>
          <p className={layoutStyles.statLabel}>Pending approvals</p>
          <p className={layoutStyles.statValue}>{summary.pending}</p>
          <p className={layoutStyles.statHint}>Waiting for admin decision</p>
        </div>

        <div className={layoutStyles.statCard}>
          <p className={layoutStyles.statLabel}>Ready to transfer</p>
          <p className={layoutStyles.statValue}>{summary.ready}</p>
          <p className={layoutStyles.statHint}>Approved, not yet transferred</p>
        </div>

        <div className={layoutStyles.statCard}>
          <p className={layoutStyles.statLabel}>Transferred (₱)</p>
          <p className={layoutStyles.statValue}>
            ₱ {summary.transferredAmount.toLocaleString()}
          </p>
          <p className={layoutStyles.statHint}>Total amount sent to sellers</p>
        </div>
      </section>

      {/* Table */}
      <section className={layoutStyles.panel}>
        <div className={layoutStyles.panelHead}>
          <p className={layoutStyles.panelTitle}>Payouts</p>

          <div className={styles.toolbar}>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className={layoutStyles.smallBtn}
              aria-label="Filter by status"
            >
              <option value="all">All statuses</option>
              <option value="pending">Pending approval</option>
              <option value="approved">Approved</option>
              <option value="transferred">Transferred</option>
              <option value="failed">Failed</option>
            </select>

            <input
              type="search"
              placeholder="Search by ID, buyer, or seller"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={`${layoutStyles.searchInput} ${styles.searchInputWrap}`}
            />
          </div>
        </div>

        <div className={layoutStyles.table}>
          <div className={layoutStyles.rowHead}>
            <span>Date</span>
            <span>Buyer / Seller</span>
            <span>Amount & split</span>
            <span>Status</span>
            <span className={styles.actionsHead}>Actions</span>
          </div>

          {filtered.map((row) => {
            const { lvShare, sellerShare, rate } = calculateCommissionSplit(
              row.amount,
              row.sellerId,
            )

            return (
              <div className={layoutStyles.row} key={row.id}>
                <span>
                  <strong>{row.date}</strong>
                  <br />
                  <span className={styles.meta}>
                    {row.id} · {row.orderRef}
                  </span>
                </span>

                <span>
                  <strong>{row.buyerName}</strong>
                  <br />
                  <span className={styles.meta}>
                    Seller: {row.sellerName}
                  </span>
                </span>

                <span>
                  <strong>₱ {row.amount.toLocaleString()}</strong>
                  <br />
                  <span className={styles.meta}>
                    LV ({rate}%): ₱ {lvShare.toLocaleString()} · Seller:{' '}
                    ₱ {sellerShare.toLocaleString()}
                  </span>
                </span>

                <span className={layoutStyles.badge}>
                  {STATUS_LABELS[row.status] || row.status}
                </span>

                <span className={styles.actionsCell}>
                  {row.status === 'pending' && (
                    <button
                      type="button"
                      className={layoutStyles.smallBtn}
                      onClick={() => updateStatus(row.id, 'approved')}
                    >
                      Approve
                    </button>
                  )}

                  {row.status === 'approved' && (
                    <button
                      type="button"
                      className={layoutStyles.smallBtn}
                      onClick={() => updateStatus(row.id, 'transferred')}
                    >
                      Transfer
                    </button>
                  )}

                  {row.status === 'transferred' && (
                    <span className={styles.completed}>Completed</span>
                  )}

                  {row.status === 'failed' && (
                    <span className={styles.failed}>Failed</span>
                  )}
                </span>
              </div>
            )
          })}

          {filtered.length === 0 && (
            <div className={styles.empty}>
              No payouts match the current filters.
            </div>
          )}
        </div>
      </section>
    </div>
  )
}