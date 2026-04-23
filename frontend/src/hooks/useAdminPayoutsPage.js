'use client'

import { useState, useMemo, useCallback, useEffect } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import {
  PAYOUTS_PAGE_INITIAL_TRANSACTIONS,
  PAYOUTS_PAGE_INITIAL_COMMISSION_SETTINGS,
} from '@/data/adminSampleData'
import { getCommissionRate, calcAmounts } from '@/utils/adminPayouts'
import { readEnum, readInt, readString, replaceUrlQuery } from '@/lib/url/queryParams'
import { useDebouncedEffect } from '@/hooks/useDebouncedEffect'

const ROWS_PER_PAGE = 10

const TAB_VALUES = ['all', 'transactions', 'commissions', 'sellers']

export function useAdminPayoutsPage() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [transactions, setTransactions] = useState(PAYOUTS_PAGE_INITIAL_TRANSACTIONS)
  const [commissionSettings, setCommissionSettings] = useState(PAYOUTS_PAGE_INITIAL_COMMISSION_SETTINGS)
  const [selectedTxn, setSelectedTxn] = useState(null)
  const [activeTab, setActiveTab] = useState(() => readEnum(searchParams, 'tab', TAB_VALUES, 'all')) // 'all' | 'transactions' | 'commissions' | 'sellers'

  const [search, setSearch] = useState(() => readString(searchParams, 'q', ''))
  const [filterSeller, setFilterSeller] = useState(() => readString(searchParams, 'seller', 'all'))
  const [filterPayment, setFilterPayment] = useState(() => readString(searchParams, 'payment', 'all'))
  const [filterPayout, setFilterPayout] = useState(() => readString(searchParams, 'payout', 'all'))
  const [filterDateFrom, setFilterDateFrom] = useState(() => readString(searchParams, 'from', ''))
  const [filterDateTo, setFilterDateTo] = useState(() => readString(searchParams, 'to', ''))
  const [showFilters, setShowFilters] = useState(false)
  const [expandedRow, setExpandedRow] = useState(null)
  const [selectedRows, setSelectedRows] = useState(new Set())

  const [currentPage, setCurrentPage] = useState(() => Math.max(1, readInt(searchParams, 'page', 1)))

  // Sync state <- URL (back/forward, shared links)
  useEffect(() => {
    const nextTab = readEnum(searchParams, 'tab', TAB_VALUES, 'all')
    const nextQ = readString(searchParams, 'q', '')
    const nextSeller = readString(searchParams, 'seller', 'all')
    const nextPayment = readString(searchParams, 'payment', 'all')
    const nextPayout = readString(searchParams, 'payout', 'all')
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

  const summary = useMemo(() => {
    let platformRevenue = 0, sellerTotal = 0, pendingAmt = 0, completedAmt = 0
    transactions.forEach(t => {
      if (t.paymentStatus !== 'paid') return
      const rate = getCommissionRate(t.sellerId, commissionSettings)
      const { commission, sellerEarnings } = calcAmounts(t.amount, rate)
      platformRevenue += commission
      sellerTotal += sellerEarnings
      if (t.payoutStatus === 'paid') completedAmt += sellerEarnings
      else if (['pending','processing'].includes(t.payoutStatus)) pendingAmt += sellerEarnings
    })
    return {
      platformRevenue,
      sellerTotal,
      pendingAmt,
      completedAmt,
      total: transactions.length,
    }
  }, [transactions, commissionSettings])

  const filtered = useMemo(() => {
    return transactions.filter(t => {
      if (search) {
        const q = search.toLowerCase()
        if (!t.orderId.toLowerCase().includes(q) && !t.id.toLowerCase().includes(q) && !t.buyerName.toLowerCase().includes(q) && !t.sellerName.toLowerCase().includes(q)) return false
      }
      if (filterSeller !== 'all' && t.sellerId !== filterSeller) return false
      if (filterPayment !== 'all' && t.paymentStatus !== filterPayment) return false
      if (filterPayout !== 'all' && t.payoutStatus !== filterPayout) return false
      if (filterDateFrom && t.date < filterDateFrom) return false
      if (filterDateTo && t.date > filterDateTo) return false
      return true
    })
  }, [transactions, search, filterSeller, filterPayment, filterPayout, filterDateFrom, filterDateTo])

  useEffect(() => { setCurrentPage(1) }, [search, filterSeller, filterPayment, filterPayout, filterDateFrom, filterDateTo])

  const totalPages = Math.ceil(filtered.length / ROWS_PER_PAGE)
  const paginatedRows = filtered.slice((currentPage - 1) * ROWS_PER_PAGE, currentPage * ROWS_PER_PAGE)

  // Keep currentPage valid if data/filter changes reduce page count.
  useEffect(() => {
    if (totalPages <= 0) return
    if (currentPage > totalPages) setCurrentPage(totalPages)
  }, [currentPage, totalPages])

  // Ensure tab param is always present for non-default tabs (and omitted for "all").
  // This runs immediately on tab changes (not debounced behind search typing).
  useEffect(() => {
    replaceUrlQuery(router, pathname, searchParams, {
      tab: { value: activeTab, omitIf: 'all' },
    })
  }, [activeTab, router, pathname, searchParams])

  // Sync URL <- state (debounce search typing; keep tabs in URL too)
  useDebouncedEffect(() => {
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
  }, [
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
  ], 300)

  const updatePayout = useCallback((id, newStatus, ref, date) => {
    setTransactions(prev => prev.map(t =>
      t.id === id ? { ...t, payoutStatus: newStatus, payoutReference: ref, payoutDate: date } : t
    ))
    setSelectedTxn(prev => prev && prev.id === id ? { ...prev, payoutStatus: newStatus, payoutReference: ref, payoutDate: date } : prev)
  }, [])

  const clearFilters = () => {
    setSearch(''); setFilterSeller('all'); setFilterPayment('all')
    setFilterPayout('all'); setFilterDateFrom(''); setFilterDateTo('')
  }

  const hasFilters = search || filterSeller !== 'all' || filterPayment !== 'all' || filterPayout !== 'all' || filterDateFrom || filterDateTo

  const showTransactions = activeTab === 'all' || activeTab === 'transactions'
  const showCommissions = activeTab === 'all' || activeTab === 'commissions'
  const showSellerEarnings = activeTab === 'all' || activeTab === 'sellers'

  return {
    ROWS_PER_PAGE,
    transactions,
    commissionSettings,
    setCommissionSettings,
    selectedTxn,
    setSelectedTxn,
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
    filtered,
    paginatedRows,
    totalPages,
    updatePayout,
    clearFilters,
    hasFilters,
    showTransactions,
    showCommissions,
    showSellerEarnings,
  }
}
