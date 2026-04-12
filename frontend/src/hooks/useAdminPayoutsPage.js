import { useState, useMemo, useCallback, useEffect } from 'react'
import {
  PAYOUTS_PAGE_INITIAL_TRANSACTIONS,
  PAYOUTS_PAGE_INITIAL_COMMISSION_SETTINGS,
} from '@/data/adminSampleData'
import { getCommissionRate, calcAmounts } from '@/utils/adminPayouts'

const ROWS_PER_PAGE = 10

export function useAdminPayoutsPage() {
  const [transactions, setTransactions] = useState(PAYOUTS_PAGE_INITIAL_TRANSACTIONS)
  const [commissionSettings, setCommissionSettings] = useState(PAYOUTS_PAGE_INITIAL_COMMISSION_SETTINGS)
  const [selectedTxn, setSelectedTxn] = useState(null)
  const [activeTab, setActiveTab] = useState('all') // 'all' | 'transactions' | 'commissions' | 'sellers'

  const [search, setSearch] = useState('')
  const [filterSeller, setFilterSeller] = useState('all')
  const [filterPayment, setFilterPayment] = useState('all')
  const [filterPayout, setFilterPayout] = useState('all')
  const [filterDateFrom, setFilterDateFrom] = useState('')
  const [filterDateTo, setFilterDateTo] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [expandedRow, setExpandedRow] = useState(null)
  const [selectedRows, setSelectedRows] = useState(new Set())

  const [currentPage, setCurrentPage] = useState(1)

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
