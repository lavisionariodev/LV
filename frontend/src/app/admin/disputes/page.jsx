'use client'

import { useMemo, useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import styles from './disputes.module.css'
import { TbX } from 'react-icons/tb'
import { LuSettings2 } from 'react-icons/lu'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useDebouncedEffect } from '@/shared/hooks'
import { readEnum, readString, replaceUrlQuery } from '@/lib/url/queryParams'
import { bulkStatusActionApplies } from '@/lib/admin/bulkEligibility'
import ConfirmModal from '@/components/ui/Modal/ConfirmModal'

const STATUS_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'open', label: 'Open' },
  { value: 'under_review', label: 'Under Review' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'closed', label: 'Closed' },
]

const STATUS_LABEL = Object.fromEntries(STATUS_OPTIONS.map((o) => [o.value, o.label]))

/** Light bg + matching border/text for bulk “Set status” actions */
function disputeBulkActionButtonStyles(statusValue) {
  switch (statusValue) {
    case 'open':
      return { background: '#fef2f2', color: '#b91c1c', border: '1px solid #b91c1c' }
    case 'under_review':
      return { background: '#fffbeb', color: '#b45309', border: '1px solid #b45309' }
    case 'resolved':
      return { background: '#f0fdf4', color: '#15803d', border: '1px solid #16a34a' }
    case 'closed':
      return { background: '#f1f5f9', color: '#475569', border: '1px solid #64748b' }
    default:
      return { background: '#f1f5f9', color: '#0f172a', border: '1px solid #0f172a' }
  }
}

