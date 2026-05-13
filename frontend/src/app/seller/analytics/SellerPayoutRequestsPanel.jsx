'use client'

import { useEffect, useState } from 'react'
import { useToast } from '@/contexts/ToastContext'
import styles from '../analytics/analytics.module.css'

function formatDate(value) {
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' })
}

export default function SellerPayoutRequestsPanel({ className = '' }) {
  const toast = useToast()
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [note, setNote] = useState('')
  const [requestedAmount, setRequestedAmount] = useState('')

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        const res = await fetch('/api/seller/payout-requests', { cache: 'no-store' })
        const body = await res.json().catch(() => null)
        if (!res.ok) throw new Error(body?.error || 'Failed to load payout requests.')
        if (!cancelled) setRequests(Array.isArray(body?.requests) ? body.requests : [])
      } catch (err) {
        if (!cancelled) {
          toast.error(err?.message || 'Failed to load payout requests.')
          setRequests([])
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [toast])

  const reloadRequests = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/seller/payout-requests', { cache: 'no-store' })
      const body = await res.json().catch(() => null)
      if (!res.ok) throw new Error(body?.error || 'Failed to load payout requests.')
      setRequests(Array.isArray(body?.requests) ? body.requests : [])
    } catch (err) {
      toast.error(err?.message || 'Failed to load payout requests.')
      setRequests([])
    } finally {
      setLoading(false)
    }
  }

  const onSubmit = async (event) => {
    event.preventDefault()
    const trimmedNote = note.trim()
    if (!trimmedNote) {
      toast.error('Add a short note so admins know what to review.')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/seller/payout-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          note: trimmedNote,
          requestedAmount: requestedAmount.trim() === '' ? null : requestedAmount,
        }),
      })
      const body = await res.json().catch(() => null)
      if (!res.ok) throw new Error(body?.error || 'Failed to submit payout request.')
      toast.success('Payout request sent to admin review.')
      setNote('')
      setRequestedAmount('')
      await reloadRequests()
    } catch (err) {
      toast.error(err?.message || 'Failed to submit payout request.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className={`${styles.chartCard} ${className}`.trim()} aria-label="Payout release requests">
      <div className={styles.chartHeader}>
        <div className={styles.chartTitleGroup}>
          <h2 className={styles.chartTitle}>Request payout release</h2>
          <p className={styles.chartSubtitle}>
            Ask admins to review eligible escrow funds. This does not auto-release payouts.
          </p>
        </div>
      </div>

      <form className={styles.payoutRequestForm} onSubmit={onSubmit}>
        <label className={styles.payoutRequestField}>
          <span className={styles.payoutRequestLabel}>Requested amount (optional)</span>
          <input
            className={styles.payoutRequestInput}
            inputMode="decimal"
            value={requestedAmount}
            onChange={(e) => setRequestedAmount(e.target.value)}
            placeholder="Leave blank to request a full review"
            disabled={submitting}
          />
        </label>
        <label className={styles.payoutRequestField}>
          <span className={styles.payoutRequestLabel}>Note for admin</span>
          <textarea
            className={styles.payoutRequestTextarea}
            rows={4}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Explain which completed bookings or escrow balance should be reviewed."
            disabled={submitting}
          />
        </label>
        <button type="submit" className={styles.downloadButton} disabled={submitting}>
          {submitting ? 'Submitting…' : 'Submit payout request'}
        </button>
      </form>

      <div className={styles.payoutRequestHistory}>
        <h3 className={styles.payoutRequestHistoryTitle}>Request history</h3>
        {loading ? <p className={styles.pageError}>Loading payout requests…</p> : null}
        {!loading && requests.length === 0 ? (
          <p className={styles.chartSubtitle}>No payout requests submitted yet.</p>
        ) : null}
        {!loading && requests.length > 0 ? (
          <ul className={styles.payoutRequestList}>
            {requests.map((request) => (
              <li key={request.id} className={styles.payoutRequestItem}>
                <div>
                  <p className={styles.payoutRequestItemTitle}>
                    {request.status} · {formatDate(request.created_at)}
                  </p>
                  <p className={styles.payoutRequestItemBody}>{request.note}</p>
                </div>
                {request.requested_amount != null ? (
                  <span className={styles.payoutRequestAmount}>₱{Number(request.requested_amount).toLocaleString('en-PH')}</span>
                ) : null}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </section>
  )
}
