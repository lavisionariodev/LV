'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import styles from './disputes.module.css'
import { disputes as initialDisputes } from '@/data/adminSampleData'

const STATUS_OPTIONS = [
  { value: 'all',          label: 'All' },
  { value: 'open',         label: 'Open' },
  { value: 'under_review', label: 'Under Review' },
  { value: 'resolved',     label: 'Resolved' },
  { value: 'closed',       label: 'Closed' },
]

const PRIORITY_LABELS = {
  high:   { label: 'High',   cls: 'priorityHigh' },
  medium: { label: 'Medium', cls: 'priorityMed'  },
  low:    { label: 'Low',    cls: 'priorityLow'  },
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
    <div className={styles.pageRoot}>

      {/* Summary Cards */}
      <section className={styles.statsGrid}>
        <div className={styles.statCard}>
          <p className={styles.statLabel}>Total Disputes</p>
          <p className={styles.statValue}>{summary.total}</p>
          <p className={styles.statHint}>All time</p>
        </div>
        <div className={styles.statCard}>
          <p className={styles.statLabel}>Open</p>
          <p className={styles.statValue}>{summary.open}</p>
          <p className={styles.statHint}>Needs attention</p>
        </div>
        <div className={styles.statCard}>
          <p className={styles.statLabel}>Under Review</p>
          <p className={styles.statValue}>{summary.under_review}</p>
          <p className={styles.statHint}>Being investigated</p>
        </div>
        <div className={styles.statCard}>
          <p className={styles.statLabel}>Resolved</p>
          <p className={styles.statValue}>{summary.resolved}</p>
          <p className={styles.statHint}>Successfully closed</p>
        </div>
      </section>

      {/* Table Panel */}
      <section className={styles.tablePanel}>
        <div className={styles.tablePanelHead}>
          <p className={styles.tablePanelTitle}>Dispute List</p>

          <div className={styles.toolbar}>
            <div className={styles.filterGroup}>
              {STATUS_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  className={`${styles.filterBtn} ${statusFilter === opt.value ? styles.filterBtnActive : ''}`}
                  onClick={() => setStatusFilter(opt.value)}
                >
                  {opt.label}
                  {opt.value !== 'all' && (
                    <span className={styles.filterCount}>
                      {initialDisputes.filter((d) => d.status === opt.value).length}
                    </span>
                  )}
                </button>
              ))}
            </div>

            <div className={styles.searchWrap}>
              <svg className={styles.searchIcon} viewBox="0 0 20 20" fill="none">
                <circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M15 15l-3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              <input
                type="search"
                placeholder="Search ID, order, or parties…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className={styles.searchInput}
              />
            </div>
          </div>
        </div>

        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.th}>Date Filed</th>
                <th className={styles.th}>Order & Parties</th>
                <th className={styles.th}>Reason</th>
                <th className={styles.th}>Description</th>
                <th className={styles.th}>Status</th>
                <th className={`${styles.th} ${styles.thRight}`}>View</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((d) => (
                <tr key={d.id} className={styles.tr}>
                  <td className={styles.td}>
                    <span className={styles.dateText}>{d.openedAt}</span>
                    <br />
                    <span className={styles.refText}>{d.id}</span>
                  </td>

                  <td className={styles.td}>
                    <span className={styles.orderRef}>Order {d.orderRef}</span>
                    <div className={styles.parties}>
                      <span className={styles.complainantBadge}>C</span>
                      <span className={styles.partyName}>{d.complainantName}</span>
                      <svg className={styles.arrowIcon} viewBox="0 0 16 16" fill="none">
                        <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      <span className={styles.respondentBadge}>R</span>
                      <span className={styles.partyName}>{d.respondentName}</span>
                    </div>
                  </td>

                  <td className={styles.td}>
                    <span className={styles.reasonTag}>{d.reason}</span>
                  </td>

                  <td className={styles.td}>
                    <span className={styles.descText}>
                      {d.description.slice(0, 90)}{d.description.length > 90 ? '…' : ''}
                    </span>
                  </td>

                  <td className={styles.td}>
                    <span className={`${styles.badge} ${styles[`badge_${d.status}`]}`}>
                      {STATUS_OPTIONS.find((o) => o.value === d.status)?.label || d.status}
                    </span>
                  </td>

                  <td className={`${styles.td} ${styles.tdRight}`}>
                    <Link
                      href={`/admin/disputes/${d.id}`}
                      className={styles.viewLink}
                      onClick={(e) => e.stopPropagation()}
                    >
                      View →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filtered.length === 0 && (
            <div className={styles.emptyState}>
              <svg className={styles.emptyIcon} viewBox="0 0 48 48" fill="none">
                <circle cx="22" cy="22" r="14" stroke="#cbd5e1" strokeWidth="2"/>
                <path d="M32 32l8 8" stroke="#cbd5e1" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              <p className={styles.emptyText}>No disputes match the current filters.</p>
              <button className={styles.clearBtn} onClick={() => { setSearch(''); setStatusFilter('all') }}>
                Clear filters
              </button>
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