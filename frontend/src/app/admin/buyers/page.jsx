'use client'

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { BsThreeDots } from 'react-icons/bs'
import { FiRotateCcw } from 'react-icons/fi'
import { TbX } from 'react-icons/tb'
import { LuSettings2 } from 'react-icons/lu'
import styles from './buyers.module.css'
import { useDebouncedEffect, useMediaQuery } from '@/shared/hooks'
import { Dropdown } from '@/components/ui'
import ConfirmModal from '@/components/ui/Modal/ConfirmModal'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { readEnum, readString, replaceUrlQuery } from '@/shared/utils/queryParams'
import { bulkStatusActionApplies } from '@/lib/admin/bulkEligibility'

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
  const [menuPos, setMenuPos] = useState({ top: 0, right: 0 })
  const wrapRef = useRef(null)
  const triggerRef = useRef(null)

  function placeMenu() {
    const el = triggerRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    setMenuPos({ top: r.bottom + 6, right: window.innerWidth - r.right })
  }

  useLayoutEffect(() => {
    if (!open) return
    placeMenu()
  }, [open])

  useEffect(() => {
    if (!open) return
    function handle(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handle)
    window.addEventListener('scroll', placeMenu, true)
    window.addEventListener('resize', placeMenu)
    return () => {
      document.removeEventListener('mousedown', handle)
      window.removeEventListener('scroll', placeMenu, true)
      window.removeEventListener('resize', placeMenu)
    }
  }, [open])

  const isSuspended = buyer.status === 'suspended'
  const close = () => setOpen(false)

  return (
    <div className={styles.actionMenuWrap} ref={wrapRef}>
      <button
        ref={triggerRef}
        type="button"
        className={styles.actionMenuTrigger}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={`Actions for ${buyer.fullName}`}
        disabled={busy}
      >
        <BsThreeDots className={styles.actionMenuTriggerIcon} aria-hidden size={16} />
      </button>
      {open ? (
        <div
          className={styles.actionMenu}
          role="menu"
          style={{ top: menuPos.top, right: menuPos.right }}
        >
          <button
            type="button"
            role="menuitem"
            className={styles.actionMenuItem}
            onClick={() => {
              onView?.(buyer)
              close()
            }}
          >
            View details
          </button>
          {isSuspended ? (
            <button
              type="button"
              role="menuitem"
              className={`${styles.actionMenuItem} ${styles.actionMenuItemPrimary}`}
              disabled={busy}
              onClick={() => {
                onReactivate?.(buyer)
                close()
              }}
            >
              Reactivate
            </button>
          ) : (
            <button
              type="button"
              role="menuitem"
              className={`${styles.actionMenuItem} ${styles.actionMenuItemDanger}`}
              disabled={busy}
              onClick={() => {
                onSuspend?.(buyer)
                close()
              }}
            >
              Suspend
            </button>
          )}
        </div>
      ) : null}
    </div>
  )
}

function BuyerDetailRow({ label, children }) {
  return (
    <div className={styles.detailRow}>
      <span className={styles.detailRowLabel}>{label}</span>
      <div className={styles.detailRowValue}>{children}</div>
    </div>
  )
}

