'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import layoutStyles from '../../admin.module.css'
import styles from './detail.module.css'

const STATUS_FLOW = ['open', 'under_review', 'resolved', 'closed']

const STATUS_LABELS = {
  open: 'Open',
  under_review: 'Under review',
  resolved: 'Resolved',
  closed: 'Closed',
}

function getInitials(name = '') {
  const parts = String(name).trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  const first = parts[0]?.[0] || ''
  const last = (parts.length > 1 ? parts[parts.length - 1]?.[0] : parts[0]?.[1]) || ''
  return `${first}${last}`.toUpperCase() || '?'
}

function StatusBanner({ status, openedAt }) {
  return (
    <div className={`${styles.statusBanner} ${styles[`banner_${status}`] || ''}`}>
      <div className={styles.bannerLeft}>
        <span className={styles.bannerLabel}>Status</span>
        <span className={`${styles.statusPill} ${styles[`status_${status}`] || ''}`}>
          <span className={styles.statusDot} />
          {STATUS_LABELS[status] ?? status}
        </span>
      </div>
      {openedAt && <span className={styles.bannerDate}>Filed {openedAt}</span>}
    </div>
  )
}

function StepTracker({ currentStatus }) {
  const currentIndex = STATUS_FLOW.indexOf(currentStatus)
  return (
    <div className={styles.stepTrack}>
      {STATUS_FLOW.map((s, i) => {
        const done = i < currentIndex
        const active = i === currentIndex
        return (
          <div
            key={s}
            className={`${styles.stepItem}${done ? ` ${styles.stepDone}` : ''}${active ? ` ${styles.stepActive}` : ''}`}
          >
            <div className={`${styles.stepDot}${done ? ` ${styles.stepDotDone}` : ''}${active ? ` ${styles.stepDotActive}` : ''}`}>
              {done ? (
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden>
                  <path d="M1.5 5l2.5 2.5 4.5-4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              ) : (
                i + 1
              )}
            </div>
            <span className={styles.stepLabel}>{STATUS_LABELS[s]}</span>
          </div>
        )
      })}
    </div>
  )
}

