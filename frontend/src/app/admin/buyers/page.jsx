'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { FiRotateCcw } from 'react-icons/fi'
import { TbX, TbDots } from 'react-icons/tb'
import { LuSettings2 } from 'react-icons/lu'
import styles from './buyers.module.css'
import { useDebouncedEffect, useMediaQuery } from '@/shared/hooks'
import { Dropdown } from '@/components/ui'
import ConfirmModal from '@/components/ui/Modal/ConfirmModal'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { readEnum, readString, replaceUrlQuery } from '@/lib/url/queryParams'

const STATUS_FILTER_OPTIONS = [
  { value: 'all', label: 'All statuses', color: 'slate' },
  { value: 'active', label: 'Active', color: 'green' },
  { value: 'suspended', label: 'Suspended', color: 'red' },
]

const Icon = {
  Search: () => (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
      <path d="M18 18l3.5 3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
}

function normalizeAvatarUrl(url) {
  if (url == null || typeof url !== 'string') return null
  const t = url.trim()
  return t.length ? t : null
}

function Avatar({ name, src }) {
  const [imgError, setImgError] = useState(false)
  const label = name || 'Buyer'
  const url = normalizeAvatarUrl(src)
  const showImg = url && !imgError

  if (showImg) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt=""
        className={styles.avatar}
        onError={() => setImgError(true)}
      />
    )
  }

  return (
    <div className={`${styles.avatar} ${styles.avatarDefault}`} title={label} aria-hidden>
      <svg viewBox="0 0 24 24" fill="none" className={styles.avatarIcon}>
        <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.5" />
        <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    </div>
  )
}

function BuyerActionsMenu({ buyer, onView, onSuspend, onReactivate, busy }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const isSuspended = buyer.status === 'suspended'

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={`Actions for ${buyer.fullName}`}
        disabled={busy}
        style={{
          background: 'transparent',
          border: '1px solid #e2e8f0',
          padding: '6px 8px',
          borderRadius: 6,
          cursor: busy ? 'not-allowed' : 'pointer',
          opacity: busy ? 0.6 : 1,
        }}
      >
        <TbDots aria-hidden />
      </button>
      {open ? (
        <div
          style={{
            position: 'absolute',
            right: 0,
            top: 'calc(100% + 4px)',
            background: '#fff',
            border: '1px solid #e2e8f0',
            borderRadius: 8,
            boxShadow: '0 4px 12px rgba(15, 23, 42, 0.08)',
            zIndex: 5,
            minWidth: 180,
            padding: 4,
          }}
        >
          <button
            type="button"
            onClick={() => {
              setOpen(false)
              onView?.(buyer)
            }}
            style={menuItemStyle}
          >
            View details
          </button>
          {isSuspended ? (
            <button
              type="button"
              onClick={() => {
                setOpen(false)
                onReactivate?.(buyer)
              }}
              style={menuItemStyle}
            >
              Reactivate
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                setOpen(false)
                onSuspend?.(buyer)
              }}
              style={{ ...menuItemStyle, color: '#b91c1c' }}
            >
              Suspend
            </button>
          )}
        </div>
      ) : null}
    </div>
  )
}

const menuItemStyle = {
  display: 'block',
  width: '100%',
  textAlign: 'left',
  padding: '8px 10px',
  background: 'transparent',
  border: 0,
  borderRadius: 6,
  cursor: 'pointer',
  fontSize: 13,
}