const Icon = {
  Search: () => (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
      <path d="M18 18l3.5 3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
}

const UUID_LIKE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Table-friendly dispute reference (full UUIDs → short tail; compact ids unchanged). */
function disputeRefShortLabel(id) {
  const s = String(id ?? '').trim()
  if (!s) return ''
  if (UUID_LIKE.test(s)) {
    const tail = s.replace(/-/g, '').slice(-8)
    return tail ? `Ref ·${tail}` : ''
  }
  if (s.length > 16) return `${s.slice(0, 10)}…`
  return s
}

/** YYYY-MM-DD in the Date column — matches admin payouts escrow `t.date` display. */
function formatDisputeTableDate(iso) {
  if (iso == null || iso === '') return '—'
  const s = String(iso).trim()
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10)
  const t = new Date(s)
  return Number.isNaN(t.getTime()) ? '—' : t.toISOString().slice(0, 10)
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

function MobileFilterModal({ isOpen, onClose, statusFilter, setStatusFilter, tabCounts }) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div className={styles.filterModalOverlay} onClick={onClose}>
      <div className={styles.filterModal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.filterModalHandle} />
        <div className={styles.filterModalHeader}>
          <span className={styles.filterModalTitle}>Filter by status</span>
          <button
            type="button"
            className={styles.filterModalClose}
            onClick={onClose}
            aria-label="Close filters"
          >
            <TbX aria-hidden />
          </button>
        </div>
        <div className={styles.filterModalOptions}>
          {STATUS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              className={`${styles.filterModalOption}${
                statusFilter === opt.value
                  ? ` ${opt.value === 'all' ? styles.filterModalOptionActiveDefault : styles.filterModalOptionActive}`
                  : ''
              }`}
              onClick={() => {
                setStatusFilter(opt.value)
                onClose()
              }}
            >
              <span className={styles.filterModalOptionLabel}>{opt.label}</span>
              <span className={styles.filterModalOptionCount}>{tabCounts[opt.value] ?? 0}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function AdminDisputesPage() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [statusFilter, setStatusFilter] = useState(() =>
    readEnum(searchParams, 'status', STATUS_OPTIONS.map((o) => o.value), 'all')
  )
  const [search, setSearch] = useState(() => readString(searchParams, 'q', ''))
  const [filterModalOpen, setFilterModalOpen] = useState(false)
  const [selectedRows, setSelectedRows] = useState(() => new Set())

  // Sync state from URL (back/forward, shared links)
  useEffect(() => {
    const nextQ = readString(searchParams, 'q', '')
    const nextStatus = readEnum(searchParams, 'status', STATUS_OPTIONS.map((o) => o.value), 'all')
    queueMicrotask(() => {
      if (nextQ !== search) setSearch(nextQ)
      if (nextStatus !== statusFilter) setStatusFilter(nextStatus)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  // Sync URL <- state (debounce search typing)
  useDebouncedEffect(() => {
    replaceUrlQuery(router, pathname, searchParams, {
      q: search,
      status: { value: statusFilter, omitIf: 'all' },
    })
  }, [search, statusFilter, router, pathname, searchParams], 300)

  const [allDisputes, setAllDisputes] = useState([])
  const [listLoading, setListLoading] = useState(true)
  const [listError, setListError] = useState('')
  const [bulkBusy, setBulkBusy] = useState(false)
  const [bulkStatusConfirm, setBulkStatusConfirm] = useState(null)

  const disputeById = useMemo(() => {
    const m = new Map()
    for (const d of allDisputes) {
      if (d?.id != null) m.set(String(d.id), d)
    }
    return m
  }, [allDisputes])

  const loadDisputes = useCallback(async () => {
    setListError('')
    const res = await fetch('/api/admin/disputes', { cache: 'no-store' })
    const body = await res.json().catch(() => null)
    if (!res.ok) {
      setListError(typeof body?.error === 'string' ? body.error : 'Failed to load disputes.')
      setAllDisputes([])
      return
    }
    setAllDisputes(Array.isArray(body?.disputes) ? body.disputes : [])
  }, [])

  const requestBulkStatus = useCallback(
    (nextStatus) => {
      if (
        !bulkStatusActionApplies(
          selectedRows,
          (id) => disputeById.get(String(id)) ?? null,
          nextStatus,
        )
      ) {
        return
      }
      const ids = [...selectedRows]
      if (ids.length === 0) return
      setBulkStatusConfirm({ nextStatus, ids })
    },
    [selectedRows, disputeById],
  )

  const confirmBulkStatus = useCallback(async () => {
    if (!bulkStatusConfirm) return
    const { nextStatus, ids } = bulkStatusConfirm
    setBulkBusy(true)
    try {
      const results = await Promise.allSettled(
        ids.map((id) =>
          fetch(`/api/admin/disputes/${encodeURIComponent(id)}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ status: nextStatus }),
          }).then(async (res) => {
            if (!res.ok) {
              const body = await res.json().catch(() => null)
              throw new Error(body?.error || 'Failed to update.')
            }
            return res
          }),
        ),
      )
      const failed = results.filter((r) => r.status === 'rejected').length
      if (failed > 0) {
        window.alert(`${failed} dispute(s) failed to update.`)
      }
      setSelectedRows(new Set())
      setBulkStatusConfirm(null)
      await loadDisputes()
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('admin:disputes-changed'))
      }
    } finally {
      setBulkBusy(false)
    }
  }, [bulkStatusConfirm, loadDisputes])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setListLoading(true)
      await loadDisputes()
      if (!cancelled) setListLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [loadDisputes])

  const summary = useMemo(() => {
    const open = allDisputes.filter((d) => d.status === 'open').length
    const under_review = allDisputes.filter((d) => d.status === 'under_review').length
    const resolved = allDisputes.filter((d) => d.status === 'resolved').length
    const total = allDisputes.length
    return { total, open, under_review, resolved }
  }, [allDisputes])

  const tabCounts = useMemo(() => {
    const counts = { all: allDisputes.length }
    STATUS_OPTIONS.forEach(({ value }) => {
      if (value !== 'all') {
        counts[value] = allDisputes.filter((d) => d.status === value).length
      }
    })
    return counts
  }, [allDisputes])

  const filtered = useMemo(() => {
    return allDisputes.filter((d) => {
      if (statusFilter !== 'all' && d.status !== statusFilter) return false
      if (!search.trim()) return true
      const q = search.trim().toLowerCase()
      return (
        d.id.toLowerCase().includes(q) ||
        String(d.orderId ?? '').toLowerCase().includes(q) ||
        String(d.buyerId ?? '').toLowerCase().includes(q) ||
        String(d.sellerUserId ?? '').toLowerCase().includes(q) ||
        d.orderRef.toLowerCase().includes(q) ||
        d.complainantName.toLowerCase().includes(q) ||
        d.respondentName.toLowerCase().includes(q) ||
        d.reason.toLowerCase().includes(q) ||
        d.description.toLowerCase().includes(q) ||
        formatDisputeTableDate(d.openedAtIso).toLowerCase().includes(q) ||
        String(d.openedAtIso ?? '')
          .toLowerCase()
          .includes(q)
      )
    })
  }, [allDisputes, statusFilter, search])

  const activeFilterLabel = statusFilter !== 'all' ? STATUS_LABEL[statusFilter] : null

  return (
    <div className={styles.page}>
      {listError ? (
        <p role="alert" style={{ color: '#b91c1c', margin: '0 0 8px', fontSize: 14 }}>
          {listError}
        </p>
      ) : null}
      {/* ── Stats ── */}
      <section className={styles.statsGrid}>
        <div className={styles.statsBar} aria-label="Dispute summary">
          <div className={styles.statItem}>
            <div className={styles.statNumber}>
              {listLoading ? <span className={styles.disputesSkStat} aria-hidden /> : summary.open}
            </div>
            <div className={styles.statItemLabel}>Open</div>
          </div>
          <div className={styles.statItem}>
            <div className={styles.statNumber}>
              {listLoading ? <span className={styles.disputesSkStat} aria-hidden /> : summary.under_review}
            </div>
            <div className={styles.statItemLabel}>Under Review</div>
          </div>
        </div>
      </section>

      {/* ── Mobile-only standalone search bar (outside table panel) ── */}
      <div className={styles.mobileSearchSection}>
        <div className={`${styles.mobileSearchWrap}${activeFilterLabel ? ` ${styles.mobileSearchWrapActive}` : ''}`}>
          <span className={styles.mobileSearchIcon}>
            <Icon.Search />
          </span>
          <input
            type="search"
            placeholder="Search disputes…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={styles.mobileSearchInput}
            autoComplete="off"
          />
          {search.trim() ? (
            <button
              type="button"
              className={styles.mobileSearchClearBtn}
              onClick={() => setSearch('')}
              aria-label="Clear search"
            >
              <TbX aria-hidden />
            </button>
          ) : null}
          <div className={styles.mobileSearchDivider} />
          <button
            type="button"
            className={styles.mobileFilterBtn}
            onClick={() => setFilterModalOpen(true)}
            aria-label="Open filters"
          >
            <LuSettings2
              aria-hidden
              className={`${styles.mobileFilterIcon}${activeFilterLabel ? ` ${styles.mobileFilterIconActive}` : ''}`}
            />
          </button>
        </div>

        {activeFilterLabel && (
          <div className={styles.mobileActivePillsRow} aria-label="Active filters">
            <div className={styles.mobileActivePill}>
              <span className={styles.mobileActivePillLabel}>{activeFilterLabel}</span>
              <button
                type="button"
                className={styles.mobileActivePillClear}
                onClick={() => setStatusFilter('all')}
                aria-label="Clear filter"
              >
                <TbX aria-hidden />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Table panel ── */}
      <section className={styles.tablePanel}>
        <div className={styles.toolbar}>
          {/* Desktop tabs — hidden on mobile */}
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

          {/* Desktop search — hidden on mobile */}
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
              {search.trim() ? (
                <button
                  type="button"
                  className={styles.toolbarSearchClearBtn}
                  onClick={() => setSearch('')}
                  aria-label="Clear search"
                >
                  <TbX aria-hidden />
                </button>
              ) : null}
            </div>
          </div>
        </div>

        {/* ── Bulk action toolbar ── */}
        {selectedRows.size > 0 ? (
          <div
            style={{
              display: 'flex',
              gap: 8,
              alignItems: 'center',
              padding: '10px 12px',
              background: '#f8fafc',
              border: '1px solid #cbd5e1',
              borderRadius: 8,
              marginBottom: 10,
              flexWrap: 'wrap',
            }}
            aria-live="polite"
          >
            <span style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>
              {selectedRows.size} selected
            </span>
            {STATUS_OPTIONS.filter((o) => o.value !== 'all')
              .filter((opt) =>
                bulkStatusActionApplies(
                  selectedRows,
                  (id) => disputeById.get(String(id)) ?? null,
                  opt.value,
                ),
              )
              .map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => requestBulkStatus(opt.value)}
                  disabled={bulkBusy}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 6,
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: bulkBusy ? 'not-allowed' : 'pointer',
                    opacity: bulkBusy ? 0.5 : 1,
                    ...disputeBulkActionButtonStyles(opt.value),
                  }}
                >
                  {bulkBusy ? 'Working…' : `Set ${STATUS_LABEL[opt.value] ?? opt.value}`}
                </button>
              ))}
            <button
              type="button"
              onClick={() => setSelectedRows(new Set())}
              disabled={bulkBusy}
              style={{
                marginLeft: 'auto',
                padding: '6px 12px',
                background: '#ffffff',
                color: '#0f172a',
                border: '1px solid #0f172a',
                borderRadius: 6,
                fontSize: 12,
                fontWeight: 600,
                cursor: bulkBusy ? 'not-allowed' : 'pointer',
                opacity: bulkBusy ? 0.5 : 1,
              }}
            >
              Clear selection
            </button>
          </div>
        ) : null}

        {/* ── Desktop table (hidden on mobile) ── */}
        <div className={styles.tableWrap}>
          <table className={styles.table} aria-busy={listLoading}>
            <thead>
              <tr>
                <th className={styles.checkboxCell}>
                  <input
                    type="checkbox"
                    className={styles.rowCheckbox}
                    disabled={listLoading}
                    checked={filtered.length > 0 && filtered.every((d) => selectedRows.has(d.id))}
                    onChange={(e) => {
                      setSelectedRows((prev) => {
                        const next = new Set(prev)
                        if (e.target.checked) {
                          filtered.forEach((d) => next.add(d.id))
                        } else {
                          filtered.forEach((d) => next.delete(d.id))
                        }
                        return next
                      })
                    }}
                    aria-label="Select all disputes in view"
                  />
                </th>
                <th>Order</th>
                <th>Parties</th>
                <th>Reason</th>
                <th>Date</th>
                <th>Status</th>
                <th className={styles.thActionCol}>Action</th>
              </tr>
            </thead>
            <tbody>
              {listLoading ? (
                Array.from({ length: 7 }).map((_, i) => (
                  <tr key={`dis-sk-${i}`} className={styles.tr}>
                    <td className={styles.checkboxCell}>
                      <span className={styles.disputesSkBar} style={{ width: 16, height: 16, borderRadius: 4 }} aria-hidden />
                    </td>
                    {/* Order: order ref + optional short ref */}
                    <td className={styles.td}>
                      <span className={styles.disputesSkBar} style={{ height: 13, width: 112, marginBottom: 5 }} aria-hidden />
                      <span className={styles.disputesSkBar} style={{ height: 9, width: 76 }} aria-hidden />
                    </td>
                    {/* Parties: chip row (skeleton mimics flex row) */}
                    <td className={styles.td}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <span className={styles.disputesSkBar} style={{ width: 22, height: 22, borderRadius: 7, flexShrink: 0 }} aria-hidden />
                        <span className={styles.disputesSkBar} style={{ height: 11, width: 88, flex: '1 1 60px', minWidth: 48 }} aria-hidden />
                        <span className={styles.disputesSkBar} style={{ width: 13, height: 13, borderRadius: 2, flexShrink: 0 }} aria-hidden />
                        <span className={styles.disputesSkBar} style={{ width: 22, height: 22, borderRadius: 7, flexShrink: 0 }} aria-hidden />
                        <span className={styles.disputesSkBar} style={{ height: 11, width: 100, flex: '1 1 72px', minWidth: 56 }} aria-hidden />
                      </div>
                    </td>
                    {/* Reason pill */}
                    <td className={styles.td}>
                      <span className={styles.disputesSkBar} style={{ height: 24, width: 120, borderRadius: 999 }} aria-hidden />
                    </td>
                    {/* Date YYYY-MM-DD */}
                    <td className={styles.td}>
                      <span className={styles.disputesSkBar} style={{ height: 13, width: 92 }} aria-hidden />
                    </td>
                    {/* Status badge */}
                    <td className={styles.td}>
                      <span className={styles.disputesSkBar} style={{ height: 26, width: 88, borderRadius: 999 }} aria-hidden />
                    </td>
                    {/* View */}
                    <td className={`${styles.td} ${styles.tdActionCol}`}>
                      <span className={styles.disputesSkBar} style={{ height: 30, width: 76, borderRadius: 8 }} aria-hidden />
                    </td>
                  </tr>
                ))
              ) : filtered.map((d) => {
                const refLbl = disputeRefShortLabel(d.id)
                return (
                <tr key={d.id} className={styles.tr}>
                  <td className={styles.checkboxCell}>
                    <input
                      type="checkbox"
                      className={styles.rowCheckbox}
                      checked={selectedRows.has(d.id)}
                      onChange={(e) => {
                        setSelectedRows((prev) => {
                          const next = new Set(prev)
                          if (e.target.checked) next.add(d.id)
                          else next.delete(d.id)
                          return next
                        })
                      }}
                      aria-label={`Select dispute, order ${d.orderRef}`}
                    />
                  </td>
                  <td className={styles.td}>
                    <span className={styles.orderRef}>{d.orderRef}</span>
                    {refLbl ? <span className={styles.refText}>{refLbl}</span> : null}
                  </td>
                  <td className={styles.td}>
                    <div className={styles.parties}>
                      <span className={styles.partyChip} data-role="complainant" title="Complainant">C</span>
                      <span className={styles.partyName}>{d.complainantName}</span>
                      <svg className={styles.arrowIcon} viewBox="0 0 16 16" fill="none" aria-hidden>
                        <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      <span className={styles.partyChip} data-role="respondent" title="Respondent">R</span>
                      <span className={styles.partyName}>{d.respondentName}</span>
                    </div>
                  </td>
                  <td className={styles.td}>
                    <span className={styles.reasonTag}>{d.reason}</span>
                  </td>
                  <td className={styles.td}>
                    <span className={styles.dateCell}>{formatDisputeTableDate(d.openedAtIso)}</span>
                  </td>
                  <td className={styles.td}>
                    <StatusBadge status={d.status} />
                  </td>
                  <td className={`${styles.td} ${styles.tdActionCol}`}>
                    <Link href={`/admin/disputes/${d.id}`} className={styles.viewBtn} onClick={(e) => e.stopPropagation()}>
                      View
                    </Link>
                  </td>
                </tr>
                )
              })}
            </tbody>
          </table>

          {!listLoading && filtered.length === 0 && (
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

        {/* ── Mobile card list (hidden on desktop) ── */}
        <div className={styles.mobileList}>
          {listLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={`dis-m-sk-${i}`} className={styles.disputesSkMobileCardSk}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span className={styles.disputesSkBar} style={{ display: 'block', height: 14, width: '72%', marginBottom: 6 }} aria-hidden />
                    <span className={styles.disputesSkBar} style={{ display: 'block', height: 10, width: 100 }} aria-hidden />
                  </div>
                  <span className={styles.disputesSkBar} style={{ width: 72, height: 24, borderRadius: 999, flexShrink: 0 }} aria-hidden />
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6 }}>
                  <span className={styles.disputesSkBar} style={{ width: 22, height: 22, borderRadius: 7, flexShrink: 0 }} aria-hidden />
                  <span className={styles.disputesSkBar} style={{ height: 11, width: 80, flex: '1 1 72px' }} aria-hidden />
                  <span className={styles.disputesSkBar} style={{ width: 13, height: 13, flexShrink: 0 }} aria-hidden />
                  <span className={styles.disputesSkBar} style={{ width: 22, height: 22, borderRadius: 7, flexShrink: 0 }} aria-hidden />
                  <span className={styles.disputesSkBar} style={{ height: 11, width: 96, flex: '1 1 80px' }} aria-hidden />
                </div>
                <span className={styles.disputesSkBar} style={{ height: 24, width: 128, borderRadius: 999 }} aria-hidden />
                <span className={styles.disputesSkBar} style={{ height: 13, width: 92 }} aria-hidden />
                <span className={styles.disputesSkBar} style={{ height: 36, width: 120, borderRadius: 8, display: 'block', margin: '0 auto' }} aria-hidden />
              </div>
            ))
          ) : filtered.map((d) => {
            const refLbl = disputeRefShortLabel(d.id)
            return (
            <div key={d.id} className={styles.mobileCard}>
              <div className={styles.mobileCardHeader}>
                <div className={styles.mobileHeaderMain}>
                  <div className={styles.mobileTitle}>{d.orderRef}</div>
                  {refLbl ? <div className={styles.mobileSubtitle}>{refLbl}</div> : null}
                </div>
                <div className={styles.mobileBadgeWrap}>
                  <StatusBadge status={d.status} />
                </div>
              </div>

              <div className={styles.mobileCardBody}>
                <div className={styles.mobileField}>
                  <div className={styles.mobileFieldLabel}>Parties</div>
                  <div className={styles.parties}>
                    <span className={styles.partyChip} data-role="complainant" title="Complainant">C</span>
                    <span className={styles.partyName}>{d.complainantName}</span>
                    <svg className={styles.arrowIcon} viewBox="0 0 16 16" fill="none" aria-hidden>
                      <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <span className={styles.partyChip} data-role="respondent" title="Respondent">R</span>
                    <span className={styles.partyName}>{d.respondentName}</span>
                  </div>
                </div>
                <div className={styles.mobileField}>
                  <div className={styles.mobileFieldLabel}>Reason</div>
                  <span className={styles.reasonTag}>{d.reason}</span>
                </div>
                <div className={styles.mobileField}>
                  <div className={styles.mobileFieldLabel}>Date</div>
                  <span className={styles.dateCell}>{formatDisputeTableDate(d.openedAtIso)}</span>
                </div>
              </div>

              <div className={styles.mobileActions}>
                <Link href={`/admin/disputes/${d.id}`} className={`${styles.viewBtn} ${styles.mobileViewBtn}`}>
                  View
                </Link>
              </div>
            </div>
            )
          })}

          {!listLoading && filtered.length === 0 && (
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

        {!listLoading && filtered.length > 0 && (
          <div className={styles.tableFooter}>
            Showing <strong>{filtered.length}</strong> of <strong>{allDisputes.length}</strong> disputes
          </div>
        )}
      </section>

      <ConfirmModal
        open={bulkStatusConfirm != null}
        variant={
          bulkStatusConfirm?.nextStatus === 'closed'
            ? 'neutral'
            : bulkStatusConfirm?.nextStatus === 'resolved'
              ? 'primary'
              : bulkStatusConfirm?.nextStatus === 'open'
                ? 'danger'
                : 'warning'
        }
        title="Update selected disputes?"
        message={
          bulkStatusConfirm
            ? (() => {
                const label =
                  bulkStatusConfirm.nextStatus === 'under_review'
                    ? 'under review'
                    : STATUS_LABEL[bulkStatusConfirm.nextStatus] ?? bulkStatusConfirm.nextStatus
                return `Set ${bulkStatusConfirm.ids.length} selected dispute${bulkStatusConfirm.ids.length > 1 ? 's' : ''} to "${label}"?`
              })()
            : ''
        }
        confirmLabel="Apply"
        confirmLoadingLabel="Updating..."
        cancelLabel="Cancel"
        loading={bulkBusy}
        onCancel={() => {
          if (bulkBusy) return
          setBulkStatusConfirm(null)
        }}
        onConfirm={confirmBulkStatus}
      />

      {/* Mobile filter slide-up modal */}
      <MobileFilterModal
        isOpen={filterModalOpen}
        onClose={() => setFilterModalOpen(false)}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        tabCounts={tabCounts}
      />
    </div>
  )
}