export default function AdminDisputeDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = Array.isArray(params?.id) ? params.id[0] : params?.id

  const [dispute, setDispute] = useState(null)
  const [loading, setLoading] = useState(true)
  const [fetchErr, setFetchErr] = useState('')
  const [resolutionNotes, setResolutionNotes] = useState('')
  const [saving, setSaving] = useState(false)

  const reload = useCallback(async () => {
    if (!id) return
    setLoading(true)
    setFetchErr('')
    const res = await fetch(`/api/admin/disputes/${encodeURIComponent(id)}`, { cache: 'no-store' })
    const body = await res.json().catch(() => null)
    if (!res.ok) {
      setDispute(null)
      setFetchErr(typeof body?.error === 'string' ? body.error : 'Failed to load dispute.')
      setLoading(false)
      return
    }
    const d = body?.dispute
    setDispute(d || null)
    setResolutionNotes(d?.resolutionNotes ? String(d.resolutionNotes) : '')
    setLoading(false)
  }, [id])

  useEffect(() => {
    queueMicrotask(() => {
      reload();
    });
  }, [reload]);

  async function savePatch(nextStatus) {
    if (!id) return
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/disputes/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: nextStatus,
          resolutionNotes: resolutionNotes.trim() || null,
        }),
      })
      const body = await res.json().catch(() => null)
      if (!res.ok) {
        window.alert(typeof body?.error === 'string' ? body.error : 'Save failed.')
        return
      }
      await reload()
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className={layoutStyles.dashWrap}>
        <section className={layoutStyles.panel}>
          <p className={layoutStyles.panelTitle}>Loading…</p>
        </section>
      </div>
    )
  }

  if (fetchErr || !dispute) {
    return (
      <div className={layoutStyles.dashWrap}>
        <section className={layoutStyles.panel}>
          <p className={layoutStyles.panelTitle}>Dispute not found</p>
          <p className={styles.notFoundHint}>
            {fetchErr || (
              <>
                We could not find dispute <code>{id}</code>.
              </>
            )}
          </p>
          <div className={styles.backBtnWrap}>
            <button
              type="button"
              className={layoutStyles.smallBtn}
              onClick={() => router.push('/admin/disputes')}
            >
              Back to disputes
            </button>
          </div>
        </section>
      </div>
    )
  }

  const status = dispute.status
  const currentIndex = STATUS_FLOW.indexOf(status)

  const goToNextStatus = () => {
    if (currentIndex === -1 || currentIndex === STATUS_FLOW.length - 1) return
    savePatch(STATUS_FLOW[currentIndex + 1])
  }

  return (
    <div className={layoutStyles.dashWrap}>
      <section className={layoutStyles.panel}>

        {/* ── Page header ── */}
        <div className={layoutStyles.panelHead}>
          <div className={styles.headLeft}>
            <p className={layoutStyles.panelTitle}>Dispute</p>
            <p className={styles.headRef}>{dispute.id}</p>
          </div>
          <button
            type="button"
            className={styles.backBtn}
            onClick={() => router.push('/admin/disputes')}
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
              <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Back to list
          </button>
        </div>

        {/* ── Status banner ── */}
        <StatusBanner status={status} openedAt={dispute.openedAt} />

        <div className={styles.form}>

          {/* ── Case summary ── */}
          <div className={styles.section}>
            <p className={styles.sectionTitle}>Case summary</p>
            <div className={styles.fieldGrid}>
              <div className={styles.field}>
                <span className={styles.label}>Order reference</span>
                <span className={styles.value}>{dispute.orderRef}</span>
              </div>
              <div className={styles.field}>
                <span className={styles.label}>Dispute ID</span>
                <span className={styles.value}>{dispute.id}</span>
              </div>
              <div className={styles.field}>
                <span className={styles.label}>Reason</span>
                <span className={styles.value}>{dispute.reason}</span>
              </div>
              <div className={styles.field}>
                <span className={styles.label}>Opened on</span>
                <span className={styles.value}>{dispute.openedAt}</span>
              </div>
              <div className={styles.field}>
                <span className={styles.label}>Order payment</span>
                <span className={styles.value}>
                  {dispute.orderPaymentStatus || '—'} · fulfillment {dispute.orderFulfillment || '—'}
                </span>
              </div>
              <div className={styles.field}>
                <span className={styles.label}>Payouts</span>
                <span className={styles.value}>
                  <Link
                    href={`/admin/payouts?q=${encodeURIComponent(dispute.orderRef || '')}`}
                    className={styles.link}
                  >
                    Search this order in payouts
                  </Link>
                </span>
              </div>
            </div>
          </div>

          {/* ── Parties ── */}
          <div className={styles.section}>
            <p className={styles.sectionTitle}>Parties</p>
            <div className={styles.partyGrid}>
              <div className={styles.partyCard} data-role="complainant">
                <span className={styles.partyKicker}>Complainant</span>
                <div className={styles.partyAvatar} data-role="complainant" aria-hidden>
                  {getInitials(dispute.complainantName)}
                </div>
                <span className={styles.partyName}>{dispute.complainantName}</span>
                <span className={styles.partyMeta}>
                  Buyer{dispute.complainantEmail ? ` · ${dispute.complainantEmail}` : ''}
                </span>
              </div>
              <div className={styles.partyCard} data-role="respondent">
                <span className={styles.partyKicker}>Respondent</span>
                <div className={styles.partyAvatar} data-role="respondent" aria-hidden>
                  {getInitials(dispute.respondentName)}
                </div>
                <span className={styles.partyName}>{dispute.respondentName}</span>
                <span className={styles.partyMeta}>
                  Seller{dispute.respondentEmail ? ` · ${dispute.respondentEmail}` : ''}
                </span>
              </div>
            </div>
          </div>

          {/* ── Description ── */}
          <div className={styles.section}>
            <p className={styles.sectionTitle}>Description</p>
            <div className={styles.textAreaLike}>{dispute.description || '—'}</div>
          </div>

        </div>

        {/* ── Status management ── */}
        <div className={styles.statusSection}>
          <p className={styles.sectionTitle}>Status workflow</p>
          <StepTracker currentStatus={status} />
          <label className={styles.sectionTitle} htmlFor="resolution-notes" style={{ display: 'block', marginTop: 12 }}>
            Resolution notes (optional)
          </label>
          <textarea
            id="resolution-notes"
            className={styles.textAreaLike}
            rows={4}
            value={resolutionNotes}
            onChange={(e) => setResolutionNotes(e.target.value)}
            disabled={saving}
            style={{ width: '100%', resize: 'vertical', marginBottom: 12 }}
          />
          <div className={styles.statusActions}>
            {STATUS_FLOW.map((s) => {
              const active = status === s
              return (
                <button
                  key={s}
                  type="button"
                  className={`${styles.statusBtn}${active ? ` ${styles.statusBtnActive}` : ''}`}
                  onClick={() => savePatch(s)}
                  aria-pressed={active}
                  disabled={saving}
                >
                  {STATUS_LABELS[s]}
                </button>
              )
            })}
            {currentIndex !== -1 && currentIndex < STATUS_FLOW.length - 1 && (
              <button type="button" className={styles.nextBtn} onClick={goToNextStatus} disabled={saving}>
                Move to next step →
              </button>
            )}
          </div>
          <p className={styles.demoHint}>Status changes are saved immediately. Admin access only.</p>
        </div>

        <hr className={styles.divider} />

        {/* ── Footer note ── */}
        <div className={styles.footerNote}>
          <p>
            You can always go back to{' '}
            <Link href="/admin/disputes" className={styles.link}>the disputes list</Link>{' '}
            to review other records.
          </p>
        </div>

      </section>
    </div>
  )
}