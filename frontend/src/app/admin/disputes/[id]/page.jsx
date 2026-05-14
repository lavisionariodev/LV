'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import layoutStyles from '../../admin.module.css'
import styles from './detail.module.css'
import ConfirmModal from '@/components/ui/Modal/ConfirmModal'

const STATUS_FLOW = ['open', 'under_review', 'resolved', 'closed']

const STATUS_LABELS = {
  open: 'Open',
  under_review: 'Under review',
  resolved: 'Resolved',
  closed: 'Closed',
}

const DISPUTE_STAGE_ORDER = { open: 0, under_review: 1, resolved: 2, closed: 3 }
const CLOSE_STATUSES = new Set(['resolved', 'closed'])
const OUTCOME_OPTIONS = [
  { value: 'continue_service', label: 'Continue service (lift dispute hold, no refund)' },
  { value: 'refund_buyer', label: 'Refund buyer (hold escrow and start refund)' },
  { value: 'no_financial_change', label: 'Close with no financial change' },
]

function disputeStatusConfirmVariant(current, next) {
  if (!current || !next || current === next) return 'warning'
  const ci = DISPUTE_STAGE_ORDER[current] ?? -1
  const ni = DISPUTE_STAGE_ORDER[next] ?? -1
  if (ni < ci) return 'danger'
  if (next === 'closed') return 'neutral'
  if (next === 'resolved') return 'primary'
  return 'warning'
}

const IMAGE_EXT_RE = /\.(png|jpe?g|gif|webp|bmp|svg|avif)(\?|$)/i

function relativeTime(iso) {
  if (!iso) return ''
  const t = new Date(iso).getTime()
  if (Number.isNaN(t)) return ''
  const diff = Math.floor((Date.now() - t) / 1000)
  if (diff < 30) return 'just now'
  if (diff < 60) return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  if (diff < 86400 * 30) return `${Math.floor(diff / 86400)}d ago`
  try {
    return new Date(iso).toLocaleDateString()
  } catch {
    return ''
  }
}