function BuyerDetailModal({ buyer, onClose, onSuspend, onReactivate, busy }) {
  if (!buyer) return null
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Buyer details"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 23, 42, 0.45)',
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#fff',
          borderRadius: 12,
          maxWidth: 520,
          width: '100%',
          padding: 20,
          boxShadow: '0 24px 60px rgba(15, 23, 42, 0.25)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 style={{ margin: 0, fontSize: 16 }}>Buyer details</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{ background: 'transparent', border: 0, fontSize: 22, cursor: 'pointer' }}
          >
            ×
          </button>
        </div>

        <div style={{ display: 'flex', gap: 12, marginTop: 14, alignItems: 'center' }}>
          <Avatar name={buyer.fullName} src={buyer.avatarUrl} />
          <div>
            <p style={{ margin: 0, fontWeight: 600 }}>{buyer.fullName}</p>
            <p style={{ margin: '2px 0 0', color: '#475569', fontSize: 13 }}>{buyer.email}</p>
          </div>
        </div>

        <dl style={{ marginTop: 16, display: 'grid', gridTemplateColumns: '120px 1fr', rowGap: 8 }}>
          <dt style={dtStyle}>Status</dt>
          <dd style={ddStyle}>
            <span
              className={`${styles.statusBadge} ${styles[`status_${buyer.status}`] || ''}`}
              style={{ textTransform: 'capitalize' }}
            >
              <span className={styles.statusDot} />
              {buyer.status}
            </span>
          </dd>
          <dt style={dtStyle}>Phone</dt>
          <dd style={ddStyle}>{buyer.phone || '—'}</dd>
          <dt style={dtStyle}>Joined</dt>
          <dd style={ddStyle}>{buyer.joinedAt}</dd>
          <dt style={dtStyle}>Orders</dt>
          <dd style={ddStyle}>
            {buyer.orderCount}{' '}
            <Link
              href={`/admin/payouts?q=${encodeURIComponent(buyer.id)}`}
              style={{ marginLeft: 8 }}
            >
              View in payouts →
            </Link>
          </dd>
          <dt style={dtStyle}>Disputes</dt>
          <dd style={ddStyle}>
            <Link href={`/admin/disputes?q=${encodeURIComponent(buyer.id)}`}>
              Search disputes →
            </Link>
          </dd>
          <dt style={dtStyle}>Buyer ID</dt>
          <dd style={{ ...ddStyle, fontFamily: 'monospace', wordBreak: 'break-all' }}>
            {buyer.id}
          </dd>
        </dl>

        <div style={{ marginTop: 18, display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          {buyer.status === 'suspended' ? (
            <button
              type="button"
              onClick={() => onReactivate?.(buyer)}
              disabled={busy}
              style={primaryBtnStyle}
            >
              {busy ? 'Working…' : 'Reactivate buyer'}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onSuspend?.(buyer)}
              disabled={busy}
              style={{ ...primaryBtnStyle, background: '#b91c1c' }}
            >
              {busy ? 'Working…' : 'Suspend buyer'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

const dtStyle = { fontSize: 12, color: '#64748b', margin: 0 }
const ddStyle = { fontSize: 13, color: '#0f172a', margin: 0 }
const primaryBtnStyle = {
  padding: '8px 14px',
  borderRadius: 8,
  border: 0,
  background: '#0f172a',
  color: '#fff',
  fontWeight: 600,
  cursor: 'pointer',
}

export default function AdminBuyersPage() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const isMobile = useMediaQuery('(max-width: 640px)')
  const [search, setSearch] = useState(() => readString(searchParams, 'q', ''))
  const [statusFilter, setStatusFilter] = useState(() =>
    readEnum(searchParams, 'status', STATUS_FILTER_OPTIONS.map((o) => o.value), 'all'),
  )
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [buyers, setBuyers] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedRows, setSelectedRows] = useState(() => new Set())
  const [detailBuyer, setDetailBuyer] = useState(null)
  const [busyId, setBusyId] = useState(null)
  const [bulkBusy, setBulkBusy] = useState(false)
  const [statusConfirm, setStatusConfirm] = useState(null)

  useEffect(() => {
    const nextQ = readString(searchParams, 'q', '')
    const nextStatus = readEnum(
      searchParams,
      'status',
      STATUS_FILTER_OPTIONS.map((o) => o.value),
      'all',
    )
    queueMicrotask(() => {
      if (nextQ !== search) setSearch(nextQ)
      if (nextStatus !== statusFilter) setStatusFilter(nextStatus)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  useDebouncedEffect(
    () => {
      replaceUrlQuery(router, pathname, searchParams, {
        q: search,
        status: { value: statusFilter, omitIf: 'all' },
      })
    },
    [search, statusFilter, router, pathname, searchParams],
    300,
  )

  useEffect(() => {
    if (!isMobile || !filtersOpen) return
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    function onKeyDown(e) {
      if (e.key === 'Escape') setFiltersOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = prevOverflow
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [filtersOpen, isMobile])

  const loadBuyers = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/buyers', { credentials: 'include', cache: 'no-store' })
      const body = await res.json().catch(() => null)
      if (!res.ok) {
        setError(new Error(body?.error || 'Failed to load buyers.'))
        setBuyers([])
        return
      }
      const next = (body?.buyers || []).map((row) => ({
        id: row.id,
        fullName: row.fullName || row.email || '—',
        name: row.fullName || row.email || '—',
        email: row.email || '—',
        role: 'buyer',
        phone: row.phone || null,
        joinedAt: row.createdAt ? new Date(row.createdAt).toISOString().slice(0, 10) : '—',
        status: row.status || 'active',
        avatarUrl: normalizeAvatarUrl(row.avatarUrl),
        orderCount: Number(row.orderCount) || 0,
      }))
      setBuyers(next)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    queueMicrotask(() => {
      loadBuyers()
    })
  }, [loadBuyers])

  const updateStatus = useCallback(
    async (buyerId, nextStatus) => {
      const res = await fetch(
        `/api/admin/buyers/${encodeURIComponent(buyerId)}/status`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ status: nextStatus }),
        },
      )
      const body = await res.json().catch(() => null)
      if (!res.ok) {
        throw new Error(body?.error || 'Failed to update buyer status.')
      }
      return body
    },
    [],
  )

  const requestSuspendBuyer = useCallback((buyer) => {
    if (!buyer?.id) return
    setStatusConfirm({ kind: 'suspend', buyer })
  }, [])

  const requestReactivateBuyer = useCallback((buyer) => {
    if (!buyer?.id) return
    setStatusConfirm({ kind: 'reactivate', buyer })
  }, [])

  const requestBulkBuyerStatus = useCallback(
    (nextStatus) => {
      const ids = [...selectedRows]
      if (ids.length === 0) return
      setStatusConfirm({ kind: 'bulk', nextStatus, ids })
    },
    [selectedRows],
  )

  const handleStatusConfirm = useCallback(async () => {
    if (!statusConfirm) return
    if (statusConfirm.kind === 'suspend') {
      const { buyer } = statusConfirm
      setBusyId(buyer.id)
      try {
        await updateStatus(buyer.id, 'suspended')
        setBuyers((prev) =>
          prev.map((b) => (b.id === buyer.id ? { ...b, status: 'suspended' } : b)),
        )
        setDetailBuyer((d) => (d?.id === buyer.id ? { ...d, status: 'suspended' } : d))
        setStatusConfirm(null)
      } catch (err) {
        window.alert(err?.message || 'Failed to suspend buyer.')
      } finally {
        setBusyId(null)
      }
      return
    }
    if (statusConfirm.kind === 'reactivate') {
      const { buyer } = statusConfirm
      setBusyId(buyer.id)
      try {
        await updateStatus(buyer.id, 'active')
        setBuyers((prev) =>
          prev.map((b) => (b.id === buyer.id ? { ...b, status: 'active' } : b)),
        )
        setDetailBuyer((d) => (d?.id === buyer.id ? { ...d, status: 'active' } : d))
        setStatusConfirm(null)
      } catch (err) {
        window.alert(err?.message || 'Failed to reactivate buyer.')
      } finally {
        setBusyId(null)
      }
      return
    }
    const { nextStatus, ids } = statusConfirm
    setBulkBusy(true)
    try {
      const results = await Promise.allSettled(ids.map((id) => updateStatus(id, nextStatus)))
      const okIds = []
      results.forEach((r, idx) => {
        if (r.status === 'fulfilled') okIds.push(ids[idx])
      })
      if (okIds.length > 0) {
        setBuyers((prev) =>
          prev.map((b) => (okIds.includes(b.id) ? { ...b, status: nextStatus } : b)),
        )
      }
      const failed = results.length - okIds.length
      if (failed > 0) {
        window.alert(`${failed} buyer(s) failed to update.`)
      }
      setSelectedRows(new Set())
      setStatusConfirm(null)
    } finally {
      setBulkBusy(false)
    }
  }, [statusConfirm, updateStatus])

  const filtered = useMemo(() => {
    return buyers.filter((buyer) => {
      if (statusFilter !== 'all' && buyer.status !== statusFilter) return false
      if (!search.trim()) return true
      const q = search.trim().toLowerCase()
      return (
        buyer.name.toLowerCase().includes(q) ||
        buyer.email.toLowerCase().includes(q) ||
        buyer.id.toLowerCase().includes(q)
      )
    })
  }, [buyers, search, statusFilter])

  const hasFilters = Boolean(search.trim()) || statusFilter !== 'all'

  const clearFilters = () => {
    setSearch('')
    setStatusFilter('all')
  }

  const statusLabel =
    STATUS_FILTER_OPTIONS.find((o) => o.value === statusFilter)?.label ?? 'All statuses'
  const activeFilterLabel = statusFilter !== 'all' ? statusLabel : null

  const selectedCount = selectedRows.size

  return (
    <div className={styles.pageRoot}>
      <section className={styles.tablePanel}>
        <div className={styles.toolbar}>
          <div className={styles.toolbarRow}>
            <div className={styles.toolbarControls}>
              {isMobile ? (
                <div className={styles.mobileSearchSection}>
                  <div
                    className={`${styles.mobileSearchWrap}${
                      statusFilter !== 'all' ? ` ${styles.mobileSearchWrapActive}` : ''
                    }`}
                  >
                    <span className={styles.mobileSearchIcon}>
                      <Icon.Search />
                    </span>
                    <input
                      className={styles.mobileSearchInput}
                      type="search"
                      placeholder="Search name, email, or ID…"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
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
                      onClick={() => setFiltersOpen(true)}
                      aria-haspopup="dialog"
                      aria-expanded={filtersOpen}
                      aria-label="Open filters"
                    >
                      <LuSettings2
                        aria-hidden
                        className={`${styles.mobileFilterIcon}${
                          statusFilter !== 'all' ? ` ${styles.mobileFilterIconActive}` : ''
                        }`}
                      />
                    </button>
                  </div>
                  {activeFilterLabel && (
                    <div className={styles.mobileActivePillsRow} aria-label="Active filters">
                      <div className={styles.mobileActivePill}>
                        <span className={styles.mobileActivePillLabel}>
                          {activeFilterLabel}
                        </span>
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
              ) : (
                <>
                  <div className={styles.toolbarSearchWrap}>
                    <Icon.Search />
                    <input
                      className={styles.toolbarSearchInput}
                      type="search"
                      placeholder="Search name, email, or ID…"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
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
                  <Dropdown
                    value={statusFilter}
                    onChange={setStatusFilter}
                    ariaLabel="Buyer status"
                    options={STATUS_FILTER_OPTIONS}
                    placeholder="All statuses"
                  />
                </>
              )}
            </div>

            <button
              type="button"
              className={styles.toolbarClearAll}
              onClick={clearFilters}
              disabled={!hasFilters}
            >
              <FiRotateCcw className={styles.toolbarClearIcon} aria-hidden />
              Clear All
            </button>
          </div>

          {selectedCount > 0 ? (
            <div
              style={{
                display: 'flex',
                gap: 8,
                padding: '10px 12px',
                background: '#f8fafc',
                borderTop: '1px solid #e2e8f0',
                alignItems: 'center',
              }}
              aria-live="polite"
            >
              <span style={{ fontSize: 13, fontWeight: 500 }}>
                {selectedCount} selected
              </span>
              <button
                type="button"
                onClick={() => requestBulkBuyerStatus('suspended')}
                disabled={bulkBusy}
                style={{
                  padding: '6px 12px',
                  background: '#b91c1c',
                  color: '#fff',
                  border: 0,
                  borderRadius: 6,
                  fontSize: 13,
                  cursor: bulkBusy ? 'not-allowed' : 'pointer',
                }}
              >
                {bulkBusy ? 'Working…' : 'Suspend selected'}
              </button>
              <button
                type="button"
                onClick={() => requestBulkBuyerStatus('active')}
                disabled={bulkBusy}
                style={{
                  padding: '6px 12px',
                  background: '#0f172a',
                  color: '#fff',
                  border: 0,
                  borderRadius: 6,
                  fontSize: 13,
                  cursor: bulkBusy ? 'not-allowed' : 'pointer',
                }}
              >
                {bulkBusy ? 'Working…' : 'Reactivate selected'}
              </button>
              <button
                type="button"
                onClick={() => setSelectedRows(new Set())}
                disabled={bulkBusy}
                style={{
                  padding: '6px 12px',
                  background: 'transparent',
                  color: '#475569',
                  border: '1px solid #e2e8f0',
                  borderRadius: 6,
                  fontSize: 13,
                  cursor: 'pointer',
                  marginLeft: 'auto',
                }}
              >
                Clear selection
              </button>
            </div>
          ) : null}
        </div>

        {isMobile && filtersOpen && (
          <div
            className={styles.filterSheetOverlay}
            role="presentation"
            onClick={() => setFiltersOpen(false)}
          >
            <div
              className={styles.filterSheet}
              role="dialog"
              aria-modal="true"
              aria-label="Filters"
              onClick={(e) => e.stopPropagation()}
            >
              <div className={styles.filterSheetHandle} aria-hidden />
              <div className={styles.filterSheetHeader}>
                <p className={styles.filterSheetTitle}>Filter</p>
                <button
                  type="button"
                  className={styles.filterSheetClose}
                  onClick={() => setFiltersOpen(false)}
                  aria-label="Close"
                >
                  ×
                </button>
              </div>

              <div className={styles.filterSheetBody}>
                <p className={styles.filterSheetLabel}>Status</p>
                <div className={styles.filterOptions}>
                  {STATUS_FILTER_OPTIONS.map((opt) => {
                    const active = opt.value === statusFilter
                    const isDefault = opt.value === 'all'
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        className={`${styles.filterOption} ${
                          active
                            ? isDefault
                              ? styles.filterOptionActiveDefault
                              : styles.filterOptionActive
                            : ''
                        }`}
                        onClick={() => {
                          setStatusFilter(opt.value)
                          setFiltersOpen(false)
                        }}
                        aria-pressed={active}
                      >
                        <span>{opt.label}</span>
                        {active && <span className={styles.filterOptionCheck} aria-hidden />}
                      </button>
                    )
                  })}
                </div>

                <div className={styles.filterSheetFooter}>
                  <button
                    type="button"
                    className={styles.filterSheetClearAll}
                    onClick={() => {
                      clearFilters()
                      setFiltersOpen(false)
                    }}
                    disabled={!hasFilters}
                  >
                    <FiRotateCcw className={styles.toolbarClearIcon} aria-hidden />
                    Clear All
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className={styles.tableWrap}>
          {isLoading && (
            <table
              className={styles.table}
              role="status"
              aria-live="polite"
              aria-busy="true"
              aria-label="Loading buyers"
            >
              <colgroup>
                <col className={styles.colCheck} />
                <col className={styles.colBuyer} />
                <col className={styles.colEmail} />
                <col className={styles.colJoined} />
                <col className={styles.colRole} />
                <col className={styles.colStatus} />
                <col />
              </colgroup>
              <thead>
                <tr>
                  <th className={styles.checkboxCell} aria-hidden>
                    <span className={`${styles.buyersSkBar} ${styles.buyersSkCheckbox}`} />
                  </th>
                  <th>Buyer</th>
                  <th>Email</th>
                  <th>Joined</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 9 }).map((_, i) => (
                  <tr key={`buyers-sk-${i}`} className={styles.primaryRow}>
                    <td className={styles.checkboxCell}>
                      <span
                        className={`${styles.buyersSkBar} ${styles.buyersSkCheckbox}`}
                        aria-hidden
                      />
                    </td>
                    <td>
                      <div className={styles.buyerCell}>
                        <span
                          className={`${styles.buyersSkBar} ${styles.buyersSkAvatar}`}
                          aria-hidden
                        />
                        <div className={styles.buyerText}>
                          <span
                            className={`${styles.buyersSkBar} ${styles.buyersSkName}`}
                            aria-hidden
                          />
                          <span
                            className={`${styles.buyersSkBar} ${styles.buyersSkEmail} ${styles.mobileEmailInline}`}
                            aria-hidden
                          />
                        </div>
                      </div>
                    </td>
                    <td>
                      <span
                        className={`${styles.buyersSkBar} ${styles.buyersSkEmail}`}
                        style={{ width: 200 }}
                        aria-hidden
                      />
                    </td>
                    <td>
                      <span
                        className={`${styles.buyersSkBar} ${styles.buyersSkMeta}`}
                        aria-hidden
                      />
                    </td>
                    <td>
                      <span
                        className={`${styles.buyersSkBar} ${styles.buyersSkPill}`}
                        aria-hidden
                      />
                    </td>
                    <td>
                      <span
                        className={`${styles.buyersSkBar} ${styles.buyersSkPill}`}
                        aria-hidden
                      />
                    </td>
                    <td />
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {error && !isLoading && (
            <p className={styles.loadError}>
              {error.message || 'Could not load buyers. Check admin permissions.'}
            </p>
          )}

          {!isLoading && !error && filtered.length > 0 && (
            <table className={styles.table}>
              <colgroup>
                <col className={styles.colCheck} />
                <col className={styles.colBuyer} />
                <col className={styles.colEmail} />
                <col className={styles.colJoined} />
                <col className={styles.colRole} />
                <col className={styles.colStatus} />
                <col />
              </colgroup>
              <thead>
                <tr>
                  <th className={styles.checkboxCell}>
                    <input
                      type="checkbox"
                      className={styles.rowCheckbox}
                      checked={
                        filtered.length > 0 &&
                        filtered.every((b) => selectedRows.has(b.id))
                      }
                      onChange={(e) => {
                        setSelectedRows((prev) => {
                          const next = new Set(prev)
                          if (e.target.checked) {
                            filtered.forEach((b) => next.add(b.id))
                          } else {
                            filtered.forEach((b) => next.delete(b.id))
                          }
                          return next
                        })
                      }}
                      aria-label="Select all buyers in view"
                    />
                  </th>
                  <th>Buyer</th>
                  <th>Email</th>
                  <th>Joined</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((buyer) => (
                  <tr key={buyer.id} className={styles.primaryRow}>
                    <td className={styles.checkboxCell}>
                      <input
                        type="checkbox"
                        className={styles.rowCheckbox}
                        checked={selectedRows.has(buyer.id)}
                        onChange={(e) => {
                          setSelectedRows((prev) => {
                            const next = new Set(prev)
                            if (e.target.checked) next.add(buyer.id)
                            else next.delete(buyer.id)
                            return next
                          })
                        }}
                        aria-label={`Select ${buyer.fullName}`}
                      />
                    </td>

                    <td>
                      <div className={styles.buyerCell}>
                        <Avatar name={buyer.fullName} src={buyer.avatarUrl} />
                        <div className={styles.buyerText}>
                          <button
                            type="button"
                            onClick={() => setDetailBuyer(buyer)}
                            className={styles.buyerName}
                            style={{
                              background: 'transparent',
                              border: 0,
                              padding: 0,
                              cursor: 'pointer',
                              textAlign: 'left',
                              color: 'inherit',
                            }}
                          >
                            {buyer.fullName}
                          </button>
                          <span
                            className={`${styles.email} ${styles.mobileEmailInline}`}
                            title={buyer.email}
                          >
                            {buyer.email}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td>
                      <span className={styles.email} title={buyer.email}>
                        {buyer.email}
                      </span>
                    </td>

                    <td>
                      <div className={styles.badgesRow}>
                        <span className={styles.meta}>{buyer.joinedAt}</span>
                        <span
                          className={`${styles.statusBadge} ${
                            styles[`status_${buyer.status}`] || ''
                          } ${styles.mobileStatusInline}`}
                        >
                          <span className={styles.statusDot} />
                          {buyer.status}
                        </span>
                      </div>
                    </td>

                    <td>
                      <span className={styles.badge}>{buyer.role}</span>
                    </td>

                    <td>
                      <span
                        className={`${styles.statusBadge} ${
                          styles[`status_${buyer.status}`] || ''
                        }`}
                      >
                        <span className={styles.statusDot} />
                        {buyer.status}
                      </span>
                    </td>

                    <td style={{ textAlign: 'right' }}>
                      <BuyerActionsMenu
                        buyer={buyer}
                        onView={(b) => setDetailBuyer(b)}
                        onSuspend={requestSuspendBuyer}
                        onReactivate={requestReactivateBuyer}
                        busy={busyId === buyer.id}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {!isLoading && !error && filtered.length === 0 && (
            <div className={styles.emptyState}>
              <svg className={styles.emptyIcon} viewBox="0 0 48 48" fill="none">
                <circle cx="22" cy="22" r="14" stroke="#cbd5e1" strokeWidth="2" />
                <path d="M32 32l8 8" stroke="#cbd5e1" strokeWidth="2" strokeLinecap="round" />
              </svg>
              <p className={styles.emptyTitle}>No buyers found</p>
              <p className={styles.emptyText}>No buyers match your current filters.</p>
              <button
                type="button"
                className={styles.clearBtn}
                onClick={() => {
                  clearFilters()
                }}
              >
                Clear filters
              </button>
            </div>
          )}
        </div>

        {!isLoading && !error && filtered.length > 0 && (
          <div className={styles.tableFooter}>
            Showing <strong>{filtered.length}</strong> of <strong>{buyers.length}</strong> buyers
          </div>
        )}
      </section>

      <BuyerDetailModal
        buyer={detailBuyer}
        onClose={() => setDetailBuyer(null)}
        onSuspend={requestSuspendBuyer}
        onReactivate={requestReactivateBuyer}
        busy={detailBuyer && busyId === detailBuyer.id}
      />

      <ConfirmModal
        open={statusConfirm != null}
        title={
          statusConfirm?.kind === 'suspend'
            ? 'Suspend buyer?'
            : statusConfirm?.kind === 'reactivate'
              ? 'Reactivate buyer?'
              : statusConfirm?.nextStatus === 'suspended'
                ? 'Suspend selected buyers?'
                : 'Reactivate selected buyers?'
        }
        message={
          statusConfirm?.kind === 'suspend'
            ? `${statusConfirm.buyer.fullName} will not be able to place new orders until reactivated.`
            : statusConfirm?.kind === 'reactivate'
              ? `Restore full access for ${statusConfirm.buyer.fullName}?`
              : statusConfirm?.nextStatus === 'suspended'
                ? `Suspend ${statusConfirm.ids.length} selected buyer${statusConfirm.ids.length > 1 ? 's' : ''}? They will not be able to place new orders until reactivated.`
                : `Reactivate ${statusConfirm?.ids?.length ?? 0} selected buyer${(statusConfirm?.ids?.length ?? 0) > 1 ? 's' : ''} and restore full access?`
        }
        variant={
          statusConfirm?.kind === 'reactivate' ||
          (statusConfirm?.kind === 'bulk' && statusConfirm.nextStatus === 'active')
            ? 'primary'
            : 'danger'
        }
        confirmLabel={
          statusConfirm?.kind === 'reactivate'
            ? 'Reactivate'
            : statusConfirm?.kind === 'bulk'
              ? statusConfirm.nextStatus === 'active'
                ? 'Reactivate'
                : 'Suspend'
              : 'Suspend'
        }
        confirmLoadingLabel={
          statusConfirm?.kind === 'reactivate'
            ? 'Reactivating...'
            : statusConfirm?.kind === 'bulk'
              ? statusConfirm.nextStatus === 'active'
                ? 'Reactivating...'
                : 'Suspending...'
              : 'Suspending...'
        }
        cancelLabel="Cancel"
        loading={
          (statusConfirm?.kind === 'bulk' && bulkBusy) ||
          (statusConfirm?.kind !== 'bulk' &&
            statusConfirm?.buyer?.id != null &&
            busyId === statusConfirm.buyer.id)
        }
        onCancel={() => {
          if (bulkBusy || busyId) return
          setStatusConfirm(null)
        }}
        onConfirm={handleStatusConfirm}
      />
    </div>
  )
}
