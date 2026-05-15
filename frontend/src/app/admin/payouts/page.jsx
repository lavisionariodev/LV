'use client'

import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { FiArrowUp, FiArrowDown, FiRotateCcw, FiUnlock } from 'react-icons/fi'
import { TbCreditCardPay, TbPlayerPause, TbX } from 'react-icons/tb'
import { LuSettings2 } from 'react-icons/lu'

import { readEnum, readInt, readString, replaceUrlQuery } from '@/shared/utils/queryParams'
import { useDebouncedEffect } from '@/shared/hooks/useDebouncedEffect'
import {
  formatPHP,
  formatDateRangeLabel,
  PAYMENT_STATUS_META,
  PAYOUT_STATUS_META,
  DISBURSEMENT_STATE_META,
  getTxnCommissionParts,
} from '@/shared/utils/adminPayouts'
import { computeCommissionSnapshot } from '@/shared/utils/commissionSnapshot'
import { formatCount, formatPHPMobile } from '@/shared/utils/formatCount'

import { Dropdown } from '@/components/ui'
import ConfirmModal from '@/components/ui/Modal/ConfirmModal'
import confirmModalStyles from '@/components/ui/Modal/ConfirmModal.module.css'
import adminStyles from '../admin.module.css'

import styles from './payouts.module.css'
import StuckRefundsStrip from './StuckRefundsStrip'
import PayoutRequestsStrip from './PayoutRequestsStrip'

// ─── Admin payouts page data hook (formerly useAdminPayoutsPage.js) ──────────

const ROWS_PER_PAGE = 10

const TAB_VALUES = ['all', 'transactions', 'commissions', 'sellers']

const ESCROW_FILTER_VALUES = ['all', 'escrowed', 'on_hold', 'released']

/** Map old ?payout= URL values (pre-escrow UI) to current order_escrows.status filters. */
function coerceEscrowFilterFromUrl(raw) {
  const v = String(raw || 'all').toLowerCase()
  const legacy = {
    pending: 'escrowed',
    processing: 'escrowed',
    paid: 'released',
    refunded: 'all',
  }
  if (legacy[v] !== undefined) return legacy[v]
  if (ESCROW_FILTER_VALUES.includes(v)) return v
  return 'all'
}

function txnSortTimestamp(t) {
  if (t?.dateObj != null) {
    const n = new Date(t.dateObj).getTime()
    if (Number.isFinite(n)) return n
  }
  if (t?.date && /^\d{4}-\d{2}-\d{2}$/.test(String(t.date))) {
    const n = new Date(`${String(t.date)}T12:00:00`).getTime()
    if (Number.isFinite(n)) return n
  }
  return 0
}

/** Same rules as per-row “Release” in EscrowReleasePanel */
function payoutTxnCanBulkRelease(t) {
  return (
    t &&
    t.payoutStatus === 'escrowed' &&
    t.paymentStatus === 'paid' &&
    t.fulfillmentStatus === 'completed' &&
    !['pending', 'submitted'].includes(String(t.disbursementState || '').toLowerCase())
  )
}

function payoutTxnCanBulkUnhold(t) {
  return t && t.payoutStatus === 'on_hold'
}

/** Stable Set key for transaction row selection (API may use string or numeric ids). */
function payoutTxnRowKey(t) {
  if (t == null || t.id == null) return ''
  return String(t.id)
}

function shouldShowDisbursementBadge(disbursementState, payoutStatus) {
  if (!disbursementState || disbursementState === 'none') return false
  if (disbursementState === 'legacy_manual' && payoutStatus === 'released') return false
  return true
}

function buildPayoutQueryString({
  search,
  filterSeller,
  filterPayment,
  filterPayout,
  filterDateFrom,
  filterDateTo,
}) {
  const qs = new URLSearchParams()
  if (search.trim()) qs.set('q', search.trim())
  if (filterSeller !== 'all') qs.set('seller', filterSeller)
  if (filterPayment !== 'all') qs.set('payment', filterPayment)
  if (filterPayout !== 'all') qs.set('escrow', filterPayout)
  if (filterDateFrom) qs.set('from', filterDateFrom)
  if (filterDateTo) qs.set('to', filterDateTo)
  return qs.toString()
}

function useAdminPayoutsPage() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [transactions, setTransactions] = useState([])
  const [sellerOptions, setSellerOptions] = useState([])
  /** Live default rate from DB; overrides in `sellers` are UI-only preview until persisted elsewhere. */
  const [commissionSettings, setCommissionSettings] = useState({ global: 10, sellers: {} })
  const [summaryStats, setSummaryStats] = useState({
    platformRevenue30d: 0,
    pendingPayoutAmt: 0,
    completedReleasedAmt: 0,
    totalEscrows: 0,
  })

  const [listLoading, setListLoading] = useState(true)
  const [listError, setListError] = useState(null)
  const [listTruncated, setListTruncated] = useState(false)
  const [summaryLoading, setSummaryLoading] = useState(true)
  const [disbursementConfig, setDisbursementConfig] = useState(null)

  const [activeTab, setActiveTab] = useState(() => readEnum(searchParams, 'tab', TAB_VALUES, 'all'))

  const [search, setSearch] = useState(() => readString(searchParams, 'q', ''))
  const [filterSeller, setFilterSeller] = useState(() => readString(searchParams, 'seller', 'all'))
  const [filterPayment, setFilterPayment] = useState(() => readString(searchParams, 'payment', 'all'))
  const [filterPayout, setFilterPayout] = useState(() =>
    coerceEscrowFilterFromUrl(readString(searchParams, 'payout', 'all')),
  )
  const [filterDateFrom, setFilterDateFrom] = useState(() => readString(searchParams, 'from', ''))
  const [filterDateTo, setFilterDateTo] = useState(() => readString(searchParams, 'to', ''))
  const [approvedRequestId, setApprovedRequestId] = useState(() =>
    readString(searchParams, 'approvedRequestId', ''),
  )
  const [showFilters, setShowFilters] = useState(false)
  const [expandedRow, setExpandedRow] = useState(null)
  const [selectedRows, setSelectedRows] = useState(new Set())
  /** `true`: newest-first (matches API default); `false`: oldest-first */
  const [dateSortDesc, setDateSortDesc] = useState(true)

  const [currentPage, setCurrentPage] = useState(() => Math.max(1, readInt(searchParams, 'page', 1)))

  const fetchingRef = useRef(false)

  const applyListPayload = useCallback((payload) => {
    if (!payload || typeof payload !== 'object') return
    const sellers = Array.isArray(payload.sellers) ? payload.sellers : []
    const overrideMap = {}
    for (const s of sellers) {
      if (s?.id && s.commissionPercentOverride != null) {
        const n = Number(s.commissionPercentOverride)
        if (Number.isFinite(n)) overrideMap[s.id] = n
      }
    }
    setCommissionSettings((prev) => ({
      ...prev,
      global:
        typeof payload.defaultCommissionPercent === 'number' &&
        Number.isFinite(payload.defaultCommissionPercent)
          ? payload.defaultCommissionPercent
          : prev.global,
      sellers: overrideMap,
    }))
    setSellerOptions(sellers)
    setTransactions(Array.isArray(payload.transactions) ? payload.transactions : [])
    setListTruncated(Boolean(payload.truncated))
  }, [])

  const fetchDisbursementConfig = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/payouts/disbursement-config', { credentials: 'include' })
      const body = await res.json().catch(() => null)
      if (!res.ok) throw new Error(body?.error || 'Failed to load disbursement config')
      setDisbursementConfig(body?.config && typeof body.config === 'object' ? body.config : null)
    } catch {
      setDisbursementConfig(null)
    }
  }, [])

  const fetchSummary = useCallback(async () => {
    setSummaryLoading(true)
    try {
      const res = await fetch('/api/admin/payouts?summary=1', { credentials: 'include' })
      const body = await res.json().catch(() => null)
      if (!res.ok) throw new Error(body?.error || 'Failed to load summary')
      const s = body.summary
      if (s && typeof s === 'object') {
        setSummaryStats({
          platformRevenue30d: Number(s.platformRevenue30d) || 0,
          pendingPayoutAmt: Number(s.pendingPayoutAmt) || 0,
          completedReleasedAmt: Number(s.completedReleasedAmt) || 0,
          totalEscrows: Number(s.totalEscrows) || 0,
        })
      }
    } catch {
      setSummaryStats((prev) => prev)
    } finally {
      setSummaryLoading(false)
    }
  }, [])

  const fetchTransactions = useCallback(async () => {
    if (fetchingRef.current) return
    fetchingRef.current = true
    setListLoading(true)
    setListError(null)
    try {
      const qs = buildPayoutQueryString({
        search,
        filterSeller,
        filterPayment,
        filterPayout,
        filterDateFrom,
        filterDateTo,
      })
      const url = qs ? `/api/admin/payouts?${qs}` : '/api/admin/payouts'
      const res = await fetch(url, { credentials: 'include' })
      const body = await res.json().catch(() => null)
      if (!res.ok) throw new Error(body?.error || 'Failed to load payouts')
      applyListPayload(body)
    } catch (e) {
      setListError(e?.message || 'Failed to load payouts')
      setTransactions([])
      setSellerOptions([])
      setListTruncated(false)
    } finally {
      setListLoading(false)
      fetchingRef.current = false
    }
  }, [
    applyListPayload,
    search,
    filterSeller,
    filterPayment,
    filterPayout,
    filterDateFrom,
    filterDateTo,
  ])

  useEffect(() => {
    queueMicrotask(() => {
      void fetchSummary()
      void fetchDisbursementConfig()
    })
  }, [fetchDisbursementConfig, fetchSummary])

  useDebouncedEffect(
    () => {
      fetchTransactions()
    },
    [
      search,
      filterSeller,
      filterPayment,
      filterPayout,
      filterDateFrom,
      filterDateTo,
      fetchTransactions,
    ],
    300,
  )

  // Sync state <- URL (back/forward, shared links)
  useEffect(() => {
    const nextTab = readEnum(searchParams, 'tab', TAB_VALUES, 'all')
    const nextQ = readString(searchParams, 'q', '')
    const nextSeller = readString(searchParams, 'seller', 'all')
    const nextPayment = readString(searchParams, 'payment', 'all')
    const nextPayout = coerceEscrowFilterFromUrl(
      readString(searchParams, 'escrow', readString(searchParams, 'payout', 'all')),
    )
    const nextFrom = readString(searchParams, 'from', '')
    const nextTo = readString(searchParams, 'to', '')
    const nextApprovedRequestId = readString(searchParams, 'approvedRequestId', '')
    const nextPage = Math.max(1, readInt(searchParams, 'page', 1))

    queueMicrotask(() => {
      if (nextTab !== activeTab) setActiveTab(nextTab)
      if (nextQ !== search) setSearch(nextQ)
      if (nextSeller !== filterSeller) setFilterSeller(nextSeller)
      if (nextPayment !== filterPayment) setFilterPayment(nextPayment)
      if (nextPayout !== filterPayout) setFilterPayout(nextPayout)
      if (nextFrom !== filterDateFrom) setFilterDateFrom(nextFrom)
      if (nextTo !== filterDateTo) setFilterDateTo(nextTo)
      if (nextApprovedRequestId !== approvedRequestId) setApprovedRequestId(nextApprovedRequestId)
      if (nextPage !== currentPage) setCurrentPage(nextPage)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  const summary = useMemo(
    () => ({
      platformRevenue: summaryStats.platformRevenue30d,
      pendingAmt: summaryStats.pendingPayoutAmt,
      completedAmt: summaryStats.completedReleasedAmt,
      total: summaryStats.totalEscrows,
    }),
    [summaryStats],
  )

  useEffect(() => {
    queueMicrotask(() => setCurrentPage(1))
  }, [search, filterSeller, filterPayment, filterPayout, filterDateFrom, filterDateTo])

  const toggleDateSort = useCallback(() => {
    setDateSortDesc((d) => !d)
    setCurrentPage(1)
  }, [])

  const sortedTransactions = useMemo(() => {
    const copy = Array.isArray(transactions) ? [...transactions] : []
    copy.sort((a, b) => {
      const ta = txnSortTimestamp(a)
      const tb = txnSortTimestamp(b)
      if (ta !== tb) {
        return dateSortDesc ? tb - ta : ta - tb
      }
      return String(a.id || '').localeCompare(String(b.id || ''))
    })
    return copy
  }, [transactions, dateSortDesc])

  const totalPages = Math.ceil(sortedTransactions.length / ROWS_PER_PAGE) || 1
  const paginatedRows = sortedTransactions.slice((currentPage - 1) * ROWS_PER_PAGE, currentPage * ROWS_PER_PAGE)

  useEffect(() => {
    if (totalPages <= 0) return
    if (currentPage > totalPages) queueMicrotask(() => setCurrentPage(totalPages))
  }, [currentPage, totalPages])

  useDebouncedEffect(
    () => {
      replaceUrlQuery(router, pathname, searchParams, {
        tab: { value: activeTab, omitIf: 'all' },
        q: search,
        seller: { value: filterSeller, omitIf: 'all' },
        payment: { value: filterPayment, omitIf: 'all' },
        payout: { value: filterPayout, omitIf: 'all' },
        from: filterDateFrom,
        to: filterDateTo,
        page: { value: currentPage, omitIf: 1 },
      })
    },
    [
      activeTab,
      search,
      filterSeller,
      filterPayment,
      filterPayout,
      filterDateFrom,
      filterDateTo,
      currentPage,
      router,
      pathname,
      searchParams,
    ],
    300,
  )

  const refreshAll = useCallback(async () => {
    await Promise.all([fetchSummary(), fetchTransactions(), fetchDisbursementConfig()])
  }, [fetchDisbursementConfig, fetchSummary, fetchTransactions])

  const releaseOrder = useCallback(
    async (orderUuid, options = {}) => {
      const res = await fetch('/api/admin/payouts/release', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          orderId: orderUuid,
          releaseReference: options.releaseReference ?? '',
          manualOverride: Boolean(options.manualOverride),
          approvedRequestId: options.approvedRequestId ?? null,
        }),
      })
      const body = await res.json().catch(() => null)
      if (!res.ok) throw new Error(body?.error || 'Release failed.')
      await refreshAll()
      return body
    },
    [refreshAll],
  )

  const holdOrder = useCallback(
    async (orderUuid, reason) => {
      const res = await fetch('/api/admin/payouts/hold', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ orderId: orderUuid, reason }),
      })
      const body = await res.json().catch(() => null)
      if (!res.ok) throw new Error(body?.error || 'Hold failed.')
      await refreshAll()
      return body
    },
    [refreshAll],
  )

  const unholdOrder = useCallback(
    async (orderUuid) => {
      const res = await fetch('/api/admin/payouts/unhold', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ orderId: orderUuid }),
      })
      const body = await res.json().catch(() => null)
      if (!res.ok) throw new Error(body?.error || 'Unhold failed.')
      await refreshAll()
      return body
    },
    [refreshAll],
  )

  const updateOrderCommission = useCallback(
    async (orderUuid, commissionRatePercent) => {
      const res = await fetch('/api/admin/payouts/commission', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ orderId: orderUuid, commissionRatePercent }),
      })
      const body = await res.json().catch(() => null)
      if (!res.ok) throw new Error(body?.error || 'Commission update failed.')
      await refreshAll()
      return body
    },
    [refreshAll],
  )

  const updateGlobalCommission = useCallback(
    async (defaultCommissionPercent) => {
      const res = await fetch('/api/admin/platform-billing', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ defaultCommissionPercent }),
      })
      const body = await res.json().catch(() => null)
      if (!res.ok) throw new Error(body?.error || 'Failed to save default commission.')
      await refreshAll()
      return body
    },
    [refreshAll],
  )

  const updateSellerCommissionOverride = useCallback(
    async (sellerUserId, commissionPercentOverride) => {
      const res = await fetch(
        `/api/admin/sellers/${encodeURIComponent(sellerUserId)}/commission`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ commissionPercentOverride }),
        },
      )
      const body = await res.json().catch(() => null)
      if (!res.ok) throw new Error(body?.error || 'Failed to save seller commission.')
      await refreshAll()
      return body
    },
    [refreshAll],
  )

  const clearFilters = () => {
    setSearch('')
    setFilterSeller('all')
    setFilterPayment('all')
    setFilterPayout('all')
    setFilterDateFrom('')
    setFilterDateTo('')
  }

  const hasFilters =
    search ||
    filterSeller !== 'all' ||
    filterPayment !== 'all' ||
    filterPayout !== 'all' ||
    filterDateFrom ||
    filterDateTo

  const showTransactions = activeTab === 'all' || activeTab === 'transactions'
  const showCommissions = activeTab === 'all' || activeTab === 'commissions'
  const showSellerEarnings = activeTab === 'all' || activeTab === 'sellers'

  return {
    ROWS_PER_PAGE,
    transactions,
    sellerOptions,
    commissionSettings,
    activeTab,
    setActiveTab,
    search,
    setSearch,
    filterSeller,
    setFilterSeller,
    filterPayment,
    setFilterPayment,
    filterPayout,
    setFilterPayout,
    filterDateFrom,
    setFilterDateFrom,
    filterDateTo,
    setFilterDateTo,
    approvedRequestId,
    showFilters,
    setShowFilters,
    expandedRow,
    setExpandedRow,
    selectedRows,
    setSelectedRows,
    currentPage,
    setCurrentPage,
    summary,
    summaryLoading,
    listLoading,
    listError,
    listTruncated,
    disbursementConfig,
    paginatedRows,
    totalPages,
    dateSortDesc,
    toggleDateSort,
    refreshAll,
    releaseOrder,
    holdOrder,
    unholdOrder,
    updateOrderCommission,
    updateGlobalCommission,
    updateSellerCommissionOverride,
    clearFilters,
    hasFilters,
    showTransactions,
    showCommissions,
    showSellerEarnings,
  }
}

