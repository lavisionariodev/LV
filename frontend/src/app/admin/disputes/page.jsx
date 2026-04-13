'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import styles from './disputes.module.css'
import { disputes as initialDisputes } from '@/data/adminSampleData'

const STATUS_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'open', label: 'Open' },
  { value: 'under_review', label: 'Under Review' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'closed', label: 'Closed' },
]

const STATUS_LABEL = Object.fromEntries(STATUS_OPTIONS.map((o) => [o.value, o.label]))

const Icon = {
  Search: () => (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
      <path d="M18 18l3.5 3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
}

function StatusBadge({ status }) {
  const label = STATUS_LABEL[status] || status
  return (
    <span className={`${styles.statusBadge} ${styles[`status_${status}`] || styles.status_default}`}>
      <span className={styles.statusDot} />
      {label}
    </span>
  )
}

export default function AdminDisputesPage() {
  const [statusFilter, setStatusFilter] = useState('all')
  const [search, setSearch] = useState('')

  const summary = useMemo(() => {
    const open = initialDisputes.filter((d) => d.status === 'open').length
    const under_review = initialDisputes.filter((d) => d.status === 'under_review').length
    const resolved = initialDisputes.filter((d) => d.status === 'resolved').length
    const total = initialDisputes.length
    return { total, open, under_review, resolved }
  }, [])

  const tabCounts = useMemo(() => {
    const counts = { all: initialDisputes.length }
    STATUS_OPTIONS.forEach(({ value }) => {
      if (value !== 'all') {
        counts[value] = initialDisputes.filter((d) => d.status === value).length
      }
    })
    return counts
  }, [])

  const filtered = useMemo(() => {
    return initialDisputes.filter((d) => {
      if (statusFilter !== 'all' && d.status !== statusFilter) return false
      if (!search.trim()) return true
      const q = search.trim().toLowerCase()
      return (
        d.id.toLowerCase().includes(q) ||
        d.orderRef.toLowerCase().includes(q) ||
        d.complainantName.toLowerCase().includes(q) ||
        d.respondentName.toLowerCase().includes(q) ||
        d.reason.toLowerCase().includes(q)
      )
    })
  }, [statusFilter, search])

  return (
    <div className={styles.page}>
      <section className={styles.statsGrid}>
        <div className={styles.statCard}>
          <p className={styles.statLabel}>Total disputes</p>
          <p className={styles.statValue}>{summary.total}</p>
          <p className={styles.statHint}>All time</p>
        </div>
        <div className={styles.statCard}>
          <p className={styles.statLabel}>Open</p>
          <p className={styles.statValue}>{summary.open}</p>
          <p className={styles.statHint}>Needs attention</p>
        </div>
        <div className={styles.statCard}>
          <p className={styles.statLabel}>Under review</p>
          <p className={styles.statValue}>{summary.under_review}</p>
          <p className={styles.statHint}>Being investigated</p>
        </div>
        <div className={styles.statCard}>
          <p className={styles.statLabel}>Resolved</p>
          <p className={styles.statValue}>{summary.resolved}</p>
          <p className={styles.statHint}>Successfully closed</p>
        </div>
      </section>

      <section className={styles.tablePanel}>
        <div className={styles.toolbar}>
          <div className={styles.toolbarTopRow}>
            <div className={styles.tabs}>
              {STATUS_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  className={`${styles.tab}${statusFilter === opt.value ? ` ${styles.tabActive}` : ''}`}
                  onClick={() => setStatusFilter(opt.value)}
                >
                  {opt.label}
                  <span className={styles.tabCount}>{tabCounts[opt.value] ?? 0}</span>
                </button>
              ))}
            </div>
          </div>

          <div className={styles.filterRow}>
            <div className={styles.toolbarSearchWrap}>
              <Icon.Search />
              <input
                type="search"
                placeholder="Search ID, order, parties, or reason…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className={styles.toolbarSearchInput}
                autoComplete="off"
              />
            </div>
          </div>
        </div>

        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Filed</th>
                <th>Order & parties</th>
                <th>Reason</th>
                <th>Summary</th>
                <th>Status</th>
                <th className={styles.thRight} />
              </tr>
            </thead>
            <tbody>
              {filtered.map((d) => (
                <tr key={d.id} className={styles.tr}>
                  <td className={styles.td}>
                    <span className={styles.dateText}>{d.openedAt}</span>
                    <span className={styles.refText}>{d.id}</span>
                  </td>

                  <td className={styles.td}>
                    <span className={styles.orderRef}>Order {d.orderRef}</span>
                    <div className={styles.parties}>
                      <span className={styles.partyChip} data-role="complainant" title="Complainant">
                        C
                      </span>
                      <span className={styles.partyName}>{d.complainantName}</span>
                      <svg className={styles.arrowIcon} viewBox="0 0 16 16" fill="none" aria-hidden>
                        <path
                          d="M3 8h10M9 4l4 4-4 4"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                      <span className={styles.partyChip} data-role="respondent" title="Respondent">
                        R
                      </span>
                      <span className={styles.partyName}>{d.respondentName}</span>
                    </div>
                  </td>

                  <td className={styles.td}>
                    <span className={styles.reasonTag}>{d.reason}</span>
                  </td>

                  <td className={styles.td}>
                    <span className={styles.descText}>
                      {d.description.slice(0, 90)}
                      {d.description.length > 90 ? '…' : ''}
                    </span>
                  </td>

                  <td className={styles.td}>
                    <StatusBadge status={d.status} />
                  </td>

                  <td className={`${styles.td} ${styles.tdRight}`}>
                    <Link
                      href={`/admin/disputes/${d.id}`}
                      className={styles.viewBtn}
                      onClick={(e) => e.stopPropagation()}
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filtered.length === 0 && (
            <div className={styles.emptyState}>
              <svg className={styles.emptyIcon} viewBox="0 0 48 48" fill="none" aria-hidden>
                <circle cx="22" cy="22" r="14" stroke="currentColor" strokeWidth="2" />
                <path d="M32 32l8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
              <p className={styles.emptyTitle}>No disputes found</p>
              <p className={styles.emptyText}>Try a different search or status filter.</p>
            </div>
          )}
        </div>

        <div className={styles.tableFooter}>
          Showing <strong>{filtered.length}</strong> of <strong>{initialDisputes.length}</strong> disputes
        </div>
      </section>
    </div>
  )
}
