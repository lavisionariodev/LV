'use client'

import { useMemo, useState } from 'react'
import styles from './payouts.module.css'
import {
  payments as initialPayments,
} from '@/data/adminSampleData'

const STATUS_LABELS = {
  pending: 'Pending',
  approved: 'Approved',
  transferred: 'Transferred',
  failed: 'Failed',
}

const DEFAULT_COMMISSION_RATE = 10

export default function AdminPayoutsPage() {
  const [rows, setRows] = useState(initialPayments)
  const [statusFilter, setStatusFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [commissionRate, setCommissionRate] = useState(DEFAULT_COMMISSION_RATE)
  const [editingRate, setEditingRate] = useState(false)
  const [rateInput, setRateInput] = useState(String(DEFAULT_COMMISSION_RATE))
  const [expandedRow, setExpandedRow] = useState(null)

  const summary = useMemo(() => {
    const total = rows.length
    const pending = rows.filter((r) => r.status === 'pending').length
    const ready = rows.filter((r) => r.status === 'approved').length
    const transferredAmount = rows
      .filter((r) => r.status === 'transferred')
      .reduce((sum, r) => sum + r.amount, 0)
    const totalCommission = rows
      .filter((r) => r.status === 'transferred')
      .reduce((sum, r) => sum + Math.round(r.amount * (commissionRate / 100)), 0)
    return { total, pending, ready, transferredAmount, totalCommission }
  }, [rows, commissionRate])

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
      prev.map((row) => (row.id === id ? { ...row, status: nextStatus } : row))
    )
  }

  const saveRate = () => {
    const parsed = parseFloat(rateInput)
    if (!isNaN(parsed) && parsed >= 0 && parsed <= 100) {
      setCommissionRate(parsed)
    }
    setEditingRate(false)
  }

  return (
    <div className={styles.pageRoot}>

      {/* Commission Rate Editor */}
        <div className={styles.commissionCard}>
          <div className={styles.commissionCardLeft}>
            <span className={styles.commissionDot} />
            <div>
              <p className={styles.commissionLabel}>Platform Commission Rate</p>
              <p className={styles.commissionHint}>Applied to all transactions</p>
            </div>
          </div>
          {editingRate ? (
            <div className={styles.commissionEditRow}>
              <input
                className={styles.commissionInput}
                type="number"
                min="0"
                max="100"
                step="0.5"
                value={rateInput}
                onChange={(e) => setRateInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && saveRate()}
                autoFocus
              />
              <span className={styles.commissionPct}>%</span>
              <button className={styles.saveBtn} onClick={saveRate}>Save</button>
              <button className={styles.cancelBtn} onClick={() => setEditingRate(false)}>Cancel</button>
            </div>
          ) : (
            <div className={styles.commissionDisplayRow}>
              <span className={styles.commissionValue}>{commissionRate}%</span>
              <button
                className={styles.editRateBtn}
                onClick={() => { setRateInput(String(commissionRate)); setEditingRate(true) }}
              >
                Edit
              </button>
            </div>
          )}
        </div>

      {/* Summary Cards */}
      <section className={styles.statsGrid}>
        <div className={styles.statCard}>
          <p className={styles.statLabel}>Total Transactions</p>
          <p className={styles.statValue}>{summary.total}</p>
          <p className={styles.statHint}>All time</p>
        </div>
        <div className={styles.statCard}>
          <p className={styles.statLabel}>Pending Approval</p>
          <p className={styles.statValue}>{summary.pending}</p>
          <p className={styles.statHint}>Awaiting admin action</p>
        </div>
        <div className={styles.statCard}>
          <p className={styles.statLabel}>Ready to Transfer</p>
          <p className={styles.statValue}>{summary.ready}</p>
          <p className={styles.statHint}>Approved, not yet sent</p>
        </div>
        <div className={styles.statCard}>
          <p className={styles.statLabel}>Total Transferred</p>
          <p className={styles.statValue}>₱{summary.transferredAmount.toLocaleString()}</p>
          <p className={styles.statHint}>
            Commission earned: ₱{summary.totalCommission.toLocaleString()}
          </p>
        </div>
      </section>

      {/* Table Panel */}
      <section className={styles.tablePanel}>
        <div className={styles.tablePanelHead}>
          <p className={styles.tablePanelTitle}>Transaction List</p>
          <div className={styles.toolbar}>
            <div className={styles.filterGroup}>
              {['all', 'pending', 'approved', 'transferred', 'failed'].map((s) => (
                <button
                  key={s}
                  className={`${styles.filterBtn} ${statusFilter === s ? styles.filterBtnActive : ''}`}
                  onClick={() => setStatusFilter(s)}
                >
                  {s === 'all' ? 'All' : STATUS_LABELS[s]}
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
                placeholder="Search ID, buyer, or seller…"
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
                <th className={styles.th}>Date & Reference</th>
                <th className={styles.th}>Buyer → Seller</th>
                <th className={styles.th}>Amount</th>
                <th className={styles.th}>Commission Split</th>
                <th className={styles.th}>Status</th>
                <th className={`${styles.th} ${styles.thRight}`}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => {
                const lvShare = Math.round(row.amount * (commissionRate / 100))
                const sellerShare = row.amount - lvShare
                const isExpanded = expandedRow === row.id

                return (
                  <>
                    <tr
                      key={row.id}
                      className={`${styles.tr} ${isExpanded ? styles.trExpanded : ''}`}
                      onClick={() => setExpandedRow(isExpanded ? null : row.id)}
                    >
                      <td className={styles.td}>
                        <span className={styles.dateText}>{row.date}</span>
                        <br />
                        <span className={styles.refText}>{row.id} · {row.orderRef}</span>
                      </td>

                      <td className={styles.td}>
                        <div className={styles.parties}>
                          <span className={styles.buyerBadge}>B</span>
                          <span className={styles.partyName}>{row.buyerName}</span>
                          <svg className={styles.arrowIcon} viewBox="0 0 16 16" fill="none">
                            <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                          <span className={styles.sellerBadge}>S</span>
                          <span className={styles.partyName}>{row.sellerName}</span>
                        </div>
                      </td>

                      <td className={styles.td}>
                        <span className={styles.amountText}>₱{row.amount.toLocaleString()}</span>
                      </td>

                      <td className={styles.td}>
                        <div className={styles.splitBarWrap}>
                          <div className={styles.splitBarTrack}>
                            <div
                              className={styles.splitBarFill}
                              style={{ width: `${commissionRate}%` }}
                            />
                          </div>
                          <div className={styles.splitLabels}>
                            <span className={styles.splitLV}>Platform ₱{lvShare.toLocaleString()}</span>
                            <span className={styles.splitSeller}>Seller ₱{sellerShare.toLocaleString()}</span>
                          </div>
                        </div>
                      </td>

                      <td className={styles.td}>
                        <span className={`${styles.badge} ${styles[`badge_${row.status}`]}`}>
                          {STATUS_LABELS[row.status] || row.status}
                        </span>
                      </td>

                      <td className={`${styles.td} ${styles.tdRight}`}>
                        <div className={styles.actionsCell} onClick={(e) => e.stopPropagation()}>
                          {row.status === 'pending' && (
                            <button
                              className={styles.btnApprove}
                              onClick={() => updateStatus(row.id, 'approved')}
                            >
                              Approve
                            </button>
                          )}
                          {row.status === 'approved' && (
                            <button
                              className={styles.btnTransfer}
                              onClick={() => updateStatus(row.id, 'transferred')}
                            >
                              Transfer
                            </button>
                          )}
                          {row.status === 'transferred' && (
                            <span className={styles.completedTag}>✓ Completed</span>
                          )}
                          {row.status === 'failed' && (
                            <span className={styles.failedTag}>✕ Failed</span>
                          )}
                        </div>
                      </td>
                    </tr>

                    {isExpanded && (
                      <tr key={`${row.id}-exp`} className={styles.expandedRow}>
                        <td colSpan={6} className={styles.expandedTd}>
                          <div className={styles.expandedGrid}>
                            <div className={styles.expandedItem}>
                              <p className={styles.expandedLabel}>Transaction ID</p>
                              <p className={styles.expandedVal}>{row.id}</p>
                            </div>
                            <div className={styles.expandedItem}>
                              <p className={styles.expandedLabel}>Order Reference</p>
                              <p className={styles.expandedVal}>{row.orderRef}</p>
                            </div>
                            <div className={styles.expandedItem}>
                              <p className={styles.expandedLabel}>Gross Amount</p>
                              <p className={styles.expandedVal}>₱{row.amount.toLocaleString()}</p>
                            </div>
                            <div className={styles.expandedItem}>
                              <p className={styles.expandedLabel}>Platform ({commissionRate}%)</p>
                              <p className={styles.expandedVal}>₱{lvShare.toLocaleString()}</p>
                            </div>
                            <div className={styles.expandedItem}>
                              <p className={styles.expandedLabel}>Seller Net Payout</p>
                              <p className={styles.expandedVal}>₱{sellerShare.toLocaleString()}</p>
                            </div>
                            <div className={styles.expandedItem}>
                              <p className={styles.expandedLabel}>Status</p>
                              <p className={styles.expandedVal}>{STATUS_LABELS[row.status]}</p>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                )
              })}
            </tbody>
          </table>

          {filtered.length === 0 && (
            <div className={styles.emptyState}>
              <svg className={styles.emptyIcon} viewBox="0 0 48 48" fill="none">
                <circle cx="22" cy="22" r="14" stroke="#cbd5e1" strokeWidth="2"/>
                <path d="M32 32l8 8" stroke="#cbd5e1" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              <p className={styles.emptyText}>No payouts match the current filters.</p>
              <button className={styles.clearBtn} onClick={() => { setSearch(''); setStatusFilter('all') }}>
                Clear filters
              </button>
            </div>
          )}
        </div>

        <div className={styles.tableFooter}>
          Showing <strong>{filtered.length}</strong> of <strong>{rows.length}</strong> transactions
        </div>
      </section>
    </div>
  )
}