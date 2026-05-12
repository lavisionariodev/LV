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

function getInitials(name = '') {
  const parts = String(name).trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return 'D'
  const first = parts[0]?.[0] || ''
  const second = (parts.length > 1 ? parts[parts.length - 1]?.[0] : parts[0]?.[1]) || ''
  const initials = `${first}${second}`.toUpperCase()
  return initials || 'D'
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
        d.orderRef.toLowerCase().includes(q) ||
        d.complainantName.toLowerCase().includes(q) ||
        d.respondentName.toLowerCase().includes(q) ||
        d.reason.toLowerCase().includes(q) ||
        d.description.toLowerCase().includes(q)
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
                <th>Filed</th>
                <th>Order &amp; parties</th>
                <th>Reason</th>
                <th>Summary</th>
                <th>Status</th>
                <th className={styles.thRight} />
              </tr>
            </thead>
            <tbody>
              {listLoading ? (
                Array.from({ length: 7 }).map((_, i) => (
                  <tr key={`dis-sk-${i}`} className={styles.tr}>
                    <td className={styles.checkboxCell}>
                      <span className={styles.disputesSkBar} style={{ width: 16, height: 16, borderRadius: 4 }} aria-hidden />
                    </td>
                    <td className={styles.td}>
                      <span className={styles.disputesSkBar} style={{ height: 12, width: 72, marginBottom: 6 }} aria-hidden />
                      <span className={styles.disputesSkBar} style={{ height: 10, width: 100 }} aria-hidden />
                    </td>
                    <td className={styles.td}>
                      <span className={styles.disputesSkBar} style={{ height: 12, width: 120, marginBottom: 8 }} aria-hidden />
                      <span className={styles.disputesSkBar} style={{ height: 10, width: '90%' }} aria-hidden />
                    </td>
                    <td className={styles.td}>
                      <span className={styles.disputesSkBar} style={{ height: 22, width: 88, borderRadius: 999 }} aria-hidden />
                    </td>
                    <td className={styles.td}>
                      <span className={styles.disputesSkBar} style={{ height: 10, width: '100%' }} aria-hidden />
                      <span className={styles.disputesSkBar} style={{ height: 10, width: '85%', marginTop: 6 }} aria-hidden />
                    </td>
                    <td className={styles.td}>
                      <span className={styles.disputesSkBar} style={{ height: 24, width: 96, borderRadius: 999 }} aria-hidden />
                    </td>
                    <td className={`${styles.td} ${styles.tdRight}`}>
                      <span className={styles.disputesSkBar} style={{ height: 28, width: 52, borderRadius: 8 }} aria-hidden />
                    </td>
                  </tr>
                ))
              ) : filtered.map((d) => (
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
                      aria-label={`Select dispute ${d.id}`}
                    />
                  </td>
                  <td className={styles.td}>
                    <span className={styles.dateText}>{d.openedAt}</span>
                    <span className={styles.refText}>{d.id}</span>
                  </td>
                  <td className={styles.td}>
                    <span className={styles.orderRef}>Order {d.orderRef}</span>
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
                    <span className={styles.descText}>
                      {d.description.slice(0, 90)}{d.description.length > 90 ? '…' : ''}
                    </span>
                  </td>
                  <td className={styles.td}>
                    <StatusBadge status={d.status} />
                  </td>
                  <td className={`${styles.td} ${styles.tdRight}`}>
                    <Link href={`/admin/disputes/${d.id}`} className={styles.viewBtn} onClick={(e) => e.stopPropagation()}>
                      View
                    </Link>
                  </td>
                </tr>
              ))}
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
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                  <span className={styles.disputesSkBar} style={{ width: 40, height: 40, borderRadius: 999 }} aria-hidden />
                  <span className={styles.disputesSkBar} style={{ width: 72, height: 24, borderRadius: 999 }} aria-hidden />
                </div>
                <span className={styles.disputesSkBar} style={{ height: 14, width: '70%' }} aria-hidden />
                <span className={styles.disputesSkBar} style={{ height: 12, width: '50%' }} aria-hidden />
                <span className={styles.disputesSkBar} style={{ height: 40, width: '100%' }} aria-hidden />
                <span className={styles.disputesSkBar} style={{ height: 40, width: '100%', borderRadius: 10 }} aria-hidden />
              </div>
            ))
          ) : filtered.map((d) => (
            <div key={d.id} className={styles.mobileCard}>
              {/* Header: avatar + identity + status badge */}
              <div className={styles.mobileCardHeader}>
                <div className={styles.mobileIdentity}>
                  <div className={styles.mobileAvatar} aria-hidden>
                    {getInitials(d.complainantName)}
                  </div>
                  <div className={styles.mobileIdentityText}>
                    <div className={styles.mobileTitle}>{d.complainantName}</div>
                    <div className={styles.mobileSubtitle}>
                      Order {d.orderRef}
                      <span className={styles.mobileSubtitleDot} aria-hidden>•</span>
                      {d.id}
                    </div>
                  </div>
                </div>
                <div className={styles.mobileBadgeWrap}>
                  <StatusBadge status={d.status} />
                </div>
              </div>

              {/* Details: Filed / Order / Reason */}
              <div className={styles.mobileDetails}>
                <div className={styles.mobileDetailItem}>
                  <div className={styles.mobileDetailLabel}>Filed</div>
                  <div className={styles.mobileDetailValue}>{d.openedAt}</div>
                </div>
                <div className={styles.mobileDetailItem}>
                  <div className={styles.mobileDetailLabel}>Order</div>
                  <div className={styles.mobileDetailValue}>{d.orderRef}</div>
                </div>
                <div className={styles.mobileDetailItem}>
                  <div className={styles.mobileDetailLabel}>Reason</div>
                  <div className={styles.mobileDetailValue}>{d.reason}</div>
                </div>
              </div>

              {/* Summary snippet */}
              <div className={styles.mobileSummary}>
                {d.description.slice(0, 120)}
                {d.description.length > 120 ? '…' : ''}
              </div>

              {/* Action */}
              <div className={styles.mobileActions}>
                <Link href={`/admin/disputes/${d.id}`} className={`${styles.viewBtn} ${styles.mobileViewBtn}`}>
                  View details
                </Link>
              </div>
            </div>
          ))}

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
          bulkStatusConfirm?.nextStatus === 'resolved' || bulkStatusConfirm?.nextStatus === 'closed'
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