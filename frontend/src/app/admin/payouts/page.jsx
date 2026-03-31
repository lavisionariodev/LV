'use client'

import React, { useState, useMemo, useCallback } from 'react'
import { Poppins } from 'next/font/google'
import { FiArrowUp, FiArrowDown } from 'react-icons/fi'
import styles from './payouts.module.css'

const poppins = Poppins({ weight: ['400', '500', '600', '700', '800'], subsets: ['latin'] })

// ─── Sample Data ────────────────────────────────────────────────────────────

const SELLERS = [
  { id: 's1', name: 'Heaven Memorial Services', email: 'admin@heavenmemorial.ph', phone: '09171234567' },
  { id: 's2', name: 'Grace Funeral Services', email: 'accounts@gracefuneral.ph', phone: '09281234567' },
  { id: 's3', name: 'Eternal Rest Chapel', email: 'billing@eternalrest.ph', phone: '09391234567' },
  { id: 's4', name: 'Serenity Funeral Home', email: 'finance@serenityfh.ph', phone: '09501234567' },
]

const BUYERS = [
  { id: 'b1', name: 'Maria Santos', email: 'maria.santos@gmail.com', phone: '09171112222' },
  { id: 'b2', name: 'Jose Reyes', email: 'jose.reyes@yahoo.com', phone: '09282223333' },
  { id: 'b3', name: 'Ana Cruz', email: 'ana.cruz@outlook.com', phone: '09393334444' },
  { id: 'b4', name: 'Pedro Dela Cruz', email: 'pedro.dc@gmail.com', phone: '09504445555' },
  { id: 'b5', name: 'Lina Gomez', email: 'lina.gomez@gmail.com', phone: '09165556666' },
  { id: 'b6', name: 'Ricardo Lim', email: 'r.lim@business.com', phone: '09276667777' },
]

const SERVICES = [
  'Complete Funeral Package – Gold',
  'Basic Cremation Package',
  'Traditional Burial – Standard',
  'Memorial Service Package',
  'Embalming & Viewing Package',
  'Premium Chapel Service',
  'Eco-Friendly Green Burial',
  'Full Service Cremation – Premium',
]

const PAYMENT_METHODS = ['GCash', 'Maya', 'Bank Transfer', 'Credit Card', 'Cash']

function generateTransactions() {
  const txns = []
  const now = new Date()
  for (let i = 0; i < 32; i++) {
    const seller = SELLERS[i % SELLERS.length]
    const buyer = BUYERS[i % BUYERS.length]
    const amount = [15000, 22500, 35000, 48000, 12000, 28000, 55000, 18500][i % 8]
    const paymentStatuses = ['paid', 'paid', 'paid', 'pending', 'refunded']
    const payoutStatuses = ['pending', 'processing', 'paid', 'on_hold', 'refunded']
    const paymentStatus = paymentStatuses[i % paymentStatuses.length]
    const payoutStatus = payoutStatuses[i % payoutStatuses.length]
    const daysAgo = i * 3
    const date = new Date(now)
    date.setDate(date.getDate() - daysAgo)

    txns.push({
      id: `TXN-${String(10000 + i).padStart(5, '0')}`,
      orderId: `ORD-${String(20000 + i).padStart(5, '0')}`,
      sellerId: seller.id,
      sellerName: seller.name,
      sellerEmail: seller.email,
      sellerPhone: seller.phone,
      buyerId: buyer.id,
      buyerName: buyer.name,
      buyerEmail: buyer.email,
      buyerPhone: buyer.phone,
      service: SERVICES[i % SERVICES.length],
      amount,
      paymentMethod: PAYMENT_METHODS[i % PAYMENT_METHODS.length],
      paymentStatus,
      payoutStatus,
      payoutReference: payoutStatus === 'paid' ? `REF-${String(30000 + i).padStart(6, '0')}` : '',
      payoutDate: payoutStatus === 'paid' ? date.toISOString().split('T')[0] : '',
      date: date.toISOString().split('T')[0],
      dateObj: date,
    })
  }
  return txns
}

const INITIAL_TRANSACTIONS = generateTransactions()

