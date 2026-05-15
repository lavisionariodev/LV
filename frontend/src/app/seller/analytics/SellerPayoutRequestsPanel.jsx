'use client'

import { useEffect, useState } from 'react'
import { GiReceiveMoney } from 'react-icons/gi'
import { useToast } from '@/contexts/ToastContext'
import {
  createSellerPayoutRequest,
  listSellerPayoutRequests,
} from '@/lib/seller/payoutRequestsClient'
import styles from '../analytics/analytics.module.css'
import BodyPortal from '@/components/ui/Modal/BodyPortal'

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
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false)
  const [note, setNote] = useState('')
  const [requestedAmount, setRequestedAmount] = useState('')

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        const requests = await listSellerPayoutRequests()
        if (!cancelled) setRequests(requests)
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
      const requests = await listSellerPayoutRequests()
      setRequests(requests)
    } catch (err) {
      toast.error(err?.message || 'Failed to load payout requests.')
      setRequests([])
    } finally {
      setLoading(false)
    }
  }

  const closeRequestModal = () => {
    if (submitting) return
    setIsRequestModalOpen(false)
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
      await createSellerPayoutRequest({
        note: trimmedNote,
        requestedAmount: requestedAmount.trim() === '' ? null : requestedAmount,
      })
      toast.success('Payout request sent to admin review.')
      setNote('')
      setRequestedAmount('')
      setIsRequestModalOpen(false)
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
          <h2 className={styles.chartTitle}>Payout review request</h2>
          <p className={styles.chartSubtitle}>
            Ask admins to review eligible escrow funds. Approval authorizes release review only — PayMongo settlement happens per completed order in Admin Payouts.
          </p>
        </div>
        <button
          type="button"
          className={`${styles.downloadButton} ${styles.payoutRequestOpenBtn}`}
          onClick={() => setIsRequestModalOpen(true)}
        >
          <GiReceiveMoney size={16} aria-hidden />
          <span>Request payout release</span>
        </button>
      </div>

      {isRequestModalOpen ? (
        <BodyPortal>
        <div
          className={styles.payoutRequestModalOverlay}
          role="dialog"
          aria-modal="true"
          aria-labelledby="payout-request-modal-title"
          onClick={closeRequestModal}
        >
          <div className={styles.payoutRequestModalCard} onClick={(e) => e.stopPropagation()}>
            <div className={styles.payoutRequestModalHeader}>
              <div className={styles.payoutRequestModalTitleWrap}>
                <GiReceiveMoney className={styles.payoutRequestModalTitleIcon} aria-hidden />
                <h3 id="payout-request-modal-title" className={styles.payoutRequestModalTitle}>
                  Payout review request
                </h3>
              </div>
              <button
                type="button"
                className={styles.payoutRequestModalCloseBtn}
                onClick={closeRequestModal}
                aria-label="Close payout request modal"
                disabled={submitting}
              >
                ×
              </button>
            </div>
            <div className={styles.payoutRequestModalBody}>
              <p className={styles.payoutRequestModalSubtitle}>
                Add the details admins need to review your eligible escrow funds.
              </p>
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
                <div className={styles.payoutRequestModalActions}>
                  <button
                    type="button"
                    className={styles.payoutRequestModalGhostBtn}
                    onClick={closeRequestModal}
                    disabled={submitting}
                  >
                    Cancel
                  </button>
                  <button type="submit" className={styles.payoutRequestModalPrimaryBtn} disabled={submitting}>
                    {submitting ? 'Submitting…' : 'Submit review request'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
        </BodyPortal>
      ) : null}

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
                    {request.status === 'approved'
                      ? 'Approved for release review'
                      : request.status}{' '}
                    · {formatDate(request.created_at)}
                  </p>
                  <p className={styles.payoutRequestItemBody}>
                    {request.status === 'approved'
                      ? 'Funds are not sent automatically. Admins release completed orders in Payouts; PayMongo settlement may follow when enabled.'
                      : request.note}
                  </p>
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
