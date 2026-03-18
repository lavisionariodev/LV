'use client'

import { useMemo, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import styles from './marketing.module.css'
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

function TrendChart() {
  // Minimal inline sparkline (no chart libs).
  const points = useMemo(() => [10, 14, 12, 18, 16, 22, 20, 26], [])
  const w = 260
  const h = 70
  const pad = 6
  const min = Math.min(...points)
  const max = Math.max(...points)

  const mapX = (i) => pad + (i * (w - pad * 2)) / (points.length - 1)
  const mapY = (v) => {
    const t = max === min ? 0 : (v - min) / (max - min)
    return h - pad - t * (h - pad * 2)
  }

  const d = points
    .map((v, i) => {
      const x = mapX(i)
      const y = mapY(v)
      return `${i === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`
    })
    .join(' ')

  const fillD = `${d} L ${mapX(points.length - 1).toFixed(2)} ${(h - pad).toFixed(2)} L ${mapX(0).toFixed(
    2,
  )} ${(h - pad).toFixed(2)} Z`

  return (
    <div className={styles.trendChart}>
      <svg width="100%" viewBox={`0 0 ${w} ${h}`} aria-hidden>
        <defs>
          <linearGradient id="marketingTrendFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(45, 74, 56, 0.22)" />
            <stop offset="100%" stopColor="rgba(45, 74, 56, 0.02)" />
          </linearGradient>
        </defs>
        <path d={fillD} fill="url(#marketingTrendFill)" />
        <path d={d} fill="none" stroke="var(--color-green-700)" strokeWidth="2.2" strokeLinecap="round" />
      </svg>
    </div>
  )
}

function Drawer({ open, title, onClose, children }) {
  if (!open) return null

  return (
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
    </div>
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

export default function MarketingHub({ initialTab = 'centre' }) {
  const router = useRouter()
  const pathname = usePathname()

  const [toast, setToast] = useState(null)

  const [drawer, setDrawer] = useState({
    open: false,
    type: null,
  })

  const [discountDraft, setDiscountDraft] = useState({
    name: '',
    discountType: 'percentage',
    value: 10,
    start: '',
    end: '',
    scopeType: 'service',
    scopeId: 'srv_1',
  })

  const [campaignDraft, setCampaignDraft] = useState({
    name: '',
    startDate: '',
    durationDays: 14,
    scopeType: 'service',
    scopeId: 'srv_1',
    attachDiscountId: 'disc_1',
    attachVoucherId: 'vch_1',
  })

  const [voucherDraft, setVoucherDraft] = useState({
    mode: 'single',
    prefix: 'LV',
    amount: 25,
    expiration: '',
    usageLimit: 1,
    scopeType: 'service',
    scopeId: 'srv_1',
  })

  const tabs = useMemo(
    () => [
      { key: 'centre', label: 'Marketing Centre' },
      { key: 'discounts', label: 'Discounts' },
      { key: 'vouchers', label: 'Vouchers' },
      { key: 'campaigns', label: 'Campaigns' },
    ],
    [],
  )

  const activeTabKey = useMemo(() => {
    if (!pathname) return initialTab
    if (pathname === '/seller/marketing' || pathname.startsWith('/seller/marketing/centre')) return 'centre'
    if (pathname.startsWith('/seller/marketing/discount')) return 'discounts'
    if (pathname.startsWith('/seller/marketing/vouchers')) return 'vouchers'
    if (pathname.startsWith('/seller/marketing/campaign')) return 'campaigns'
    return initialTab
  }, [pathname, initialTab])

  const tabToRoute = (key) => {
    switch (key) {
      case 'centre':
        return '/seller/marketing/centre'
      case 'discounts':
        return '/seller/marketing/discount'
      case 'vouchers':
        return '/seller/marketing/vouchers'
      case 'campaigns':
        return '/seller/marketing/campaign'
      default:
        return '/seller/marketing/centre'
    }
  }

  // Placeholder data for the minimal UI.
  const centreData = useMemo(
    () => ({
      metrics: [
        { value: '$3.8k', label: 'Campaign revenue' },
        { value: '1.2k', label: 'Clicks' },
        { value: '4.3%', label: 'Conversions' },
      ],
      promotions: [
        { name: 'Spring Promo', status: 'Active' },
        { name: 'Weekend Discount', status: 'Paused' },
        { name: 'Early Bird', status: 'Active' },
      ],
    }),
    [],
  )

  const discountsData = useMemo(
    () => [
      { id: 'disc_1', name: '10% Summer Boost', type: 'percentage', status: 'Active', usage: 42 },
      { id: 'disc_2', name: '$15 Off Premium', type: 'fixed', status: 'Scheduled', usage: 7 },
      { id: 'disc_3', name: 'VIP Flat $25', type: 'fixed', status: 'Active', usage: 19 },
    ],
    [],
  )

  const vouchersData = useMemo(
    () => [
      { id: 'vch_1', code: 'LVSPRING10', status: 'Active', redemptions: 12 },
      { id: 'vch_2', code: 'LVVIP25', status: 'Active', redemptions: 5 },
      { id: 'vch_3', code: 'LVWEEKEND', status: 'Expired', redemptions: 0 },
    ],
    [],
  )

  const campaignsData = useMemo(
    () => [
      { id: 'cmp_1', name: 'Summer Launch', status: 'Active', clicks: 980, conversions: '4.1%' },
      { id: 'cmp_2', name: 'VIP Push', status: 'Draft', clicks: 0, conversions: '—' },
      { id: 'cmp_3', name: 'Spring Retarget', status: 'Completed', clicks: 740, conversions: '3.6%' },
    ],
    [],
  )

  const openDrawer = (type) => setDrawer({ open: true, type })
  const closeDrawer = () => setDrawer({ open: false, type: null })

  const pushToast = (message, variant = 'info') => {
    setToast({ message, variant })
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
      // fall back to copy
    }
    await onCopy(text)
  }

  return (
    <div className={styles.marketingPage}>
      <div className={styles.marketingHeader}>
        <div>
          <h1 className={styles.marketingTitle}>Marketing</h1>
          <p className={styles.marketingSubtitle}>Create, schedule, and measure promotions across your services.</p>
        </div>
      </div>

      <div className={styles.marketingLayout}>
        <aside className={styles.tabSidebar} aria-label="Marketing sections">
          <div className={styles.tabSidebarInner}>
            {tabs.map((t) => {
              const isActive = t.key === activeTabKey
              return (
                <button
                  key={t.key}
                  type="button"
                  className={`${styles.tabBtn} ${isActive ? styles.tabBtnActive : ''}`}
                  onClick={() => router.push(tabToRoute(t.key))}
                >
                  <span className={styles.tabDot} aria-hidden />
                  <span className={styles.tabLabel}>{t.label}</span>
                </button>
              )
            })}
          </div>
        </aside>

        <section className={styles.tabContent} aria-live="polite">
          {activeTabKey === 'centre' && (
            <>
              <div className={styles.grid3}>
                {centreData.metrics.map((m) => (
                  <div key={m.label} className={styles.metricCard}>
                    <div className={styles.metricValue}>{m.value}</div>
                    <div className={styles.metricLabel}>{m.label}</div>
                  </div>
                ))}
              </div>

              <div className={styles.rowGap}>
                <div className={styles.card}>
                  <div className={styles.cardHeaderRow}>
                    <div className={styles.cardTitle}>Active promotions</div>
                    <div className={styles.cardMuted}>Status snapshot</div>
                  </div>
                  <div className={styles.dividerThin} />
                  <div className={styles.list}>
                    {centreData.promotions.map((p) => (
                      <div key={p.name} className={styles.listItem}>
                        <div className={styles.listItemName}>{p.name}</div>
                        <StatusPill status={p.status} />
                      </div>
                    ))}
                  </div>
                </div>

                <div className={styles.card}>
                  <div className={styles.cardHeaderRow}>
                    <div className={styles.cardTitle}>Trend</div>
                    <div className={styles.cardMuted}>Clicks & conversions</div>
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
              </div>

              <div className={styles.actionsRow}>
                <button
                  type="button"
                  className={`${styles.primaryBtn}`}
                  onClick={() => openDrawer('createCampaign')}
                >
                  Create Campaign
                </button>
                <button
                  type="button"
                  className={`${styles.secondaryBtn}`}
                  onClick={() => openDrawer('createDiscount')}
                >
                  Create Discount
                </button>
              </div>
            </>
          )}

          {activeTabKey === 'discounts' && (
            <>
              <div className={styles.card}>
                <div className={styles.cardHeaderRow}>
                  <div className={styles.cardTitle}>Discounts</div>
                  <div className={styles.cardMuted}>Create and manage price reductions</div>
                </div>
                <div className={styles.dividerThin} />
                <div className={styles.actionsRowTight}>
                  <button
                    type="button"
                    className={styles.primaryBtn}
                    onClick={() => openDrawer('createDiscount')}
                  >
                    New Discount
                  </button>
                </div>
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
                      {discountsData.map((d) => (
                        <tr key={d.id}>
                          <td className={styles.tdMain}>{d.name}</td>
                          <td>{d.type === 'percentage' ? 'Percentage' : 'Fixed'}</td>
                          <td>
                            <StatusPill status={d.status === 'Scheduled' ? 'Draft' : d.status} />
                          </td>
                          <td>{d.usage}</td>
                          <td className={styles.tdRight}>
                            <button
                              type="button"
                              className={styles.rowActionBtn}
                              onClick={() => {
                                setDiscountDraft((prev) => ({
                                  ...prev,
                                  name: d.name,
                                  discountType: d.type,
                                }))
                                openDrawer('editDiscount')
                              }}
                            >
                              Edit
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {activeTabKey === 'vouchers' && (
            <>
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
                      {vouchersData.map((v) => (
                        <tr key={v.id}>
                          <td className={styles.tdMain}>
                            <code className={styles.code}>{v.code}</code>
                          </td>
                          <td>
                            <StatusPill status={v.status === 'Expired' ? 'Completed' : v.status} />
                          </td>
                          <td>{v.redemptions}</td>
                          <td className={styles.tdRight}>
                            <button
                              type="button"
                              className={styles.rowActionBtn}
                              onClick={() => onCopyOrShare(v.code)}
                            >
                              Copy/Share
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className={styles.footerHint}>
                  Tip: Use copy to share a single voucher code quickly.
                </div>
              </div>
            </>
          )}

          {activeTabKey === 'campaigns' && (
            <>
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
                      {campaignsData.map((c) => (
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
                </div>
              </div>
            </>
          )}
        </section>
      </div>

      <Drawer
        open={drawer.open && drawer.type === 'createCampaign'}
        title="Create Campaign"
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
            <select
              className={styles.select}
              value={campaignDraft.scopeId}
              onChange={(e) => setCampaignDraft((d) => ({ ...d, scopeId: e.target.value }))}
            >
              <option value="srv_1">Service: Standard</option>
              <option value="srv_2">Package: Starter</option>
              <option value="srv_3">Package: Pro</option>
            </select>
          </Field>
          <Field label="Attach discount (optional)">
            <select
              className={styles.select}
              value={campaignDraft.attachDiscountId}
              onChange={(e) => setCampaignDraft((d) => ({ ...d, attachDiscountId: e.target.value }))}
            >
              <option value="disc_1">10% Summer Boost</option>
              <option value="disc_2">$15 Off Premium</option>
              <option value="disc_3">VIP Flat $25</option>
            </select>
          </Field>
          <Field label="Attach voucher (optional)">
            <select
              className={styles.select}
              value={campaignDraft.attachVoucherId}
              onChange={(e) => setCampaignDraft((d) => ({ ...d, attachVoucherId: e.target.value }))}
            >
              <option value="vch_1">LVSPRING10</option>
              <option value="vch_2">LVVIP25</option>
            </select>
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
              pushToast('Campaign draft created', 'success')
              router.push('/seller/marketing/campaign')
            }}
          >
            Save Draft
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

          <Field label="Discount type">
            <select
              className={styles.select}
              value={discountDraft.discountType}
              onChange={(e) => setDiscountDraft((d) => ({ ...d, discountType: e.target.value }))}
            >
              <option value="percentage">Percentage</option>
              <option value="fixed">Fixed amount</option>
            </select>
          </Field>

          <Field label="Value">
            <input
              className={styles.input}
              type="number"
              value={discountDraft.value}
              onChange={(e) => setDiscountDraft((d) => ({ ...d, value: Number(e.target.value || 0) }))}
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
            <select
              className={styles.select}
              value={discountDraft.scopeId}
              onChange={(e) => setDiscountDraft((d) => ({ ...d, scopeId: e.target.value }))}
            >
              <option value="srv_1">Service: Standard</option>
              <option value="srv_2">Package: Starter</option>
              <option value="srv_3">Package: Pro</option>
            </select>
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
              pushToast('Discount saved', 'success')
              router.push('/seller/marketing/discount')
            }}
          >
            Save Discount
          </button>
        </div>
      </Drawer>

      <Drawer open={drawer.open && drawer.type === 'createVoucher'} title="Generate Vouchers" onClose={closeDrawer}>
        <div className={styles.drawerFormGrid}>
          <Field label="Mode">
            <select
              className={styles.select}
              value={voucherDraft.mode}
              onChange={(e) => setVoucherDraft((d) => ({ ...d, mode: e.target.value }))}
            >
              <option value="single">Single code</option>
              <option value="bulk">Bulk codes</option>
            </select>
          </Field>

          <div className={styles.twoCols}>
            <Field label="Prefix">
              <input
                className={styles.input}
                value={voucherDraft.prefix}
                onChange={(e) => setVoucherDraft((d) => ({ ...d, prefix: e.target.value }))}
                placeholder="LV"
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

          <Field label="Assign to">
            <select
              className={styles.select}
              value={voucherDraft.scopeId}
              onChange={(e) => setVoucherDraft((d) => ({ ...d, scopeId: e.target.value }))}
            >
              <option value="srv_1">Service: Standard</option>
              <option value="srv_2">Package: Starter</option>
              <option value="srv_3">Package: Pro</option>
            </select>
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
              pushToast('Voucher codes generated', 'success')
              router.push('/seller/marketing/vouchers')
            }}
          >
            Generate
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

