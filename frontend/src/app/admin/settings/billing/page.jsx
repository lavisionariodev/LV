'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useMediaQuery } from '@/shared/hooks'
import styles from '../settings.module.css'

function formatRuleDate(isoDate) {
  if (!isoDate) return '—'
  try {
    return new Date(isoDate + (isoDate.length === 10 ? 'T12:00:00' : '')).toLocaleDateString(
      undefined,
      { year: 'numeric', month: 'short', day: 'numeric' },
    )
  } catch {
    return isoDate
  }
}

export default function Page() {
  const isProfileDetail = useMediaQuery('(max-width: 640px)')
  const isSheet = false
  const [billingLoading, setBillingLoading] = useState(true)
  const [defaultCommissionPercent, setDefaultCommissionPercent] = useState(10)
  const [billingUpdatedAt, setBillingUpdatedAt] = useState(null)
  const [row, setRow] = useState(null)

  const [editingRate, setEditingRate] = useState(false)
  const [rateInput, setRateInput] = useState('10')
  const [rateBusy, setRateBusy] = useState(false)
  const [rateError, setRateError] = useState('')

  const [editingLegal, setEditingLegal] = useState(false)
  const [legalDraft, setLegalDraft] = useState({
    legalName: '',
    address: '',
    taxId: '',
    billingEmail: '',
  })
  const [editingSettlement, setEditingSettlement] = useState(false)
  const [settlementDraft, setSettlementDraft] = useState('')
  const [panelBusy, setPanelBusy] = useState(false)
  const [panelError, setPanelError] = useState('')

  const applyResponse = (body) => {
    if (!body || typeof body !== 'object') return
    setDefaultCommissionPercent(
      Number.isFinite(Number(body?.defaultCommissionPercent))
        ? Number(body.defaultCommissionPercent)
        : 10,
    )
    setBillingUpdatedAt(body?.row?.updated_at ? String(body.row.updated_at) : null)
    setRow(body?.row ?? null)
  }

  useEffect(() => {
    let cancelled = false
    queueMicrotask(() => {
      ;(async () => {
        setBillingLoading(true)
        try {
          const res = await fetch('/api/admin/platform-billing', { credentials: 'include' })
          const body = await res.json().catch(() => null)
          if (cancelled || !res.ok) return
          applyResponse(body)
        } finally {
          if (!cancelled) setBillingLoading(false)
        }
      })()
    })
    return () => {
      cancelled = true
    }
  }, [])

  const startEditRate = () => {
    setRateInput(String(defaultCommissionPercent))
    setRateError('')
    setEditingRate(true)
  }

  const saveRate = async () => {
    setRateError('')
    const v = parseFloat(rateInput)
    if (!Number.isFinite(v) || v < 0 || v > 100) {
      setRateError('Enter a rate from 0 through 100.')
      return
    }
    setRateBusy(true)
    try {
      const res = await fetch('/api/admin/platform-billing', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ defaultCommissionPercent: v }),
      })
      const body = await res.json().catch(() => null)
      if (!res.ok) {
        setRateError(body?.error || 'Failed to save commission rate.')
        return
      }
      applyResponse(body)
      setEditingRate(false)
    } finally {
      setRateBusy(false)
    }
  }

  const startEditLegal = () => {
    setLegalDraft({
      legalName: row?.legal_name || '',
      address: row?.address || '',
      taxId: row?.tax_id || '',
      billingEmail: row?.billing_email || '',
    })
    setPanelError('')
    setEditingLegal(true)
  }

  const saveLegal = async () => {
    setPanelError('')
    setPanelBusy(true)
    try {
      const res = await fetch('/api/admin/platform-billing', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          legalName: legalDraft.legalName,
          address: legalDraft.address,
          taxId: legalDraft.taxId,
          billingEmail: legalDraft.billingEmail,
        }),
      })
      const body = await res.json().catch(() => null)
      if (!res.ok) {
        setPanelError(body?.error || 'Failed to save legal details.')
        return
      }
      applyResponse(body)
      setEditingLegal(false)
    } finally {
      setPanelBusy(false)
    }
  }

  const startEditSettlement = () => {
    setSettlementDraft(row?.settlement_notes || '')
    setPanelError('')
    setEditingSettlement(true)
  }

  const saveSettlement = async () => {
    setPanelError('')
    setPanelBusy(true)
    try {
      const res = await fetch('/api/admin/platform-billing', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ settlementNotes: settlementDraft }),
      })
      const body = await res.json().catch(() => null)
      if (!res.ok) {
        setPanelError(body?.error || 'Failed to save settlement notes.')
        return
      }
      applyResponse(body)
      setEditingSettlement(false)
    } finally {
      setPanelBusy(false)
    }
  }

  const wrapClass = isSheet
    ? styles.settingsSheetEmbed
    : `${styles.card} ${styles.full} ${isProfileDetail ? styles.cardBorderless : ''}`

  const hasLegal =
    Boolean(row?.legal_name) ||
    Boolean(row?.address) ||
    Boolean(row?.tax_id) ||
    Boolean(row?.billing_email)
  const hasSettlement = Boolean(row?.settlement_notes)

  return (
    <section className={wrapClass}>
      {!isSheet && !isProfileDetail && (
        <div className={styles.tabDetailHead}>
          <div className={styles.tabDetailHeadRow}>
            <div className={styles.tabDetailHeadText}>
              <h2 className={styles.tabDetailTitle}>Platform billing</h2>
              <p className={styles.tabDetailSubtitle}>
                Commission and settlement for the marketplace. Day-to-day payouts and orders are
                managed under Payouts.
              </p>
            </div>
          </div>
        </div>
      )}
      {isSheet && (
        <p className={styles.settingsSheetLead}>
          Commission and settlement for the marketplace. Day-to-day payouts and orders are managed
          under Payouts.
        </p>
      )}

      {panelError ? (
        <p className={styles.tabDetailSubtitle} style={{ color: '#b91c1c' }}>
          {panelError}
        </p>
      ) : null}

      <div className={styles.billingStack}>
        <div className={styles.billingSection}>
          <h3 className={styles.billingSectionTitle}>Platform commission</h3>
          <p className={styles.billingSectionLead}>
            Default share of each successful order between buyers and sellers, applied at order
            capture. Per-seller overrides are stored on the seller record.
          </p>
          <dl className={styles.billingDl} aria-busy={billingLoading}>
            <div className={styles.billingDlRow}>
              <dt>Default rate</dt>
              <dd>
                {billingLoading ? (
                  <span
                    className={styles.settingsSkBar}
                    style={{
                      display: 'inline-block',
                      width: 44,
                      height: 15,
                      verticalAlign: 'middle',
                    }}
                    aria-hidden
                  />
                ) : editingRate ? (
                  <span className={styles.billingInlineActions}>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.5"
                      value={rateInput}
                      onChange={(e) => setRateInput(e.target.value)}
                      className={styles.billingInlineInput}
                    />
                    <span>%</span>
                    <span className={styles.billingInlineActionBtns}>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingRate(false)
                          setRateError('')
                        }}
                        disabled={rateBusy}
                        className={styles.secondaryBtn}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={saveRate}
                        disabled={rateBusy}
                        className={styles.primaryBtn}
                      >
                        {rateBusy ? 'Saving…' : 'Save'}
                      </button>
                    </span>
                    {rateError ? (
                      <span className={styles.billingInlineError}>{rateError}</span>
                    ) : null}
                  </span>
                ) : (
                  <span className={styles.billingInlineActions}>
                    {`${defaultCommissionPercent}%`}
                    <button
                      type="button"
                      onClick={startEditRate}
                      className={styles.secondaryBtn}
                    >
                      Edit
                    </button>
                  </span>
                )}
              </dd>
            </div>
            <div className={styles.billingDlRow}>
              <dt>Rule</dt>
              <dd>Platform default (applied at order capture)</dd>
            </div>
            <div className={styles.billingDlRow}>
              <dt>Last updated</dt>
              <dd>
                {billingLoading ? (
                  <span
                    className={styles.settingsSkBar}
                    style={{
                      display: 'inline-block',
                      width: 128,
                      height: 14,
                      verticalAlign: 'middle',
                    }}
                    aria-hidden
                  />
                ) : billingUpdatedAt ? (
                  formatRuleDate(billingUpdatedAt.slice(0, 10))
                ) : (
                  '—'
                )}
              </dd>
            </div>
            <div className={styles.billingDlRow}>
              <dt>Per-seller overrides</dt>
              <dd>Stored on the seller record (Payouts → Commission settings).</dd>
            </div>
          </dl>
          <Link href="/admin/payouts" className={styles.billingCta}>
            Review escrows &amp; payout rates →
          </Link>
        </div>

        <div className={styles.billingSection}>
          <h3 className={styles.billingSectionTitle}>Settlement</h3>
          <p className={styles.billingSectionLead}>
            Notes about where the platform commission settles (treasury account, bank, e-wallet,
            etc.).
          </p>
          {editingSettlement ? (
            <div className={styles.billingEditBlock}>
              <textarea
                value={settlementDraft}
                onChange={(e) => setSettlementDraft(e.target.value)}
                rows={4}
                className={styles.settingsFieldTextarea}
              />
              <div className={styles.billingActions}>
                <button
                  type="button"
                  onClick={saveSettlement}
                  disabled={panelBusy}
                  className={styles.primaryBtn}
                >
                  {panelBusy ? 'Saving…' : 'Save'}
                </button>
                <button
                  type="button"
                  onClick={() => setEditingSettlement(false)}
                  disabled={panelBusy}
                  className={styles.secondaryBtn}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : hasSettlement ? (
            <>
              <p className={styles.billingNotes}>{row.settlement_notes}</p>
              <div className={styles.billingActions}>
                <button
                  type="button"
                  onClick={startEditSettlement}
                  className={styles.secondaryBtn}
                >
                  Edit settlement notes
                </button>
              </div>
            </>
          ) : (
            <>
              <div className={styles.billingPlaceholder} role="status">
                Not configured yet
              </div>
              <div className={styles.billingActions}>
                <button
                  type="button"
                  onClick={startEditSettlement}
                  className={styles.primaryBtn}
                >
                  Add settlement notes
                </button>
              </div>
            </>
          )}
          <Link href="/admin/payouts" className={styles.billingCta}>
            View payout activity →
          </Link>
        </div>

        <div className={styles.billingSection}>
          <h3 className={styles.billingSectionTitle}>Legal and invoicing</h3>
          <p className={styles.billingSectionLead}>
            Registered business name, address, tax ID, and billing contact for official documents.
          </p>
          {editingLegal ? (
            <div className={styles.billingEditBlock}>
              <label className={styles.billingField}>
                <span className={styles.billingFieldLabel}>Legal name</span>
                <input
                  value={legalDraft.legalName}
                  onChange={(e) =>
                    setLegalDraft((p) => ({ ...p, legalName: e.target.value }))
                  }
                  className={styles.settingsFieldInput}
                />
              </label>
              <label className={styles.billingField}>
                <span className={styles.billingFieldLabel}>Address</span>
                <textarea
                  value={legalDraft.address}
                  onChange={(e) =>
                    setLegalDraft((p) => ({ ...p, address: e.target.value }))
                  }
                  rows={2}
                  className={styles.settingsFieldTextarea}
                />
              </label>
              <label className={styles.billingField}>
                <span className={styles.billingFieldLabel}>Tax ID</span>
                <input
                  value={legalDraft.taxId}
                  onChange={(e) =>
                    setLegalDraft((p) => ({ ...p, taxId: e.target.value }))
                  }
                  className={styles.settingsFieldInput}
                />
              </label>
              <label className={styles.billingField}>
                <span className={styles.billingFieldLabel}>Billing email</span>
                <input
                  type="email"
                  value={legalDraft.billingEmail}
                  onChange={(e) =>
                    setLegalDraft((p) => ({ ...p, billingEmail: e.target.value }))
                  }
                  className={styles.settingsFieldInput}
                />
              </label>
              <div className={styles.billingActions}>
                <button
                  type="button"
                  onClick={saveLegal}
                  disabled={panelBusy}
                  className={styles.primaryBtn}
                >
                  {panelBusy ? 'Saving…' : 'Save'}
                </button>
                <button
                  type="button"
                  onClick={() => setEditingLegal(false)}
                  disabled={panelBusy}
                  className={styles.secondaryBtn}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : hasLegal ? (
            <>
              <dl className={styles.billingDl}>
                <div className={styles.billingDlRow}>
                  <dt>Legal name</dt>
                  <dd>{row.legal_name || '—'}</dd>
                </div>
                <div className={styles.billingDlRow}>
                  <dt>Address</dt>
                  <dd className={styles.billingNotes}>{row.address || '—'}</dd>
                </div>
                <div className={styles.billingDlRow}>
                  <dt>Tax ID</dt>
                  <dd>{row.tax_id || '—'}</dd>
                </div>
                <div className={styles.billingDlRow}>
                  <dt>Billing email</dt>
                  <dd>{row.billing_email || '—'}</dd>
                </div>
              </dl>
              <div className={styles.billingActions}>
                <button
                  type="button"
                  onClick={startEditLegal}
                  className={styles.secondaryBtn}
                >
                  Edit legal details
                </button>
              </div>
            </>
          ) : (
            <>
              <div className={styles.billingPlaceholder} role="status">
                Not configured yet — stored data will appear here after setup.
              </div>
              <div className={styles.billingActions}>
                <button
                  type="button"
                  onClick={startEditLegal}
                  className={styles.primaryBtn}
                >
                  Configure legal details
                </button>
              </div>
            </>
          )}
        </div>

        <div className={styles.billingQuickLinks} aria-label="Related admin pages">
          <span className={styles.billingQuickLinksLabel}>Quick links</span>
          <div className={styles.billingQuickLinksRow}>
            <Link href="/admin/analytics" className={styles.billingQuickLink}>
              Analytics
            </Link>
            <span className={styles.billingQuickLinksSep} aria-hidden />
            <Link href="/admin/payouts" className={styles.billingQuickLink}>
              Payouts
            </Link>
            <span className={styles.billingQuickLinksSep} aria-hidden />
            <Link href="/admin/sellers" className={styles.billingQuickLink}>
              Sellers
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
