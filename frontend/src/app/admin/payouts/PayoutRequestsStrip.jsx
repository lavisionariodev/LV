'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import styles from './payouts.module.css'
import ConfirmModal from '@/components/ui/Modal/ConfirmModal'

function formatMoney(n) {
  const v = Number(n)
  if (!Number.isFinite(v)) return '—'
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', minimumFractionDigits: 0 }).format(v)
}

function formatDate(value) {
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' })
}

function sellerLabel(row) {
  return row.sellerBusinessName || row.sellerContactName || row.sellerEmail || row.sellerUserId || 'Seller'
}

function escrowSummary(snapshot) {
  if (!snapshot || typeof snapshot !== 'object') return '—'
  const parts = []
  const escrowed = snapshot.escrowedNet ?? snapshot.escrowed_net
  const held = snapshot.heldNet ?? snapshot.held_net
  const released = snapshot.releasedNet ?? snapshot.released_net
  if (escrowed != null) parts.push(`Escrowed ${formatMoney(escrowed)}`)
  if (held != null) parts.push(`On hold ${formatMoney(held)}`)
  if (released != null) parts.push(`Released ${formatMoney(released)}`)
  return parts.length ? parts.join(' · ') : '—'
}

const PAGE_LIMIT = 50
const NOTE_MIN = 12