function BuyerDetailModal({ buyer, onClose, onSuspend, onReactivate, busy }) {
  useEffect(() => {
    if (!buyer) return
    function onKeyDown(e) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [buyer, onClose])

  if (!buyer) return null

  const suspended = buyer.status === 'suspended'

  return (
    <div className={styles.detailModalOverlay} role="presentation" onClick={onClose}>
      <div
        className={styles.detailModal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="buyer-detail-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.detailModalHeader}>
          <div className={styles.detailModalHeaderText}>
            <p className={styles.detailModalEyebrow}>Viewing details</p>
            <h2 id="buyer-detail-title" className={styles.detailModalTitle}>
              Buyer record
            </h2>
          </div>
          <button type="button" className={styles.detailModalClose} onClick={onClose} aria-label="Close">
            <TbX aria-hidden size={18} strokeWidth={1.75} />
          </button>
        </div>

        <div className={styles.detailModalHero}>
          <Avatar name={buyer.fullName} src={buyer.avatarUrl} />
          <div className={styles.detailModalHeroText}>
            <p className={styles.detailModalHeroName}>{buyer.fullName}</p>
            <p className={styles.detailModalHeroEmail}>{buyer.email}</p>
          </div>
        </div>

        <div className={styles.detailModalBody}>
          <section className={styles.detailSection} aria-labelledby="buyer-detail-profile">
            <div className={styles.detailGroup}>
              <p id="buyer-detail-profile" className={styles.detailGroupTitle}>
                Profile
              </p>
              <BuyerDetailRow label="Status">
                <span
                  className={`${styles.statusBadge} ${styles[`status_${buyer.status}`] || ''}`}
                  style={{ textTransform: 'capitalize' }}
                >
                  <span className={styles.statusDot} />
                  {buyer.status}
                </span>
              </BuyerDetailRow>
              <BuyerDetailRow label="Phone">{buyer.phone || '—'}</BuyerDetailRow>
              <BuyerDetailRow label="Joined">{buyer.joinedAt}</BuyerDetailRow>
            </div>
          </section>

          <section className={styles.detailSection} aria-labelledby="buyer-detail-activity">
            <div className={styles.detailGroup}>
              <p id="buyer-detail-activity" className={styles.detailGroupTitle}>
                Activity &amp; admin links
              </p>
              <BuyerDetailRow label="Orders">
                <span>{buyer.orderCount}</span>
                <Link
                  href={`/admin/payouts?q=${encodeURIComponent(buyer.id)}`}
                  className={styles.detailInlineLink}
                >
                  View in payouts
                </Link>
              </BuyerDetailRow>
              <BuyerDetailRow label="Disputes">
                <Link href={`/admin/disputes?q=${encodeURIComponent(buyer.id)}`} className={styles.detailInlineLink}>
                  Search disputes
                </Link>
              </BuyerDetailRow>
            </div>
          </section>
        </div>

        <div className={styles.detailModalFooter}>
          {suspended ? (
            <button
              type="button"
              className={styles.detailModalBtnPrimary}
              onClick={() => onReactivate?.(buyer)}
              disabled={busy}
            >
              {busy ? 'Working…' : 'Reactivate buyer'}
            </button>
          ) : (
            <button
              type="button"
              className={`${styles.detailModalBtnPrimary} ${styles.detailModalBtnDanger}`}
              onClick={() => onSuspend?.(buyer)}
              disabled={busy}
            >
              {busy ? 'Working…' : 'Suspend buyer'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
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

  const buyerById = useMemo(() => {
    const m = new Map()
    for (const b of buyers) {
      if (b?.id != null) m.set(String(b.id), b)
    }
    return m
  }, [buyers])

  const requestBulkBuyerStatus = useCallback(
    (nextStatus) => {
      if (
        !bulkStatusActionApplies(
          selectedRows,
          (id) => buyerById.get(String(id)) ?? null,
          nextStatus,
        )
      ) {
        return
      }
      const ids = [...selectedRows]
      if (ids.length === 0) return
      setStatusConfirm({ kind: 'bulk', nextStatus, ids })
    },
    [selectedRows, buyerById],
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
  const bulkSuspendApplies = useMemo(
    () =>
      bulkStatusActionApplies(
        selectedRows,
        (id) => buyerById.get(String(id)) ?? null,
        'suspended',
      ),
    [selectedRows, buyerById],
  )
  const bulkReactivateApplies = useMemo(
    () =>
      bulkStatusActionApplies(
        selectedRows,
        (id) => buyerById.get(String(id)) ?? null,
        'active',
      ),
    [selectedRows, buyerById],
  )

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
                flexWrap: 'wrap',
                padding: '10px 12px',
                background: '#f8fafc',
                borderTop: '1px solid #cbd5e1',
                alignItems: 'center',
              }}
              aria-live="polite"
            >
              <span style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>
                {selectedCount} selected
              </span>
              {bulkSuspendApplies ? (
                <button
                  type="button"
                  onClick={() => requestBulkBuyerStatus('suspended')}
                  disabled={bulkBusy}
                  style={{
                    padding: '6px 12px',
                    background: '#fef2f2',
                    color: '#b91c1c',
                    border: '1px solid #b91c1c',
                    borderRadius: 6,
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: bulkBusy ? 'not-allowed' : 'pointer',
                    opacity: bulkBusy ? 0.5 : 1,
                  }}
                >
                  {bulkBusy ? 'Working…' : 'Suspend selected'}
                </button>
              ) : null}
              {bulkReactivateApplies ? (
                <button
                  type="button"
                  onClick={() => requestBulkBuyerStatus('active')}
                  disabled={bulkBusy}
                  style={{
                    padding: '6px 12px',
                    background: '#f1f5f9',
                    color: '#0f172a',
                    border: '1px solid #0f172a',
                    borderRadius: 6,
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: bulkBusy ? 'not-allowed' : 'pointer',
                    opacity: bulkBusy ? 0.5 : 1,
                  }}
                >
                  {bulkBusy ? 'Working…' : 'Reactivate selected'}
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => setSelectedRows(new Set())}
                disabled={bulkBusy}
                style={{
                  padding: '6px 12px',
                  background: '#ffffff',
                  color: '#0f172a',
                  border: '1px solid #0f172a',
                  borderRadius: 6,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: bulkBusy ? 'not-allowed' : 'pointer',
                  opacity: bulkBusy ? 0.5 : 1,
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
                <col className={styles.colActions} />
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
                        style={{ width: '100%', maxWidth: '100%' }}
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
                <col className={styles.colActions} />
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
