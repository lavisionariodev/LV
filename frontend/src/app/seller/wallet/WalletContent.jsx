'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { GiReceiveMoney } from 'react-icons/gi'
import { TbHistory, TbInfoCircle, TbWallet } from 'react-icons/tb'
import { useToast } from '@/contexts/ToastContext'
import { formatPhpAmount } from '@/lib/cart/formatPhp'
import { MIN_WITHDRAWAL_PHP } from '@/lib/payments/processSellerWithdrawal'
import {
  createSellerWithdrawal,
  fetchSellerWalletSummary,
  fetchSellerWalletTransactions,
  fetchSellerWithdrawals,
} from '@/lib/seller/walletClient'
import { createPortal } from 'react-dom'
import styles from './wallet.module.css'

const TX_TYPE_CLASS = {
  ORDER_EARNING: styles.typeOrderEarning,
  REFUND: styles.typeRefund,
  WITHDRAWAL: styles.typeWithdrawal,
  ADMIN_ADJUSTMENT: styles.typeAdjustment,
  FEE: styles.typeFee,
}

const TX_TYPE_LABEL = {
  ORDER_EARNING: 'Order earning',
  REFUND: 'Refund',
  WITHDRAWAL: 'Withdrawal',
  ADMIN_ADJUSTMENT: 'Adjustment',
  FEE: 'Fee',
}

function formatDate(value) {
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' })
}

function typeBadgeClass(type) {
  return TX_TYPE_CLASS[type] || styles.typeFee
}

function formatTxAmount(amount) {
  const n = Number(amount) || 0
  const formatted = formatPhpAmount(Math.abs(n))
  if (n > 0) return { text: `+${formatted}`, className: styles.amountPositive }
  if (n < 0) return { text: `−${formatted}`, className: styles.amountNegative }
  return { text: formatted, className: '' }
}

const ORDER_LINK_TYPES = new Set(['ORDER_EARNING', 'REFUND', 'FEE'])

function TransactionDescription({ tx }) {
  const orderId = tx?.orderId ? String(tx.orderId).trim() : ''
  if (!orderId || !ORDER_LINK_TYPES.has(tx.type)) {
    return tx.description || '—'
  }
  return (
    <Link href={`/seller/orders?orderId=${encodeURIComponent(orderId)}`} className={styles.inlineLink}>
      {tx.description || 'View order'}
    </Link>
  )
}

const WALLET_SK_TX_COLS = ['Date', 'Type', 'Description', 'Amount', 'Status']
const WALLET_SK_WD_COLS = ['Date', 'Amount', 'Net', 'Status']

