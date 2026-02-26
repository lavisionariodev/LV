'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import layoutStyles from '../admin.module.css'
import styles from './disputes.module.css'
import { disputes as initialDisputes } from '@/data/adminSampleData'

const STATUS_OPTIONS = [
  { value: 'all', label: 'All statuses' },
  { value: 'open', label: 'Open' },
  { value: 'under_review', label: 'Under review' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'closed', label: 'Closed' },
]

export default function AdminDisputesPage() {
  const [statusFilter, setStatusFilter] = useState('all')

  const filtered = useMemo(() => {
    return initialDisputes.filter((d) => {
      if (statusFilter !== 'all' && d.status !== statusFilter) return false
      return true
    })
  }, [statusFilter])

  return (
    <div className={layoutStyles.dashWrap}>
      <section className={layoutStyles.panel}>
        <div className={layoutStyles.panelHead}>
          <p className={layoutStyles.panelTitle}>Disputes</p>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className={layoutStyles.smallBtn}
            aria-label="Filter disputes by status"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div className={layoutStyles.table}>
          <div className={layoutStyles.rowHead}>
            <span>Date</span>
            <span>Order / Parties</span>
            <span>Reason</span>
            <span>Status</span>
          </div>

          {filtered.map((d) => (
            <Link
              key={d.id}
              href={`/admin/disputes/${d.id}`}
              className={`${layoutStyles.row} ${styles.rowLink}`}
            >
              <span>
                <strong>{d.openedAt}</strong>
                <br />
                <span className={styles.meta}>{d.id}</span>
              </span>

              <span>
                <strong>Order {d.orderRef}</strong>
                <br />
                <span className={styles.meta}>
                  {d.complainantName} → {d.respondentName}
                </span>
              </span>

              <span>
                <strong>{d.reason}</strong>
                <br />
                <span className={styles.meta}>
                  {d.description.slice(0, 80)}
                  {d.description.length > 80 ? '…' : ''}
                </span>
              </span>

              <span className={layoutStyles.badge}>{d.status}</span>
            </Link>
          ))}

          {filtered.length === 0 && (
            <div className={styles.empty}>
              No disputes match the current filters.
            </div>
          )}
        </div>
      </section>
    </div>
  )
}

