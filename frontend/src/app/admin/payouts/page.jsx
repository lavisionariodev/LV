'use client'

import React, { useState, useMemo, useRef, useEffect } from 'react'
import { FiArrowUp, FiArrowDown, FiRotateCcw } from 'react-icons/fi'

import { PAYOUTS_PAGE_SELLERS as SELLERS } from '@/data/adminSampleData'
import { useAdminPayoutsPage } from '@/hooks'
import {
  formatPHP,
  formatDateRangeLabel,
  PAYMENT_STATUS_META,
  PAYOUT_STATUS_META,
  getCommissionRate,
  calcAmounts,
} from '@/utils/adminPayouts'

import styles from './payouts.module.css'

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

// ─── Sub-Components ──────────────────────────────────────────────────────────

// ── Custom Dropdown ──────────────────────────────────────────────────────────
function CustomDropdown({ value, onChange, options, placeholder, ariaLabel }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const selected = options.find(o => o.value === value)

  return (
    <div className={styles.customDropdown} ref={ref} aria-label={ariaLabel}>
      <button
        type="button"
        className={`${styles.customDropdownTrigger} ${open ? styles.customDropdownTriggerOpen : ''}`}
        onClick={() => setOpen(o => !o)}
      >
        <span className={styles.customDropdownLabel}>
          {selected ? selected.label : placeholder}
        </span>
        <svg className={`${styles.customDropdownChevron} ${open ? styles.customDropdownChevronOpen : ''}`} viewBox="0 0 24 24" fill="none">
          <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
      {open && (
        <div className={styles.customDropdownMenu}>
          {options.map(opt => (
            <button
              key={opt.value}
              type="button"
              className={`${styles.customDropdownItem} ${value === opt.value ? styles.customDropdownItemActive : ''}`}
              onClick={() => { onChange(opt.value); setOpen(false) }}
            >
              {opt.color && (
                <span className={`${styles.customDropdownDot} ${styles[`dropDot_${opt.color}`]}`} />
              )}
              {opt.label}
              {value === opt.value && (
                <svg className={styles.customDropdownCheck} viewBox="0 0 24 24" fill="none">
                  <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

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
      // Start fresh selection
      onChange(dateStr, '')
    } else {
      // Second click — assign from/to in order
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
  const meta = type === 'payment' ? PAYMENT_STATUS_META[value] : PAYOUT_STATUS_META[value]
  if (!meta) return null
  if (type === 'payout') {
    return <span className={`${styles.badgePayout} ${styles[`badgePayout_${meta.color}`]}`}>{meta.label}</span>
  }
  return <span className={`${styles.badge} ${styles[`badge_${meta.color}`]}`}>{meta.label}</span>
}


function StatCard({ label, value, percent }) {
  const isPositive = percent >= 0

  return (
    <div className={styles.statCard}>
      <p className={styles.statLabel}>{label}</p>
      <div className={styles.statBody}>
        <div className={styles.statLeft}>
          <p className={styles.statValue}>{value}</p>
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
        </div>
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

function RateGauge({ rate }) {
  const clamp = Math.min(100, Math.max(0, rate))
  const r = 38, cx = 48, cy = 48
  const circumference = Math.PI * r // half-circle
  const filled = (clamp / 100) * circumference
  const color = clamp <= 8 ? '#10b981' : clamp <= 15 ? '#4ade80' : '#ef4444'
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

function CommissionPanel({ settings, onUpdateSettings, transactions = [] }) {
  const [globalInput, setGlobalInput] = useState(String(settings.global))
  const [editingGlobal, setEditingGlobal] = useState(false)
  const [sellerInputs, setSellerInputs] = useState({})
  const [editingSeller, setEditingSeller] = useState(null)
  const [confirmReset, setConfirmReset] = useState(false)
  const [changeLog, setChangeLog] = useState([
    { id: 1, type: 'global', label: 'Global rate', from: 10, to: 10, ts: Date.now() - 3600000 * 24 },
    { id: 2, type: 'seller', label: 'Heaven Memorial Services', from: 10, to: 12, ts: Date.now() - 3600000 * 12 },
    { id: 3, type: 'seller', label: 'Grace Funeral Services', from: 10, to: 8, ts: Date.now() - 3600000 * 2 },
  ])
  const [showLog, setShowLog] = useState(false)
  const [activeSection, setActiveSection] = useState('global') // 'global' | 'sellers'

  const customCount = Object.keys(settings.sellers).length

  const saveGlobal = () => {
    const v = parseFloat(globalInput)
    if (!isNaN(v) && v >= 0 && v <= 100) {
      setChangeLog(prev => [{ id: Date.now(), type: 'global', label: 'Global rate', from: settings.global, to: v, ts: Date.now() }, ...prev.slice(0, 9)])
      onUpdateSettings({ ...settings, global: v })
    }
    setEditingGlobal(false)
  }

  const saveSeller = (sid) => {
    const seller = SELLERS.find(s => s.id === sid)
    const v = parseFloat(sellerInputs[sid])
    const prev = settings.sellers[sid] !== undefined ? settings.sellers[sid] : settings.global
    if (!isNaN(v) && v >= 0 && v <= 100) {
      setChangeLog(p => [{ id: Date.now(), type: 'seller', label: seller?.name || sid, from: prev, to: v, ts: Date.now() }, ...p.slice(0, 9)])
      onUpdateSettings({ ...settings, sellers: { ...settings.sellers, [sid]: v } })
    } else if (sellerInputs[sid] === '') {
      const next = { ...settings.sellers }
      delete next[sid]
      onUpdateSettings({ ...settings, sellers: next })
    }
    setEditingSeller(null)
  }

  const removeOverride = (sid) => {
    const seller = SELLERS.find(s => s.id === sid)
    setChangeLog(p => [{ id: Date.now(), type: 'remove', label: seller?.name || sid, from: settings.sellers[sid], to: settings.global, ts: Date.now() }, ...p.slice(0, 9)])
    const next = { ...settings.sellers }
    delete next[sid]
    onUpdateSettings({ ...settings, sellers: next })
  }

  const resetAll = () => {
    setChangeLog(p => [{ id: Date.now(), type: 'reset', label: 'All overrides cleared', from: null, to: settings.global, ts: Date.now() }, ...p.slice(0, 9)])
    onUpdateSettings({ ...settings, sellers: {} })
    setConfirmReset(false)
  }

  function timeAgo(ts) {
    const s = Math.floor((Date.now() - ts) / 1000)
    if (s < 60) return 'just now'
    if (s < 3600) return `${Math.floor(s/60)}m ago`
    if (s < 86400) return `${Math.floor(s/3600)}h ago`
    return `${Math.floor(s/86400)}d ago`
  }

  // Compute per-seller impact using transactions
  const sellerStats = useMemo(() => {
    const map = {}
    SELLERS.forEach(s => { map[s.id] = { revenue: 0, txnCount: 0 } })
    if (transactions) {
      transactions.forEach(t => {
        if (t.paymentStatus === 'paid' && map[t.sellerId]) {
          const rate = getCommissionRate(t.sellerId, settings)
          const { commission } = calcAmounts(t.amount, rate)
          map[t.sellerId].revenue += commission
          map[t.sellerId].txnCount++
        }
      })
    }
    return map
  }, [transactions, settings])

  return (
    <div className={styles.commissionPanel}>
      {/* ── Header ── */}
      <div className={styles.commissionPanelHeader}>
        <div className={styles.commissionPanelHeaderLeft}>
          <div className={styles.commissionPanelTitleWrap}>
            <p className={styles.commissionPanelTitle}>Commission Settings</p>
            <p className={styles.commissionPanelSub}>Configure platform fee rates globally or per seller</p>
          </div>
        </div>
        <div className={styles.commissionPanelHeaderRight}>
          {customCount > 0 && (
            <span className={styles.overrideCountBadge}>{customCount} custom override{customCount > 1 ? 's' : ''}</span>
          )}
          <button
            className={`${styles.logToggleBtn} ${showLog ? styles.logToggleBtnActive : ''}`}
            onClick={() => setShowLog(v => !v)}
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
        {[{ key: 'global', label: 'Global Rate' }, { key: 'sellers', label: `Per-Seller Rates (${SELLERS.length})` }].map(tab => (
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
                <RateGauge rate={settings.global} />
                <div className={styles.gaugeCardInfo}>
                  <p className={styles.gaugeCardLabel}>Global Commission Rate</p>
                  <p className={styles.gaugeCardHint}>Applied to all sellers without a custom override</p>
                  <div className={styles.gaugeCardMeta}>
                    <span className={`${styles.gaugeRiskBadge} ${settings.global <= 8 ? styles.gaugeRiskLow : settings.global <= 15 ? styles.gaugeRiskMid : styles.gaugeRiskHigh}`}>
                      {settings.global <= 8 ? 'Low' : settings.global <= 15 ? 'Standard' : 'High'} rate
                    </span>
                    <span className={styles.gaugeAffects}>Affects {SELLERS.length - customCount} seller{SELLERS.length - customCount !== 1 ? 's' : ''}</span>
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
                      <button className={styles.btnSave} onClick={saveGlobal}>Save Rate</button>
                      <button className={styles.btnCancel} onClick={() => { setEditingGlobal(false); setGlobalInput(String(settings.global)) }}>Cancel</button>
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
              {SELLERS.map(seller => {
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
                          <button className={styles.btnSave} onClick={() => saveSeller(seller.id)}>Save</button>
                          <button className={styles.btnCancel} onClick={() => setEditingSeller(null)}>Cancel</button>
                        </div>
                        <p className={styles.sellerEditHint}>Leave blank or 0 to remove override</p>
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
                          <button className={styles.btnRemoveOverride} onClick={() => removeOverride(seller.id)}>Remove</button>
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
              <button className={styles.confirmCancelBtn} onClick={() => setConfirmReset(false)}>Cancel</button>
              <button className={styles.confirmResetBtn} onClick={resetAll}>Yes, Reset All</button>
            </div>
          </div>
        </div>
      )}
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

export default function AdminPayoutsPage() {
  const {
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
  } = useAdminPayoutsPage()

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
        <section className={styles.statsGrid}>
          <StatCard label="Platform Revenue" value={formatPHP(summary.platformRevenue)} percent={14} />
          <StatCard label="Total Order" value={summary.total} percent={-17} />
          <StatCard label="Pending Payouts" value={formatPHP(summary.pendingAmt)} percent={8} />
          <StatCard label="Completed Payouts" value={formatPHP(summary.completedAmt)} percent={23} />
        </section>
      )}

      {/* Tab panels: All = transactions → commission → seller earnings */}
      <div
        className={activeTab === 'all' ? styles.allViewStack : undefined}
        style={activeTab === 'all' ? undefined : { display: 'contents' }}
      >
      {/* Tab: Transactions */}
      {showTransactions && (
        <div className={styles.tablePanel}>
          {/* Toolbar — single row: search, date range, status, seller, filters, clear */}
          <div className={styles.toolbar}>
            <div className={styles.toolbarRow}>
              <div className={styles.toolbarControls}>
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
                </div>

                <DateRangePicker
                  from={filterDateFrom}
                  to={filterDateTo}
                  onChange={(from, to) => { setFilterDateFrom(from); setFilterDateTo(to) }}
                />

                <CustomDropdown
                  value={filterPayout}
                  onChange={setFilterPayout}
                  ariaLabel="Payout status"
                  options={[
                    { value: 'all', label: 'All statuses' },
                    ...Object.entries(PAYOUT_STATUS_META).map(([k, v]) => ({ value: k, label: v.label, color: v.color }))
                  ]}
                  placeholder="All statuses"
                />

                <CustomDropdown
                  value={filterSeller}
                  onChange={setFilterSeller}
                  ariaLabel="Seller"
                  options={[
                    { value: 'all', label: 'All sellers' },
                    ...SELLERS.map(s => ({ value: s.id, label: s.name }))
                  ]}
                  placeholder="All sellers"
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

            {showFilters && (
              <div className={styles.filterBarExtra}>
                <div className={styles.filterFieldInline}>
                  <span className={styles.filterFieldInlineLabel}>Payment</span>
                  <CustomDropdown
                    value={filterPayment}
                    onChange={setFilterPayment}
                    ariaLabel="Payment status"
                    options={[
                      { value: 'all', label: 'All' },
                      ...Object.entries(PAYMENT_STATUS_META).map(([k, v]) => ({ value: k, label: v.label, color: v.color }))
                    ]}
                    placeholder="All"
                  />
                </div>
              </div>
            )}
          </div>

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
      {showCommissions && (
        <CommissionPanel settings={commissionSettings} onUpdateSettings={setCommissionSettings} transactions={transactions} />
      )}

      {/* Tab: Seller Earnings */}
      {showSellerEarnings && (
        <SellerEarningsPanel transactions={transactions} settings={commissionSettings} />
      )}
      </div>

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