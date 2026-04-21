'use client'

import { useMemo, useState, useEffect } from 'react'
import Link from 'next/link'
import styles from './disputes.module.css'
import { disputes as initialDisputes } from '@/data/adminSampleData'
import { TbX } from 'react-icons/tb'
import { LuSettings2 } from 'react-icons/lu'

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
              className={`${styles.filterModalOption}${statusFilter === opt.value ? ` ${styles.filterModalOptionActive}` : ''}`}
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
  const [statusFilter, setStatusFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [filterModalOpen, setFilterModalOpen] = useState(false)

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

  const activeFilterLabel = statusFilter !== 'all' ? STATUS_LABEL[statusFilter] : null

  return (
    <div className={styles.page}>

      {/* ── Stats ── */}
      <section className={styles.statsGrid}>
        <div className={styles.statsBar} aria-label="Dispute summary">
          <div className={styles.statItem}>
            <div className={styles.statNumber}>{summary.open}</div>
            <div className={styles.statItemLabel}>Open</div>
          </div>
          <div className={styles.statItem}>
            <div className={styles.statNumber}>{summary.under_review}</div>
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

        {/* ── Desktop table (hidden on mobile) ── */}
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Filed</th>
                <th>Order &amp; parties</th>
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

        {/* ── Mobile card list (hidden on desktop) ── */}
        <div className={styles.mobileList}>
          {filtered.map((d) => (
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

        {filtered.length > 0 && (
          <div className={styles.tableFooter}>
            Showing <strong>{filtered.length}</strong> of <strong>{initialDisputes.length}</strong> disputes
          </div>
        )}
      </section>

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