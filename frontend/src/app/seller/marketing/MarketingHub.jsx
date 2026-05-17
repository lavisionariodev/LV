'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { TbEdit, TbPlayerPause, TbPlayerPlay, TbTrash } from 'react-icons/tb'
import {
  AreaChart,
  Area,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import styles from './marketing.module.css'
import { createPortal } from 'react-dom'
import { Toast } from '@/components/ui'

function StatusPill({ status }) {
  const cls =
    status === 'Active'
      ? styles.statusActive
      : status === 'Draft'
        ? styles.statusDraft
        : status === 'Completed'
          ? styles.statusCompleted
          : status === 'Paused'
            ? styles.statusPaused
            : styles.statusNeutral

  return <span className={`${styles.statusPill} ${cls}`}>{status}</span>
}


const ROWS_PER_PAGE = 10

function buildVisiblePages(currentPage, totalPages) {
  if (totalPages <= 0) return []
  return Array.from({ length: totalPages }, (_, i) => i + 1)
    .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
    .reduce((acc, p, idx, arr) => {
      if (idx > 0 && p - arr[idx - 1] > 1) acc.push('...')
      acc.push(p)
      return acc
    }, [])
}

function slicePage(items, page) {
  const start = (page - 1) * ROWS_PER_PAGE
  return items.slice(start, start + ROWS_PER_PAGE)
}

function MarketingPagination({ page, setPage, totalItems, itemLabel, ariaLabel }) {
  const totalPages = Math.ceil(totalItems / ROWS_PER_PAGE) || 1
  if (totalPages <= 1 || totalItems === 0) return null
  const start = (page - 1) * ROWS_PER_PAGE + 1
  const end = Math.min(page * ROWS_PER_PAGE, totalItems)
  return (
    <div className={styles.pagination}>
      <div className={styles.paginationControls} role="navigation" aria-label={ariaLabel}>
        <button type="button" className={`${styles.pageBtn} ${page === 1 ? styles.pageBtnDisabled : ''}`} onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1}>‹ Previous</button>
        {buildVisiblePages(page, totalPages).map((p, idx) =>
          p === '...' ? <span key={`e-${idx}`} className={styles.pageEllipsis}>…</span> : (
            <button key={p} type="button" className={`${styles.pageBtn} ${page === p ? styles.pageBtnActive : ''}`} onClick={() => setPage(p)} aria-current={page === p ? 'page' : undefined}>{p}</button>
          ),
        )}
        <button type="button" className={`${styles.pageBtn} ${page === totalPages ? styles.pageBtnDisabled : ''}`} onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page === totalPages}>Next ›</button>
      </div>
      <p className={styles.paginationInfo}>Showing <strong>{start}–{end}</strong> of <strong>{totalItems}</strong> {itemLabel}</p>
    </div>
  )
}