function WalletSkeletonTable({ columns, rowCount, rowWidths }) {
  return (
    <div className={styles.dataTableWrap}>
      <table className={styles.dataTable}>
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col}>{col}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rowCount }).map((_, i) => (
            <tr key={`sk-row-${i}`} className={styles.walletSkRow}>
              {rowWidths[i].map((w, j) => (
                <td key={j}>
                  <span className={styles.walletSkBar} style={w} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function SellerWalletLoadingFallback() {
  const txRowWidths = [
    [{ width: '72%', maxWidth: 140 }, { width: 64 }, { width: '85%' }, { width: 72 }, { width: 80 }],
    [{ width: '68%', maxWidth: 130 }, { width: 56 }, { width: '78%' }, { width: 68 }, { width: 72 }],
    [{ width: '75%', maxWidth: 150 }, { width: 60 }, { width: '82%' }, { width: 76 }, { width: 68 }],
    [{ width: '70%', maxWidth: 135 }, { width: 58 }, { width: '80%' }, { width: 70 }, { width: 76 }],
    [{ width: '74%', maxWidth: 145 }, { width: 62 }, { width: '76%' }, { width: 74 }, { width: 64 }],
  ]

  const wdRowWidths = [
    [{ width: '70%', maxWidth: 130 }, { width: 80 }, { width: 72 }, { width: 88 }],
    [{ width: '65%', maxWidth: 120 }, { width: 76 }, { width: 68 }, { width: 80 }],
    [{ width: '72%', maxWidth: 128 }, { width: 84 }, { width: 70 }, { width: 92 }],
  ]

  return (
    <div
      className={styles.pageWrap}
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label="Loading wallet"
    >
      <section className={styles.summaryStrip} aria-hidden>
        {[0, 1, 2, 3].map((i) => (
          <article key={i} className={styles.summaryCard}>
            <span className={`${styles.walletSkBar} ${styles.walletSkSummaryLabel}`} />
            <span className={`${styles.walletSkBar} ${styles.walletSkSummaryValue}`} />
            <span className={`${styles.walletSkBar} ${styles.walletSkSummaryHint}`} />
          </article>
        ))}
      </section>

      <div className={`${styles.walletSkActionsRow} ${styles.actionsRow}`} aria-hidden>
        <span className={`${styles.walletSkBar} ${styles.walletSkActionBtn}`} />
        <span className={`${styles.walletSkBar} ${styles.walletSkActionBtnNarrow}`} />
        <span className={`${styles.walletSkBar} ${styles.walletSkActionBtnNarrow}`} />
      </div>

      <section className={styles.sectionCard} aria-hidden>
        <div className={styles.sectionHeader}>
          <span className={`${styles.walletSkBar} ${styles.walletSkSectionTitle}`} />
          <span className={`${styles.walletSkBar} ${styles.walletSkSectionSub}`} />
        </div>
        <div className={styles.walletSkTableOnly}>
          <WalletSkeletonTable columns={WALLET_SK_TX_COLS} rowCount={5} rowWidths={txRowWidths} />
        </div>
        <div className={styles.walletSkMobileOnly} aria-hidden>
          {Array.from({ length: 4 }).map((_, i) => (
            <article key={`tx-mob-${i}`} className={styles.walletSkMobileCard}>
              <div className={styles.walletSkMobileCardTop}>
                <span className={styles.walletSkBar} style={{ width: 72, height: 20, borderRadius: 999 }} />
                <span className={styles.walletSkBar} style={{ width: 64, height: 14 }} />
              </div>
              <span className={`${styles.walletSkBar} ${styles.walletSkMobileCardLine}`} />
              <div className={styles.walletSkMobileCardTop} style={{ marginTop: 8 }}>
                <span className={styles.walletSkBar} style={{ width: '55%', height: 10 }} />
                <span className={styles.walletSkBar} style={{ width: 56, height: 10 }} />
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.sectionCard} aria-hidden>
        <div className={styles.sectionHeader}>
          <span className={`${styles.walletSkBar} ${styles.walletSkSectionTitle}`} />
          <span className={`${styles.walletSkBar} ${styles.walletSkSectionSub}`} />
        </div>
        <div className={styles.walletSkTableOnly}>
          <WalletSkeletonTable columns={WALLET_SK_WD_COLS} rowCount={3} rowWidths={wdRowWidths} />
        </div>
        <div className={styles.walletSkMobileOnly} aria-hidden>
          {Array.from({ length: 3 }).map((_, i) => (
            <article key={`wd-mob-${i}`} className={styles.walletSkMobileCard}>
              <div className={styles.walletSkMobileCardTop}>
                <span className={styles.walletSkBar} style={{ width: 88, height: 16 }} />
                <span className={styles.walletSkBar} style={{ width: 72, height: 14 }} />
              </div>
              <span className={`${styles.walletSkBar} ${styles.walletSkMobileCardLine}`} style={{ width: '48%' }} />
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}

export default function WalletContent() {
  const toast = useToast()
  const withdrawalsRef = useRef(null)
  const [summary, setSummary] = useState(null)
  const [transactions, setTransactions] = useState([])
  const [withdrawals, setWithdrawals] = useState([])
  const [withdrawReady, setWithdrawReady] = useState(false)
  const [withdrawConfig, setWithdrawConfig] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [amount, setAmount] = useState('')

  const loadAll = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [walletData, txData, wdData] = await Promise.all([
        fetchSellerWalletSummary(),
        fetchSellerWalletTransactions({ limit: 50 }),
        fetchSellerWithdrawals({ limit: 20 }),
      ])
      setSummary(walletData.summary ?? null)
      setWithdrawConfig(walletData.withdrawConfig ?? null)
      setWithdrawReady(Boolean(walletData.withdrawConfig?.withdrawReady))
      setTransactions(txData.transactions ?? [])
      setWithdrawals(wdData.withdrawals ?? [])
    } catch (err) {
      setError(err?.message || 'Failed to load wallet.')
      setSummary(null)
      setWithdrawConfig(null)
      setWithdrawReady(false)
      setTransactions([])
      setWithdrawals([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadAll()
  }, [loadAll])

  const available = Number(summary?.availableBalance) || 0

  const openWithdraw = () => {
    if (!withdrawReady) return
    if (available > 0) {
      setAmount(String(Math.floor(available * 100) / 100))
    }
    setModalOpen(true)
  }

  const scrollToWithdrawals = () => {
    withdrawalsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const onSubmitWithdraw = async (event) => {
    event.preventDefault()
    const value = Number(amount)
    if (!Number.isFinite(value) || value <= 0) {
      toast.error('Enter a valid withdrawal amount.')
      return
    }
    if (value < MIN_WITHDRAWAL_PHP) {
      toast.error(`Minimum withdrawal is ${formatPhpAmount(MIN_WITHDRAWAL_PHP)}.`)
      return
    }
    if (value > available + 0.001) {
      toast.error(`Amount exceeds available balance (${formatPhpAmount(available)}).`)
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
      setModalOpen(false)
      setAmount('')
      await loadAll()
    } catch (err) {
      toast.error(err?.message || 'Withdrawal failed.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading && !summary && !error) {
    return <SellerWalletLoadingFallback />
  }

  return (
    <div className={styles.pageWrap}>
      {error ? (
        <div className={styles.retryRow}>
          <p className={styles.errorBanner}>{error}</p>
          <button type="button" className={styles.retryButton} onClick={() => loadAll()}>
            Try again
          </button>
        </div>
      ) : null}

      <section className={styles.summaryStrip} aria-label="Wallet summary">
        <article className={styles.summaryCard}>
          <span className={styles.summaryLabel}>Available balance</span>
          <span className={styles.summaryValue}>
            {loading ? '…' : formatPhpAmount(summary?.availableBalance)}
          </span>
          <span className={styles.summaryHint}>Ready to withdraw after admin release</span>
        </article>
        <article className={styles.summaryCard}>
          <span className={styles.summaryLabel}>Pending balance</span>
          <span className={styles.summaryValue}>
            {loading ? '…' : formatPhpAmount(summary?.pendingBalance)}
          </span>
          <span className={styles.summaryHint}>In escrow until release or on hold</span>
        </article>
        <article className={styles.summaryCard}>
          <span className={styles.summaryLabel}>Processing withdrawals</span>
          <span className={styles.summaryValue}>
            {loading ? '…' : formatPhpAmount(summary?.processingWithdrawals)}
          </span>
          <span className={styles.summaryHint}>Submitted to payout provider</span>
        </article>
        <article className={styles.summaryCard}>
          <span className={styles.summaryLabel}>Lifetime earnings</span>
          <span className={styles.summaryValue}>
            {loading ? '…' : formatPhpAmount(summary?.lifetimeEarnings)}
          </span>
          <span className={styles.summaryHint}>Net from all orders (escrow)</span>
        </article>
      </section>

      <div className={styles.actionsRow}>
        <button
          type="button"
          className={styles.btnPrimary}
          onClick={openWithdraw}
          disabled={loading || !withdrawReady || available < MIN_WITHDRAWAL_PHP}
        >
          <GiReceiveMoney size={18} aria-hidden />
          Withdraw funds
        </button>
        <button
          type="button"
          className={styles.btnSecondary}
          onClick={scrollToWithdrawals}
          disabled={loading}
        >
          <TbHistory size={18} aria-hidden />
          View withdrawal history
        </button>
        <Link href="/seller/settings/payouts" className={styles.btnSecondary}>
          <TbWallet size={18} aria-hidden />
          Payout settings
        </Link>
      </div>

      {!loading && withdrawConfig && !withdrawConfig.payoutSettingsComplete ? (
        <div className={styles.withdrawNotice} role="status">
          <TbInfoCircle className={styles.withdrawNoticeIcon} size={20} aria-hidden />
          <p className={styles.withdrawNoticeText}>
            {withdrawConfig.payoutSettingsError || 'Complete your payout details before withdrawing.'}{' '}
            <Link href="/seller/settings/payouts" className={styles.inlineLink}>
              Open payout settings
            </Link>
          </p>
        </div>
      ) : null}
      {!loading && withdrawConfig?.manualPayoutOnly ? (
        <div className={styles.withdrawNotice} role="status">
          <TbInfoCircle className={styles.withdrawNoticeIcon} size={20} aria-hidden />
          <p className={styles.withdrawNoticeText}>
            You selected manual payout. Wallet withdraw requires bank or GCash in{' '}
            <Link href="/seller/settings/payouts" className={styles.inlineLink}>
              payout settings
            </Link>
            .
          </p>
        </div>
      ) : null}
      {!loading &&
      withdrawConfig?.payoutSettingsComplete &&
      !withdrawConfig.manualPayoutOnly &&
      !withdrawConfig.automatedReady ? (
        <div className={styles.withdrawNotice} role="status">
          <TbInfoCircle className={styles.withdrawNoticeIcon} size={20} aria-hidden />
          <p className={styles.withdrawNoticeText}>
            Automated withdrawals are not enabled on the platform yet. Your payout details are saved;
            transfers will run when PayMongo disbursement is turned on.
          </p>
        </div>
      ) : null}

      <section className={styles.sectionCard} aria-label="Recent transactions">
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Recent transactions</h2>
          <p className={styles.sectionSubtitle}>
            Earnings become available only after order completion and admin release.
          </p>
        </div>
        {transactions.length === 0 ? (
          <p className={styles.emptyState}>No wallet transactions yet.</p>
        ) : (
          <>
            <div className={styles.dataTableWrap}>
              <table className={styles.dataTable}>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Type</th>
                    <th>Description</th>
                    <th>Amount</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx) => {
                    const amt = formatTxAmount(tx.amount)
                    return (
                      <tr key={tx.id}>
                        <td>{formatDate(tx.date)}</td>
                        <td>
                          <span className={`${styles.typeBadge} ${typeBadgeClass(tx.type)}`}>
                            {TX_TYPE_LABEL[tx.type] || tx.type}
                          </span>
                        </td>
                        <td>
                          <TransactionDescription tx={tx} />
                        </td>
                        <td className={amt.className}>{amt.text}</td>
                        <td>
                          <span className={styles.statusChip}>{tx.statusLabel || tx.status}</span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <div className={styles.mobileCardList}>
              {transactions.map((tx) => {
                const amt = formatTxAmount(tx.amount)
                return (
                  <article key={tx.id} className={styles.mobileCard}>
                    <div className={styles.mobileCardRow}>
                      <span className={`${styles.typeBadge} ${typeBadgeClass(tx.type)}`}>
                        {TX_TYPE_LABEL[tx.type] || tx.type}
                      </span>
                      <span className={amt.className}>{amt.text}</span>
                    </div>
                    <p className={styles.mobileCardRow}>
                      <TransactionDescription tx={tx} />
                    </p>
                    <div className={styles.mobileCardRow}>
                      <span>{formatDate(tx.date)}</span>
                      <span className={styles.statusChip}>{tx.statusLabel || tx.status}</span>
                    </div>
                  </article>
                )
              })}
            </div>
          </>
        )}
      </section>

      <section
        ref={withdrawalsRef}
        className={styles.sectionCard}
        aria-label="Recent withdrawals"
        id="withdrawal-history"
      >
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Recent withdrawals</h2>
          <p className={styles.sectionSubtitle}>Transfers to your saved bank or GCash account.</p>
        </div>
        {withdrawals.length === 0 ? (
          <p className={styles.emptyState}>No withdrawals yet.</p>
        ) : (
          <>
            <div className={styles.dataTableWrap}>
              <table className={styles.dataTable}>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Amount</th>
                    <th>Net</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {withdrawals.map((row) => (
                    <tr key={row.id}>
                      <td>{formatDate(row.createdAt)}</td>
                      <td>{formatPhpAmount(row.amountPhp)}</td>
                      <td>{formatPhpAmount(row.netAmountPhp ?? row.amountPhp)}</td>
                      <td>
                        <span className={styles.statusChip}>{row.statusLabel || row.status}</span>
                        {row.failureReason ? (
                          <div className={styles.failureReason}>{row.failureReason}</div>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className={styles.mobileCardList}>
              {withdrawals.map((row) => (
                <article key={row.id} className={styles.mobileCard}>
                  <div className={styles.mobileCardRow}>
                    <strong>{formatPhpAmount(row.amountPhp)}</strong>
                    <span className={styles.statusChip}>{row.statusLabel || row.status}</span>
                  </div>
                  <p className={styles.mobileCardRow}>
                    <span className={styles.mobileCardLabel}>Date</span>
                    {formatDate(row.createdAt)}
                  </p>
                  {row.failureReason ? (
                    <p className={`${styles.mobileCardRow} ${styles.failureReason}`}>
                      {row.failureReason}
                    </p>
                  ) : null}
                </article>
              ))}
            </div>
          </>
        )}
      </section>

      {modalOpen && typeof document !== 'undefined'
        ? createPortal(
          <div
            className={styles.modalOverlay}
            role="presentation"
            onClick={() => {
              if (!submitting) setModalOpen(false)
            }}
          >
            <div
              className={styles.modalCard}
              role="dialog"
              aria-modal="true"
              aria-labelledby="withdraw-funds-title"
              onClick={(e) => e.stopPropagation()}
            >
              <div className={styles.modalHeader}>
                <h2 id="withdraw-funds-title" className={styles.modalTitle}>
                  Withdraw funds
                </h2>
                <button
                  type="button"
                  className={styles.modalCloseBtn}
                  onClick={() => {
                    if (!submitting) setModalOpen(false)
                  }}
                  disabled={submitting}
                  aria-label="Close"
                >
                  ×
                </button>
              </div>
              {!withdrawReady ? (
                <p className={styles.modalHint}>
                  {withdrawConfig?.manualPayoutOnly
                    ? 'Switch to bank or GCash in payout settings to withdraw from your wallet.'
                    : withdrawConfig?.payoutSettingsError ||
                      'Complete payout settings and enable platform disbursement before withdrawing.'}{' '}
                  <Link href="/seller/settings/payouts" className={styles.inlineLink}>
                    Open payout settings
                  </Link>
                </p>
              ) : null}
              <form className={styles.modalForm} onSubmit={onSubmitWithdraw}>
                <p className={styles.modalSubtitle}>
                  Available: {formatPhpAmount(available)} · Minimum{' '}
                  {formatPhpAmount(MIN_WITHDRAWAL_PHP)}
                </p>
                <label className={styles.modalField}>
                  <span className={styles.modalLabel}>Amount (PHP)</span>
                  <input
                    className={styles.modalInput}
                    type="number"
                    min={MIN_WITHDRAWAL_PHP}
                    step="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    required
                    disabled={!withdrawReady || submitting}
                  />
                </label>
                <div className={styles.modalActions}>
                  <button
                    type="button"
                    className={styles.btnGhost}
                    onClick={() => {
                      if (!submitting) setModalOpen(false)
                    }}
                    disabled={submitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className={styles.btnPrimary}
                    disabled={submitting || !withdrawReady}
                  >
                    {submitting ? 'Processing…' : 'Confirm withdrawal'}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )
      : null}
    </div>
  )
}