const INITIAL_COMMISSION_SETTINGS = {
  global: 10,
  sellers: {
    s1: 12,
    s2: 8,
  },
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const formatPHP = (n) => `₱${Number(n).toLocaleString('en-PH', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`

const PAYMENT_STATUS_META = {
  paid:     { label: 'Paid',     color: 'green' },
  pending:  { label: 'Pending',  color: 'amber' },
  refunded: { label: 'Refunded', color: 'red'   },
  failed:   { label: 'Failed',   color: 'red'   },
}

const PAYOUT_STATUS_META = {
  pending:    { label: 'Pending',    color: 'amber'  },
  processing: { label: 'Processing', color: 'blue'   },
  paid:       { label: 'Paid',       color: 'green'  },
  on_hold:    { label: 'On Hold',    color: 'slate'  },
  refunded:   { label: 'Refunded',   color: 'red'    },
}

function getCommissionRate(sellerId, settings) {
  return settings.sellers[sellerId] !== undefined
    ? settings.sellers[sellerId]
    : settings.global
}

function calcAmounts(amount, rate) {
  const commission = Math.round(amount * rate / 100)
  return { commission, sellerEarnings: amount - commission }
}

function exportToCSV(transactions, settings) {
  const headers = ['Order ID','Txn ID','Date','Buyer','Buyer Email','Seller','Service','Total Amount','Commission %','Commission','Seller Earnings','Payment Status','Payout Status','Payout Reference','Payout Date']
  const rows = transactions.map(t => {
    const rate = getCommissionRate(t.sellerId, settings)
    const { commission, sellerEarnings } = calcAmounts(t.amount, rate)
    return [t.orderId, t.id, t.date, t.buyerName, t.buyerEmail, t.sellerName, t.service, t.amount, `${rate}%`, commission, sellerEarnings, t.paymentStatus, t.payoutStatus, t.payoutReference, t.payoutDate]
  })
  const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `payouts_export_${new Date().toISOString().slice(0,10)}.csv`
  a.click()
}

// ─── Icons ───────────────────────────────────────────────────────────────────

const Icon = {
  Revenue:     () => <svg viewBox="0 0 24 24" fill="none"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 14.93V18h-2v-1.07A4.004 4.004 0 018 13h2c0 1.1.9 2 2 2s2-.9 2-2c0-1.1-.9-2-2-2a4 4 0 01-4-4c0-1.86 1.28-3.41 3-3.86V2h2v1.14A4.004 4.004 0 0116 7h-2c0-1.1-.9-2-2-2s-2 .9-2 2 .9 2 2 2a4 4 0 014 4c0 1.86-1.28 3.41-3 3.93z" fill="currentColor"/></svg>,
  Earnings:    () => <svg viewBox="0 0 24 24" fill="none"><path d="M20 4H4c-1.11 0-2 .89-2 2v12c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z" fill="currentColor"/></svg>,
  Pending:     () => <svg viewBox="0 0 24 24" fill="none"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67V7z" fill="currentColor"/></svg>,
  Completed:   () => <svg viewBox="0 0 24 24" fill="none"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" fill="currentColor"/></svg>,
  Txns:        () => <svg viewBox="0 0 24 24" fill="none"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z" fill="currentColor"/></svg>,
  Search:      () => <svg viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2"/><path d="M18 18l3.5 3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>,
  Filter:      () => <svg viewBox="0 0 24 24" fill="none"><path d="M4 6h16M7 12h10M10 18h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>,
  Export:      () => <svg viewBox="0 0 24 24" fill="none"><path d="M12 16l4-5h-3V4h-2v7H8l4 5zm8 2H4v2h16v-2z" fill="currentColor"/></svg>,
  Close:       () => <svg viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>,
  Edit:        () => <svg viewBox="0 0 24 24" fill="none"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 000-1.41l-2.34-2.34a1 1 0 00-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" fill="currentColor"/></svg>,
  Check:       () => <svg viewBox="0 0 24 24" fill="none"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" fill="currentColor"/></svg>,
  ChevronDown: () => <svg viewBox="0 0 24 24" fill="none"><path d="M7 10l5 5 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  Info:        () => <svg viewBox="0 0 24 24" fill="none"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" fill="currentColor"/></svg>,
  Seller:      () => <svg viewBox="0 0 24 24" fill="none"><path d="M20 4H4v2l8 5 8-5V4zM4 8.236V20h16V8.236l-8 5-8-5z" fill="currentColor"/></svg>,
}

// ─── Sub-Components ──────────────────────────────────────────────────────────

function Badge({ type, value }) {
  const meta = type === 'payment' ? PAYMENT_STATUS_META[value] : PAYOUT_STATUS_META[value]
  if (!meta) return null
  if (type === 'payout') {
    return <span className={`${styles.badgePayout} ${styles[`badgePayout_${meta.color}`]}`}>{meta.label}</span>
  }
  return <span className={`${styles.badge} ${styles[`badge_${meta.color}`]}`}>{meta.label}</span>
}

function StatCard({ label, value, percent, period }) {
  const isPositive = percent >= 0
  const percentColor = isPositive ? '#10b981' : '#ef4444'
  const percentBg = isPositive ? '#ecfdf5' : '#fef5f5'
  
  return (
    <div className={styles.statCard}>
      <p className={styles.statLabel}>{label}</p>
      <p className={styles.statValue}>{value}</p>
      <div className={styles.statFooter}>
        <div className={styles.statPercent} style={{ color: percentColor, backgroundColor: percentBg }}>
          {isPositive ? <FiArrowUp className={styles.percentIcon} /> : <FiArrowDown className={styles.percentIcon} />}
          <span className={styles.percentValue}>{Math.abs(percent)}%</span>
        </div>
        <p className={`${styles.statPeriod} ${styles.statPeriodHide}`}>{period}</p>
      </div>
    </div>
  )
}

// ─── Payout Panel (slides in to the left of Details modal) ──────────────────

function PayoutPanel({ txn, settings, onClose, onUpdatePayout, mobileInline = false }) {
  const [payoutRef, setPayoutRef] = useState(txn.payoutReference)
  const [payoutDate, setPayoutDate] = useState(txn.payoutDate || new Date().toISOString().split('T')[0])
  const [editingRef, setEditingRef] = useState(false)

  const handleStatusChange = (newStatus) => {
    onUpdatePayout(txn.id, newStatus, payoutRef, payoutDate)
  }

  const handleSaveRef = () => {
    onUpdatePayout(txn.id, txn.payoutStatus, payoutRef, payoutDate)
    setEditingRef(false)
  }

  const bodyContent = (
      <div className={styles.payoutPanelBody}>

        {/* Current status badge */}
        <div className={styles.payoutCurrentStatus}>
          <span className={styles.payoutCurrentLabel}>Current Status</span>
          <Badge type="payout" value={txn.payoutStatus}/>
        </div>

        {/* Status picker */}
        <div className={styles.payoutStatusSection}>
          <p className={styles.payoutSectionLabel}>Update Status</p>
          <div className={styles.payoutStatusGrid}>
            {['pending','processing','paid','on_hold','refunded'].map(s => {
              const meta = PAYOUT_STATUS_META[s]
              const isActive = txn.payoutStatus === s
              return (
                <button
                  key={s}
                  className={`${styles.payoutStatusCard} ${isActive ? styles.payoutStatusCardActive : ''} ${styles[`payoutCard_${meta.color}`]}`}
                  onClick={() => handleStatusChange(s)}
                >
                  <span className={styles.payoutStatusCardDot}/>
                  {meta.label}
                  {isActive && <span className={styles.payoutActiveCheck}><Icon.Check /></span>}
                </button>
              )
            })}
          </div>
        </div>

        {/* Reference number */}
        <div className={styles.payoutFieldSection}>
          <p className={styles.payoutSectionLabel}>Payout Reference #</p>
          {editingRef ? (
            <div className={styles.payoutRefEditRow}>
              <input
                className={styles.payoutRefInput}
                value={payoutRef}
                onChange={e => setPayoutRef(e.target.value)}
                placeholder="e.g. REF-123456"
                autoFocus
              />
              <button className={styles.btnSave} onClick={handleSaveRef}>Save</button>
              <button className={styles.cancelRefBtn} onClick={() => setEditingRef(false)}>Cancel</button>
            </div>
          ) : (
            <div className={styles.payoutRefDisplay}>
              <span className={styles.payoutRefValue}>{payoutRef || <span className={styles.payoutRefEmpty}>Not set</span>}</span>
              <button className={styles.editRefBtn} onClick={() => setEditingRef(true)}><Icon.Edit /> Edit</button>
            </div>
          )}
        </div>

        {/* Payout date */}
        <div className={styles.payoutFieldSection}>
          <p className={styles.payoutSectionLabel}>Payout Date</p>
          <input
            type="date"
            className={styles.payoutDateInput}
            value={payoutDate}
            onChange={e => setPayoutDate(e.target.value)}
          />
        </div>

        {/* Confirm save */}
        <button
          className={styles.payoutSaveBtn}
          onClick={() => { onUpdatePayout(txn.id, txn.payoutStatus, payoutRef, payoutDate); onClose() }}
        >
          <Icon.Check /> Save Changes
        </button>

      </div>
  )

  if (mobileInline) return bodyContent

  return (
    <div className={styles.payoutPanel}>
      <div className={styles.payoutPanelHeader}>
        <div>
          <p className={styles.payoutPanelTitle}>Payout Management</p>
          <p className={styles.payoutPanelSub}>{txn.orderId}</p>
        </div>
        <button className={styles.modalClose} onClick={onClose}><Icon.Close /></button>
      </div>
      {bodyContent}
    </div>
  )
}

// ─── Transaction Details Modal ────────────────────────────────────────────────

const MODAL_TABS = ['Buyer', 'Seller', 'Service']
const MOBILE_MODAL_MODES = ['Details', 'Manage Payout']

function TransactionModal({ txn, settings, onClose, onUpdatePayout }) {
  const [showPayoutPanel, setShowPayoutPanel] = useState(false)
  const [activeInfoTab, setActiveInfoTab] = useState('Buyer')
  // Mobile mode: 'details' | 'payout' — toggled via segmented control at top
  const [mobileMode, setMobileMode] = useState('details')
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth <= 640 : false
  )

  React.useEffect(() => {
    const mq = window.matchMedia('(max-width: 640px)')
    const handler = (e) => setIsMobile(e.matches)
    mq.addEventListener('change', handler)
    setIsMobile(mq.matches)
    return () => mq.removeEventListener('change', handler)
  }, [])

  const rate = getCommissionRate(txn.sellerId, settings)
  const { commission, sellerEarnings } = calcAmounts(txn.amount, rate)

  return (
    <div className={styles.modalOverlay} onClick={onClose}>

      {/* Payout panel — slides in to the left (desktop only) */}
      {showPayoutPanel && !isMobile && (
        <div className={styles.payoutPanelWrap} onClick={e => e.stopPropagation()}>
          <PayoutPanel
            txn={txn}
            settings={settings}
            onClose={() => setShowPayoutPanel(false)}
            onUpdatePayout={onUpdatePayout}
          />
        </div>
      )}

      {/* Main details modal */}
      <div className={styles.modal} onClick={e => e.stopPropagation()}>

        {/* ── Header ── */}
        <div className={styles.modalHeader}>
          <div>
            <h2 className={styles.modalTitle}>Transaction Details</h2>
            <p className={styles.modalSubtitle}>{txn.orderId} · {txn.id}</p>
          </div>
          <button className={styles.modalClose} onClick={onClose}><Icon.Close /></button>
        </div>

        {/* ── Mobile mode switcher (Details / Manage Payout) ── */}
        <div className={styles.mobileModeBar}>
          {MOBILE_MODAL_MODES.map(mode => (
            <button
              key={mode}
              className={`${styles.mobileModeBtn} ${mobileMode === (mode === 'Details' ? 'details' : 'payout') ? styles.mobileModeBtnActive : ''}`}
              onClick={() => setMobileMode(mode === 'Details' ? 'details' : 'payout')}
            >
              {mode}
            </button>
          ))}
        </div>

        {/* ── Scrollable body ── */}
        <div className={styles.modalScrollBody}>

          {/* ── View: Details (always visible on desktop; conditional on mobile) ── */}
          <div className={`${styles.modalContentPane} ${mobileMode === 'payout' ? styles.mobileHidden : ''}`}>
            <div className={styles.modalBody}>

              {/* Amounts Hero */}
              <div className={styles.modalAmountHero}>
                <div className={styles.heroAmount}>
                  <span className={styles.heroAmountLabel}>Total Amount</span>
                  <span className={styles.heroAmountValue}>{formatPHP(txn.amount)}</span>
                </div>
                <div className={styles.heroSplit}>
                  <div className={styles.heroSplitItem}>
                    <div className={styles.heroSplitLeft}>
                      <span className={styles.heroSplitDot} style={{background:'#94a3b8'}}/>
                      <p className={styles.heroSplitLabel}>Platform Commission ({rate}%)</p>
                    </div>
                    <span className={styles.heroSplitVal}>{formatPHP(commission)}</span>
                  </div>
                  <div className={styles.heroSplitItem}>
                    <div className={styles.heroSplitLeft}>
                      <span className={styles.heroSplitDot} style={{background:'#10b981'}}/>
                      <p className={styles.heroSplitLabel}>Seller Earnings</p>
                    </div>
                    <span className={styles.heroSplitVal}>{formatPHP(sellerEarnings)}</span>
                  </div>
                </div>
                <div className={styles.heroBar}>
                  <div className={styles.heroBarFill} style={{width:`${rate}%`, background:'#475569'}}/>
                  <div className={styles.heroBarFill} style={{width:`${100-rate}%`, background:'#10b981'}}/>
                </div>
              </div>

              {/* Status row */}
              <div className={styles.modalStatusRow}>
                <div className={styles.modalStatusItem}>
                  <span className={styles.modalStatusLabel}>Payment</span>
                  <Badge type="payment" value={txn.paymentStatus}/>
                </div>
                <div className={styles.modalStatusDivider}/>
                <div className={styles.modalStatusItem}>
                  <span className={styles.modalStatusLabel}>Payout</span>
                  <Badge type="payout" value={txn.payoutStatus}/>
                </div>
              </div>

              {/* Info tabs */}
              <div className={styles.modalInfoTabs}>
                <div className={styles.modalInfoTabNav}>
                  {MODAL_TABS.map(tab => (
                    <button
                      key={tab}
                      className={`${styles.modalInfoTabBtn} ${activeInfoTab === tab ? styles.modalInfoTabBtnActive : ''}`}
                      onClick={() => setActiveInfoTab(tab)}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
                <div className={styles.modalInfoTabPanel}>
                  {activeInfoTab === 'Buyer' && (
                    <div className={styles.modalInfoRows}>
                      <div className={styles.modalInfoRow}><span>Name</span><strong>{txn.buyerName}</strong></div>
                      <div className={styles.modalInfoRow}><span>Email</span><strong>{txn.buyerEmail}</strong></div>
                      <div className={styles.modalInfoRow}><span>Phone</span><strong>{txn.buyerPhone}</strong></div>
                    </div>
                  )}
                  {activeInfoTab === 'Seller' && (
                    <div className={styles.modalInfoRows}>
                      <div className={styles.modalInfoRow}><span>Business</span><strong>{txn.sellerName}</strong></div>
                      <div className={styles.modalInfoRow}><span>Email</span><strong>{txn.sellerEmail}</strong></div>
                      <div className={styles.modalInfoRow}><span>Phone</span><strong>{txn.sellerPhone}</strong></div>
                    </div>
                  )}
                  {activeInfoTab === 'Service' && (
                    <div className={styles.modalInfoRows}>
                      <div className={styles.modalInfoRow}><span>Package</span><strong>{txn.service}</strong></div>
                      <div className={styles.modalInfoRow}><span>Payment Method</span><strong>{txn.paymentMethod}</strong></div>
                      <div className={styles.modalInfoRow}><span>Date</span><strong>{txn.date}</strong></div>
                    </div>
                  )}
                </div>
              </div>

              {/* Payout management trigger — desktop only */}
              <button
                className={`${styles.openPayoutBtn} ${showPayoutPanel ? styles.openPayoutBtnActive : ''}`}
                onClick={() => setShowPayoutPanel(prev => !prev)}
              >
                <svg viewBox="0 0 24 24" fill="none"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
                {showPayoutPanel ? 'Close Payout Panel' : 'Manage Payout'}
                <svg className={styles.openPayoutChevron} viewBox="0 0 24 24" fill="none"><path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </button>

            </div>
          </div>

          {/* ── View: Manage Payout (mobile only — desktop uses payoutPanelWrap instead) ── */}
          <div className={`${styles.modalContentPane} ${styles.modalContentPaneMobile} ${mobileMode === 'details' ? styles.mobileHidden : ''}`}>
            <div className={styles.modalBody}>
              <PayoutPanel
                txn={txn}
                settings={settings}
                onClose={() => setMobileMode('details')}
                onUpdatePayout={onUpdatePayout}
                mobileInline
              />
            </div>
          </div>

        </div>{/* end modalScrollBody */}
      </div>
    </div>
  )
}

// ─── Commission Settings Panel ────────────────────────────────────────────────

function CommissionPanel({ settings, onUpdateSettings }) {
  const [globalInput, setGlobalInput] = useState(String(settings.global))
  const [editingGlobal, setEditingGlobal] = useState(false)
  const [sellerInputs, setSellerInputs] = useState({})
  const [editingSeller, setEditingSeller] = useState(null)

  const saveGlobal = () => {
    const v = parseFloat(globalInput)
    if (!isNaN(v) && v >= 0 && v <= 100) {
      onUpdateSettings({ ...settings, global: v })
    }
    setEditingGlobal(false)
  }

  const saveSeller = (sid) => {
    const v = parseFloat(sellerInputs[sid])
    if (!isNaN(v) && v >= 0 && v <= 100) {
      onUpdateSettings({ ...settings, sellers: { ...settings.sellers, [sid]: v } })
    } else if (sellerInputs[sid] === '') {
      const next = { ...settings.sellers }
      delete next[sid]
      onUpdateSettings({ ...settings, sellers: next })
    }
    setEditingSeller(null)
  }

  const removeOverride = (sid) => {
    const next = { ...settings.sellers }
    delete next[sid]
    onUpdateSettings({ ...settings, sellers: next })
  }

  return (
    <div className={styles.commissionPanel}>
      <div className={styles.commissionPanelHeader}>
        <div>
          <p className={styles.commissionPanelTitle}>Commission Settings</p>
          <p className={styles.commissionPanelSub}>Configure global and per-seller commission rates</p>
        </div>
      </div>

      <div className={styles.commissionBody}>
        {/* Global Rate */}
        <div className={styles.commissionGlobalRow}>
          <div className={styles.commissionGlobalLeft}>
            <div className={styles.commissionGlobalIcon}><Icon.Revenue /></div>
            <div>
              <p className={styles.commissionGlobalLabel}>Global Commission Rate</p>
              <p className={styles.commissionGlobalHint}>Default rate applied to all sellers without custom override</p>
            </div>
          </div>
          {editingGlobal ? (
            <div className={styles.commissionEditRow}>
              <input
                className={styles.commissionRateInput}
                type="number" min="0" max="100" step="0.5"
                value={globalInput}
                onChange={e => setGlobalInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && saveGlobal()}
                autoFocus
              />
              <span className={styles.pctSymbol}>%</span>
              <button className={styles.btnSave} onClick={saveGlobal}>Save</button>
              <button className={styles.btnCancel} onClick={() => setEditingGlobal(false)}>Cancel</button>
            </div>
          ) : (
            <div className={styles.commissionDisplayRow}>
              <span className={styles.commissionRateVal}>{settings.global}%</span>
              <button className={styles.btnEdit} onClick={() => { setGlobalInput(String(settings.global)); setEditingGlobal(true) }}>
                <Icon.Edit /> Edit
              </button>
            </div>
          )}
        </div>

        {/* Per-Seller Overrides */}
        <div className={styles.sellerOverrideSection}>
          <p className={styles.sellerOverrideTitle}>Seller-Specific Overrides</p>
          <div className={styles.sellerOverrideList}>
            {SELLERS.map(seller => {
              const override = settings.sellers[seller.id]
              const isEditing = editingSeller === seller.id
              const effective = override !== undefined ? override : settings.global
              const isCustom = override !== undefined

              return (
                <div key={seller.id} className={`${styles.sellerOverrideRow} ${isCustom ? styles.sellerOverrideRowActive : ''}`}>
                  <div className={styles.sellerOverrideInfo}>
                    <div className={styles.sellerAvatar}>{seller.name[0]}</div>
                    <div>
                      <p className={styles.sellerOverrideName}>{seller.name}</p>
                      <p className={styles.sellerOverrideHint}>{isCustom ? 'Custom rate' : 'Using global rate'}</p>
                    </div>
                  </div>
                  {isEditing ? (
                    <div className={styles.commissionEditRow}>
                      <input
                        className={styles.commissionRateInput}
                        type="number" min="0" max="100" step="0.5"
                        value={sellerInputs[seller.id] ?? String(effective)}
                        onChange={e => setSellerInputs(p => ({ ...p, [seller.id]: e.target.value }))}
                        onKeyDown={e => e.key === 'Enter' && saveSeller(seller.id)}
                        autoFocus
                      />
                      <span className={styles.pctSymbol}>%</span>
                      <button className={styles.btnSave} onClick={() => saveSeller(seller.id)}>Save</button>
                      <button className={styles.btnCancel} onClick={() => setEditingSeller(null)}>Cancel</button>
                    </div>
                  ) : (
                    <div className={styles.sellerOverrideRight}>
                      <span className={`${styles.sellerRateVal} ${isCustom ? styles.sellerRateCustom : ''}`}>{effective}%</span>
                      <button className={styles.btnEdit} onClick={() => { setSellerInputs(p => ({ ...p, [seller.id]: String(effective) })); setEditingSeller(seller.id) }}>
                        <Icon.Edit /> {isCustom ? 'Edit' : 'Override'}
                      </button>
                      {isCustom && (
                        <button className={styles.btnRemoveOverride} onClick={() => removeOverride(seller.id)}>Remove</button>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Seller Earnings Panel ────────────────────────────────────────────────────

function SellerEarningsPanel({ transactions, settings }) {
  const earnings = useMemo(() => {
    return SELLERS.map(seller => {
      const sellerTxns = transactions.filter(t => t.sellerId === seller.id)
      let available = 0, pending = 0, totalWithdrawn = 0

      sellerTxns.forEach(t => {
        const rate = getCommissionRate(t.sellerId, settings)
        const { sellerEarnings } = calcAmounts(t.amount, rate)
        if (t.payoutStatus === 'paid') totalWithdrawn += sellerEarnings
        else if (t.payoutStatus === 'pending' || t.payoutStatus === 'processing') {
          if (t.paymentStatus === 'paid') available += sellerEarnings
          else pending += sellerEarnings
        } else if (t.payoutStatus === 'on_hold') pending += sellerEarnings
      })

      return { ...seller, available, pending, totalWithdrawn, txnCount: sellerTxns.length }
    })
  }, [transactions, settings])

  return (
    <div className={styles.sellerEarningsPanel}>
      <div className={styles.sePanelHeader}>
        <p className={styles.sePanelTitle}>Seller Earnings Tracker</p>
        <p className={styles.sePanelSub}>Live balances based on payout status</p>
      </div>
      <div className={styles.seGrid}>
        {earnings.map(s => (
          <div key={s.id} className={styles.seCard}>
            <div className={styles.seCardTop}>
              <div className={styles.seAvatar}>{s.name[0]}</div>
              <div>
                <p className={styles.seName}>{s.name}</p>
                <p className={styles.seTxnCount}>{s.txnCount} transactions</p>
              </div>
            </div>
            <div className={styles.seBalances}>
              <div className={styles.seBalanceItem}>
                <span className={styles.seBalLabel}>Available</span>
                <span className={`${styles.seBalVal} ${styles.seBalAvailable}`}>{formatPHP(s.available)}</span>
              </div>
              <div className={styles.seBalanceItem}>
                <span className={styles.seBalLabel}>Pending</span>
                <span className={`${styles.seBalVal} ${styles.seBalPending}`}>{formatPHP(s.pending)}</span>
              </div>
              <div className={styles.seBalanceItem}>
                <span className={styles.seBalLabel}>Withdrawn</span>
                <span className={`${styles.seBalVal} ${styles.seBalWithdrawn}`}>{formatPHP(s.totalWithdrawn)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const ROWS_PER_PAGE = 10

export default function AdminPayoutsPage() {
  const [transactions, setTransactions] = useState(INITIAL_TRANSACTIONS)
  const [commissionSettings, setCommissionSettings] = useState(INITIAL_COMMISSION_SETTINGS)
  const [selectedTxn, setSelectedTxn] = useState(null)
  const [activeTab, setActiveTab] = useState('transactions') // 'transactions' | 'commissions' | 'sellers'

  // Filters
  const [search, setSearch] = useState('')
  const [filterSeller, setFilterSeller] = useState('all')
  const [filterPayment, setFilterPayment] = useState('all')
  const [filterPayout, setFilterPayout] = useState('all')
  const [filterDateFrom, setFilterDateFrom] = useState('')
  const [filterDateTo, setFilterDateTo] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [expandedRow, setExpandedRow] = useState(null)
  const [selectedRows, setSelectedRows] = useState(new Set())

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)

  // Summary
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

  // Filtered transactions
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

  // Reset to page 1 whenever filters change
  React.useEffect(() => { setCurrentPage(1) }, [search, filterSeller, filterPayment, filterPayout, filterDateFrom, filterDateTo])

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

  return (
    <div className={`${styles.page} ${poppins.className}`}>
      {/* Financial Overview */}
      <section className={styles.statsGrid}>
        <StatCard label="Platform Revenue" value={formatPHP(summary.platformRevenue)} percent={14} period="in the last month" />
        <StatCard label="Total Order" value={summary.total} percent={-17} period="in the last month" />
        <StatCard label="Pending Payouts" value={formatPHP(summary.pendingAmt)} percent={8} period="in the last month" />
        <StatCard label="Completed Payouts" value={formatPHP(summary.completedAmt)} percent={23} period="in the last month" />
      </section>

      {/* Tab Navigation */}
      <div className={styles.tabNav}>
        {[
          { key: 'transactions', label: 'Transactions' },
          { key: 'commissions', label: 'Commission Settings' },
          { key: 'sellers', label: 'Seller Earnings' },
        ].map(tab => (
          <button
            key={tab.key}
            className={`${styles.tabBtn} ${activeTab === tab.key ? styles.tabBtnActive : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab: Transactions */}
      {activeTab === 'transactions' && (
        <div className={styles.tablePanel}>
          {/* Toolbar */}
          <div className={styles.toolbar}>
            <div className={styles.toolbarLeft}>
              <div className={styles.searchWrap}>
                <Icon.Search />
                <input
                  className={styles.searchInput}
                  placeholder="Search Order ID, buyer, or seller…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
              <button
                className={`${styles.filterToggle} ${showFilters ? styles.filterToggleActive : ''}`}
                onClick={() => setShowFilters(!showFilters)}
              >
                <Icon.Filter /> Filters {hasFilters && <span className={styles.filterDot}/>}
              </button>
              {hasFilters && (
                <button className={styles.clearFiltersBtn} onClick={clearFilters}>Clear all</button>
              )}
            </div>
          </div>

          {/* Filter Dropdowns */}
          {showFilters && (
            <div className={styles.filterBar}>
              <div className={styles.filterField}>
                <label>Seller</label>
                <select value={filterSeller} onChange={e => setFilterSeller(e.target.value)}>
                  <option value="all">All Sellers</option>
                  {SELLERS.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div className={styles.filterField}>
                <label>Payment Status</label>
                <select value={filterPayment} onChange={e => setFilterPayment(e.target.value)}>
                  <option value="all">All</option>
                  {Object.entries(PAYMENT_STATUS_META).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </div>
              <div className={styles.filterField}>
                <label>Payout Status</label>
                <select value={filterPayout} onChange={e => setFilterPayout(e.target.value)}>
                  <option value="all">All</option>
                  {Object.entries(PAYOUT_STATUS_META).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </div>
              <div className={styles.filterField}>
                <label>Date From</label>
                <input type="date" value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)} />
              </div>
              <div className={styles.filterField}>
                <label>Date To</label>
                <input type="date" value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)} />
              </div>
            </div>
          )}

          {/* Mobile Card List — hidden on desktop via CSS */}
          <div className={styles.mobileCardList}>
            {paginatedRows.length === 0 ? (
              <div className={styles.emptyState}>
                <p className={styles.emptyTitle}>No transactions found</p>
                <p className={styles.emptyHint}>Try adjusting your filters</p>
                {hasFilters && <button className={styles.clearFiltersBtn} onClick={clearFilters}>Clear filters</button>}
              </div>
            ) : paginatedRows.map(t => {
              const rate = getCommissionRate(t.sellerId, commissionSettings)
              const { commission, sellerEarnings } = calcAmounts(t.amount, rate)
              return (
                <div key={t.id} className={styles.mobileCard}>
                  <div className={styles.mobileCardTop}>
                    <div>
                      <p className={styles.orderId}>{t.orderId}</p>
                      <p className={styles.txnId}>{t.id}</p>
                    </div>
                    <p className={styles.mobileCardAmount}>{formatPHP(t.amount)}</p>
                  </div>
                  <p className={styles.mobileCardService}>{t.service}</p>
                  <div className={styles.mobileCardMeta}>
                    <span className={styles.mobileCardBuyer}>{t.buyerName}</span>
                    <span className={styles.mobileCardDate}>{t.date}</span>
                  </div>
                  <div className={styles.mobileCardStatuses}>
                    <Badge type="payment" value={t.paymentStatus}/>
                    <Badge type="payout" value={t.payoutStatus}/>
                  </div>
                  <div className={styles.mobileCardBreakdown}>
                    <span className={styles.mobileCardBreakdownItem}>Platform <strong>{formatPHP(commission)}</strong></span>
                    <span className={styles.mobileCardBreakdownDivider}>·</span>
                    <span className={styles.mobileCardBreakdownItem}>Seller <strong className={styles.mobileCardEarnings}>{formatPHP(sellerEarnings)}</strong></span>
                  </div>
                  <button className={styles.mobileCardDetailsBtn} onClick={() => setSelectedTxn(t)}>View Details</button>
                </div>
              )
            })}
          </div>

          {/* Table — hidden on mobile via CSS */}
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className={styles.checkboxCell}>
                    <input
                      type="checkbox"
                      className={styles.rowCheckbox}
                      checked={paginatedRows.length > 0 && paginatedRows.every(t => selectedRows.has(t.id))}
                      onChange={e => {
                        setSelectedRows(prev => {
                          const next = new Set(prev)
                          if (e.target.checked) paginatedRows.forEach(t => next.add(t.id))
                          else paginatedRows.forEach(t => next.delete(t.id))
                          return next
                        })
                      }}
                    />
                  </th>
                  <th>Order</th>
                  <th>Service</th>
                  <th>Buyer</th>
                  <th>Payment</th>
                  <th>Payout</th>
                  <th className={styles.thSortable}>Date</th>
                  <th>Amount</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {paginatedRows.map(t => {
                  const rate = getCommissionRate(t.sellerId, commissionSettings)
                  const { commission, sellerEarnings } = calcAmounts(t.amount, rate)
                  const isExpanded = expandedRow === t.id
                  return (
                    <React.Fragment key={t.id}>
                      {/* ── Primary row ── */}
                      <tr
                        key={t.id}
                        className={`${styles.primaryRow} ${isExpanded ? styles.primaryRowOpen : ''}`}
                      >
                        <td className={styles.checkboxCell}>
                          <input
                            type="checkbox"
                            className={styles.rowCheckbox}
                            checked={selectedRows.has(t.id)}
                            onChange={e => {
                              setSelectedRows(prev => {
                                const next = new Set(prev)
                                if (e.target.checked) next.add(t.id)
                                else next.delete(t.id)
                                return next
                              })
                            }}
                          />
                        </td>
                        <td>
                          <p className={styles.orderId}>{t.orderId}</p>
                          <p className={styles.txnId}>{t.id}</p>
                        </td>
                        <td className={styles.serviceCell}>{t.service}</td>
                        <td>
                          <p className={styles.personName}>{t.buyerName}</p>
                          <p className={styles.personEmail}>{t.buyerEmail}</p>
                        </td>
                        <td><Badge type="payment" value={t.paymentStatus}/></td>
                        <td><Badge type="payout" value={t.payoutStatus}/></td>
                        <td className={styles.dateCell}>{t.date}</td>
                        <td>
                          <p className={styles.amountCell}>{formatPHP(t.amount)}</p>
                        </td>
                        <td>
                          <div className={styles.rowActions}>
                            <button
                              className={styles.viewBtn}
                              onClick={() => setSelectedTxn(t)}
                            >
                              Details
                            </button>
                            <button
                              className={`${styles.expandBtn} ${isExpanded ? styles.expandBtnOpen : ''}`}
                              onClick={() => setExpandedRow(isExpanded ? null : t.id)}
                              title={isExpanded ? 'Collapse' : 'View seller breakdown'}
                            >
                              <svg viewBox="0 0 24 24" fill="none">
                                <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* ── Seller breakdown collapsed panel ── */}
                      {isExpanded && (
                        <tr key={`${t.id}-detail`} className={styles.expandedRow}>
                          <td colSpan={9} className={styles.expandedTd}>
                            <div className={styles.expandedPanel}>

                              {/* Seller info */}
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

                              {/* Commission breakdown */}
                              <div className={styles.expandedSection}>
                                <p className={styles.expandedSectionLabel}>
                                  <svg viewBox="0 0 24 24" fill="none"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 14.93V18h-2v-1.07A4.004 4.004 0 018 13h2c0 1.1.9 2 2 2s2-.9 2-2c0-1.1-.9-2-2-2a4 4 0 01-4-4c0-1.86 1.28-3.41 3-3.86V2h2v1.14A4.004 4.004 0 0116 7h-2c0-1.1-.9-2-2-2s-2 .9-2 2 .9 2 2 2a4 4 0 014 4c0 1.86-1.28 3.41-3 3.93z" fill="currentColor"/></svg>
                                  Commission Breakdown
                                </p>
                                <div className={styles.breakdownRows}>
                                  <div className={styles.breakdownRow}>
                                    <span>Total Collected</span>
                                    <strong>{formatPHP(t.amount)}</strong>
                                  </div>
                                  <div className={`${styles.breakdownRow} ${styles.breakdownPlatform}`}>
                                    <span>Platform Fee ({rate}%){commissionSettings.sellers[t.sellerId] !== undefined ? ' · custom' : ''}</span>
                                    <strong>− {formatPHP(commission)}</strong>
                                  </div>
                                  <div className={`${styles.breakdownRow} ${styles.breakdownSeller}`}>
                                    <span>Seller Earnings</span>
                                    <strong>{formatPHP(sellerEarnings)}</strong>
                                  </div>
                                </div>
                                {/* Visual split bar */}
                                <div className={styles.splitBar}>
                                  <div className={styles.splitBarSegment} style={{width:`${rate}%`, background:'#334155'}} title={`Platform ${rate}%`}/>
                                  <div className={styles.splitBarSegment} style={{width:`${100-rate}%`, background:'#10b981'}} title={`Seller ${100-rate}%`}/>
                                </div>
                              </div>

                              <div className={styles.expandedDivider}/>

                              {/* Payout status */}
                              <div className={styles.expandedSection}>
                                <p className={styles.expandedSectionLabel}>
                                  <svg viewBox="0 0 24 24" fill="none"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                                  Payout Status
                                </p>
                                <div className={styles.payoutStatusRow}>
                                  <Badge type="payout" value={t.payoutStatus}/>
                                  {t.payoutReference && (
                                    <span className={styles.refChip}>Ref: {t.payoutReference}</span>
                                  )}
                                  {t.payoutDate && (
                                    <span className={styles.dateChip}>{t.payoutDate}</span>
                                  )}
                                </div>
                              </div>

                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  )
                })}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <div className={styles.emptyState}>
                <p className={styles.emptyTitle}>No transactions found</p>
                <p className={styles.emptyHint}>Try adjusting your filters or search query</p>
                {hasFilters && <button className={styles.clearFiltersBtn} onClick={clearFilters}>Clear filters</button>}
              </div>
            )}
          </div>

          {/* Pagination */}
          {filtered.length > 0 && (
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
                Showing <strong>{(currentPage - 1) * ROWS_PER_PAGE + 1}–{Math.min(currentPage * ROWS_PER_PAGE, filtered.length)}</strong> of <strong>{filtered.length}</strong> entries
              </p>
            </div>
          )}
        </div>
      )}

      {/* Tab: Commission Settings */}
      {activeTab === 'commissions' && (
        <CommissionPanel settings={commissionSettings} onUpdateSettings={setCommissionSettings} />
      )}

      {/* Tab: Seller Earnings */}
      {activeTab === 'sellers' && (
        <SellerEarningsPanel transactions={transactions} settings={commissionSettings} />
      )}

      {/* Modal */}
      {selectedTxn && (
        <TransactionModal
          txn={selectedTxn}
          settings={commissionSettings}
          onClose={() => setSelectedTxn(null)}
          onUpdatePayout={updatePayout}
        />
      )}
    </div>
  )
}