// ─── Icons ───────────────────────────────────────────────────────────────────

const Icon = {
  Search:      () => <svg viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2"/><path d="M18 18l3.5 3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>,
  Filter:      () => <svg viewBox="0 0 24 24" fill="none"><path d="M4 6h16M7 12h10M10 18h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>,
  Close:       () => <svg viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>,
  Edit:        () => <svg viewBox="0 0 24 24" fill="none"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 000-1.41l-2.34-2.34a1 1 0 00-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" fill="currentColor"/></svg>,
  Check:       () => <svg viewBox="0 0 24 24" fill="none"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" fill="currentColor"/></svg>,
  Calendar: () => (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2" />
      <path d="M16 2v4M8 2v4M3 10h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
}

const DEFAULT_PAYOUT_OPTION = { value: 'all', label: 'All' }
const DEFAULT_SELLER_OPTION = { value: 'all', label: 'All' }
const DEFAULT_PAYMENT_OPTION = { value: 'all', label: 'All' }

// ─── Sub-Components ──────────────────────────────────────────────────────────

// ── Date Range Picker ────────────────────────────────────────────────────────
function DateRangePicker({ from, to, onChange }) {
  const [open, setOpen] = useState(false)
  const [viewDate, setViewDate] = useState(() => {
    const d = from ? new Date(`${from}T12:00:00`) : new Date()
    return { year: d.getFullYear(), month: d.getMonth() }
  })
  const [hovered, setHovered] = useState(null)
  const ref = useRef(null)

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const label = formatDateRangeLabel(from, to)

  const DAYS = ['Su','Mo','Tu','We','Th','Fr','Sa']
  const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

  function getDaysInMonth(year, month) {
    return new Date(year, month + 1, 0).getDate()
  }
  function getFirstDayOfWeek(year, month) {
    return new Date(year, month, 1).getDay()
  }

  const { year, month } = viewDate
  const daysInMonth = getDaysInMonth(year, month)
  const firstDay = getFirstDayOfWeek(year, month)
  const cells = []
  for (let i = 0; i < firstDay; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  function toStr(y, m, d) {
    return `${y}-${String(m + 1).padStart(2,'0')}-${String(d).padStart(2,'0')}`
  }

  function handleDayClick(d) {
    if (!d) return
    const dateStr = toStr(year, month, d)
    if (!from || (from && to)) {
      onChange(dateStr, '')
    } else {
      if (dateStr < from) onChange(dateStr, from)
      else onChange(from, dateStr)
      setOpen(false)
    }
  }

  function dayState(d) {
    if (!d) return ''
    const s = toStr(year, month, d)
    const end = hovered && !to ? hovered : to
    if (s === from) return 'start'
    if (s === to) return 'end'
    if (from && end && s > from && s < end) return 'inRange'
    return ''
  }

  function prevMonth() {
    setViewDate(v => {
      if (v.month === 0) return { year: v.year - 1, month: 11 }
      return { year: v.year, month: v.month - 1 }
    })
  }
  function nextMonth() {
    setViewDate(v => {
      if (v.month === 11) return { year: v.year + 1, month: 0 }
      return { year: v.year, month: v.month + 1 }
    })
  }

  function clear() { onChange('', ''); setOpen(false) }

  return (
    <div className={styles.drpWrap} ref={ref}>
      <button
        type="button"
        className={`${styles.drpTrigger} ${open ? styles.drpTriggerOpen : ''} ${(from || to) ? styles.drpTriggerActive : ''}`}
        onClick={() => setOpen(o => !o)}
      >
        <span className={styles.drpCalIcon}><Icon.Calendar /></span>
        <span className={`${styles.drpLabel} ${!(from || to) ? styles.drpLabelPlaceholder : ''}`}>
          {label || 'Date range'}
        </span>
        {(from || to) && (
          <span
            className={styles.drpClear}
            role="button"
            tabIndex={0}
            onClick={e => { e.stopPropagation(); clear() }}
            onKeyDown={e => e.key === 'Enter' && (e.stopPropagation(), clear())}
            title="Clear dates"
          >
            <svg viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
          </span>
        )}
        {!(from || to) && (
          <svg className={`${styles.drpChevron} ${open ? styles.drpChevronOpen : ''}`} viewBox="0 0 24 24" fill="none">
            <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )}
      </button>

      {open && (
        <div className={styles.drpCalendar}>
          <div className={styles.drpCalHeader}>
            <button type="button" className={styles.drpNavBtn} onClick={prevMonth}>
              <svg viewBox="0 0 24 24" fill="none"><path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
            <span className={styles.drpMonthLabel}>{MONTHS[month]} {year}</span>
            <button type="button" className={styles.drpNavBtn} onClick={nextMonth}>
              <svg viewBox="0 0 24 24" fill="none"><path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
          </div>

          <div className={styles.drpGrid}>
            {DAYS.map(d => (
              <span key={d} className={styles.drpDayName}>{d}</span>
            ))}
            {cells.map((d, idx) => {
              const state = dayState(d)
              return (
                <button
                  key={idx}
                  type="button"
                  className={[
                    styles.drpDay,
                    !d ? styles.drpDayEmpty : '',
                    state === 'start' ? styles.drpDayStart : '',
                    state === 'end' ? styles.drpDayEnd : '',
                    state === 'inRange' ? styles.drpDayInRange : '',
                  ].filter(Boolean).join(' ')}
                  onClick={() => handleDayClick(d)}
                  onMouseEnter={() => d && !to && setHovered(toStr(year, month, d))}
                  onMouseLeave={() => setHovered(null)}
                  disabled={!d}
                >
                  {d || ''}
                </button>
              )
            })}
          </div>

          <div className={styles.drpFooter}>
            <span className={styles.drpFooterHint}>
              {!from ? 'Select start date' : !to ? 'Select end date' : `${from} → ${to}`}
            </span>
            {(from || to) && (
              <button type="button" className={styles.drpClearBtn} onClick={clear}>Clear</button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function Badge({ type, value }) {
  const raw = value == null || value === '' ? '' : String(value).trim()
  const key = raw.toLowerCase()

  if (type === 'disbursement') {
    const meta = DISBURSEMENT_STATE_META[key] || DISBURSEMENT_STATE_META.none
    const cls = styles[`badgePayout_${meta.color}`] || styles.badgePayout_slate
    return <span className={`${styles.badgePayout} ${cls}`}>{meta.label}</span>
  }
  const meta = type === 'payment' ? PAYMENT_STATUS_META[key] : PAYOUT_STATUS_META[key]
  const label = meta?.label ?? (raw ? raw : '—')
  if (type === 'payout') {
    const cls = meta ? styles[`badgePayout_${meta.color}`] : styles.badgePayout_slate
    return <span className={`${styles.badgePayout} ${cls || ''}`}>{label}</span>
  }
  const paymentCls = meta ? styles[`badge_${meta.color}`] : styles.badge_slate
  return <span className={`${styles.badge} ${paymentCls || ''}`}>{label}</span>
}

const PAYOUTS_TABLE_SKELETON_ROWS = 6
const PAYOUTS_MOBILE_SKELETON_CARDS = 4

function PayoutsTransactionsLoadingLiveRegion() {
  return (
    <span className={styles.payoutsLoadingSrOnly} aria-live="polite" aria-busy="true">
      Loading payouts and transactions. Please wait.
    </span>
  )
}

function PayoutsMobileTransactionSkeleton() {
  return (
    <>
      {Array.from({ length: PAYOUTS_MOBILE_SKELETON_CARDS }, (_, i) => (
        <div
          key={`payout-m-sk-${i}`}
          className={`${styles.mobileCard} ${styles.mobileCardSkeleton}`}
          aria-hidden
        >
          <div className={styles.mobileCardHeader}>
            <span className={`${styles.tableSkeletonBar} ${styles.mobileSkOrder}`} />
            <span className={`${styles.tableSkeletonBar} ${styles.mobileSkAmount}`} />
          </div>
          <div className={styles.mobileCardSection}>
            <span className={`${styles.tableSkeletonBar} ${styles.mobileSkService}`} />
          </div>
          <div className={styles.mobileCardSection}>
            <div className={styles.mobileCardMetaRow}>
              <span className={`${styles.tableSkeletonBar} ${styles.mobileSkBuyer}`} />
              <span className={`${styles.tableSkeletonBar} ${styles.mobileSkDate}`} />
            </div>
          </div>
          <div className={styles.mobileCardSection}>
            <div className={styles.mobileCardStatuses}>
              <span className={`${styles.tableSkeletonBar} ${styles.mobileSkPill}`} />
              <span className={`${styles.tableSkeletonBar} ${styles.mobileSkPill}`} />
            </div>
          </div>
          <div className={styles.mobileCardSection}>
            <span className={`${styles.tableSkeletonBar} ${styles.mobileSkBreakdown}`} />
          </div>
          <div className={styles.mobileCardFooter}>
            <span className={`${styles.tableSkeletonBar} ${styles.mobileSkDetailsBtn}`} />
          </div>
        </div>
      ))}
    </>
  )
}

function PayoutsTableSkeletonBody() {
  return (
    <>
      {Array.from({ length: PAYOUTS_TABLE_SKELETON_ROWS }, (_, row) => (
        <tr key={`payout-sk-${row}`} className={styles.tableSkeletonRow}>
          <td className={styles.checkboxCell}>
            <span className={`${styles.tableSkeletonBar} ${styles.tableSkeletonCheckbox}`} aria-hidden />
          </td>
          <td>
            <span className={`${styles.tableSkeletonBar} ${styles.tableSkeletonBarOrder}`} aria-hidden />
          </td>
          <td>
            <span className={`${styles.tableSkeletonBar} ${styles.tableSkeletonBarService}`} aria-hidden />
          </td>
          <td>
            <div className={styles.tableSkeletonStack}>
              <span className={`${styles.tableSkeletonBar} ${styles.tableSkeletonBarBuyer}`} aria-hidden />
              <span className={`${styles.tableSkeletonBar} ${styles.tableSkeletonBarEmail}`} aria-hidden />
            </div>
          </td>
          <td>
            <span className={`${styles.tableSkeletonBar} ${styles.tableSkeletonPill}`} aria-hidden />
          </td>
          <td>
            <span className={`${styles.tableSkeletonBar} ${styles.tableSkeletonPill}`} aria-hidden />
          </td>
          <td>
            <span className={`${styles.tableSkeletonBar} ${styles.tableSkeletonBarDate}`} aria-hidden />
          </td>
          <td>
            <span className={`${styles.tableSkeletonBar} ${styles.tableSkeletonBarAmount}`} aria-hidden />
          </td>
          <td>
            <div className={styles.rowActions}>
              <span className={`${styles.tableSkeletonBar} ${styles.tableSkeletonChevron}`} aria-hidden />
            </div>
          </td>
        </tr>
      ))}
    </>
  )
}

// ─── Escrow release (desktop expanded row + mobile sheet) ────────────────────

function EscrowReleasePanel({
  t,
  releaseOrder,
  holdOrder,
  unholdOrder,
  approvedRequestId = '',
  compactUi = false,
  /** `'sheet'` — mobile order-details modal layout (distinct from desktop expanded row). */
  variant = 'default',
}) {
  const isSheet = variant === 'sheet'
  const useCompactCopy = compactUi || isSheet
  const [releaseModalOpen, setReleaseModalOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)
  const [holdModalOpen, setHoldModalOpen] = useState(false)
  const [holdReasonInput, setHoldReasonInput] = useState('')
  const [holdModalErr, setHoldModalErr] = useState(null)
  const [releaseReferenceInput, setReleaseReferenceInput] = useState('')
  const [manualOverrideRelease, setManualOverrideRelease] = useState(false)

  const disbursementState = String(t.disbursementState || 'none').toLowerCase()
  const disbursementLabel =
    DISBURSEMENT_STATE_META[disbursementState]?.label || disbursementState || '—'

  const closeHoldModal = useCallback(() => {
    if (busy) return
    setHoldModalOpen(false)
    setHoldModalErr(null)
    setHoldReasonInput('')
  }, [busy])

  const handleReleaseModalCancel = useCallback(() => {
    if (busy) return
    setReleaseModalOpen(false)
  }, [busy])

  const canRelease = payoutTxnCanBulkRelease(t)

  const blockers = []
  if (t.paymentStatus !== 'paid') {
    blockers.push(useCompactCopy ? 'Not paid.' : 'Payment is not marked paid.')
  }
  if (t.fulfillmentStatus !== 'completed') {
    blockers.push(useCompactCopy ? 'Service not completed.' : 'Fulfillment is not completed.')
  }
  if (t.payoutStatus === 'on_hold') {
    blockers.push(
      useCompactCopy ? 'On hold — remove hold first.' : 'Escrow is on hold — remove hold before releasing.',
    )
  }
  if (t.payoutStatus === 'released') {
    blockers.push(useCompactCopy ? 'Released.' : 'Already released.')
  }
  if (['pending', 'submitted'].includes(disbursementState)) {
    blockers.push(
      useCompactCopy
        ? 'PayMongo payout already in progress.'
        : 'A PayMongo payout is already in progress for this order.',
    )
  }

  async function handleConfirmRelease() {
    if (busy) return
    setBusy(true)
    setErr(null)
    try {
      await releaseOrder(t.orderUuid, {
        releaseReference: releaseReferenceInput.trim(),
        approvedRequestId: approvedRequestId || null,
        manualOverride: manualOverrideRelease,
      })
      setReleaseModalOpen(false)
      setReleaseReferenceInput('')
      setManualOverrideRelease(false)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Release failed.')
    } finally {
      setBusy(false)
    }
  }

  function openHoldModal() {
    setHoldReasonInput('')
    setHoldModalErr(null)
    setHoldModalOpen(true)
  }

  async function submitHoldFromModal() {
    const reason = holdReasonInput.trim()
    if (!reason) {
      setHoldModalErr(
        useCompactCopy ? 'Enter a hold reason.' : 'A reason is required before placing this order on hold.',
      )
      return
    }
    setBusy(true)
    setErr(null)
    setHoldModalErr(null)
    try {
      await holdOrder(t.orderUuid, reason)
      setHoldModalOpen(false)
      setHoldModalErr(null)
      setHoldReasonInput('')
    } catch (e) {
      setHoldModalErr(e instanceof Error ? e.message : 'Hold failed.')
    } finally {
      setBusy(false)
    }
  }

  async function doUnhold() {
    setBusy(true)
    setErr(null)
    try {
      await unholdOrder(t.orderUuid)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Unhold failed.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <ConfirmModal
        open={holdModalOpen}
        variant="warning"
        icon={<TbPlayerPause size={22} strokeWidth={1.75} aria-hidden />}
        title={
          <span className={confirmModalStyles.modalTitleDivider}>
            <span className={confirmModalStyles.titleCompound}>
              <span className={confirmModalStyles.titleCompoundOrder}>
                {t.orderId || t.orderUuid || '—'}
              </span>
              <span className={confirmModalStyles.titleCompoundSub}>Place on hold</span>
            </span>
          </span>
        }
        message={
          useCompactCopy
            ? 'Funds stay on hold until you remove it. Seller is not paid until then.'
            : 'Funds stay with the platform until you remove this hold; the seller will not be paid out until then.'
        }
        subtitleAlign="left"
        extra={
          <>
            <label htmlFor={`escrow-hold-reason-${t.id}`} className={confirmModalStyles.modalFieldLabel}>
              Reason
            </label>
            <textarea
              id={`escrow-hold-reason-${t.id}`}
              className={confirmModalStyles.modalTextarea}
              rows={4}
              value={holdReasonInput}
              onChange={(e) => {
                setHoldReasonInput(e.target.value)
                if (holdModalErr) setHoldModalErr(null)
              }}
              placeholder={
                useCompactCopy
                  ? 'e.g. Dispute, review, buyer request…'
                  : 'e.g. Dispute opened, compliance review, buyer request…'
              }
              disabled={busy}
              autoFocus
            />
            {holdModalErr ? <p className={confirmModalStyles.modalFieldError}>{holdModalErr}</p> : null}
          </>
        }
        confirmLabel={useCompactCopy ? 'Place hold' : 'Place on hold'}
        confirmLoadingLabel={useCompactCopy ? 'Holding...' : 'Placing hold...'}
        cancelLabel="Cancel"
        onConfirm={submitHoldFromModal}
        onCancel={closeHoldModal}
        loading={busy}
      />
      <ConfirmModal
        open={releaseModalOpen}
        variant="primary"
        icon={<TbCreditCardPay size={22} strokeWidth={1.75} aria-hidden />}
        title={useCompactCopy ? 'Release payout' : 'Release payout?'}
        subtitleAlign="left"
        message={
          useCompactCopy ? (
            <>
              <strong>{t.orderId || t.orderUuid || '—'}</strong>
              {' · '}
              Net to seller{' '}
              <strong className={confirmModalStyles.subtitleAccentGreen}>
                {formatPHP(Number(t.net_amount) || 0)}
              </strong>
              . Continue only when the payout should be finalized.
            </>
          ) : (
            <>
              This will start PayMongo disbursement for order{' '}
              <strong>{t.orderId || t.orderUuid || '—'}</strong>
              {' '}
              when automated payouts are enabled. Net to seller after platform fee:{' '}
              <strong className={confirmModalStyles.subtitleAccentGreen}>
                {formatPHP(Number(t.net_amount) || 0)}
              </strong>
              .
            </>
          )
        }
        extra={
          <>
            <label htmlFor={`escrow-release-ref-${t.id}`} className={confirmModalStyles.modalFieldLabel}>
              Release reference (optional)
            </label>
            <input
              id={`escrow-release-ref-${t.id}`}
              type="text"
              className={confirmModalStyles.modalInput}
              value={releaseReferenceInput}
              onChange={(e) => setReleaseReferenceInput(e.target.value)}
              placeholder="Bank ref, transfer note, or PayMongo transfer id"
              disabled={busy}
            />
            <label className={confirmModalStyles.modalCheckboxField}>
              <input
                type="checkbox"
                checked={manualOverrideRelease}
                onChange={(e) => setManualOverrideRelease(e.target.checked)}
                disabled={busy}
              />
              <span>Manual ledger release (skip PayMongo transfer)</span>
            </label>
          </>
        }
        confirmLabel={useCompactCopy ? 'Release' : 'Release payout'}
        confirmLoadingLabel="Releasing..."
        cancelLabel="Cancel"
        onConfirm={handleConfirmRelease}
        onCancel={handleReleaseModalCancel}
        loading={busy}
      />
    <div className={isSheet ? styles.msheetReleaseCard : styles.escrowActionCard}>
      <p className={isSheet ? styles.msheetReleaseTitle : styles.escrowActionTitle}>
        Release payout
      </p>
      <p className={isSheet ? styles.msheetReleaseNetLine : styles.escrowActionHint}>
        {useCompactCopy ? (
          <>
            Net to seller <strong>{formatPHP(Number(t.net_amount) || 0)}</strong>
          </>
        ) : (
          <>
            Net to seller after platform fee:{' '}
            <strong>{formatPHP(Number(t.net_amount) || 0)}</strong>
          </>
        )}
      </p>
      <p className={isSheet ? styles.msheetReleasedLine : styles.escrowActionReleased}>
        Payout rail: {disbursementLabel}
        {t.disbursementFailureReason ? ` · ${t.disbursementFailureReason}` : ''}
      </p>
      {t.payoutStatus === 'released' && (t.released_at || t.payoutDate) && (
        <p className={isSheet ? styles.msheetReleasedLine : styles.escrowActionReleased}>
          Released {t.released_at ? String(t.released_at).slice(0, 10) : t.payoutDate}
          {t.payoutReference ? ` · Ref ${t.payoutReference}` : ''}
        </p>
      )}
      {t.hold_reason && (
        <p className={isSheet ? styles.msheetHoldNote : styles.escrowHoldReason}>
          Hold: {t.hold_reason}
        </p>
      )}
      {blockers.length > 0 && t.payoutStatus !== 'released' && (
        isSheet ? (
          <div className={styles.msheetBlockerRibbon} role="status">
            {blockers.join(' · ')}
          </div>
        ) : (
          <ul className={styles.escrowBlockers}>
            {blockers.map((b) => (
              <li key={b}>{b}</li>
            ))}
          </ul>
        )
      )}
      {err && <p className={isSheet ? styles.msheetInlineErr : styles.escrowActionErr}>{err}</p>}
      <div className={isSheet ? styles.msheetReleaseBtns : styles.escrowActionBtns}>
        {t.payoutStatus === 'escrowed' && (
          <>
            <button
              type="button"
              className={isSheet ? styles.msheetBtnRelease : styles.releaseBtnArm}
              disabled={!canRelease || busy}
              onClick={() => canRelease && setReleaseModalOpen(true)}
            >
              Release
            </button>
            <button
              type="button"
              className={isSheet ? styles.msheetBtnHold : styles.holdEscrowBtn}
              disabled={busy}
              onClick={openHoldModal}
            >
              Hold
            </button>
          </>
        )}
        {t.payoutStatus === 'on_hold' && (
          <button
            type="button"
            className={isSheet ? styles.msheetBtnUnholdFull : styles.unholdEscrowBtn}
            disabled={busy}
            onClick={doUnhold}
          >
            Remove hold
          </button>
        )}
      </div>
    </div>
    </>
  )
}


function StatCard({ label, shortLabel, value, percent, className, valueLoading, summarySkWidth }) {
  const isPositive = percent >= 0
  const loading = Boolean(valueLoading)

  return (
    <div className={`${styles.statCard}${className ? ` ${className}` : ''}`}>
      <p className={styles.statLabel}>
        {shortLabel ? (
          <>
            <span className={styles.statLabelLong}>{label}</span>
            <span className={styles.statLabelShort}>{shortLabel}</span>
          </>
        ) : label}
      </p>
      <div className={styles.statBody}>
        <div className={styles.statLeft}>
          <p className={styles.statValue}>
            {loading ? (
              <span
                className={styles.payoutsSummarySk}
                style={summarySkWidth != null ? { width: summarySkWidth } : undefined}
                aria-hidden
              />
            ) : (
              value
            )}
          </p>
          {!loading && (
          <div
            className={`${styles.statTrend} ${isPositive ? styles.statTrendPositive : styles.statTrendNegative}`}
          >
            {isPositive ? (
              <FiArrowUp className={styles.statTrendArrow} aria-hidden />
            ) : (
              <FiArrowDown className={styles.statTrendArrow} aria-hidden />
            )}
            <span className={styles.statTrendValue}>{Math.abs(percent)}%</span>
          </div>
          )}
        </div>
        {!loading && (
        <div className={styles.statRight}>
          <svg
            className={`${styles.statSparkline} ${isPositive ? styles.statSparklinePositive : styles.statSparklineNegative}`}
            viewBox="0 0 80 40"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden
          >
            <defs>
              <linearGradient id={`sparkGrad_${isPositive ? 'pos' : 'neg'}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="currentColor" stopOpacity="0.18" />
                <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
              </linearGradient>
            </defs>
            {isPositive ? (
              <>
                {/* Downward area shadow fill */}
                <polygon
                  points="0,30 14,22 24,28 36,12 50,18 62,8 80,14 80,40 0,40"
                  fill={`url(#sparkGrad_pos)`}
                />
                {/* Glow/blur duplicate line */}
                <polyline
                  points="0,30 14,22 24,28 36,12 50,18 62,8 80,14"
                  stroke="currentColor"
                  strokeWidth="5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                  opacity="0.12"
                />
                {/* Main line */}
                <polyline
                  points="0,30 14,22 24,28 36,12 50,18 62,8 80,14"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                />
              </>
            ) : (
              <>
                {/* Downward area shadow fill */}
                <polygon
                  points="0,10 14,18 24,12 36,28 50,22 62,32 80,26 80,40 0,40"
                  fill={`url(#sparkGrad_neg)`}
                />
                {/* Glow/blur duplicate line */}
                <polyline
                  points="0,10 14,18 24,12 36,28 50,22 62,32 80,26"
                  stroke="currentColor"
                  strokeWidth="5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                  opacity="0.12"
                />
                {/* Main line */}
                <polyline
                  points="0,10 14,18 24,12 36,28 50,22 62,32 80,26"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                />
              </>
            )}
          </svg>
        </div>
        )}
      </div>
    </div>
  )
}

function EscrowCommissionRateEditor({
  t,
  updateOrderCommission,
  compactUi = false,
  variant = 'default',
}) {
  const isSheet = variant === 'sheet'
  const useCompactCopy = compactUi || isSheet
  const locked = t.payoutStatus === 'released'
  const gross = Number(t.amount) || Number(t.gross_amount) || 0
  const savedRate = Number(t.commission_rate_percent)

  const [draft, setDraft] = useState(() => (Number.isFinite(savedRate) ? String(savedRate) : ''))
  const [localErr, setLocalErr] = useState(null)
  const [saving, setSaving] = useState(false)

  const parsedDraft = useMemo(() => {
    const s = draft.trim().replace(',', '.')
    if (s === '') return null
    const n = Number.parseFloat(s)
    if (!Number.isFinite(n) || n < 0 || n > 100) return null
    return Math.round(n * 100) / 100
  }, [draft])

  const unchanged =
    parsedDraft != null &&
    Math.round(parsedDraft * 100) === Math.round((Number.isFinite(savedRate) ? savedRate : 0) * 100)

  const preview =
    parsedDraft != null && !unchanged ? computeCommissionSnapshot(gross, parsedDraft) : null

  async function handleSave() {
    if (!parsedDraft) {
      setLocalErr(useCompactCopy ? 'Enter 0–100.' : 'Rate must be a number from 0 through 100.')
      return
    }
    setSaving(true)
    setLocalErr(null)
    try {
      await updateOrderCommission(t.orderUuid, parsedDraft)
    } catch (e) {
      setLocalErr(e instanceof Error ? e.message : 'Update failed.')
    } finally {
      setSaving(false)
    }
  }

  if (locked) {
    return (
      <p
        className={
          isSheet ? styles.msheetCommissionLockedNote : styles.expandedCommissionLocked
        }
      >
        {useCompactCopy
          ? 'Commission is locked after release.'
          : 'Commission rate cannot be changed after this order has been released.'}
      </p>
    )
  }

  if (isSheet) {
    return (
      <section className={styles.msheetCommissionSection} aria-label="Commission rate for this order">
        <div className={styles.msheetCommissionHeader}>
          <span className={styles.msheetCommissionHeadline}>Commission rate</span>
          <span className={styles.msheetCommissionSub}>Applies only to this order</span>
        </div>
        <div className={styles.msheetCommissionRow}>
          <div className={styles.msheetRateControl}>
            <input
              type="text"
              inputMode="decimal"
              className={styles.msheetRateInput}
              value={draft}
              onChange={(e) => {
                setDraft(e.target.value)
                setLocalErr(null)
              }}
              aria-invalid={Boolean(localErr)}
              aria-label="Commission percent"
            />
            <span className={styles.msheetRateSuffix}>%</span>
          </div>
          <button
            type="button"
            className={styles.msheetRateSaveBtn}
            disabled={saving || parsedDraft === null || unchanged}
            onClick={handleSave}
            aria-label={saving ? 'Saving commission rate' : 'Save commission rate'}
          >
            {saving ? '…' : 'Save'}
          </button>
        </div>
        {preview && (
          <div className={styles.msheetCommissionPreview}>
            <span>{formatPHP(preview.commissionAmountPhp)} fee</span>
            <span className={styles.msheetCommissionPreviewSep}>·</span>
            <span>{formatPHP(preview.netAmountPhp)} net</span>
          </div>
        )}
        {localErr && <p className={styles.msheetCommissionErr}>{localErr}</p>}
      </section>
    )
  }

  return (
    <div className={styles.expandedCommissionEdit}>
      <p className={styles.expandedCommissionEditLabel}>
        {useCompactCopy ? 'Commission % (this order)' : 'Commission rate for this order'}
      </p>
      <div className={styles.expandedCommissionEditRow}>
        <input
          type="text"
          inputMode="decimal"
          className={styles.expandedCommissionRateInput}
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value)
            setLocalErr(null)
          }}
          aria-invalid={Boolean(localErr)}
        />
        <span className={styles.expandedCommissionPercentSuffix}>%</span>
        <button
          type="button"
          className={styles.expandedCommissionSaveBtn}
          disabled={saving || parsedDraft === null || unchanged}
          onClick={handleSave}
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
      {preview && (
        <p
          className={`${styles.expandedCommissionHint}${
            useCompactCopy ? ` ${styles.expandedCommissionHintStack}` : ''
          }`}
        >
          {useCompactCopy ? (
            <>
              Fee {formatPHP(preview.commissionAmountPhp)}
              <span className={styles.expandedCommissionHintNet}>
                Net {formatPHP(preview.netAmountPhp)}
              </span>
            </>
          ) : (
            <>
              Preview: platform fee {formatPHP(preview.commissionAmountPhp)} · seller net{' '}
              {formatPHP(preview.netAmountPhp)}
            </>
          )}
        </p>
      )}
      {localErr && <p className={styles.expandedCommissionErr}>{localErr}</p>}
    </div>
  )
}

/** Dedicated mobile bottom-sheet layout (not the desktop expanded row). */
function MobileTxnDetailSheetContent({
  t,
  commissionSettings,
  releaseOrder,
  holdOrder,
  unholdOrder,
  updateOrderCommission,
  approvedRequestId = '',
}) {
  const { rate, commission, sellerEarnings } = getTxnCommissionParts(t, commissionSettings)
  const splitRate = Math.min(100, Math.max(0, Number(rate) || 0))

  return (
    <div className={styles.msheetRoot}>
      <section className={styles.msheetCard} aria-label="Seller">
        <div className={styles.msheetEyebrow}>Seller</div>
        <div className={styles.msheetSellerBiz}>{t.sellerName}</div>
        {(t.sellerEmail || '').trim().length > 0 && (
          <div className={styles.msheetSellerContact}>{t.sellerEmail}</div>
        )}
        {(t.sellerPhone || '').trim().length > 0 && (
          <div className={styles.msheetSellerPhone}>{t.sellerPhone}</div>
        )}
      </section>

      <section className={styles.msheetCard} aria-label="Commission breakdown">
        <div className={styles.msheetEyebrow}>Money split</div>
        <div className={styles.msheetMoneyLines}>
          <div className={styles.msheetMoneyLine}>
            <span>Collected</span>
            <span className={styles.msheetMoneyVal}>{formatPHP(t.amount)}</span>
          </div>
          <div className={styles.msheetMoneyLineMuted}>
            <span>Fee ({rate}%)</span>
            <span className={styles.msheetMoneyDeduct}>− {formatPHP(commission)}</span>
          </div>
        </div>
        <div className={styles.msheetSellerNetBanner}>
          <span className={styles.msheetSellerNetLbl}>Seller receives</span>
          <span className={styles.msheetSellerNetFig}>{formatPHP(sellerEarnings)}</span>
        </div>
        <div className={styles.msheetSplitTrack} title={`Platform ${rate}% · Seller ${100 - rate}%`}>
          <span className={styles.msheetSplitPlat} style={{ flex: `0 0 ${splitRate}%` }} />
          <span className={styles.msheetSplitSeller} style={{ flex: '1 1 0', minWidth: 0 }} />
        </div>
      </section>

      <EscrowCommissionRateEditor
        key={`${t.id}-${String(t.commission_rate_percent)}-${t.payoutStatus}`}
        t={t}
        updateOrderCommission={updateOrderCommission}
        variant="sheet"
      />

      <section className={styles.msheetCard} aria-label="Order status">
        <div className={styles.msheetEyebrow}>Status</div>
        <div className={styles.msheetStatusRow}>
          <span className={styles.msheetStatusKey}>Service</span>
          <span className={styles.msheetStatusVal}>{t.fulfillmentStatus || '—'}</span>
        </div>
        <div className={styles.msheetBadgeRow}>
          <Badge type="payment" value={t.paymentStatus} />
          <Badge type="payout" value={t.payoutStatus} />
        </div>
        {(t.payoutReference || t.payoutDate) && (
          <div className={styles.msheetRefRow}>
            {t.payoutReference && (
              <span className={styles.msheetRefChip}>Ref {t.payoutReference}</span>
            )}
            {t.payoutDate && <span className={styles.msheetDateChip}>{t.payoutDate}</span>}
          </div>
        )}
      </section>

      <EscrowReleasePanel
        key={String(t.id)}
        t={t}
        releaseOrder={releaseOrder}
        holdOrder={holdOrder}
        unholdOrder={unholdOrder}
        approvedRequestId={approvedRequestId}
        variant="sheet"
      />
    </div>
  )
}

function ExpandedEscrowDetails({
  t,
  commissionSettings,
  releaseOrder,
  holdOrder,
  unholdOrder,
  updateOrderCommission,
  approvedRequestId = '',
  compactUi = false,
}) {
  const { rate, commission, sellerEarnings } = getTxnCommissionParts(t, commissionSettings)

  return (
    <div className={styles.expandedPanelRow}>
      <div className={styles.expandedPanelLeft}>
        <div className={styles.expandedSection}>
          <p className={styles.expandedSectionLabel}>
            <svg viewBox="0 0 24 24" fill="none"><path d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0H5m14 0h2M5 21H3M9 7h1m-1 4h1m4-4h1m-1 4h1M9 21v-4a1 1 0 011-1h4a1 1 0 011 1v4H9z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
            Seller
          </p>
          <p className={styles.expandedSellerName}>{t.sellerName}</p>
          <p className={styles.expandedSellerEmail}>{t.sellerEmail}</p>
          <p className={styles.expandedSellerPhone}>{t.sellerPhone}</p>
        </div>

        <div className={styles.expandedDivider}/>

        <div className={styles.expandedSection}>
          <p className={styles.expandedSectionLabel}>
            <svg viewBox="0 0 24 24" fill="none"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 14.93V18h-2v-1.07A4.004 4.004 0 018 13h2c0 1.1.9 2 2 2s2-.9 2-2c0-1.1-.9-2-2-2a4 4 0 01-4-4c0-1.86 1.28-3.41 3-3.86V2h2v1.14A4.004 4.004 0 0116 7h-2c0-1.1-.9-2-2-2s-2 .9-2 2 .9 2 2 2a4 4 0 014 4c0 1.86-1.28 3.41-3 3.93z" fill="currentColor"/></svg>
            {compactUi ? 'Commission' : 'Commission breakdown'}
          </p>
          <div className={styles.breakdownRows}>
            <div className={styles.breakdownRow}>
              <span>{compactUi ? 'Collected' : 'Total collected'}</span>
              <strong>{formatPHP(t.amount)}</strong>
            </div>
            <div className={`${styles.breakdownRow} ${styles.breakdownPlatform}`}>
              <span>
                {compactUi ? `Fee (${rate}%)` : `Platform fee (${rate}%)`}
              </span>
              <strong>− {formatPHP(commission)}</strong>
            </div>
            <div className={`${styles.breakdownRow} ${styles.breakdownSeller}`}>
              <span>Seller net</span>
              <strong>{formatPHP(sellerEarnings)}</strong>
            </div>
          </div>
          <div className={styles.splitBar}>
            <div className={styles.splitBarSegment} style={{ width: `${rate}%`, background: '#334155' }} title={`Platform ${rate}%`} />
            <div className={styles.splitBarSegment} style={{ width: `${100 - rate}%`, background: '#10b981' }} title={`Seller ${100 - rate}%`} />
          </div>
          <EscrowCommissionRateEditor
            key={`${t.id}-${String(t.commission_rate_percent)}-${t.payoutStatus}`}
            t={t}
            updateOrderCommission={updateOrderCommission}
            compactUi={compactUi}
          />
        </div>

        <div className={styles.expandedDivider}/>

        <div className={styles.expandedSection}>
          <p className={styles.expandedSectionLabel}>
            <svg viewBox="0 0 24 24" fill="none"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
            Status
          </p>
          <p className={styles.expandedFulfillmentLine}>
            {compactUi ? 'Service: ' : 'Fulfillment: '}
            <strong>{t.fulfillmentStatus || '—'}</strong>
          </p>
          <div className={styles.payoutStatusRow}>
            <Badge type="payment" value={t.paymentStatus} />
            <Badge type="payout" value={t.payoutStatus} />
            {shouldShowDisbursementBadge(t.disbursementState, t.payoutStatus) ? (
              <Badge type="disbursement" value={t.disbursementState} />
            ) : null}
            {t.payoutReference && <span className={styles.refChip}>Ref: {t.payoutReference}</span>}
            {t.payoutDate && <span className={styles.dateChip}>{t.payoutDate}</span>}
          </div>
        </div>
      </div>

      <div className={styles.expandedDividerVert} aria-hidden />

      <div className={styles.expandedPanelRight}>
        <EscrowReleasePanel
          key={String(t.id)}
          t={t}
          releaseOrder={releaseOrder}
          holdOrder={holdOrder}
          unholdOrder={unholdOrder}
          approvedRequestId={approvedRequestId}
          compactUi={compactUi}
        />
      </div>
    </div>
  )
}

// ─── Commission Settings Panel ────────────────────────────────────────────────

/**
 * Resolve commission gauge thresholds from the platform default rate.
 *
 * - "Low": strictly below the platform default (seller-friendly band).
 * - "Standard": from the default up to 1.5× default.
 * - "High": anything above 1.5× default.
 *
 * Always safe even when defaultRate is 0 / NaN (falls back to a sensible 10%).
 */
function resolveCommissionThresholds(defaultRate) {
  const base = Number.isFinite(defaultRate) && defaultRate > 0 ? Number(defaultRate) : 10
  return {
    lowBoundary: Math.max(0, base),
    standardBoundary: Math.max(base, base * 1.5),
  }
}

function commissionRiskTier(rate, defaultRate) {
  const { lowBoundary, standardBoundary } = resolveCommissionThresholds(defaultRate)
  if (rate < lowBoundary) return 'low'
  if (rate <= standardBoundary) return 'standard'
  return 'high'
}

function RateGauge({ rate, defaultRate }) {
  const clamp = Math.min(100, Math.max(0, rate))
  const r = 38, cx = 48, cy = 48
  const circumference = Math.PI * r // half-circle
  const filled = (clamp / 100) * circumference
  const tier = commissionRiskTier(clamp, defaultRate)
  const color = tier === 'low' ? '#10b981' : tier === 'standard' ? '#4ade80' : '#ef4444'
  return (
    <svg width="96" height="56" viewBox="0 0 96 60" className={styles.rateGaugeSvg}>
      <path
        d={`M ${cx - r},${cy} A ${r},${r} 0 0,1 ${cx + r},${cy}`}
        fill="none" stroke="#f1f5f9" strokeWidth="8" strokeLinecap="round"
      />
      <path
        d={`M ${cx - r},${cy} A ${r},${r} 0 0,1 ${cx + r},${cy}`}
        fill="none" stroke={color} strokeWidth="8" strokeLinecap="round"
        strokeDasharray={`${filled} ${circumference}`}
        style={{ transition: 'stroke-dasharray 0.5s ease, stroke 0.3s ease' }}
      />
      <text x={cx} y={cy - 4} textAnchor="middle" fontSize="15" fontWeight="800" fill="#0f172a">{clamp}%</text>
      <text x={cx} y={cy + 10} textAnchor="middle" fontSize="9" fill="#94a3b8" fontWeight="600" letterSpacing="0.5">RATE</text>
    </svg>
  )
}

function CommissionPanel({
  settings,
  transactions = [],
  sellersList = [],
  onSaveGlobal,
  onSaveSellerOverride,
  onClearSellerOverride,
}) {
  const [globalInput, setGlobalInput] = useState(String(settings.global))
  const [editingGlobal, setEditingGlobal] = useState(false)
  const [sellerInputs, setSellerInputs] = useState({})
  const [editingSeller, setEditingSeller] = useState(null)
  const [confirmReset, setConfirmReset] = useState(false)
  /** Persisted change log entries (succeeded API calls). */
  const [changeLog, setChangeLog] = useState([])
  const [showLog, setShowLog] = useState(false)
  const [activeSection, setActiveSection] = useState('global') // 'global' | 'sellers'
  const [busy, setBusy] = useState(null) // 'global' | sellerId | 'reset' | null
  const [saveError, setSaveError] = useState('')

  const customCount = Object.keys(settings.sellers).length

  const reloadChangeLog = useCallback(async () => {
    const res = await fetch('/api/admin/payouts/commission-change-log?limit=20', {
      credentials: 'include',
      cache: 'no-store',
    })
    const body = await res.json().catch(() => null)
    if (!res.ok) return
    setChangeLog(
      (body?.entries ?? []).map((row) => ({
        id: row.id,
        ts: new Date(row.created_at).getTime(),
        type:
          row.scope === 'global'
            ? 'global'
            : row.scope === 'seller_override'
              ? row.to_percent == null
                ? 'remove'
                : 'seller'
              : 'order',
        label: row.label,
        from: row.from_percent,
        to: row.to_percent,
      })),
    )
  }, [])

  const toggleChangeLog = useCallback(() => {
    setShowLog((open) => {
      const next = !open
      if (next) {
        void reloadChangeLog()
      }
      return next
    })
  }, [reloadChangeLog])

  const saveGlobal = async () => {
    setSaveError('')
    const v = parseFloat(globalInput)
    if (Number.isNaN(v) || v < 0 || v > 100) {
      setSaveError('Enter a rate from 0 through 100.')
      return
    }
    if (typeof onSaveGlobal !== 'function') {
      setEditingGlobal(false)
      return
    }
    setBusy('global')
    try {
      await onSaveGlobal(v)
      await reloadChangeLog()
      setEditingGlobal(false)
    } catch (err) {
      setSaveError(err?.message || 'Failed to save commission.')
    } finally {
      setBusy(null)
    }
  }

  const saveSeller = async (sid) => {
    setSaveError('')
    const rawInput = sellerInputs[sid]

    if (rawInput === '' || rawInput == null) {
      if (typeof onClearSellerOverride === 'function') {
        setBusy(sid)
        try {
          await onClearSellerOverride(sid)
          await reloadChangeLog()
          setEditingSeller(null)
        } catch (err) {
          setSaveError(err?.message || 'Failed to clear override.')
        } finally {
          setBusy(null)
        }
      } else {
        setEditingSeller(null)
      }
      return
    }

    const v = parseFloat(rawInput)
    if (Number.isNaN(v) || v < 0 || v > 100) {
      setSaveError('Enter a rate from 0 through 100.')
      return
    }
    if (typeof onSaveSellerOverride !== 'function') {
      setEditingSeller(null)
      return
    }
    setBusy(sid)
    try {
      await onSaveSellerOverride(sid, v)
      await reloadChangeLog()
      setEditingSeller(null)
    } catch (err) {
      setSaveError(err?.message || 'Failed to save override.')
    } finally {
      setBusy(null)
    }
  }

  const removeOverride = async (sid) => {
    if (typeof onClearSellerOverride !== 'function') return
    setBusy(sid)
    setSaveError('')
    try {
      await onClearSellerOverride(sid)
      await reloadChangeLog()
    } catch (err) {
      setSaveError(err?.message || 'Failed to clear override.')
    } finally {
      setBusy(null)
    }
  }

  const resetAll = async () => {
    if (typeof onClearSellerOverride !== 'function') {
      setConfirmReset(false)
      return
    }
    const sellerIds = Object.keys(settings.sellers)
    if (sellerIds.length === 0) {
      setConfirmReset(false)
      return
    }
    setBusy('reset')
    setSaveError('')
    try {
      const results = await Promise.allSettled(
        sellerIds.map((sid) => onClearSellerOverride(sid)),
      )
      const failed = results.filter((r) => r.status === 'rejected')
      if (failed.length > 0) {
        setSaveError(`Cleared ${sellerIds.length - failed.length} of ${sellerIds.length} overrides.`)
      }
      await reloadChangeLog()
    } finally {
      setBusy(null)
      setConfirmReset(false)
    }
  }

  function timeAgo(ts) {
    // Relative label; wall clock is intentional (not derived React state).
    // eslint-disable-next-line react-hooks/purity -- changelog stamps are compared to current time
    const s = Math.floor((Date.now() - ts) / 1000)
    if (s < 60) return 'just now'
    if (s < 3600) return `${Math.floor(s/60)}m ago`
    if (s < 86400) return `${Math.floor(s/3600)}h ago`
    return `${Math.floor(s/86400)}d ago`
  }

  // Compute per-seller impact using transactions
  const sellerStats = useMemo(() => {
    const map = {}
    sellersList.forEach((s) => {
      map[s.id] = { revenue: 0, txnCount: 0 }
    })
    if (transactions) {
      transactions.forEach((t) => {
        if (t.paymentStatus === 'paid' && map[t.sellerId]) {
          const { commission } = getTxnCommissionParts(t, settings)
          map[t.sellerId].revenue += commission
          map[t.sellerId].txnCount++
        }
      })
    }
    return map
  }, [transactions, settings, sellersList])

  return (
    <div className={styles.commissionPanel}>
      {/* ── Header ── */}
      <div className={styles.commissionPanelHeader}>
        <div className={styles.commissionPanelHeaderLeft}>
          <div className={styles.commissionPanelTitleWrap}>
            <p className={styles.commissionPanelTitle}>Commission Settings</p>
            <p className={styles.commissionPanelSub}>
              Global rate matches Platform billing · Per-seller overrides persist to the seller record
            </p>
            {saveError ? (
              <p className={styles.commissionPanelSub} style={{ color: '#b91c1c' }}>
                {saveError}
              </p>
            ) : null}
          </div>
        </div>
        <div className={styles.commissionPanelHeaderRight}>
          {customCount > 0 && (
            <span className={styles.overrideCountBadge}>{customCount} custom override{customCount > 1 ? 's' : ''}</span>
          )}
          <button
            className={`${styles.logToggleBtn} ${showLog ? styles.logToggleBtnActive : ''}`}
            onClick={toggleChangeLog}
            title="Change history"
          >
            <svg viewBox="0 0 24 24" fill="none"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
            History
          </button>
          {customCount > 0 && (
            <button
              className={styles.resetAllBtn}
              onClick={() => setConfirmReset(true)}
              title="Reset all overrides to global rate"
            >
              <svg viewBox="0 0 24 24" fill="none"><path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
              Reset All
            </button>
          )}
        </div>
      </div>

      {/* ── Section Tabs ── */}
      <div className={styles.commissionSectionTabs}>
        {[{ key: 'global', label: 'Global Rate' }, { key: 'sellers', label: `Per-Seller Rates (${sellersList.length})` }].map(tab => (
          <button
            key={tab.key}
            className={`${styles.commissionSectionTab} ${activeSection === tab.key ? styles.commissionSectionTabActive : ''}`}
            onClick={() => setActiveSection(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className={styles.commissionBody}>

        {/* ── Change Log Drawer ── */}
        {showLog && (
          <div className={styles.changeLogDrawer}>
            <div className={styles.changeLogHeader}>
              <span className={styles.changeLogTitle}>Change History</span>
              <button className={styles.changeLogClose} onClick={() => setShowLog(false)}>
                <svg viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
              </button>
            </div>
            <div className={styles.changeLogList}>
              {changeLog.length === 0 && <p className={styles.changeLogEmpty}>No changes recorded yet.</p>}
              {changeLog.map(entry => (
                <div key={entry.id} className={styles.changeLogEntry}>
                  <div className={`${styles.changeLogDot} ${entry.type === 'remove' || entry.type === 'reset' ? styles.changeLogDotRed : styles.changeLogDotGreen}`} />
                  <div className={styles.changeLogMeta}>
                    <span className={styles.changeLogEntryLabel}>{entry.label}</span>
                    <span className={styles.changeLogEntryDetail}>
                      {entry.type === 'reset' ? 'All overrides cleared' : entry.from !== null ? `${entry.from}% → ${entry.to}%` : `Set to ${entry.to}%`}
                    </span>
                  </div>
                  <span className={styles.changeLogTime}>{timeAgo(entry.ts)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── SECTION: Global Rate ── */}
        {activeSection === 'global' && (
          <div className={styles.commissionGlobalSection}>
            {/* Gauge card */}
            <div className={styles.commissionGaugeCard}>
              <div className={styles.gaugeCardLeft}>
                <RateGauge rate={settings.global} defaultRate={settings.global} />
                <div className={styles.gaugeCardInfo}>
                  <p className={styles.gaugeCardLabel}>Global Commission Rate</p>
                  <p className={styles.gaugeCardHint}>Applied to all sellers without a custom override</p>
                  <div className={styles.gaugeCardMeta}>
                    {(() => {
                      const tier = commissionRiskTier(settings.global, settings.global)
                      const badgeClass =
                        tier === 'low'
                          ? styles.gaugeRiskLow
                          : tier === 'standard'
                            ? styles.gaugeRiskMid
                            : styles.gaugeRiskHigh
                      const badgeLabel = tier === 'low' ? 'Low' : tier === 'standard' ? 'Standard' : 'High'
                      return (
                        <span className={`${styles.gaugeRiskBadge} ${badgeClass}`}>
                          {badgeLabel} rate
                        </span>
                      )
                    })()}
                    <span className={styles.gaugeAffects}>
                      Affects{' '}
                      {Math.max(0, sellersList.length - customCount)} seller
                      {Math.max(0, sellersList.length - customCount) !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
              </div>
              <div className={styles.gaugeCardRight}>
                {editingGlobal ? (
                  <div className={styles.gaugeEditBlock}>
                    <label className={styles.gaugeEditLabel}>New rate (%)</label>
                    <div className={styles.gaugeEditRow}>
                      <input
                        className={styles.commissionRateInput}
                        type="number" min="0" max="100" step="0.5"
                        value={globalInput}
                        onChange={e => setGlobalInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && saveGlobal()}
                        autoFocus
                      />
                      <span className={styles.pctSymbol}>%</span>
                    </div>
                    <div className={styles.gaugeEditPreview}>
                      <span>On ₱50,000 order:</span>
                      <strong>{formatPHP(Math.round(50000 * (parseFloat(globalInput)||0) / 100))} fee</strong>
                    </div>
                    <div className={styles.gaugeEditActions}>
                      <button
                        className={styles.btnSave}
                        onClick={saveGlobal}
                        disabled={busy === 'global'}
                      >
                        {busy === 'global' ? 'Saving…' : 'Save Rate'}
                      </button>
                      <button
                        className={styles.btnCancel}
                        onClick={() => {
                          setEditingGlobal(false)
                          setGlobalInput(String(settings.global))
                          setSaveError('')
                        }}
                        disabled={busy === 'global'}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className={styles.gaugeDisplayBlock}>
                    <p className={styles.gaugeDisplayRate}>{settings.global}%</p>
                    <p className={styles.gaugeDisplaySub}>of each transaction</p>
                    <button className={styles.btnEdit} onClick={() => { setGlobalInput(String(settings.global)); setEditingGlobal(true) }}>
                      <Icon.Edit /> Edit Rate
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Impact summary cards */}
            <div className={styles.globalImpactGrid}>
              {[
                { label: 'On ₱10,000 sale', amount: 10000 },
                { label: 'On ₱25,000 sale', amount: 25000 },
                { label: 'On ₱50,000 sale', amount: 50000 },
                { label: 'On ₱100,000 sale', amount: 100000 },
              ].map(({ label, amount }) => {
                const fee = Math.round(amount * settings.global / 100)
                return (
                  <div key={amount} className={styles.impactCard}>
                    <span className={styles.impactLabel}>{label}</span>
                    <div className={styles.impactSplit}>
                      <div className={styles.impactSplitBar}>
                        <div className={styles.impactSplitPlatform} style={{ width: `${settings.global}%` }} />
                        <div className={styles.impactSplitSeller} style={{ width: `${100 - settings.global}%` }} />
                      </div>
                    </div>
                    <div className={styles.impactValues}>
                      <span className={styles.impactFee}>Fee: {formatPHP(fee)}</span>
                      <span className={styles.impactSeller}>Seller: {formatPHP(amount - fee)}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ── SECTION: Per-Seller ── */}
        {activeSection === 'sellers' && (
          <div className={styles.sellerOverrideSection}>
            <div className={styles.sellerOverrideHeaderRow}>
              <p className={styles.sellerOverrideTitle}>Seller-Specific Commission Overrides</p>
              <p className={styles.sellerOverrideDesc}>
                Set a custom rate per seller. Sellers without an override use the global <strong>{settings.global}%</strong> rate.
              </p>
            </div>

            <div className={styles.sellerOverrideList}>
              {sellersList.length === 0 && (
                <p className={styles.sellerOverrideDesc}>Load payout data to see sellers with escrows.</p>
              )}
              {sellersList.map(seller => {
                const override = settings.sellers[seller.id]
                const isEditing = editingSeller === seller.id
                const effective = override !== undefined ? override : settings.global
                const isCustom = override !== undefined
                const stat = sellerStats[seller.id] || { revenue: 0, txnCount: 0 }
                const diff = isCustom ? effective - settings.global : 0

                return (
                  <div key={seller.id} className={`${styles.sellerOverrideRow} ${isCustom ? styles.sellerOverrideRowActive : ''}`}>
                    {/* Left: avatar + info */}
                    <div className={styles.sellerOverrideInfo}>
                      <div className={`${styles.sellerAvatar} ${isCustom ? styles.sellerAvatarCustom : ''}`}>{seller.name[0]}</div>
                      <div className={styles.sellerOverrideTextBlock}>
                        <div className={styles.sellerOverrideNameRow}>
                          <p className={styles.sellerOverrideName}>{seller.name}</p>
                          {isCustom && (
                            <span className={`${styles.sellerDiffBadge} ${diff > 0 ? styles.sellerDiffUp : styles.sellerDiffDown}`}>
                              {diff > 0 ? '+' : ''}{diff.toFixed(1)}% vs global
                            </span>
                          )}
                        </div>
                        <p className={styles.sellerOverrideHint}>
                          {isCustom ? `Custom rate · ${stat.txnCount} txns · ${formatPHP(stat.revenue)} collected` : `Using global rate · ${stat.txnCount} txns`}
                        </p>
                      </div>
                    </div>

                    {/* Right: rate display or edit */}
                    {isEditing ? (
                      <div className={styles.sellerEditBlock}>
                        <div className={styles.gaugeEditRow}>
                          <input
                            className={styles.commissionRateInput}
                            type="number" min="0" max="100" step="0.5"
                            value={sellerInputs[seller.id] ?? String(effective)}
                            onChange={e => setSellerInputs(p => ({ ...p, [seller.id]: e.target.value }))}
                            onKeyDown={e => e.key === 'Enter' && saveSeller(seller.id)}
                            autoFocus
                          />
                          <span className={styles.pctSymbol}>%</span>
                          <button
                            className={styles.btnSave}
                            onClick={() => saveSeller(seller.id)}
                            disabled={busy === seller.id}
                          >
                            {busy === seller.id ? 'Saving…' : 'Save'}
                          </button>
                          <button
                            className={styles.btnCancel}
                            onClick={() => {
                              setEditingSeller(null)
                              setSaveError('')
                            }}
                            disabled={busy === seller.id}
                          >
                            Cancel
                          </button>
                        </div>
                        <p className={styles.sellerEditHint}>Leave blank to remove override</p>
                      </div>
                    ) : (
                      <div className={styles.sellerOverrideRight}>
                        {/* Mini rate bar */}
                        <div className={styles.sellerMiniBar}>
                          <div className={styles.sellerMiniBarFill} style={{ width: `${effective}%`, background: isCustom ? '#102820' : '#334155' }} />
                        </div>
                        <span className={`${styles.sellerRateVal} ${isCustom ? styles.sellerRateCustom : ''}`}>{effective}%</span>
                        <button
                          className={styles.btnEdit}
                          onClick={() => { setSellerInputs(p => ({ ...p, [seller.id]: String(effective) })); setEditingSeller(seller.id) }}
                        >
                          <Icon.Edit /> {isCustom ? 'Edit' : 'Override'}
                        </button>
                        {isCustom && (
                          <button
                            className={styles.btnRemoveOverride}
                            onClick={() => removeOverride(seller.id)}
                            disabled={busy === seller.id}
                          >
                            {busy === seller.id ? 'Working…' : 'Remove'}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── Confirm Reset Modal ── */}
      {confirmReset && (
        <div className={styles.confirmOverlay} onClick={() => setConfirmReset(false)}>
          <div className={styles.confirmModal} onClick={e => e.stopPropagation()}>
            <div className={styles.confirmIcon}>
              <svg viewBox="0 0 24 24" fill="none"><path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" stroke="#f59e0b" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
            <p className={styles.confirmTitle}>Reset All Overrides?</p>
            <p className={styles.confirmDesc}>
              This will remove all {customCount} custom seller rate{customCount > 1 ? 's' : ''} and revert everyone to the global <strong>{settings.global}%</strong> rate. This cannot be undone.
            </p>
            <div className={styles.confirmActions}>
              <button
                className={styles.confirmCancelBtn}
                onClick={() => setConfirmReset(false)}
                disabled={busy === 'reset'}
              >
                Cancel
              </button>
              <button
                className={styles.confirmResetBtn}
                onClick={resetAll}
                disabled={busy === 'reset'}
              >
                {busy === 'reset' ? 'Clearing…' : 'Yes, Reset All'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Seller Earnings Panel ────────────────────────────────────────────────────

function SellerEarningsPanel({ transactions }) {
  const sellers = useMemo(() => {
    const m = new Map()
    for (const t of transactions ?? []) {
      if (!t?.sellerId) continue
      if (!m.has(t.sellerId)) {
        m.set(t.sellerId, { id: t.sellerId, name: String(t.sellerName || 'Seller').trim() || 'Seller' })
      }
    }
    return [...m.values()]
  }, [transactions])

  const earnings = useMemo(() => {
    return sellers.map((seller) => {
      const sellerTxns = transactions.filter((t) => t.sellerId === seller.id)
      let pendingRelease = 0
      let onHold = 0
      let released = 0

      sellerTxns.forEach((t) => {
        const net = Number(t.net_amount) || 0
        if (t.payoutStatus === 'released') released += net
        else if (t.payoutStatus === 'on_hold') onHold += net
        else if (t.payoutStatus === 'escrowed') pendingRelease += net
      })

      return { ...seller, pendingRelease, onHold, released, txnCount: sellerTxns.length }
    })
  }, [transactions, sellers])

  const initial = (name) => (name?.trim()?.charAt(0) || '?').toUpperCase()

  return (
    <div className={styles.sellerEarningsPanel}>
      <div className={styles.sePanelHeader}>
        <p className={styles.sePanelTitle}>Seller Earnings Tracker</p>
        <p className={styles.sePanelSub}>Totals from escrow snapshots on this payout list</p>
      </div>
      <div className={styles.seGrid}>
        {earnings.length === 0 && (
          <p className={styles.emptyHint}>No escrow rows loaded yet.</p>
        )}
        {earnings.map((s) => (
          <div key={s.id} className={styles.seCard}>
            <div className={styles.seCardTop}>
              <div className={styles.seAvatar}>{initial(s.name)}</div>
              <div>
                <p className={styles.seName}>{s.name}</p>
                <p className={styles.seTxnCount}>{s.txnCount} transactions</p>
              </div>
            </div>
            <div className={styles.seBalances}>
              <div className={styles.seBalanceItem}>
                <span className={styles.seBalLabel}>Pending release</span>
                <span className={`${styles.seBalVal} ${styles.seBalAvailable}`}>{formatPHP(s.pendingRelease)}</span>
              </div>
              <div className={styles.seBalanceItem}>
                <span className={styles.seBalLabel}>On hold</span>
                <span className={`${styles.seBalVal} ${styles.seBalPending}`}>{formatPHP(s.onHold)}</span>
              </div>
              <div className={styles.seBalanceItem}>
                <span className={styles.seBalLabel}>Released (net)</span>
                <span className={`${styles.seBalVal} ${styles.seBalWithdrawn}`}>{formatPHP(s.released)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdminPayoutsPage() {
  const {
    ROWS_PER_PAGE,
    transactions,
    sellerOptions,
    commissionSettings,
    activeTab,
    setActiveTab,
    search,
    setSearch,
    filterSeller,
    setFilterSeller,
    filterPayment,
    setFilterPayment,
    filterPayout,
    setFilterPayout,
    filterDateFrom,
    setFilterDateFrom,
    filterDateTo,
    setFilterDateTo,
    approvedRequestId,
    showFilters,
    setShowFilters,
    expandedRow,
    setExpandedRow,
    selectedRows,
    setSelectedRows,
    currentPage,
    setCurrentPage,
    summary,
    summaryLoading,
    listLoading,
    listError,
    listTruncated,
    disbursementConfig,
    paginatedRows,
    totalPages,
    dateSortDesc,
    toggleDateSort,
    refreshAll,
    releaseOrder,
    holdOrder,
    unholdOrder,
    updateOrderCommission,
    updateGlobalCommission,
    updateSellerCommissionOverride,
    clearFilters,
    hasFilters,
    showTransactions,
    showCommissions,
    showSellerEarnings,
  } = useAdminPayoutsPage()

  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth <= 640 : false
  )
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)
  /** When set on mobile, order details open in a bottom sheet (not inline). */
  const [mobileDetailModalId, setMobileDetailModalId] = useState(null)

  const activeFilterLabels = useMemo(() => {
    const labels = []
    if (filterPayout !== 'all') {
      labels.push(PAYOUT_STATUS_META[filterPayout]?.label || filterPayout)
    }
    if (filterSeller !== 'all') {
      labels.push(sellerOptions.find((s) => s.id === filterSeller)?.name || filterSeller)
    }
    if (filterPayment !== 'all') {
      labels.push(PAYMENT_STATUS_META[filterPayment]?.label || filterPayment)
    }
    return labels
  }, [filterPayout, filterSeller, filterPayment, sellerOptions])

  const mobileDetailTxn = useMemo(() => {
    if (!mobileDetailModalId) return null
    return transactions.find((x) => x.id === mobileDetailModalId) ?? null
  }, [transactions, mobileDetailModalId])

  const [payoutsBulkReleaseConfirm, setPayoutsBulkReleaseConfirm] = useState(false)
  const [payoutsBulkUnholdConfirm, setPayoutsBulkUnholdConfirm] = useState(false)
  const [payoutsBulkBusy, setPayoutsBulkBusy] = useState(false)
  const [bulkManualOverrideRelease, setBulkManualOverrideRelease] = useState(false)
  const [disbursementReminderDismissed, setDisbursementReminderDismissed] = useState(false)

  const selectedPayoutTxns = useMemo(() => {
    if (selectedRows.size === 0) return []
    return transactions.filter((t) => {
      const key = payoutTxnRowKey(t)
      return key !== '' && selectedRows.has(key)
    })
  }, [transactions, selectedRows])

  const bulkReleaseTargets = useMemo(
    () => selectedPayoutTxns.filter(payoutTxnCanBulkRelease),
    [selectedPayoutTxns],
  )
  const bulkUnholdTargets = useMemo(
    () => selectedPayoutTxns.filter(payoutTxnCanBulkUnhold),
    [selectedPayoutTxns],
  )

  const runBulkRelease = useCallback(async () => {
    if (bulkReleaseTargets.length === 0) return
    setPayoutsBulkBusy(true)
    try {
      const orderIds = bulkReleaseTargets
        .map((t) => t.orderUuid ?? t.orderId)
        .filter(Boolean)
      if (!orderIds.length) return

      const res = await fetch('/api/admin/payouts/release-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          orderIds,
          approvedRequestId: approvedRequestId || null,
          manualOverride: bulkManualOverrideRelease,
        }),
      })
      const body = await res.json().catch(() => null)
      if (!res.ok && res.status !== 207) {
        throw new Error(body?.error || 'Bulk release failed.')
      }
      const failed = Number(body?.failed) || 0
      if (failed > 0) {
        window.alert(`${failed} of ${orderIds.length} release(s) failed.`)
      }
      await refreshAll()
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Bulk release failed.')
    } finally {
      setPayoutsBulkBusy(false)
      setPayoutsBulkReleaseConfirm(false)
      setBulkManualOverrideRelease(false)
      setSelectedRows(new Set())
    }
  }, [approvedRequestId, bulkManualOverrideRelease, bulkReleaseTargets, refreshAll, setSelectedRows])

  const runBulkUnhold = useCallback(async () => {
    if (bulkUnholdTargets.length === 0) return
    setPayoutsBulkBusy(true)
    try {
      let failed = 0
      for (const t of bulkUnholdTargets) {
        try {
          const orderId = t.orderUuid ?? t.orderId
          if (!orderId) {
            failed += 1
            continue
          }
          await unholdOrder(orderId)
        } catch {
          failed += 1
        }
      }
      if (failed > 0) {
        window.alert(`${failed} of ${bulkUnholdTargets.length} unhold(s) failed.`)
      }
    } finally {
      setPayoutsBulkBusy(false)
      setPayoutsBulkUnholdConfirm(false)
      setSelectedRows(new Set())
    }
  }, [bulkUnholdTargets, unholdOrder, setSelectedRows])

  useEffect(() => {
    if (!mobileDetailModalId || !isMobile) return
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prevOverflow
    }
  }, [mobileDetailModalId, isMobile])

  useEffect(() => {
    if (!mobileDetailModalId) return
    const onKeyDown = (e) => {
      if (e.key === 'Escape') setMobileDetailModalId(null)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [mobileDetailModalId])

  useEffect(() => {
    if (
      mobileDetailModalId &&
      !transactions.some((t) => t.id === mobileDetailModalId)
    ) {
      queueMicrotask(() => setMobileDetailModalId(null))
    }
  }, [transactions, mobileDetailModalId])

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 640px)')
    const handler = (e) => setIsMobile(e.matches)
    mq.addEventListener('change', handler)
    queueMicrotask(() => setIsMobile(mq.matches))
    return () => mq.removeEventListener('change', handler)
  }, [])

  useEffect(() => {
    if (!isMobile) {
      queueMicrotask(() => {
        setMobileFiltersOpen(false)
        setMobileDetailModalId(null)
      })
    }
  }, [isMobile])

  return (
    <div className={styles.page}>
      {/* Tab Navigation */}
      <div className={styles.tabNav}>
        {[
          { key: 'all', label: 'All' },
          { key: 'transactions', label: 'Transactions' },
          { key: 'commissions', label: 'Commission Settings' },
          { key: 'sellers', label: 'Seller Earnings' },
        ].map(tab => (
          <button
            key={tab.key}
            type="button"
            className={`${styles.tabBtn} ${activeTab === tab.key ? styles.tabBtnActive : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Financial overview — only on "All" tab (not Transactions / Commission / Seller alone) */}
      {activeTab === 'all' && (
        <section className={styles.statsGrid} aria-busy={summaryLoading}>
          <StatCard
            label="Platform Revenue"
            shortLabel="Revenue"
            value={isMobile ? formatPHPMobile(summary.platformRevenue) : formatPHP(summary.platformRevenue)}
            valueLoading={summaryLoading}
            summarySkWidth={isMobile ? undefined : 132}
            percent={14}
          />
          <StatCard
            label="Escrow rows"
            shortLabel="Escrows"
            value={formatCount(summary.total, { desktop: !isMobile })}
            valueLoading={summaryLoading}
            summarySkWidth={isMobile ? 44 : 56}
            percent={-17}
          />
          <StatCard
            label="Pending release"
            shortLabel="Pending"
            value={isMobile ? formatPHPMobile(summary.pendingAmt) : formatPHP(summary.pendingAmt)}
            valueLoading={summaryLoading}
            summarySkWidth={isMobile ? undefined : 112}
            percent={8}
          />
          <StatCard
            label="Released (seller net)"
            shortLabel="Released"
            value={isMobile ? formatPHPMobile(summary.completedAmt) : formatPHP(summary.completedAmt)}
            valueLoading={summaryLoading}
            summarySkWidth={isMobile ? undefined : 112}
            percent={23}
            className={styles.statCardMobileHide}
          />
        </section>
      )}

      {approvedRequestId ? (
        <section className={styles.stuckRefundsWrap} aria-live="polite">
          <p className={styles.stuckRefundsTitle}>Approved payout review request</p>
          <p className={styles.stuckRefundsSub}>
            Release eligible completed escrow rows for this seller. Automated PayMongo disbursement runs per order when enabled.
          </p>
        </section>
      ) : null}

      {activeTab === 'all' && <PayoutRequestsStrip />}
      {activeTab === 'all' && <StuckRefundsStrip />}

      {/* Tab panels: All = transactions → commission → seller earnings */}
      <div
        className={activeTab === 'all' ? styles.allViewStack : undefined}
        style={activeTab === 'all' ? undefined : { display: 'contents' }}
      >
      {/* Tab: Transactions */}
      {showTransactions && (
        <div className={styles.tablePanel}>
          {listLoading ? <PayoutsTransactionsLoadingLiveRegion /> : null}
          {/* Toolbar — single row: search, date range, status, seller, filters, clear */}
          <div className={styles.toolbar}>
            <div className={styles.toolbarRow}>
              <div className={styles.toolbarControls}>
                {isMobile ? (
                  <div className={styles.mobileSearchSection}>
                    <div className={`${styles.mobileSearchWrap}${hasFilters ? ` ${styles.mobileSearchWrapActive}` : ''}`}>
                      <span className={styles.mobileSearchIcon}>
                        <Icon.Search />
                      </span>
                      <input
                        className={styles.mobileSearchInput}
                        type="search"
                        placeholder="Search (Order ID)"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        autoComplete="off"
                      />
                      {String(search || '').trim() ? (
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
                        onClick={() =>
                          setMobileFiltersOpen((open) => {
                            const next = !open
                            if (next) setMobileDetailModalId(null)
                            return next
                          })
                        }
                        aria-haspopup="dialog"
                        aria-expanded={mobileFiltersOpen}
                        aria-controls="payoutsMobileFilters"
                        aria-label="Open filters"
                      >
                        <LuSettings2
                          aria-hidden
                          className={`${styles.mobileFilterIcon}${hasFilters ? ` ${styles.mobileFilterIconActive}` : ''}`}
                        />
                      </button>
                    </div>
                    {activeFilterLabels.length > 0 && (
                      <div className={styles.mobileActivePillsRow} aria-label="Active filters">
                        {activeFilterLabels.map((label) => (
                          <div key={label} className={styles.mobileActivePill}>
                            <span className={styles.mobileActivePillLabel}>{label}</span>
                            <button
                              type="button"
                              className={styles.mobileActivePillClear}
                              onClick={() => {
                                const payoutLabel = PAYOUT_STATUS_META[filterPayout]?.label || filterPayout
                                const sellerLabel = sellerOptions.find((s) => s.id === filterSeller)?.name || filterSeller
                                const paymentLabel = PAYMENT_STATUS_META[filterPayment]?.label || filterPayment
                                if (label === payoutLabel) setFilterPayout('all')
                                if (label === sellerLabel) setFilterSeller('all')
                                if (label === paymentLabel) setFilterPayment('all')
                              }}
                              aria-label={`Clear ${label} filter`}
                            >
                              <TbX aria-hidden />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className={styles.toolbarSearchWrap}>
                    <Icon.Search />
                    <input
                      className={styles.toolbarSearchInput}
                      type="search"
                      placeholder="Search (Order ID)"
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      autoComplete="off"
                    />
                    {String(search || '').trim() ? (
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
                )}

                {!isMobile && (
                  <>
                    <DateRangePicker
                      from={filterDateFrom}
                      to={filterDateTo}
                      onChange={(from, to) => { setFilterDateFrom(from); setFilterDateTo(to) }}
                    />

                    <Dropdown
                      value={filterPayout}
                      onChange={setFilterPayout}
                      ariaLabel="Escrow status"
                      options={[
                        DEFAULT_PAYOUT_OPTION,
                        ...Object.entries(PAYOUT_STATUS_META).map(([k, v]) => ({ value: k, label: v.label, color: v.color }))
                      ]}
                      placeholder="All"
                    />

                    <Dropdown
                      value={filterSeller}
                      onChange={setFilterSeller}
                      ariaLabel="Seller"
                      options={[
                        DEFAULT_SELLER_OPTION,
                        ...sellerOptions.map((s) => ({ value: s.id, label: s.name })),
                      ]}
                      placeholder="All"
                    />

                    <button
                      type="button"
                      className={`${styles.toolbarFiltersBtn} ${showFilters ? styles.toolbarFiltersBtnActive : ''}`}
                      onClick={() => setShowFilters(!showFilters)}
                    >
                      <Icon.Filter />
                      Filters
                      {filterPayment !== 'all' && <span className={styles.filterDot} />}
                    </button>
                  </>
                )}
              </div>

              {!isMobile && (
                <button
                  type="button"
                  className={styles.toolbarClearAll}
                  onClick={clearFilters}
                  disabled={!hasFilters}
                >
                  <FiRotateCcw className={styles.toolbarClearIcon} aria-hidden />
                  Clear All
                </button>
              )}
            </div>

            {!isMobile && showFilters && (
              <div className={styles.filterBarExtra}>
                <div className={styles.filterFieldInline}>
                  <span className={styles.filterFieldInlineLabel}>Payment</span>
                  <Dropdown
                    value={filterPayment}
                    onChange={setFilterPayment}
                    ariaLabel="Payment status"
                    options={[
                      DEFAULT_PAYMENT_OPTION,
                      ...Object.entries(PAYMENT_STATUS_META).map(([k, v]) => ({ value: k, label: v.label, color: v.color }))
                    ]}
                    placeholder="All"
                  />
                </div>
              </div>
            )}

          
          </div>

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
              {bulkReleaseTargets.length > 0 ? (
                <button
                  type="button"
                  onClick={() => setPayoutsBulkReleaseConfirm(true)}
                  disabled={payoutsBulkBusy || listLoading || Boolean(listError)}
                  style={{
                    padding: '6px 12px',
                    background: '#f0fdf4',
                    color: '#15803d',
                    border: '1px solid #16a34a',
                    borderRadius: 6,
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: payoutsBulkBusy || listLoading || listError ? 'not-allowed' : 'pointer',
                    opacity: payoutsBulkBusy || listLoading || listError ? 0.5 : 1,
                  }}
                >
                  Release payout{bulkReleaseTargets.length === 1 ? '' : 's'} ({bulkReleaseTargets.length})
                </button>
              ) : null}
              {bulkUnholdTargets.length > 0 ? (
                <button
                  type="button"
                  onClick={() => setPayoutsBulkUnholdConfirm(true)}
                  disabled={payoutsBulkBusy || listLoading || Boolean(listError)}
                  style={{
                    padding: '6px 12px',
                    background: '#f1f5f9',
                    color: '#0f172a',
                    border: '1px solid #0f172a',
                    borderRadius: 6,
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: payoutsBulkBusy || listLoading || listError ? 'not-allowed' : 'pointer',
                    opacity: payoutsBulkBusy || listLoading || listError ? 0.5 : 1,
                  }}
                >
                  Remove hold ({bulkUnholdTargets.length})
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => {
                  setPayoutsBulkReleaseConfirm(false)
                  setPayoutsBulkUnholdConfirm(false)
                  setSelectedRows(new Set())
                }}
                disabled={payoutsBulkBusy}
                className={adminStyles.bulkClearSelectionBtn}
                aria-label="Clear selection"
              >
                <span className={adminStyles.bulkClearSelectionLabel}>Clear selection</span>
                <TbX className={adminStyles.bulkClearSelectionIcon} aria-hidden />
              </button>
            </div>
          ) : null}

          {listTruncated ? (
            <p role="status" className={styles.emptyHint} style={{ margin: '0 0 12px' }}>
              Showing the latest escrow rows only. Narrow filters or search by order ID if you need an older payout.
            </p>
          ) : null}

          {/* Mobile Card List — hidden on desktop via CSS */}
          <div className={styles.mobileCardList}>
            {listLoading ? (
              <PayoutsMobileTransactionSkeleton />
            ) : listError ? (
              <div className={styles.emptyState}>
                <p className={styles.emptyTitle}>Could not load payouts</p>
                <p className={styles.emptyHint}>{listError}</p>
              </div>
            ) : paginatedRows.length === 0 ? (
              <div className={styles.emptyState}>
                <p className={styles.emptyTitle}>No transactions found</p>
                <p className={styles.emptyHint}>Try adjusting your filters</p>
                {hasFilters && <button className={styles.clearFiltersBtn} onClick={clearFilters}>Clear filters</button>}
              </div>
            ) : (
              paginatedRows.map((t) => {
                const { commission, sellerEarnings } = getTxnCommissionParts(t, commissionSettings)
                return (
                  <article key={t.id} className={styles.mobileCard}>
                    <div className={styles.mobileCardHeader}>
                      <div className={styles.mobileCardHeaderMain}>
                        <input
                          type="checkbox"
                          className={styles.rowCheckbox}
                          checked={selectedRows.has(payoutTxnRowKey(t))}
                          disabled={listLoading || Boolean(listError)}
                          onChange={(e) => {
                            const key = payoutTxnRowKey(t)
                            if (!key) return
                            setSelectedRows((prev) => {
                              const next = new Set(prev)
                              if (e.target.checked) next.add(key)
                              else next.delete(key)
                              return next
                            })
                          }}
                          aria-label={`Select order ${t.orderId || t.orderUuid || ''}`}
                        />
                        <div className={styles.mobileHeaderMain}>
                          <p className={styles.mobileTitle}>{t.orderId}</p>
                        </div>
                      </div>
                      <p className={styles.mobileCardAmount}>{formatPHP(t.amount)}</p>
                    </div>

                    <div className={styles.mobileCardSection} data-mobile-label="Service">
                      <p className={styles.mobileCardService}>{t.service}</p>
                    </div>

                    <div className={styles.mobileCardSection} data-mobile-label="Buyer">
                      <div className={styles.mobileCardMetaRow}>
                        <span className={styles.mobileCardBuyer}>{t.buyerName}</span>
                        <span className={styles.mobileCardDate}>{t.date}</span>
                      </div>
                    </div>

                    <div className={styles.mobileCardSection} data-mobile-label="Status">
                      <div className={styles.mobileCardStatuses}>
                      <Badge type="payment" value={t.paymentStatus}/>
                      <Badge type="payout" value={t.payoutStatus}/>
                      {shouldShowDisbursementBadge(t.disbursementState, t.payoutStatus) ? (
                        <Badge type="disbursement" value={t.disbursementState} />
                      ) : null}
                      </div>
                    </div>

                    <div className={styles.mobileCardSection} data-mobile-label="Breakdown">
                      <div className={styles.mobileCardBreakdown}>
                        <span className={styles.mobileCardBreakdownItem}>Platform <strong>{formatPHP(commission)}</strong></span>
                        <span className={styles.mobileCardBreakdownDivider}>·</span>
                        <span className={styles.mobileCardBreakdownItem}>Seller <strong className={styles.mobileCardEarnings}>{formatPHP(sellerEarnings)}</strong></span>
                      </div>
                    </div>

                    <div className={styles.mobileCardFooter}>
                      <button
                        type="button"
                        className={styles.mobileCardDetailsBtn}
                        onClick={() => {
                          setMobileFiltersOpen(false)
                          setMobileDetailModalId((cur) => (cur === t.id ? null : t.id))
                        }}
                        aria-haspopup="dialog"
                        aria-expanded={mobileDetailModalId === t.id}
                        aria-controls={
                          mobileDetailModalId === t.id ? 'payoutsMobileTxnDetail' : undefined
                        }
                      >
                        View Details
                      </button>
                    </div>
                  </article>
                )
              })
            )}
          </div>

          {/* Table — hidden on mobile via CSS */}
          <div className={styles.tableWrap}>
            <table className={styles.table} aria-busy={listLoading}>
              <thead>
                <tr>
                  <th className={styles.checkboxCell}>
                    <input
                      type="checkbox"
                      className={styles.rowCheckbox}
                      disabled={listLoading || paginatedRows.length === 0 || Boolean(listError)}
                      checked={
                        paginatedRows.length > 0 &&
                        paginatedRows.every((t) => selectedRows.has(payoutTxnRowKey(t)))
                      }
                      aria-label="Select all transactions on this page"
                      onChange={e => {
                        setSelectedRows(prev => {
                          const next = new Set(prev)
                          if (e.target.checked) {
                            paginatedRows.forEach((t) => {
                              const key = payoutTxnRowKey(t)
                              if (key) next.add(key)
                            })
                          } else {
                            paginatedRows.forEach((t) => {
                              const key = payoutTxnRowKey(t)
                              if (key) next.delete(key)
                            })
                          }
                          return next
                        })
                      }}
                    />
                  </th>
                  <th>Order</th>
                  <th>Service</th>
                  <th>Buyer</th>
                  <th>Payment</th>
                  <th className={styles.escrowCell}>Escrow</th>
                  <th className={styles.thDateHead} aria-sort={dateSortDesc ? 'descending' : 'ascending'}>
                    <button
                      type="button"
                      className={styles.dateSortHeaderBtn}
                      onClick={toggleDateSort}
                      disabled={listLoading}
                      title={
                        dateSortDesc
                          ? 'Newest first · click for oldest first'
                          : 'Oldest first · click for newest first'
                      }
                      aria-label={
                        dateSortDesc
                          ? 'Date column: sorted newest first. Activate to sort oldest first.'
                          : 'Date column: sorted oldest first. Activate to sort newest first.'
                      }
                    >
                      Date
                      <span className={styles.dateSortHeaderIcon} aria-hidden>
                        {dateSortDesc ? (
                          <FiArrowDown className={styles.dateSortHeaderIconSvg} strokeWidth={2.25} />
                        ) : (
                          <FiArrowUp className={styles.dateSortHeaderIconSvg} strokeWidth={2.25} />
                        )}
                      </span>
                    </button>
                  </th>
                  <th>Amount</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {listLoading ? (
                  <PayoutsTableSkeletonBody />
                ) : listError ? (
                  <tr>
                    <td colSpan={9} className={styles.expandedTd}>
                      <p className={styles.emptyTitle}>Could not load payouts</p>
                      <p className={styles.emptyHint}>{listError}</p>
                    </td>
                  </tr>
                ) : (
                paginatedRows.map(t => {
                  const isExpanded = expandedRow === t.id
                  return (
                    <React.Fragment key={t.id}>
                      <tr
                        key={t.id}
                        className={`${styles.primaryRow} ${isExpanded ? styles.primaryRowOpen : ''}`}
                      >
                        <td className={styles.checkboxCell}>
                          <input
                            type="checkbox"
                            className={styles.rowCheckbox}
                            checked={selectedRows.has(payoutTxnRowKey(t))}
                            disabled={listLoading || Boolean(listError)}
                            onChange={e => {
                              const key = payoutTxnRowKey(t)
                              if (!key) return
                              setSelectedRows(prev => {
                                const next = new Set(prev)
                                if (e.target.checked) next.add(key)
                                else next.delete(key)
                                return next
                              })
                            }}
                            aria-label={`Select order ${t.orderId || t.orderUuid || ''}`}
                          />
                        </td>
                        <td>
                          <p className={styles.orderId}>{t.orderId}</p>
                        </td>
                        <td className={styles.serviceCell}>{t.service}</td>
                        <td>
                          <p className={styles.personName}>{t.buyerName}</p>
                          <p className={styles.personEmail}>{t.buyerEmail}</p>
                        </td>
                        <td><Badge type="payment" value={t.paymentStatus}/></td>
                        <td className={styles.escrowCell}>
                          <div className={styles.escrowStatusStack}>
                            <Badge type="payout" value={t.payoutStatus}/>
                            {shouldShowDisbursementBadge(t.disbursementState, t.payoutStatus) ? (
                              <Badge type="disbursement" value={t.disbursementState} />
                            ) : null}
                          </div>
                        </td>
                        <td className={styles.dateCell}>{t.date}</td>
                        <td>
                          <p className={styles.amountCell}>{formatPHP(t.amount)}</p>
                        </td>
                        <td>
                          <div className={styles.rowActions}>
                            <button
                              type="button"
                              className={`${styles.expandBtn} ${isExpanded ? styles.expandBtnOpen : ''}`}
                              onClick={() => setExpandedRow(isExpanded ? null : t.id)}
                              aria-expanded={isExpanded}
                              title={isExpanded ? 'Collapse details' : 'Expand details & release payout'}
                            >
                              <svg viewBox="0 0 24 24" fill="none">
                                <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>

                      {isExpanded && (
                        <tr key={`${t.id}-detail`} className={styles.expandedRow}>
                          <td colSpan={9} className={styles.expandedTd}>
                            <div className={styles.expandedPanel}>
                              <ExpandedEscrowDetails
                                t={t}
                                commissionSettings={commissionSettings}
                                releaseOrder={releaseOrder}
                                holdOrder={holdOrder}
                                unholdOrder={unholdOrder}
                                updateOrderCommission={updateOrderCommission}
                                approvedRequestId={approvedRequestId}
                                compactUi={isMobile}
                              />
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  )
                }))}
              </tbody>
            </table>
            {!listLoading && !listError && transactions.length === 0 && (
              <div className={styles.emptyState}>
                <p className={styles.emptyTitle}>No transactions found</p>
                <p className={styles.emptyHint}>Try adjusting your filters or search query</p>
                {hasFilters && <button className={styles.clearFiltersBtn} onClick={clearFilters}>Clear filters</button>}
              </div>
            )}
          </div>

          {/* Pagination */}
          {transactions.length > 0 && (
            <div className={styles.pagination}>
              <div className={styles.paginationControls}>
                <button
                  className={`${styles.pageBtn} ${currentPage === 1 ? styles.pageBtnDisabled : ''}`}
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  ‹ Previous
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                  .reduce((acc, p, idx, arr) => {
                    if (idx > 0 && p - arr[idx - 1] > 1) acc.push('...')
                    acc.push(p)
                    return acc
                  }, [])
                  .map((p, idx) =>
                    p === '...'
                      ? <span key={`ellipsis-${idx}`} className={styles.pageEllipsis}>…</span>
                      : <button
                          key={p}
                          className={`${styles.pageBtn} ${currentPage === p ? styles.pageBtnActive : ''}`}
                          onClick={() => setCurrentPage(p)}
                        >{p}</button>
                  )
                }
                <button
                  className={`${styles.pageBtn} ${currentPage === totalPages ? styles.pageBtnDisabled : ''}`}
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next ›
                </button>
              </div>
              <p className={styles.paginationInfo}>
                Showing <strong>{(currentPage - 1) * ROWS_PER_PAGE + 1}–{Math.min(currentPage * ROWS_PER_PAGE, transactions.length)}</strong> of <strong>{transactions.length}</strong> entries
              </p>
            </div>
          )}

          <ConfirmModal
            open={payoutsBulkReleaseConfirm && bulkReleaseTargets.length > 0}
            variant="primary"
            icon={<TbCreditCardPay size={22} strokeWidth={1.75} aria-hidden />}
            title={`Release ${bulkReleaseTargets.length} payout${bulkReleaseTargets.length === 1 ? '' : 's'}?`}
            subtitleAlign="left"
            message={
              <>
                This will finalize escrow release for{' '}
                <strong>{bulkReleaseTargets.length}</strong> paid, completed order
                {bulkReleaseTargets.length === 1 ? '' : 's'} (other selected rows that are not eligible are skipped).
                Only use when you intend to complete these payouts.
              </>
            }
            extra={
              <label className={confirmModalStyles.modalCheckboxField}>
                <input
                  type="checkbox"
                  checked={bulkManualOverrideRelease}
                  onChange={(e) => setBulkManualOverrideRelease(e.target.checked)}
                  disabled={payoutsBulkBusy}
                />
                <span>Manual ledger release (skip PayMongo transfer)</span>
              </label>
            }
            confirmLabel="Release payouts"
            confirmLoadingLabel="Releasing…"
            cancelLabel="Cancel"
            loading={payoutsBulkBusy}
            onCancel={() => {
              if (payoutsBulkBusy) return
              setPayoutsBulkReleaseConfirm(false)
              setBulkManualOverrideRelease(false)
            }}
            onConfirm={runBulkRelease}
          />
          <ConfirmModal
            open={payoutsBulkUnholdConfirm && bulkUnholdTargets.length > 0}
            variant="warning"
            icon={<FiUnlock size={22} aria-hidden />}
            title={`Remove hold on ${bulkUnholdTargets.length} order${bulkUnholdTargets.length === 1 ? '' : 's'}?`}
            message={
              <>
                Escrow will return to its prior state for{' '}
                <strong>{bulkUnholdTargets.length}</strong> on-hold row
                {bulkUnholdTargets.length === 1 ? '' : 's'}. Other selected rows are unchanged.
              </>
            }
            confirmLabel="Remove holds"
            confirmLoadingLabel="Removing…"
            cancelLabel="Cancel"
            loading={payoutsBulkBusy}
            onCancel={() => {
              if (payoutsBulkBusy) return
              setPayoutsBulkUnholdConfirm(false)
            }}
            onConfirm={runBulkUnhold}
          />
        </div>
      )}

      {/* Tab: Commission Settings */}
      {showCommissions && (
        <CommissionPanel
          settings={commissionSettings}
          transactions={transactions}
          sellersList={sellerOptions}
          onSaveGlobal={updateGlobalCommission}
          onSaveSellerOverride={(sellerId, rate) =>
            updateSellerCommissionOverride(sellerId, rate)
          }
          onClearSellerOverride={(sellerId) =>
            updateSellerCommissionOverride(sellerId, null)
          }
        />
      )}

      {/* Tab: Seller Earnings */}
      {showSellerEarnings && (
        <SellerEarningsPanel transactions={transactions} />
      )}
      </div>

      {/* Mobile Filter Slide-Up Modal */}
      {isMobile && (
        <>
          {/* Backdrop */}
          <div
            className={`${styles.mobileFilterOverlay} ${mobileFiltersOpen ? styles.mobileFilterOverlayVisible : ''}`}
            onClick={() => setMobileFiltersOpen(false)}
            aria-hidden
          />
          {/* Sheet */}
          <div
            id="payoutsMobileFilters"
            className={`${styles.mobileFilterSheet} ${mobileFiltersOpen ? styles.mobileFilterSheetOpen : ''}`}
            role="dialog"
            aria-modal="true"
            aria-label="Filters"
          >
            {/* Drag handle */}
            <div className={styles.mobileFilterHandle} />

            {/* Header */}
            <div className={styles.mobileFilterHeader}>
              <span className={styles.mobileFilterTitle}>Filters</span>
              <button
                type="button"
                className={styles.mobileFilterClose}
                onClick={() => setMobileFiltersOpen(false)}
                aria-label="Close filters"
              >
                <Icon.Close />
              </button>
            </div>

            {/* Filter rows */}
            <div className={styles.mobileFilterBody}>

              <div className={styles.mobileFilterRow}>
                <span className={styles.mobileFilterLabel}>Date Range</span>
                <div className={styles.mobileDateRangeGrid}>
                  <label className={styles.mobileDateField}>
                    <span className={styles.mobileDateFieldLabel}>From</span>
                    <div className={styles.mobileDateInputWrap}>
                      <input
                        type="date"
                        className={styles.mobileDateInput}
                        value={filterDateFrom || ''}
                        data-empty={!filterDateFrom}
                        onChange={(e) => setFilterDateFrom(e.target.value)}
                      />
                      {!filterDateFrom && (
                        <span className={styles.mobileDatePlaceholder} aria-hidden>
                          Select Date
                        </span>
                      )}
                    </div>
                  </label>
                  <label className={styles.mobileDateField}>
                    <span className={styles.mobileDateFieldLabel}>To</span>
                    <div className={styles.mobileDateInputWrap}>
                      <input
                        type="date"
                        className={styles.mobileDateInput}
                        value={filterDateTo || ''}
                        data-empty={!filterDateTo}
                        onChange={(e) => setFilterDateTo(e.target.value)}
                      />
                      {!filterDateTo && (
                        <span className={styles.mobileDatePlaceholder} aria-hidden>
                          Select Date
                        </span>
                      )}
                    </div>
                  </label>
                </div>
              </div>

              <div className={styles.mobileFilterRow}>
                <span className={styles.mobileFilterLabel}>Escrow status</span>
                <div className={styles.mobileChoiceGrid} role="radiogroup" aria-label="Escrow status">
                  {[
                    { value: 'all', label: 'All', accent: 'slate' },
                    ...Object.entries(PAYOUT_STATUS_META).map(([k, v]) => ({ value: k, label: v.label, accent: v.color })),
                  ].map((opt) => {
                    const active = filterPayout === opt.value
                    const isDefault = opt.value === 'all'
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        className={`${styles.mobileChoiceBtn} ${
                          active ? (isDefault ? styles.mobileChoiceBtnActiveDefault : styles.mobileChoiceBtnActive) : ''
                        }`}
                        onClick={() => setFilterPayout(opt.value)}
                        role="radio"
                        aria-checked={active}
                        data-accent={opt.accent}
                      >
                        <span>{opt.label}</span>
                        {active && <span className={styles.mobileChoiceCheck} aria-hidden />}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className={styles.mobileFilterRow}>
                <span className={styles.mobileFilterLabel}>Seller</span>
                <div className={styles.mobileChoiceGrid} role="radiogroup" aria-label="Seller">
                  {[{ id: 'all', name: 'All' }, ...sellerOptions].map((s) => {
                    const value = s.id
                    const active = filterSeller === value
                    const isDefault = value === 'all'
                    return (
                      <button
                        key={value}
                        type="button"
                        className={`${styles.mobileChoiceBtn} ${
                          active ? (isDefault ? styles.mobileChoiceBtnActiveDefault : styles.mobileChoiceBtnActive) : ''
                        }`}
                        onClick={() => setFilterSeller(value)}
                        role="radio"
                        aria-checked={active}
                      >
                        <span>{s.name}</span>
                        {active && <span className={styles.mobileChoiceCheck} aria-hidden />}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className={styles.mobileFilterRow}>
                <span className={styles.mobileFilterLabel}>Payment Status</span>
                <div className={styles.mobileChoiceGrid} role="radiogroup" aria-label="Payment status">
                  {[
                    { value: 'all', label: 'All', accent: 'slate' },
                    ...Object.entries(PAYMENT_STATUS_META).map(([k, v]) => ({ value: k, label: v.label, accent: v.color })),
                  ].map((opt) => {
                    const active = filterPayment === opt.value
                    const isDefault = opt.value === 'all'
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        className={`${styles.mobileChoiceBtn} ${
                          active ? (isDefault ? styles.mobileChoiceBtnActiveDefault : styles.mobileChoiceBtnActive) : ''
                        }`}
                        onClick={() => setFilterPayment(opt.value)}
                        role="radio"
                        aria-checked={active}
                        data-accent={opt.accent}
                      >
                        <span>{opt.label}</span>
                        {active && <span className={styles.mobileChoiceCheck} aria-hidden />}
                      </button>
                    )
                  })}
                </div>
              </div>

            </div>

            {/* Footer actions */}
            <div className={styles.mobileFilterFooter}>
              <button
                type="button"
                className={styles.mobileFilterClearBtn}
                onClick={() => { clearFilters(); }}
                disabled={!hasFilters}
              >
                Clear all {hasFilters && <span className={styles.mobileFilterClearCount}>({[filterDateFrom, filterDateTo, filterPayout !== 'all' && filterPayout, filterSeller !== 'all' && filterSeller, filterPayment !== 'all' && filterPayment].filter(Boolean).length})</span>}
              </button>
              <button
                type="button"
                className={styles.mobileFilterApplyBtn}
                onClick={() => setMobileFiltersOpen(false)}
              >
                Show Results
              </button>
            </div>
          </div>

          {mobileDetailTxn && (
            <>
              <div
                className={styles.mobileTxnDetailBackdrop}
                onClick={() => setMobileDetailModalId(null)}
                aria-hidden
              />
              <div
                id="payoutsMobileTxnDetail"
                className={styles.mobileTxnDetailSheet}
                role="dialog"
                aria-modal="true"
                aria-labelledby="payouts-mobile-txn-detail-title"
              >
                <div className={styles.mobileTxnDetailHandle} aria-hidden />
                <div className={styles.mobileTxnDetailHeader}>
                  <h2 id="payouts-mobile-txn-detail-title" className={styles.mobileTxnDetailTitle}>
                    {mobileDetailTxn.orderId || 'Order'}
                  </h2>
                  <button
                    type="button"
                    className={styles.mobileFilterClose}
                    onClick={() => setMobileDetailModalId(null)}
                    aria-label="Close order details"
                  >
                    <Icon.Close />
                  </button>
                </div>
                <div className={styles.mobileTxnDetailBody}>
                  <MobileTxnDetailSheetContent
                    t={mobileDetailTxn}
                    commissionSettings={commissionSettings}
                    releaseOrder={releaseOrder}
                    holdOrder={holdOrder}
                    unholdOrder={unholdOrder}
                    updateOrderCommission={updateOrderCommission}
                    approvedRequestId={approvedRequestId}
                  />
                </div>
              </div>
            </>
          )}
        </>
      )}

      {disbursementConfig && !disbursementReminderDismissed ? (
        <div
          className={`${styles.disbursementReminderHost}${
            disbursementConfig.automatedReady ? '' : ` ${styles.disbursementReminderHostManual}`
          }`}
          role="dialog"
          aria-modal="false"
          aria-labelledby="payouts-disbursement-reminder-title"
          aria-live="polite"
        >
          <div
            className={`${styles.disbursementReminderModal} ${
              disbursementConfig.automatedReady
                ? styles.disbursementReminderModalAutomated
                : styles.disbursementReminderModalManual
            }`}
          >
            <button
              type="button"
              className={styles.disbursementReminderClose}
              onClick={() => setDisbursementReminderDismissed(true)}
              aria-label="Dismiss disbursement reminder"
            >
              <TbX size={18} strokeWidth={2} aria-hidden />
            </button>
            <p id="payouts-disbursement-reminder-title" className={styles.disbursementReminderTitle}>
              {disbursementConfig.automatedReady
                ? 'PayMongo automated disbursement is enabled'
                : 'Escrow releases use manual settlement unless PayMongo is ready'}
            </p>
            <p className={styles.disbursementReminderSub}>
              {disbursementConfig.automatedReady
                ? 'Eligible releases can create PayMongo transfers when seller payout settings validate. Use the manual ledger checkbox to skip PayMongo for a specific release.'
                : 'Admin release finalizes escrow in the app; settlement is manual until PayMongo wallet env is configured on the server. Optional release reference can note your bank transfer.'}
            </p>
          </div>
        </div>
      ) : null}

    </div>
  )
}