function fileNameFromPath(path = '') {
  const s = String(path)
  const slash = s.lastIndexOf('/')
  return slash >= 0 ? s.slice(slash + 1) : s
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
  const [statusChangeConfirm, setStatusChangeConfirm] = useState(null)
  const [closeOutcome, setCloseOutcome] = useState('no_financial_change')
  const [events, setEvents] = useState([])
  const [eventsLoading, setEventsLoading] = useState(false)

  const loadEvents = useCallback(async () => {
    if (!id) return
    setEventsLoading(true)
    try {
      const res = await fetch(
        `/api/admin/disputes/${encodeURIComponent(id)}/events`,
        { cache: 'no-store' },
      )
      const body = await res.json().catch(() => null)
      if (res.ok) setEvents(Array.isArray(body?.events) ? body.events : [])
    } finally {
      setEventsLoading(false)
    }
  }, [id])

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
    await loadEvents()
  }, [id, loadEvents])

  useEffect(() => {
    queueMicrotask(() => {
      reload();
    });
  }, [reload]);

  const attachments = useMemo(() => {
    if (Array.isArray(dispute?.attachments)) return dispute.attachments
    return Array.isArray(dispute?.attachmentPaths)
      ? dispute.attachmentPaths.map((p) => ({ path: p, signedUrl: null }))
      : []
  }, [dispute])

  async function savePatch(nextStatus, outcome) {
    if (!id) return
    setSaving(true)
    try {
      const payload = {
        status: nextStatus,
        resolutionNotes: resolutionNotes.trim() || null,
      }
      if (CLOSE_STATUSES.has(nextStatus)) {
        payload.outcome = outcome || closeOutcome
      }
      const res = await fetch(`/api/admin/disputes/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const body = await res.json().catch(() => null)
      if (!res.ok) {
        window.alert(typeof body?.error === 'string' ? body.error : 'Save failed.')
        return
      }
      await reload()
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('admin:disputes-changed'))
      }
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className={layoutStyles.dashWrap} role="status" aria-live="polite" aria-busy="true" aria-label="Loading dispute">
        <section className={layoutStyles.panel}>
          <div className={layoutStyles.panelHead}>
            <div className={styles.headLeft}>
              <span className={styles.detailSkBar} style={{ height: 18, width: 100, marginBottom: 6 }} aria-hidden />
              <span className={styles.detailSkBar} style={{ height: 12, width: 200 }} aria-hidden />
            </div>
            <span className={styles.detailSkBar} style={{ height: 36, width: 120, borderRadius: 10 }} aria-hidden />
          </div>
          <div className={styles.detailSkBanner} aria-hidden>
            <span className={styles.detailSkBar} style={{ height: 20, width: '35%', borderRadius: 999 }} />
          </div>
          <div className={styles.form}>
            <div className={styles.section}>
              <span className={styles.detailSkBar} style={{ height: 14, width: 140, marginBottom: 14 }} aria-hidden />
              <div className={styles.fieldGrid}>
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={`dsk-f-${i}`} className={styles.field}>
                    <span className={styles.detailSkBar} style={{ height: 10, width: 80, marginBottom: 8 }} aria-hidden />
                    <span className={styles.detailSkBar} style={{ height: 14, width: '100%' }} aria-hidden />
                  </div>
                ))}
              </div>
            </div>
            <div className={styles.section}>
              <span className={styles.detailSkBar} style={{ height: 14, width: 100, marginBottom: 14 }} aria-hidden />
              <div className={styles.partyGrid}>
                <div className={styles.detailSkPartyCard}>
                  <span className={styles.detailSkBar} style={{ width: 48, height: 48, borderRadius: 999 }} aria-hidden />
                  <span className={styles.detailSkBar} style={{ height: 14, width: '80%' }} aria-hidden />
                  <span className={styles.detailSkBar} style={{ height: 11, width: '60%' }} aria-hidden />
                </div>
                <div className={styles.detailSkPartyCard}>
                  <span className={styles.detailSkBar} style={{ width: 48, height: 48, borderRadius: 999 }} aria-hidden />
                  <span className={styles.detailSkBar} style={{ height: 14, width: '75%' }} aria-hidden />
                  <span className={styles.detailSkBar} style={{ height: 11, width: '55%' }} aria-hidden />
                </div>
              </div>
            </div>
            <div className={styles.section}>
              <span className={styles.detailSkBar} style={{ height: 14, width: 110, marginBottom: 12 }} aria-hidden />
              <span className={styles.detailSkBar} style={{ height: 88, width: '100%', borderRadius: 12 }} aria-hidden />
            </div>
          </div>
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
    setStatusChangeConfirm({ next: STATUS_FLOW[currentIndex + 1] })
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
                <span className={styles.label}>Order money</span>
                <span className={styles.value}>
                  Payment {dispute.orderPaymentStatus || '—'} · fulfillment {dispute.orderFulfillment || '—'}
                  {dispute.orderRefundStatus ? ` · refund ${dispute.orderRefundStatus}` : ''}
                  {dispute.orderEscrowStatus ? ` · escrow ${dispute.orderEscrowStatus}` : ''}
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
                  Shop{dispute.respondentEmail ? ` · ${dispute.respondentEmail}` : ''}
                </span>
              </div>
            </div>
          </div>

          {/* ── Description ── */}
          <div className={styles.section}>
            <p className={styles.sectionTitle}>Description</p>
            <div className={styles.textAreaLike}>{dispute.description || '—'}</div>
          </div>

          {/* ── Attachments ── */}
          {attachments.length > 0 && (
            <div className={styles.section}>
              <p className={styles.sectionTitle}>
                Attachments
                <span style={{ marginLeft: 8, fontWeight: 400, color: '#64748b' }}>
                  ({attachments.length})
                </span>
              </p>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
                  gap: 12,
                  marginTop: 8,
                }}
              >
                {attachments.map((att, idx) => {
                  const url = att.signedUrl
                  const name = fileNameFromPath(att.path)
                  const isImage = IMAGE_EXT_RE.test(name)
                  return (
                    <div
                      key={att.path || idx}
                      style={{
                        border: '1px solid #e2e8f0',
                        borderRadius: 10,
                        padding: 8,
                        background: '#fff',
                      }}
                    >
                      {isImage && url ? (
                        <a href={url} target="_blank" rel="noreferrer">
                          {/* eslint-disable-next-line @next/next/no-img-element -- signed URLs from Supabase storage */}
                          <img
                            src={url}
                            alt={name}
                            style={{
                              width: '100%',
                              height: 110,
                              objectFit: 'cover',
                              borderRadius: 6,
                              display: 'block',
                            }}
                          />
                        </a>
                      ) : (
                        <div
                          style={{
                            height: 110,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: '#f8fafc',
                            color: '#475569',
                            borderRadius: 6,
                            fontSize: 12,
                          }}
                        >
                          File
                        </div>
                      )}
                      <div style={{ marginTop: 6, fontSize: 12 }}>
                        <p style={{ margin: 0, color: '#0f172a', wordBreak: 'break-all' }}>
                          {name}
                        </p>
                        {url ? (
                          <a
                            href={url}
                            target="_blank"
                            rel="noreferrer"
                            className={styles.link}
                          >
                            Open in new tab
                          </a>
                        ) : att.error ? (
                          <span style={{ color: '#b91c1c' }}>{att.error}</span>
                        ) : (
                          <span style={{ color: '#64748b' }}>No preview</span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
              {dispute.updatedAtIso ? (
                <p style={{ marginTop: 10, fontSize: 12, color: '#64748b' }}>
                  Last updated {relativeTime(dispute.updatedAtIso)}
                </p>
              ) : null}
            </div>
          )}

          {/* ── Timeline ── */}
          <div className={styles.section}>
            <p className={styles.sectionTitle}>
              Timeline
              <span style={{ marginLeft: 8, fontWeight: 400, color: '#64748b' }}>
                ({events.length})
              </span>
            </p>
            {eventsLoading ? (
              <p style={{ color: '#64748b', fontSize: 13 }}>Loading timeline…</p>
            ) : events.length === 0 ? (
              <p style={{ color: '#64748b', fontSize: 13 }}>No events recorded yet.</p>
            ) : (
              <ol
                style={{
                  listStyle: 'none',
                  padding: 0,
                  margin: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                  borderLeft: '2px solid #e2e8f0',
                  paddingLeft: 14,
                }}
              >
                {events.map((ev) => (
                  <li key={ev.id} style={{ position: 'relative' }}>
                    <span
                      aria-hidden
                      style={{
                        position: 'absolute',
                        left: -20,
                        top: 5,
                        width: 10,
                        height: 10,
                        borderRadius: 999,
                        background:
                          ev.actorRole === 'admin'
                            ? '#2563eb'
                            : ev.actorRole === 'system'
                              ? '#64748b'
                              : '#0f766e',
                      }}
                    />
                    <div
                      style={{
                        display: 'flex',
                        gap: 8,
                        alignItems: 'center',
                        flexWrap: 'wrap',
                      }}
                    >
                      <span
                        style={{
                          fontSize: 11,
                          textTransform: 'uppercase',
                          letterSpacing: 0.4,
                          background: '#f1f5f9',
                          color: '#334155',
                          padding: '2px 6px',
                          borderRadius: 4,
                          fontWeight: 600,
                        }}
                      >
                        {ev.actorRole}
                      </span>
                      <span style={{ fontSize: 13, color: '#0f172a' }}>
                        {ev.actorName || 'Unknown'}
                      </span>
                      {ev.eventType === 'status_changed' ? (
                        <span style={{ fontSize: 13, color: '#0f172a' }}>
                          changed status{' '}
                          <span style={{ color: '#475569' }}>
                            {STATUS_LABELS[ev.fromStatus] ?? ev.fromStatus ?? '—'} →{' '}
                            {STATUS_LABELS[ev.toStatus] ?? ev.toStatus ?? '—'}
                          </span>
                        </span>
                      ) : (
                        <span style={{ fontSize: 13, color: '#0f172a' }}>
                          {ev.eventType.replace(/_/g, ' ')}
                        </span>
                      )}
                      <span
                        style={{ marginLeft: 'auto', fontSize: 12, color: '#64748b' }}
                        title={ev.createdAt}
                      >
                        {relativeTime(ev.createdAt)}
                      </span>
                    </div>
                    {ev.note ? (
                      <p
                        style={{
                          margin: '4px 0 0',
                          fontSize: 13,
                          color: '#334155',
                          whiteSpace: 'pre-wrap',
                        }}
                      >
                        {ev.note}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ol>
            )}
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
                  onClick={() => {
                    if (s === status) return
                    setStatusChangeConfirm({ next: s })
                  }}
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
          <p className={styles.demoHint}>
            Resolving or closing a case requires a financial outcome. Sellers cannot clear escrow or issue refunds.
          </p>
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

      <ConfirmModal
        open={statusChangeConfirm != null}
        variant={disputeStatusConfirmVariant(status, statusChangeConfirm?.next)}
        title="Change dispute status?"
        message={
          statusChangeConfirm?.next
            ? CLOSE_STATUSES.has(statusChangeConfirm.next)
              ? `Set this dispute to "${STATUS_LABELS[statusChangeConfirm.next] ?? statusChangeConfirm.next}" and apply the selected financial outcome. Resolution notes (if any) will be saved with this update.`
              : `Set this dispute to "${STATUS_LABELS[statusChangeConfirm.next] ?? statusChangeConfirm.next}"? Resolution notes (if any) will be saved with this update.`
            : ''
        }
        confirmLabel="Save status"
        confirmLoadingLabel="Saving..."
        cancelLabel="Cancel"
        loading={saving}
        subtitleAlign="left"
        onCancel={() => {
          if (saving) return
          setStatusChangeConfirm(null)
        }}
        onConfirm={async () => {
          if (!statusChangeConfirm) return
          const next = statusChangeConfirm.next
          await savePatch(next, closeOutcome)
          setStatusChangeConfirm(null)
        }}
        extra={
          statusChangeConfirm?.next && CLOSE_STATUSES.has(statusChangeConfirm.next) ? (
            <label style={{ display: 'block', marginTop: 4, fontSize: 13 }}>
              <span style={{ display: 'block', marginBottom: 6, fontWeight: 600 }}>Financial outcome</span>
              <select
                value={closeOutcome}
                onChange={(e) => setCloseOutcome(e.target.value)}
                disabled={saving}
                style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #d4d4d8' }}
              >
                {OUTCOME_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>
          ) : null
        }
      />
    </div>
  )
}