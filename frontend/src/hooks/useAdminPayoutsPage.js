'use client'

import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { readEnum, readInt, readString, replaceUrlQuery } from '@/lib/url/queryParams'
import { useDebouncedEffect } from '@/hooks/useDebouncedEffect'

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

export function useAdminPayoutsPage() {
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
  const [summaryLoading, setSummaryLoading] = useState(true)

  const [activeTab, setActiveTab] = useState(() => readEnum(searchParams, 'tab', TAB_VALUES, 'all'))

  const [search, setSearch] = useState(() => readString(searchParams, 'q', ''))
  const [filterSeller, setFilterSeller] = useState(() => readString(searchParams, 'seller', 'all'))
  const [filterPayment, setFilterPayment] = useState(() => readString(searchParams, 'payment', 'all'))
  const [filterPayout, setFilterPayout] = useState(() =>
    coerceEscrowFilterFromUrl(readString(searchParams, 'payout', 'all')),
  )
  const [filterDateFrom, setFilterDateFrom] = useState(() => readString(searchParams, 'from', ''))
  const [filterDateTo, setFilterDateTo] = useState(() => readString(searchParams, 'to', ''))
  const [showFilters, setShowFilters] = useState(false)
  const [expandedRow, setExpandedRow] = useState(null)
  const [selectedRows, setSelectedRows] = useState(new Set())
  /** `true`: newest-first (matches API default); `false`: oldest-first */
  const [dateSortDesc, setDateSortDesc] = useState(true)

  const [currentPage, setCurrentPage] = useState(() => Math.max(1, readInt(searchParams, 'page', 1)))

  const fetchingRef = useRef(false)

  const applyListPayload = useCallback((payload) => {
    if (!payload || typeof payload !== 'object') return
    if (typeof payload.defaultCommissionPercent === 'number' && Number.isFinite(payload.defaultCommissionPercent)) {
      setCommissionSettings((prev) => ({ ...prev, global: payload.defaultCommissionPercent }))
    }
    setSellerOptions(Array.isArray(payload.sellers) ? payload.sellers : [])
    setTransactions(Array.isArray(payload.transactions) ? payload.transactions : [])
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
    fetchSummary()
  }, [fetchSummary])

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
    const nextPayout = coerceEscrowFilterFromUrl(readString(searchParams, 'payout', 'all'))
    const nextFrom = readString(searchParams, 'from', '')
    const nextTo = readString(searchParams, 'to', '')
    const nextPage = Math.max(1, readInt(searchParams, 'page', 1))

    if (nextTab !== activeTab) setActiveTab(nextTab)
    if (nextQ !== search) setSearch(nextQ)
    if (nextSeller !== filterSeller) setFilterSeller(nextSeller)
    if (nextPayment !== filterPayment) setFilterPayment(nextPayment)
    if (nextPayout !== filterPayout) setFilterPayout(nextPayout)
    if (nextFrom !== filterDateFrom) setFilterDateFrom(nextFrom)
    if (nextTo !== filterDateTo) setFilterDateTo(nextTo)
    if (nextPage !== currentPage) setCurrentPage(nextPage)
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
    setCurrentPage(1)
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
    if (currentPage > totalPages) setCurrentPage(totalPages)
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
    await fetchSummary()
    await fetchTransactions()
  }, [fetchSummary, fetchTransactions])

  const releaseOrder = useCallback(
    async (orderUuid, options = {}) => {
      const res = await fetch('/api/admin/payouts/release', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          orderId: orderUuid,
          releaseReference: options.releaseReference ?? '',
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
    setCommissionSettings,
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
    paginatedRows,
    totalPages,
    dateSortDesc,
    toggleDateSort,
    refreshAll,
    releaseOrder,
    holdOrder,
    unholdOrder,
    updateOrderCommission,
    clearFilters,
    hasFilters,
    showTransactions,
    showCommissions,
    showSellerEarnings,
  }
}