function TrendChart() {
  const data = useMemo(
    () => [
      { label: 'W1', total: 4200 },
      { label: 'W2', total: 5100 },
      { label: 'W3', total: 4600 },
      { label: 'W4', total: 6200 },
      { label: 'W5', total: 5800 },
      { label: 'W6', total: 6900 },
      { label: 'W7', total: 7400 },
    ],
    [],
  )

  return (
    <div className={styles.trendChart}>
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="marketingRevenueLikeGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#1F312B" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#1F312B" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#64748b' }} />
          <YAxis
            tickFormatter={(v) => `${Math.round(v / 1000)}k`}
            tick={{ fontSize: 11, fill: '#64748b' }}
            width={36}
          />
          <Tooltip
            formatter={(value) => [Number(value).toLocaleString(), 'Performance']}
            labelFormatter={(label) => `Week: ${label}`}
            contentStyle={{ fontSize: 12, borderRadius: 8 }}
          />
          <Area
            type="monotone"
            dataKey="total"
            stroke="#1F312B"
            strokeWidth={2}
            fill="url(#marketingRevenueLikeGradient)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

function ConversionBars() {
  const data = [
    { label: 'Views', value: 100 },
    { label: 'Clicks', value: 61 },
    { label: 'Leads', value: 32 },
    { label: 'Orders', value: 14 },
  ]

  return (
    <div className={styles.barChart}>
      {data.map((item) => (
        <div key={item.label} className={styles.barRow}>
          <div className={styles.barMeta}>
            <span>{item.label}</span>
            <strong>{item.value}%</strong>
          </div>
          <div className={styles.barTrack} aria-hidden>
            <div className={styles.barFill} style={{ width: `${item.value}%` }} />
          </div>
        </div>
      ))}
    </div>
  )
}

function Drawer({ open, title, onClose, children }) {
  if (!open) return null
  if (typeof document === 'undefined') return null

  return createPortal(
    <div className={styles.drawerOverlay} role="dialog" aria-modal="true" onClick={onClose}>
      <div className={styles.drawer} onClick={(e) => e.stopPropagation()}>
        <div className={styles.drawerHeader}>
          <div className={styles.drawerTitle}>{title}</div>
          <button type="button" className={styles.drawerCloseBtn} onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <div className={styles.drawerBody}>{children}</div>
      </div>
    </div>,
    document.body
  )
}

function Field({ label, children }) {
  return (
    <label className={styles.field}>
      <span className={styles.fieldLabel}>{label}</span>
      {children}
    </label>
  )
}

function StatusDropdown({ value, onChange }) {
  const [open, setOpen] = useState(false)
  const dropdownRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpen(false)
      }
    }

    if (open) {
      document.addEventListener('click', handleClickOutside)
      return () => document.removeEventListener('click', handleClickOutside)
    }
  }, [open])

  const options = ['Draft', 'Active', 'Paused', 'Completed']

  return (
    <div className={`${styles.statusDropdownWrap} ${open ? styles.statusDropdownOpen : ''}`} ref={dropdownRef}>
      <button
        type="button"
        className={styles.statusDropdownTrigger}
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className={styles.statusDropdownLabel}>{value || 'Draft'}</span>
        <span className={styles.statusDropdownChevron} aria-hidden>
          ▾
        </span>
      </button>
      {open && (
        <div className={styles.statusDropdownPanel} role="listbox" aria-label="Status options">
          {options.map((opt) => (
            <button
              key={opt}
              type="button"
              role="option"
              aria-selected={value === opt}
              className={`${styles.statusDropdownOption} ${value === opt ? styles.statusDropdownOptionSelected : ''}`}
              onClick={() => {
                onChange(opt)
                setOpen(false)
              }}
            >
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function ModeDropdown({ value, onChange }) {
  const [open, setOpen] = useState(false)
  const dropdownRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpen(false)
      }
    }

    if (open) {
      document.addEventListener('click', handleClickOutside)
      return () => document.removeEventListener('click', handleClickOutside)
    }
  }, [open])

  const options = [
    { value: 'single', label: 'Single code' },
    { value: 'bulk', label: 'Bulk codes' },
  ]
  const selectedLabel = options.find((opt) => opt.value === value)?.label || 'Single code'

  return (
    <div className={`${styles.statusDropdownWrap} ${open ? styles.statusDropdownOpen : ''}`} ref={dropdownRef}>
      <button
        type="button"
        className={styles.statusDropdownTrigger}
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className={styles.statusDropdownLabel}>{selectedLabel}</span>
        <span className={styles.statusDropdownChevron} aria-hidden>
          ▾
        </span>
      </button>
      {open && (
        <div className={styles.statusDropdownPanel} role="listbox" aria-label="Mode options">
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              role="option"
              aria-selected={value === opt.value}
              className={`${styles.statusDropdownOption} ${value === opt.value ? styles.statusDropdownOptionSelected : ''}`}
              onClick={() => {
                onChange(opt.value)
                setOpen(false)
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function MarketingHub({ initialTab = 'centre' }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const tabParam = searchParams.get('tab')
  const [toast, setToast] = useState(null)
  const [marketingListPages, setMarketingListPages] = useState({
    centreCampaigns: 1,
    centreDiscounts: 1,
    centreVouchers: 1,
    centreSegments: 1,
    centreAlerts: 1,
    tabDiscounts: 1,
    tabVouchers: 1,
    tabCampaigns: 1,
  })
  const setMarketingPage = (key, page) =>
    setMarketingListPages((prev) => ({ ...prev, [key]: page }))

  const [drawer, setDrawer] = useState({ open: false, type: null })

  const [discountDraft, setDiscountDraft] = useState({
    name: '',
    discountType: 'percentage',
    value: '',
    start: '',
    end: '',
    scopeId: '',
    status: 'Draft',
    id: null,
  })

  const [campaignDraft, setCampaignDraft] = useState({
    name: '',
    status: 'Draft',
    startDate: '',
    durationDays: 14,
    scopeId: '',
    attachDiscountId: '',
    attachVoucherId: '',
  })

  const [voucherDraft, setVoucherDraft] = useState({
    mode: 'single',
    prefix: 'LV',
    amount: 25,
    id: null,
    code: '',
    expiration: '',
    usageLimit: 1,
    scopeId: '',
    status: 'Draft',
  })

  const activeTabKey = useMemo(() => {
    if (tabParam === 'centre' || tabParam === 'discounts' || tabParam === 'vouchers' || tabParam === 'campaigns') {
      return tabParam
    }
    if (!pathname) return initialTab
    if (pathname === '/seller/marketing' || pathname.startsWith('/seller/marketing/centre')) return 'centre'
    if (pathname.startsWith('/seller/marketing/discount')) return 'discounts'
    if (pathname.startsWith('/seller/marketing/vouchers')) return 'vouchers'
    if (pathname.startsWith('/seller/marketing/campaign')) return 'campaigns'
    return initialTab
  }, [pathname, initialTab, tabParam])

  const isCentreRoute = pathname === '/seller/marketing' || pathname?.startsWith('/seller/marketing/centre')

  const centreData = useMemo(
    () => ({
      metrics: [
        { value: '$18.4k', label: 'Campaign revenue', delta: '+14.2%', toneClass: styles.statCardTotal },
        { value: '6.7k', label: 'Ad clicks', delta: '+8.4%', toneClass: styles.statCardPending },
        { value: '4.9%', label: 'Conversion rate', delta: '+1.1%', toneClass: styles.statCardInProgress },
        { value: '12', label: 'Active promotions', delta: '+3', toneClass: styles.statCardCompleted },
      ],
      promotions: [
        { name: 'Spring Promo', status: 'Active', channel: 'Social', spend: '$720', roi: '2.8x' },
        { name: 'Weekend Discount', status: 'Paused', channel: 'Email', spend: '$210', roi: '1.6x' },
        { name: 'Early Bird', status: 'Active', channel: 'Search', spend: '$540', roi: '2.1x' },
        { name: 'Bundle Boost', status: 'Active', channel: 'In-app', spend: '$310', roi: '3.0x' },
      ],
    }),
    [],
  )

  const [discountsData, setDiscountsData] = useState([
    {
      id: 'disc_1',
      name: '10% Summer Boost',
      type: 'percentage',
      status: 'Active',
      usage: 42,
      value: 10,
      start: '2026-03-01',
      end: '2026-04-01',
      scopeId: 'Service: Standard',
    },
    {
      id: 'disc_2',
      name: '$15 Off Premium',
      type: 'fixed',
      status: 'Draft',
      usage: 7,
      value: 15,
      start: '2026-03-15',
      end: '2026-04-15',
      scopeId: 'Service: Standard',
    },
    {
      id: 'disc_3',
      name: 'VIP Flat $25',
      type: 'fixed',
      status: 'Active',
      usage: 19,
      value: 25,
      start: '2026-02-20',
      end: '2026-04-20',
      scopeId: 'Service: Standard',
    },
  ])

  const [vouchersData, setVouchersData] = useState([
    { id: 'vch_1', code: 'LVSPRING10', status: 'Active', redemptions: 12, expiration: '2026-04-30', usageLimit: 1 },
    { id: 'vch_2', code: 'LVVIP25', status: 'Active', redemptions: 5, expiration: '2026-04-15', usageLimit: 1 },
    { id: 'vch_3', code: 'LVWEEKEND', status: 'Completed', redemptions: 0, expiration: '2026-04-06', usageLimit: 1 },
  ])

  const campaignsData = useMemo(
    () => [
      { id: 'cmp_1', name: 'Summer Launch', status: 'Active', clicks: 980, conversions: '4.1%' },
      { id: 'cmp_2', name: 'VIP Push', status: 'Draft', clicks: 0, conversions: '—' },
      { id: 'cmp_3', name: 'Spring Retarget', status: 'Completed', clicks: 740, conversions: '3.6%' },
    ],
    [],
  )
  const [managementCampaigns, setManagementCampaigns] = useState([
    {
      id: 'mcmp_1',
      name: 'Spring Beauty Push',
      type: 'Discount',
      status: 'Active',
      duration: 'Mar 12 - Apr 12',
      performance: 'CTR 5.2% | CVR 3.9%',
    },
    {
      id: 'mcmp_2',
      name: 'Weekend Voucher Blast',
      type: 'Voucher',
      status: 'Paused',
      duration: 'Mar 01 - Mar 28',
      performance: 'CTR 3.7% | CVR 2.8%',
    },
    {
      id: 'mcmp_3',
      name: 'VIP Retention Offer',
      type: 'Promotion',
      status: 'Draft',
      duration: 'Apr 04 - Apr 25',
      performance: 'CTR — | CVR —',
    },
  ])
  const offersData = useMemo(
    () => [
      { id: 'offer_1', title: 'Bundle Saver 15%', usage: '120 / 300', expires: 'Apr 30', status: 'Active' },
      { id: 'offer_2', title: 'New User Welcome', usage: '88 / 200', expires: 'Apr 15', status: 'Active' },
      { id: 'offer_3', title: 'Weekend Flash', usage: '45 / 150', expires: 'Apr 06', status: 'Draft' },
    ],
    [],
  )
  const audienceSegments = useMemo(
    () => [
      { id: 'seg_1', name: 'Returning Buyers', size: '2,460 users', lift: '+18% CVR' },
      { id: 'seg_2', name: 'High AOV Clients', size: '740 users', lift: '+11% revenue' },
      { id: 'seg_3', name: 'Inactive 30+ Days', size: '1,180 users', lift: '+7% reactivation' },
    ],
    [],
  )
  const alerts = useMemo(
    () => [
      { id: 'al_1', title: 'Weekend Voucher Blast is underperforming', level: 'warning' },
      { id: 'al_2', title: 'Bundle Saver 15% expires in 4 days', level: 'info' },
      { id: 'al_3', title: 'Spring Beauty Push reached 80% budget', level: 'warning' },
    ],
    [],
  )

  const openDrawer = (type) => {
    if (type === 'createDiscount') {
      setDiscountDraft({
        id: null,
        name: '',
        discountType: 'percentage',
        value: '',
        start: '',
        end: '',
        scopeId: '',
        status: 'Draft',
      })
    }

    if (type === 'createVoucher') {
      setVoucherDraft({
        mode: 'single',
        prefix: 'LV',
        amount: 25,
        id: null,
        code: '',
        expiration: '',
        usageLimit: 1,
        scopeId: '',
        status: 'Draft',
      })
    }

    setDrawer({ open: true, type })
  }
  const closeDrawer = () => setDrawer({ open: false, type: null })
  const pushToast = (message, variant = 'info') => setToast({ message, variant })
  const onToggleCampaignPause = (campaignId) => {
    setManagementCampaigns((prev) =>
      prev.map((campaign) => {
        if (campaign.id !== campaignId) return campaign
        const isPaused = campaign.status === 'Paused'
        return { ...campaign, status: isPaused ? 'Active' : 'Paused' }
      }),
    )
  }
  const onDeleteCampaign = (campaignId) => {
    setManagementCampaigns((prev) => prev.filter((campaign) => campaign.id !== campaignId))
  }
  const onDeleteDiscount = (discountId) => {
    setDiscountsData((prev) => prev.filter((discount) => discount.id !== discountId))
  }

  const onCopy = async (text) => {
    try {
      await navigator.clipboard.writeText(text)
      pushToast('Copied to clipboard', 'success')
    } catch {
      pushToast('Copy failed. Please copy manually.', 'error')
    }
  }

  const onCopyOrShare = async (text) => {
    try {
      if (navigator.share) {
        await navigator.share({ text })
        pushToast('Shared successfully', 'success')
        return
      }
    } catch {
      // fallback to copy
    }
    await onCopy(text)
  }

  return (
    <div className={styles.marketingPage}>
      <div className={styles.marketingLayout}>
        <section className={styles.tabContent} aria-live="polite">
          {isCentreRoute && (
            <>
              <div className={styles.statsStrip}>
                {centreData.metrics.map((m) => (
                  <div key={m.label} className={`${styles.statCard} ${m.toneClass}`}>
                    <div className={styles.statCardValue}>{m.value}</div>
                    <div className={styles.statCardTitle}>{m.label}</div>
                    <div className={styles.statCardDesc}>{m.delta} vs last month</div>
                  </div>
                ))}
              </div>

              <div className={`${styles.card} ${styles.campaignCard}`}>
                <div className={styles.cardHeaderRow}>
                  <div className={styles.cardTitle}>Campaign Management</div>
                  <button type="button" className={styles.primaryBtn} onClick={() => openDrawer('createCampaign')}>
                    Create Campaign
                  </button>
                </div>
                <div className={styles.dividerThin} />
                <div className={styles.tableWrap}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Campaign</th>
                        <th>Type</th>
                        <th>Status</th>
                        <th>Duration</th>
                        <th>Performance</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {slicePage(managementCampaigns, marketingListPages.centreCampaigns).map((campaign) => (
                        <tr key={campaign.id}>
                          <td className={styles.tdMain}>{campaign.name}</td>
                          <td>{campaign.type}</td>
                          <td>
                            <StatusPill status={campaign.status} />
                          </td>
                          <td>{campaign.duration}</td>
                          <td>{campaign.performance}</td>
                          <td className={styles.tdRight}>
                            <div className={styles.inlineActions}>
                              <button
                                type="button"
                                className={`${styles.iconActionBtn} ${styles.iconEditBtn}`}
                                onClick={() => {
                                  setCampaignDraft((prev) => ({
                                    ...prev,
                                    name: campaign.name,
                                    status: campaign.status,
                                  }))
                                  openDrawer('editCampaign')
                                }}
                                aria-label="Edit campaign"
                                title="Edit"
                              >
                                <TbEdit size={16} />
                              </button>
                              <button
                                type="button"
                                className={`${styles.iconActionBtn} ${styles.iconPauseBtn}`}
                                onClick={() => {
                                  const isPaused = campaign.status === 'Paused'
                                  onToggleCampaignPause(campaign.id)
                                  pushToast(isPaused ? 'Campaign unpaused' : 'Campaign paused', 'success')
                                }}
                                aria-label={campaign.status === 'Paused' ? 'Unpause campaign' : 'Pause campaign'}
                                title={campaign.status === 'Paused' ? 'Unpause' : 'Pause'}
                              >
                                {campaign.status === 'Paused' ? <TbPlayerPlay size={16} /> : <TbPlayerPause size={16} />}
                              </button>
                              <button
                                type="button"
                                className={`${styles.iconActionBtn} ${styles.iconDeleteBtn}`}
                                onClick={() => {
                                  onDeleteCampaign(campaign.id)
                                  pushToast('Campaign deleted', 'success')
                                }}
                                aria-label="Delete campaign"
                                title="Delete"
                              >
                                <TbTrash size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <MarketingPagination page={marketingListPages.centreCampaigns} setPage={(p) => setMarketingPage('centreCampaigns', p)} totalItems={managementCampaigns.length} itemLabel="campaigns" ariaLabel="Campaign management pagination" />
              </div>

              <div className={styles.rowGap}>
                <div className={styles.card}>
                  <div className={styles.cardHeaderRow}>
                    <div className={styles.cardTitle}>Discounts</div>
                    <button type="button" className={styles.primaryBtn} onClick={() => openDrawer('createDiscount')}>
                      New Discount
                    </button>
                  </div>
                  <div className={styles.dividerThin} />
                  <div className={styles.tableWrap}>
                    <table className={styles.table}>
                      <thead>
                        <tr>
                          <th>Discount</th>
                          <th>Type</th>
                          <th>Status</th>
                          <th>Usage</th>
                          <th />
                        </tr>
                      </thead>
                      <tbody>
                        {slicePage(discountsData, marketingListPages.centreDiscounts).map((d) => (
                          <tr key={d.id}>
                            <td className={styles.tdMain}>{d.name}</td>
                            <td>{d.type === 'percentage' ? 'Percentage' : 'Fixed'}</td>
                            <td>
                              <StatusPill status={d.status} />
                            </td>
                            <td>{d.usage}</td>
                            <td className={styles.tdRight}>
                              <div className={styles.inlineActions}>
                                <button
                                  type="button"
                                  className={`${styles.iconActionBtn} ${styles.iconEditBtn}`}
                                  onClick={() => {
                                    setDiscountDraft((prev) => ({
                                      ...prev,
                                      id: d.id,
                                      name: d.name,
                                      discountType: d.type,
                                      value: d.value != null ? String(d.value) : '',
                                      start: d.start ?? '',
                                      end: d.end ?? '',
                                      scopeId: d.scopeId ?? '',
                                      status: d.status,
                                    }))
                                    openDrawer('editDiscount')
                                  }}
                                  aria-label="Edit discount"
                                  title="Edit"
                                >
                                  <TbEdit size={16} />
                                </button>
                                <button
                                  type="button"
                                  className={`${styles.iconActionBtn} ${styles.iconDeleteBtn}`}
                                  onClick={() => {
                                    onDeleteDiscount(d.id)
                                    pushToast('Discount deleted', 'success')
                                  }}
                                  aria-label="Delete discount"
                                  title="Delete"
                                >
                                  <TbTrash size={16} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                <MarketingPagination page={marketingListPages.centreDiscounts} setPage={(p) => setMarketingPage('centreDiscounts', p)} totalItems={discountsData.length} itemLabel="centre discounts" ariaLabel="centre discounts pagination" />
                  </div>
                </div>

                <div className={styles.card}>
                  <div className={styles.cardHeaderRow}>
                    <div className={styles.cardTitle}>Vouchers</div>
                    <button type="button" className={styles.primaryBtn} onClick={() => openDrawer('createVoucher')}>
                      Generate Codes
                    </button>
                  </div>
                  <div className={styles.dividerThin} />
                  <div className={styles.tableWrap}>
                    <table className={styles.table}>
                      <thead>
                        <tr>
                          <th>Code</th>
                          <th>Status</th>
                          <th>Redemptions</th>
                          <th />
                        </tr>
                      </thead>
                      <tbody>
                        {slicePage(vouchersData, marketingListPages.centreVouchers).map((v) => (
                          <tr key={v.id}>
                            <td className={styles.tdMain}>
                              <code className={styles.code}>{v.code}</code>
                            </td>
                            <td>
                              <StatusPill status={v.status} />
                            </td>
                            <td>{v.redemptions}</td>
                            <td className={styles.tdRight}>
                              <div className={styles.inlineActions}>
                                <button
                                  type="button"
                                  className={`${styles.iconActionBtn} ${styles.iconEditBtn}`}
                                  title="Edit"
                                  aria-label="Edit voucher"
                                  onClick={() => {
                                    setVoucherDraft({
                                      mode: 'single',
                                      prefix: v.code.startsWith('LV') ? 'LV' : v.code.slice(0, 2),
                                      amount: 1,
                                      id: v.id,
                                      code: v.code,
                                      expiration: v.expiration || '',
                                      usageLimit: v.usageLimit ?? 1,
                                      scopeId: v.scopeId || '',
                                      status: v.status,
                                    })
                                    openDrawer('editVoucher')
                                  }}
                                >
                                  <TbEdit size={16} />
                                </button>
                                <button
                                  type="button"
                                  className={`${styles.iconActionBtn} ${styles.iconDeleteBtn}`}
                                  title="Delete"
                                  aria-label="Delete voucher"
                                  onClick={() => {
                                    setVouchersData((prev) => prev.filter((x) => x.id !== v.id))
                                    pushToast('Voucher deleted', 'success')
                                  }}
                                >
                                  <TbTrash size={16} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                <MarketingPagination page={marketingListPages.centreVouchers} setPage={(p) => setMarketingPage('centreVouchers', p)} totalItems={vouchersData.length} itemLabel="centre vouchers" ariaLabel="centre vouchers pagination" />
                  </div>
                </div>
              </div>

              <div className={styles.sectionHeader}>
                <h3 className={styles.sectionTitle}>Analytics & Insights</h3>
              </div>

              <div className={styles.rowGap}>
                <div className={styles.card}>
                  <div className={styles.cardHeaderRow}>
                    <div className={styles.cardTitle}>Campaign performance over time</div>
                    <div className={styles.cardMuted}>Last 8 weeks</div>
                  </div>
                  <div className={styles.dividerThin} />
                  <div className={styles.cardBodyTight}>
                    <TrendChart />
                    <div className={styles.trendLegend}>
                      <span className={styles.legendItem}>
                        <span className={styles.legendSwatchGreen} aria-hidden />
                        Clicks
                      </span>
                      <span className={styles.legendItem}>
                        <span className={styles.legendSwatchDark} aria-hidden />
                        Conversions
                      </span>
                    </div>
                  </div>
                </div>

                <div className={styles.card}>
                  <div className={styles.cardHeaderRow}>
                    <div className={styles.cardTitle}>Conversion funnel</div>
                    <div className={styles.cardMuted}>Awareness to purchase</div>
                  </div>
                  <div className={styles.dividerThin} />
                  <ConversionBars />
                </div>
              </div>

              <div className={styles.rowGap}>
                <div className={styles.card}>
                  <div className={styles.cardHeaderRow}>
                    <div className={styles.cardTitle}>Audience targeting</div>
                    <div className={styles.cardMuted}>Suggested high-value segments</div>
                  </div>
                  <div className={styles.dividerThin} />
                  <div className={styles.list}>
                    {slicePage(audienceSegments, marketingListPages.centreSegments).map((segment) => (
                      <div key={segment.id} className={styles.segmentRow}>
                        <div>
                          <div className={styles.listItemName}>{segment.name}</div>
                          <div className={styles.listItemMeta}>{segment.size}</div>
                        </div>
                        <span className={styles.segmentLift}>{segment.lift}</span>
                      </div>
                    ))}
                  </div>
                  <MarketingPagination page={marketingListPages.centreSegments} setPage={(p) => setMarketingPage('centreSegments', p)} totalItems={audienceSegments.length} itemLabel="segments" ariaLabel="Audience segments pagination" />
                </div>

                <div className={styles.card}>
                  <div className={styles.cardHeaderRow}>
                    <div className={styles.cardTitle}>Notifications & alerts</div>
                    <div className={styles.cardMuted}>
                      Needs attention
                      <span className={styles.attentionCount} aria-label={`${alerts.length} items`}>
                        {alerts.length}
                      </span>
                    </div>
                  </div>
                  <div className={styles.dividerThin} />
                  <div className={styles.list}>
                    {slicePage(alerts, marketingListPages.centreAlerts).map((alert) => (
                      <div key={alert.id} className={styles.alertRow}>
                        <div className={styles.alertLeft}>
                          <span
                            className={`${styles.alertIcon} ${
                              alert.level === 'warning' ? styles.alertWarningIcon : styles.alertInfoIcon
                            }`}
                            aria-hidden
                          >
                            {alert.level === 'warning' ? '!' : 'i'}
                          </span>
                          <span className={styles.alertText}>{alert.title}</span>
                        </div>
                        <span
                          className={`${styles.alertLabel} ${
                            alert.level === 'warning' ? styles.alertWarningLabel : styles.alertInfoLabel
                          }`}
                        >
                          {alert.level === 'warning' ? 'Warning' : 'Info'}
                        </span>
                      </div>
                    ))}
                  </div>
                  <MarketingPagination page={marketingListPages.centreAlerts} setPage={(p) => setMarketingPage('centreAlerts', p)} totalItems={alerts.length} itemLabel="alerts" ariaLabel="Alerts pagination" />
                </div>
              </div>
            </>
          )}

          {activeTabKey === 'discounts' && !isCentreRoute && (
            <>
              <div className={styles.cardToolbarRight}>
                <button type="button" className={styles.primaryBtn} onClick={() => openDrawer('createDiscount')}>
                  New Discount
                </button>
              </div>
              <div>
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Discount</th>
                      <th>Type</th>
                      <th>Status</th>
                      <th>Usage</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {slicePage(discountsData, marketingListPages.tabDiscounts).map((d) => (
                      <tr key={d.id}>
                        <td className={styles.tdMain}>{d.name}</td>
                        <td>{d.type === 'percentage' ? 'Percentage' : 'Fixed'}</td>
                        <td>
                          <StatusPill status={d.status} />
                        </td>
                        <td>{d.usage}</td>
                        <td className={styles.tdRight}>
                          <div className={styles.inlineActions}>
                            <button
                              type="button"
                              className={`${styles.iconActionBtn} ${styles.iconEditBtn}`}
                              onClick={() => {
                                  setDiscountDraft((prev) => ({
                                    ...prev,
                                    id: d.id,
                                    name: d.name,
                                    discountType: d.type,
                                    value: d.value ?? prev.value,
                                    start: d.start ?? '',
                                    end: d.end ?? '',
                                    scopeId: d.scopeId ?? '',
                                    status: d.status,
                                  }))
                                openDrawer('editDiscount')
                              }}
                              aria-label="Edit discount"
                              title="Edit"
                            >
                              <TbEdit size={16} />
                            </button>
                            <button
                              type="button"
                              className={`${styles.iconActionBtn} ${styles.iconDeleteBtn}`}
                              onClick={() => {
                                onDeleteDiscount(d.id)
                                pushToast('Discount deleted', 'success')
                              }}
                              aria-label="Delete discount"
                              title="Delete"
                            >
                              <TbTrash size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <MarketingPagination page={marketingListPages.tabDiscounts} setPage={(p) => setMarketingPage('tabDiscounts', p)} totalItems={discountsData.length} itemLabel="discounts" ariaLabel="discounts pagination" />
              </div>
              </div>
            </>
          )}

          {activeTabKey === 'vouchers' && !isCentreRoute && (
            <div className={styles.card}>
              <div className={styles.cardHeaderRow}>
                <div className={styles.cardTitle}>Vouchers</div>
                <div className={styles.cardMuted}>Generate codes and track redemptions</div>
              </div>
              <div className={styles.dividerThin} />
              <div className={styles.actionsRowTight}>
                <button type="button" className={styles.primaryBtn} onClick={() => openDrawer('createVoucher')}>
                  Generate Codes
                </button>
              </div>
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Code</th>
                      <th>Status</th>
                      <th>Redemptions</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {slicePage(vouchersData, marketingListPages.tabVouchers).map((v) => (
                      <tr key={v.id}>
                        <td className={styles.tdMain}>
                          <code className={styles.code}>{v.code}</code>
                        </td>
                        <td>
                          <StatusPill status={v.status} />
                        </td>
                        <td>{v.redemptions}</td>
                        <td className={styles.tdRight}>
                          <div className={styles.inlineActions}>
                            <button
                              type="button"
                              className={`${styles.iconActionBtn} ${styles.iconEditBtn}`}
                              title="Edit"
                              aria-label="Edit voucher"
                              onClick={() => {
                                setVoucherDraft({
                                  mode: 'single',
                                  prefix: v.code.startsWith('LV') ? 'LV' : v.code.slice(0, 2),
                                  amount: 1,
                                  id: v.id,
                                  code: v.code,
                                  expiration: v.expiration || '',
                                  usageLimit: v.usageLimit ?? 1,
                                  scopeId: v.scopeId || '',
                                  status: v.status,
                                })
                                openDrawer('editVoucher')
                              }}
                            >
                              <TbEdit size={16} />
                            </button>
                            <button
                              type="button"
                              className={`${styles.iconActionBtn} ${styles.iconDeleteBtn}`}
                              title="Delete"
                              aria-label="Delete voucher"
                              onClick={() => {
                                setVouchersData((prev) => prev.filter((x) => x.id !== v.id))
                                pushToast('Voucher deleted', 'success')
                              }}
                            >
                              <TbTrash size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <MarketingPagination page={marketingListPages.tabVouchers} setPage={(p) => setMarketingPage('tabVouchers', p)} totalItems={vouchersData.length} itemLabel="vouchers" ariaLabel="vouchers pagination" />
              </div>

              <div className={styles.footerHint}>Tip: Use copy to share a single voucher code quickly.</div>
            </div>
          )}

          {activeTabKey === 'campaigns' && !isCentreRoute && (
            <div className={styles.card}>
              <div className={styles.cardHeaderRow}>
                <div className={styles.cardTitle}>Campaigns</div>
                <div className={styles.cardMuted}>Create and schedule promotional campaigns</div>
              </div>
              <div className={styles.dividerThin} />
              <div className={styles.actionsRowTight}>
                <button type="button" className={styles.primaryBtn} onClick={() => openDrawer('createCampaign')}>
                  New Campaign
                </button>
              </div>
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Campaign</th>
                      <th>Status</th>
                      <th>Clicks</th>
                      <th>Conversions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {slicePage(campaignsData, marketingListPages.tabCampaigns).map((c) => (
                      <tr key={c.id}>
                        <td className={styles.tdMain}>{c.name}</td>
                        <td>
                          <StatusPill status={c.status} />
                        </td>
                        <td>{c.clicks}</td>
                        <td>{c.conversions}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <MarketingPagination page={marketingListPages.tabCampaigns} setPage={(p) => setMarketingPage('tabCampaigns', p)} totalItems={campaignsData.length} itemLabel="campaigns" ariaLabel="campaigns pagination" />
              </div>
            </div>
          )}
        </section>
      </div>

      <Drawer
        open={drawer.open && (drawer.type === 'createCampaign' || drawer.type === 'editCampaign')}
        title={drawer.type === 'editCampaign' ? 'Edit Campaign' : 'Create Campaign'}
        onClose={closeDrawer}
      >
        <div className={styles.drawerFormGrid}>
          <Field label="Campaign name">
            <input
              className={styles.input}
              value={campaignDraft.name}
              onChange={(e) => setCampaignDraft((d) => ({ ...d, name: e.target.value }))}
              placeholder="e.g. Black Friday"
            />
          </Field>
          <Field label="Status">
            <StatusDropdown
              value={campaignDraft.status}
              onChange={(nextStatus) => setCampaignDraft((d) => ({ ...d, status: nextStatus }))}
            />
          </Field>
          <Field label="Start date">
            <input
              className={styles.input}
              type="date"
              value={campaignDraft.startDate}
              onChange={(e) => setCampaignDraft((d) => ({ ...d, startDate: e.target.value }))}
            />
          </Field>
          <Field label="Duration (days)">
            <input
              className={styles.input}
              type="number"
              value={campaignDraft.durationDays}
              onChange={(e) => setCampaignDraft((d) => ({ ...d, durationDays: Number(e.target.value || 0) }))}
            />
          </Field>
          <Field label="Target service/package">
            <input
              className={styles.input}
              value={campaignDraft.scopeId}
              onChange={(e) => setCampaignDraft((d) => ({ ...d, scopeId: e.target.value }))}
              placeholder="e.g. Service: Standard"
            />
          </Field>
          <Field label="Attach discount (optional)">
            <input
              className={styles.input}
              value={campaignDraft.attachDiscountId}
              onChange={(e) => setCampaignDraft((d) => ({ ...d, attachDiscountId: e.target.value }))}
              placeholder="e.g. Summer Boost 10"
            />
          </Field>
          <Field label="Attach voucher (optional)">
            <input
              className={styles.input}
              value={campaignDraft.attachVoucherId}
              onChange={(e) => setCampaignDraft((d) => ({ ...d, attachVoucherId: e.target.value }))}
              placeholder="e.g. LVSPRING10"
            />
          </Field>
        </div>

        <div className={styles.drawerActions}>
          <button type="button" className={styles.secondaryBtn} onClick={closeDrawer}>
            Cancel
          </button>
          <button
            type="button"
            className={styles.primaryBtn}
            onClick={() => {
              closeDrawer()
              pushToast(drawer.type === 'editCampaign' ? 'Campaign updated' : 'Campaign draft created', 'success')
              router.push('/seller/marketing/campaign')
            }}
          >
            {drawer.type === 'editCampaign' ? 'Save Changes' : 'Save Draft'}
          </button>
        </div>
      </Drawer>

      <Drawer
        open={drawer.open && (drawer.type === 'createDiscount' || drawer.type === 'editDiscount')}
        title={drawer.type === 'editDiscount' ? 'Edit Discount' : 'Create Discount'}
        onClose={closeDrawer}
      >
        <div className={styles.drawerFormGrid}>
          <Field label="Discount name">
            <input
              className={styles.input}
              value={discountDraft.name}
              onChange={(e) => setDiscountDraft((d) => ({ ...d, name: e.target.value }))}
              placeholder="e.g. New Year Saver"
            />
          </Field>

          <Field label={discountDraft.discountType === 'percentage' ? 'Percentage' : 'Fixed amount'}>
            <input
              className={styles.input}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={discountDraft.value}
              onChange={(e) => {
                const digitsOnly = e.target.value.replace(/\D/g, '')
                const normalized = digitsOnly.replace(/^0+(?=\d)/, '')
                setDiscountDraft((d) => ({ ...d, value: normalized }))
              }}
              placeholder={discountDraft.discountType === 'percentage' ? 'e.g. 10' : 'e.g. 15'}
            />
          </Field>

          <Field label="Status">
            <StatusDropdown
              value={discountDraft.status}
              onChange={(nextStatus) => setDiscountDraft((d) => ({ ...d, status: nextStatus }))}
            />
          </Field>

          <div className={styles.twoCols}>
            <Field label="Valid from">
              <input
                className={styles.input}
                type="date"
                value={discountDraft.start}
                onChange={(e) => setDiscountDraft((d) => ({ ...d, start: e.target.value }))}
              />
            </Field>
            <Field label="Valid to">
              <input
                className={styles.input}
                type="date"
                value={discountDraft.end}
                onChange={(e) => setDiscountDraft((d) => ({ ...d, end: e.target.value }))}
              />
            </Field>
          </div>

          <Field label="Applies to">
            <input
              className={styles.input}
              value={discountDraft.scopeId}
              onChange={(e) => setDiscountDraft((d) => ({ ...d, scopeId: e.target.value }))}
              placeholder="e.g. Service: Standard"
            />
          </Field>
        </div>

        <div className={styles.drawerActions}>
          <button type="button" className={styles.secondaryBtn} onClick={closeDrawer}>
            Cancel
          </button>
          <button
            type="button"
            className={styles.primaryBtn}
            onClick={() => {
              const drawerType = drawer.type
              const nextId = discountDraft.id ?? `disc_new_${Date.now()}`
              closeDrawer()

              if (drawerType === 'editDiscount') {
                setDiscountsData((prev) =>
                  prev.map((d) =>
                    d.id === discountDraft.id
                      ? {
                          ...d,
                          name: discountDraft.name,
                          type: discountDraft.discountType,
                          value: Number(discountDraft.value || 0),
                          start: discountDraft.start,
                          end: discountDraft.end,
                          scopeId: discountDraft.scopeId,
                          status: discountDraft.status,
                        }
                      : d
                  )
                )
                pushToast('Discount updated', 'success')
              } else {
                setDiscountsData((prev) => [
                  {
                    id: nextId,
                    name: discountDraft.name || 'New Discount',
                    type: discountDraft.discountType,
                    status: discountDraft.status,
                    usage: 0,
                    value: Number(discountDraft.value || 0),
                    start: discountDraft.start,
                    end: discountDraft.end,
                    scopeId: discountDraft.scopeId,
                  },
                  ...prev,
                ])
                pushToast('Discount created', 'success')
              }
            }}
          >
            Save Discount
          </button>
        </div>
      </Drawer>

      <Drawer
        open={drawer.open && (drawer.type === 'createVoucher' || drawer.type === 'editVoucher')}
        title={drawer.type === 'editVoucher' ? 'Edit Voucher' : 'Generate Vouchers'}
        onClose={closeDrawer}
      >
        <div className={styles.drawerFormGrid}>
          <Field label="Mode">
            <ModeDropdown
              value={voucherDraft.mode}
              onChange={(nextMode) => setVoucherDraft((d) => ({ ...d, mode: nextMode }))}
            />
          </Field>

          <div className={styles.twoCols}>
            <Field label="Code">
              <input
                className={styles.input}
                value={voucherDraft.code}
                onChange={(e) => setVoucherDraft((d) => ({ ...d, code: e.target.value }))}
                placeholder="e.g. LVSPRING10"
              />
            </Field>
            <Field label="Quantity (bulk)">
              <input
                className={styles.input}
                type="number"
                disabled={voucherDraft.mode !== 'bulk'}
                value={voucherDraft.amount}
                onChange={(e) => setVoucherDraft((d) => ({ ...d, amount: Number(e.target.value || 0) }))}
              />
            </Field>
          </div>

          <div className={styles.twoCols}>
            <Field label="Expiration">
              <input
                className={styles.input}
                type="date"
                value={voucherDraft.expiration}
                onChange={(e) => setVoucherDraft((d) => ({ ...d, expiration: e.target.value }))}
              />
            </Field>
            <Field label="Usage limit">
              <input
                className={styles.input}
                type="number"
                value={voucherDraft.usageLimit}
                onChange={(e) => setVoucherDraft((d) => ({ ...d, usageLimit: Number(e.target.value || 0) }))}
              />
            </Field>
          </div>

          <Field label="Status">
            <StatusDropdown
              value={voucherDraft.status}
              onChange={(nextStatus) => setVoucherDraft((d) => ({ ...d, status: nextStatus }))}
            />
          </Field>

          <Field label="Assign to">
            <input
              className={styles.input}
              value={voucherDraft.scopeId}
              onChange={(e) => setVoucherDraft((d) => ({ ...d, scopeId: e.target.value }))}
              placeholder="e.g. Service: Standard"
            />
          </Field>
        </div>

        <div className={styles.drawerActions}>
          <button type="button" className={styles.secondaryBtn} onClick={closeDrawer}>
            Cancel
          </button>
          <button
            type="button"
            className={styles.primaryBtn}
            onClick={() => {
              const drawerType = drawer.type
              closeDrawer()

              if (drawerType === 'editVoucher') {
                setVouchersData((prev) =>
                  prev.map((v) =>
                    v.id === voucherDraft.id
                      ? {
                          ...v,
                          code: voucherDraft.code.trim() || v.code,
                          status: voucherDraft.status,
                          expiration: voucherDraft.expiration,
                          usageLimit: voucherDraft.usageLimit,
                          scopeId: voucherDraft.scopeId,
                        }
                      : v
                  )
                )
                pushToast('Voucher updated', 'success')
                return
              }

              const qty = voucherDraft.mode === 'bulk' ? Math.max(1, Number(voucherDraft.amount || 1)) : 1
              const baseSuffix = Math.floor(Math.random() * 9000) + 1000

              const typedCode = voucherDraft.code.trim()
              const basePrefix = typedCode || voucherDraft.prefix || 'LV'
              const codes =
                voucherDraft.mode === 'single'
                  ? [typedCode || `${basePrefix}${baseSuffix}`]
                  : Array.from({ length: qty }, (_, i) => `${basePrefix}${baseSuffix + i}`)

              setVouchersData((prev) => [
                ...codes.map((code, i) => ({
                  id: `vch_new_${Date.now()}_${i}`,
                  code,
                  status: voucherDraft.status,
                  redemptions: 0,
                  expiration: voucherDraft.expiration,
                  usageLimit: voucherDraft.usageLimit,
                  scopeId: voucherDraft.scopeId,
                })),
                ...prev,
              ])

              pushToast('Voucher codes generated', 'success')
            }}
          >
            {drawer.type === 'editVoucher' ? 'Save Changes' : 'Generate'}
          </button>
        </div>
      </Drawer>

      {toast && (
        <Toast
          message={toast.message}
          variant={toast.variant}
          onClose={() => setToast(null)}
          duration={3200}
        />
      )}
    </div>
  )
}