export default function PayoutRequestsStrip() {
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [err, setErr] = useState('')
  const [busyId, setBusyId] = useState(null)
  const [total, setTotal] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [rejectTarget, setRejectTarget] = useState(null)
  const [rejectNote, setRejectNote] = useState('')
  const [rejectError, setRejectError] = useState('')

  const fetchPage = useCallback(async ({ offset = 0, append = false } = {}) => {
    setErr('')
    if (!append) setLoading(true)
    else setLoadingMore(true)
    try {
      const url = `/api/admin/payout-requests?status=pending&limit=${PAGE_LIMIT}&offset=${offset}`
      const res = await fetch(url, { cache: 'no-store' })
      const body = await res.json().catch(() => null)
      if (!res.ok) {
        setErr(typeof body?.error === 'string' ? body.error : 'Could not load payout requests.')
        if (!append) setRequests([])
        return
      }
      const next = Array.isArray(body?.requests) ? body.requests : []
      setRequests((prev) => (append ? [...prev, ...next] : next))
      setTotal(Number.isFinite(body?.total) ? body.total : next.length)
      setHasMore(Boolean(body?.hasMore))
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [])

  const load = useCallback(() => fetchPage({ offset: 0, append: false }), [fetchPage])

  const loadMore = useCallback(
    () => fetchPage({ offset: requests.length, append: true }),
    [fetchPage, requests.length],
  )

  useEffect(() => {
    queueMicrotask(() => {
      load()
    })
  }, [load])

  const reviewRequest = async (requestId, action, adminNote = '') => {
    setBusyId(requestId)
    try {
      const res = await fetch(`/api/admin/payout-requests/${encodeURIComponent(requestId)}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, adminNote }),
      })
      const body = await res.json().catch(() => null)
      if (!res.ok) {
        window.alert(typeof body?.error === 'string' ? body.error : 'Action failed.')
        return false
      }
      await load()
      return true
    } finally {
      setBusyId(null)
    }
  }

  const escrowHref = (sellerUserId, requestId) => {
    const params = new URLSearchParams({
      tab: 'transactions',
      seller: sellerUserId,
      payout: 'escrowed',
    })
    if (requestId) params.set('approvedRequestId', requestId)
    return `/admin/payouts?${params.toString()}`
  }

  if (loading && requests.length === 0) return null

  if (err) {
    return (
      <section className={styles.stuckRefundsWrap} aria-live="polite">
        <p className={styles.stuckRefundsTitle}>Seller payout review requests</p>
        <p className={styles.stuckRefundsError}>{err}</p>
      </section>
    )
  }

  if (!requests.length) return null

  return (
    <>
      <section
        className={styles.stuckRefundsWrap}
        aria-labelledby="payout-requests-title"
        aria-busy={loading ? 'true' : 'false'}
      >
        <div className={styles.stuckRefundsHead}>
          <p id="payout-requests-title" className={styles.stuckRefundsTitle}>
            Seller payout review requests{' '}
            <span style={{ fontWeight: 400, color: '#64748b', fontSize: 13 }}>
              ({requests.length} of {total})
            </span>
          </p>
          <p className={styles.stuckRefundsSub}>
            Sellers ask admins to review eligible escrow funds. Approving a request means “approved for release review” only — funds are not sent until you release each completed order in Payouts.
          </p>
        </div>
        <div className={styles.stuckRefundsTableWrap}>
          <table className={styles.stuckRefundsTable}>
            <thead>
              <tr>
                <th>Seller</th>
                <th>Requested</th>
                <th>Note</th>
                <th>Escrow snapshot</th>
                <th>Submitted</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {requests.map((row) => (
                <tr key={row.id}>
                  <td>{sellerLabel(row)}</td>
                  <td>{row.requestedAmount == null ? '—' : formatMoney(row.requestedAmount)}</td>
                  <td>{row.note || '—'}</td>
                  <td>{escrowSummary(row.escrowSnapshot)}</td>
                  <td>{formatDate(row.createdAt)}</td>
                  <td className={styles.stuckRefundsActions}>
                    <button
                      type="button"
                      className={styles.stuckRefundsBtn}
                      disabled={busyId === row.id}
                      onClick={async () => {
                        const ok = await reviewRequest(row.id, 'approve')
                        if (ok) {
                          window.alert(
                            `Approved for release review. Funds were not sent — open escrow transactions for ${sellerLabel(row)} to release eligible completed orders.`,
                          )
                        }
                      }}
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      className={styles.stuckRefundsBtnDanger}
                      disabled={busyId === row.id}
                      onClick={() => {
                        setRejectError('')
                        setRejectNote('')
                        setRejectTarget(row)
                      }}
                    >
                      Reject
                    </button>
                    <Link href={escrowHref(row.sellerUserId, row.id)} className={styles.stuckRefundsLink}>
                      View escrow
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {hasMore ? (
          <div style={{ marginTop: 12, textAlign: 'center' }}>
            <button type="button" onClick={loadMore} disabled={loadingMore} className={styles.stuckRefundsBtn}>
              {loadingMore ? 'Loading…' : 'Load more'}
            </button>
          </div>
        ) : null}
      </section>

      <ConfirmModal
        open={rejectTarget != null}
        variant="danger"
        title="Reject payout request?"
        message="Explain what the seller should fix or why escrow cannot be released yet. They will receive this note."
        extra={
          <div style={{ display: 'grid', gap: 8 }}>
            <textarea
              value={rejectNote}
              onChange={(e) => {
                setRejectNote(e.target.value)
                setRejectError('')
              }}
              rows={4}
              placeholder="At least 12 characters"
              style={{ width: '100%', padding: '8px 10px', fontSize: 14 }}
            />
            {rejectError ? <p style={{ margin: 0, color: '#b91c1c', fontSize: 13 }}>{rejectError}</p> : null}
          </div>
        }
        subtitleAlign="left"
        confirmLabel="Reject request"
        confirmLoadingLabel="Rejecting..."
        cancelLabel="Cancel"
        loading={rejectTarget != null && busyId === rejectTarget.id}
        onCancel={() => {
          if (busyId) return
          setRejectTarget(null)
          setRejectNote('')
          setRejectError('')
        }}
        onConfirm={async () => {
          if (!rejectTarget) return
          const trimmed = rejectNote.trim()
          if (trimmed.length < NOTE_MIN) {
            setRejectError(`Please enter at least ${NOTE_MIN} characters.`)
            return
          }
          const ok = await reviewRequest(rejectTarget.id, 'reject', trimmed)
          if (ok) {
            setRejectTarget(null)
            setRejectNote('')
            setRejectError('')
          }
        }}
      />
    </>
  )
}
