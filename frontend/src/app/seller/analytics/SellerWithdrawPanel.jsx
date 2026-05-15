'use client'

import { useCallback, useEffect, useState } from 'react'
import { GiReceiveMoney } from 'react-icons/gi'
import { useToast } from '@/contexts/ToastContext'
import { createSellerWithdrawal, fetchSellerWithdrawSummary } from '@/lib/seller/withdrawClient'
import { MIN_WITHDRAWAL_PHP } from '@/lib/payments/processSellerWithdrawal'
import styles from '../analytics/analytics.module.css'
import BodyPortal from '@/components/ui/Modal/BodyPortal'

function formatPhp(amount) {
  return `₱${Number(amount || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatDate(value) {
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' })
}

function statusLabel(status) {
  const s = String(status || '').toLowerCase()
  if (s === 'succeeded') return 'Completed'
  if (s === 'submitted') return 'Processing'
  if (s === 'pending') return 'Pending'
  if (s === 'failed') return 'Failed'
  if (s === 'cancelled') return 'Cancelled'
  return s || '—'
}

export default function SellerWithdrawPanel({ className = '' }) {
  const toast = useToast()
  const [summary, setSummary] = useState(null)
  const [withdrawals, setWithdrawals] = useState([])
  const [withdrawReady, setWithdrawReady] = useState(false)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [amount, setAmount] = useState('')

  const reload = useCallback(async () => {
    setLoading(true)
    try {
      const data = await fetchSellerWithdrawSummary()
      setSummary(data.summary ?? null)
      setWithdrawals(data.withdrawals ?? [])
      setWithdrawReady(Boolean(data.withdrawConfig?.withdrawReady))
    } catch (err) {
      toast.error(err?.message || 'Failed to load wallet.')
      setSummary(null)
      setWithdrawals([])
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    reload()
  }, [reload])

  const available = Number(summary?.availableNet) || 0

  const closeModal = () => {
    if (submitting) return
    setIsModalOpen(false)
  }

  const onWithdrawClick = () => {
    if (available > 0) {
      setAmount(String(Math.floor(available * 100) / 100))
    }
    setIsModalOpen(true)
  }

  const onSubmit = async (event) => {
    event.preventDefault()
    const value = Number(amount)
    if (!Number.isFinite(value) || value <= 0) {
      toast.error('Enter a valid withdrawal amount.')
      return
    }
    if (value < MIN_WITHDRAWAL_PHP) {
      toast.error(`Minimum withdrawal is ${formatPhp(MIN_WITHDRAWAL_PHP)}.`)
      return
    }
    if (value > available + 0.001) {
      toast.error(`Amount exceeds available balance (${formatPhp(available)}).`)
      return
    }

    setSubmitting(true)
    try {
      const idempotencyKey = `wd-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
      const result = await createSellerWithdrawal({ amountPhp: value, idempotencyKey })
      if (result.pending) {
        toast.success('Withdrawal submitted. Funds typically arrive within 1–3 business days.')
      } else {
        toast.success('Withdrawal completed.')
      }
      setAmount('')
      setIsModalOpen(false)
      await reload()
    } catch (err) {
      toast.error(err?.message || 'Withdrawal failed.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className={`${styles.chartCard} ${className}`.trim()} aria-label="Withdraw earnings">
      <div className={styles.chartHeader}>
          <div className={styles.chartTitleGroup}>
          <h2 className={styles.chartTitle}>Withdraw to bank or GCash</h2>
          <p className={styles.chartSubtitle}>
            Available {loading ? '…' : formatPhp(available)} · Wallet balance{' '}
            {loading ? '…' : formatPhp(summary?.walletBalanceNet)} · Minimum {formatPhp(MIN_WITHDRAWAL_PHP)}
          </p>
        </div>
        <button
          type="button"
          className={`${styles.downloadButton} ${styles.payoutRequestOpenBtn}`}
          onClick={onWithdrawClick}
          disabled={loading || !withdrawReady || available < MIN_WITHDRAWAL_PHP}
        >
          <GiReceiveMoney size={16} aria-hidden />
          <span>Withdraw</span>
        </button>
      </div>

      {!withdrawReady && !loading ? (
        <p className={styles.payoutRequestItemBody}>
          Automated withdrawals are not enabled yet. Save your payout settings; transfers run when the platform
          enables PayMongo payouts.
        </p>
      ) : null}

      {isModalOpen ? (
        <BodyPortal>
          <div
            className={styles.payoutRequestModalOverlay}
            role="dialog"
            aria-modal="true"
            aria-labelledby="withdraw-modal-title"
            onClick={closeModal}
          >
            <div className={styles.payoutRequestModalCard} onClick={(e) => e.stopPropagation()}>
              <div className={styles.payoutRequestModalHeader}>
                <h2 id="withdraw-modal-title" className={styles.payoutRequestModalTitle}>
                  Withdraw earnings
                </h2>
                <button
                  type="button"
                  className={styles.payoutRequestModalCloseBtn}
                  onClick={closeModal}
                  disabled={submitting}
                  aria-label="Close"
                >
                  ×
                </button>
              </div>
              <form className={styles.payoutRequestForm} onSubmit={onSubmit}>
                <p className={styles.payoutRequestModalSubtitle}>
                  Available to withdraw: {formatPhp(available)}
                </p>
                <label className={styles.payoutRequestField}>
                  <span className={styles.payoutRequestLabel}>Amount (PHP)</span>
                  <input
                    className={styles.payoutRequestInput}
                    type="number"
                    min={MIN_WITHDRAWAL_PHP}
                    step="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    required
                  />
                </label>
                <WithdrawModalActions submitting={submitting} onClose={closeModal} />
              </form>
            </div>
          </div>
        </BodyPortal>
      ) : null}

      <div className={styles.payoutRequestHistory}>
        <h3 className={styles.payoutRequestHistoryTitle}>Recent withdrawals</h3>
        {loading ? (
          <p className={styles.payoutRequestItemBody}>Loading…</p>
        ) : withdrawals.length === 0 ? (
          <p className={styles.payoutRequestItemBody}>No withdrawals yet.</p>
        ) : (
          <ul className={styles.payoutRequestList}>
            {withdrawals.map((row) => (
              <li key={row.id} className={styles.payoutRequestItem}>
                <WithdrawalRow row={row} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}

function WithdrawModalActions({ submitting, onClose }) {
  return (
    <div className={styles.payoutRequestModalActions}>
      <button
        type="button"
        className={styles.payoutRequestModalGhostBtn}
        onClick={onClose}
        disabled={submitting}
      >
        Cancel
      </button>
      <button type="submit" className={styles.payoutRequestModalPrimaryBtn} disabled={submitting}>
        {submitting ? 'Processing…' : 'Confirm withdrawal'}
      </button>
    </div>
  )
}

function WithdrawalRow({ row }) {
  return (
    <>
      <div className={styles.payoutRequestItemTitle}>
        {formatPhp(row.amountPhp)} · {statusLabel(row.status)}
      </div>
      <p className={styles.payoutRequestAmount}>{formatDate(row.createdAt)}</p>
      {row.failureReason ? <p className={styles.payoutRequestItemBody}>{row.failureReason}</p> : null}
    </>
  )
}
