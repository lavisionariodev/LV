/**
 * Maps escrow + ledger + withdrawal rows into seller-facing wallet transaction feed.
 * Pending ORDER_EARNING rows are informational only — not spendable until admin release.
 */

export const WALLET_TX_TYPES = [
  'ORDER_EARNING',
  'REFUND',
  'WITHDRAWAL',
  'ADMIN_ADJUSTMENT',
  'FEE',
]

/**
 * @param {string | null | undefined} orderId
 * @param {Record<string, string> | undefined} orderNumberById
 */
function orderLabel(orderId, orderNumberById) {
  if (!orderId) return 'Order'
  const key = String(orderId)
  const num = orderNumberById?.[key]
  if (num) return `Order #${num}`
  return `Order ${key.slice(0, 8)}`
}

function escrowStatusToTxStatus(escrowStatus) {
  const s = String(escrowStatus || '').toLowerCase()
  if (s === 'on_hold') return 'on_hold'
  if (s === 'escrowed') return 'pending'
  if (s === 'released') return 'completed'
  if (s === 'refunded') return 'refunded'
  return s || 'pending'
}

function withdrawalStatusToTxStatus(status) {
  const s = String(status || '').toLowerCase()
  if (s === 'succeeded') return 'completed'
  if (s === 'submitted') return 'processing'
  if (s === 'pending') return 'pending'
  if (s === 'failed') return 'failed'
  if (s === 'cancelled') return 'cancelled'
  return s || 'pending'
}

function statusLabel(status) {
  const s = String(status || '').toLowerCase()
  if (s === 'completed') return 'Completed'
  if (s === 'processing') return 'Processing'
  if (s === 'pending') return 'Pending'
  if (s === 'on_hold') return 'On hold'
  if (s === 'failed') return 'Failed'
  if (s === 'cancelled') return 'Cancelled'
  if (s === 'refunded') return 'Refunded'
  return status || '—'
}

/**
 * @param {any[]} escrows
 * @param {any[]} ledgerEntries
 * @param {any[]} withdrawals
 * @param {{ orderNumberById?: Record<string, string> }} [opts]
 */
export function buildSellerWalletTransactions(escrows, ledgerEntries, withdrawals, opts = {}) {
  const { orderNumberById = {} } = opts
  const transactions = []
  const withdrawalIdsFromTable = new Set((withdrawals ?? []).map((w) => String(w.id)))

  for (const escrow of escrows ?? []) {
    const status = String(escrow.status || '').toLowerCase()
    const orderId = escrow.order_id ? String(escrow.order_id) : null
    const escrowId = escrow.id ? String(escrow.id) : null
    const net = Number(escrow.net_amount) || 0
    if (status === 'released') {
      continue
    }

    // Pending / on-hold escrow earnings — not available for withdrawal until admin release.
    if ((status === 'escrowed' || status === 'on_hold') && net > 0) {
      const txStatus = escrowStatusToTxStatus(status)
      let description = `${orderLabel(orderId, orderNumberById)} — awaiting admin release`
      if (status === 'on_hold' && escrow.hold_reason) {
        description = `${orderLabel(orderId, orderNumberById)} — on hold: ${escrow.hold_reason}`
      }
      transactions.push({
        id: `escrow-pending:${escrowId}`,
        date: escrow.created_at || escrow.updated_at,
        type: 'ORDER_EARNING',
        description,
        amount: net,
        status: txStatus,
        statusLabel: statusLabel(txStatus),
        referenceType: 'escrow',
        referenceId: escrowId,
        orderId,
        spendable: false,
      })
    }

    // FEE rows come from ledger order_payment entries (avoid duplicating per escrow).
  }

  for (const row of ledgerEntries ?? []) {
    const entryType = String(row.entry_type || '').toLowerCase()
    const orderId = row.order_id ? String(row.order_id) : null
    const escrowId = row.escrow_id ? String(row.escrow_id) : null
    const amount = Number(row.amount_php) || 0
    const meta = row.metadata && typeof row.metadata === 'object' ? row.metadata : {}
    const createdAt = row.created_at

    if (entryType === 'held_funds' || entryType === 'order_payment') {
      if (entryType === 'order_payment') {
        const commission = Number(meta.commission_amount) || 0
        const rate = Number(meta.commission_rate_percent) || 0
        if (commission > 0) {
          const feeId = escrowId ? `ledger-fee:escrow:${escrowId}` : `ledger-fee:${row.id}`
          if (!transactions.some((t) => t.id === feeId)) {
            transactions.push({
              id: feeId,
              date: createdAt,
              type: 'FEE',
              description: `Platform commission (${rate}%) — ${orderLabel(orderId, orderNumberById)}`,
              amount: -commission,
              status: 'completed',
              statusLabel: statusLabel('completed'),
              referenceType: escrowId ? 'escrow' : 'order',
              referenceId: escrowId || orderId,
              orderId,
              spendable: false,
            })
          }
        }
      }
      continue
    }

    if (entryType === 'payout_release') {
      const ref = meta.release_reference ? String(meta.release_reference) : null
      transactions.push({
        id: `ledger-release:${row.id}`,
        date: createdAt,
        type: 'ORDER_EARNING',
        description: `${orderLabel(orderId, orderNumberById)} — released to wallet${ref ? ` (${ref})` : ''}`,
        amount,
        status: 'completed',
        statusLabel: statusLabel('completed'),
        referenceType: 'escrow',
        referenceId: escrowId,
        orderId,
        spendable: true,
      })
      continue
    }

    if (entryType === 'refund') {
      transactions.push({
        id: `ledger-refund:${row.id}`,
        date: createdAt,
        type: 'REFUND',
        description: `Refund — ${orderLabel(orderId, orderNumberById)}`,
        amount: -Math.abs(amount),
        status: 'completed',
        statusLabel: statusLabel('completed'),
        referenceType: 'order',
        referenceId: orderId,
        orderId,
        spendable: false,
      })
      continue
    }

    if (entryType === 'adjustment') {
      const reason = meta.reason ? String(meta.reason) : 'Admin adjustment'
      transactions.push({
        id: `ledger-adjustment:${row.id}`,
        date: createdAt,
        type: 'ADMIN_ADJUSTMENT',
        description: reason,
        amount,
        status: 'completed',
        statusLabel: statusLabel('completed'),
        referenceType: 'adjustment',
        referenceId: row.id,
        orderId: null,
        spendable: false,
      })
      continue
    }

    if (entryType === 'withdrawal') {
      const wid = meta.withdrawal_id ? String(meta.withdrawal_id) : null
      if (wid && withdrawalIdsFromTable.has(wid)) continue
      transactions.push({
        id: `ledger-withdrawal:${row.id}`,
        date: createdAt,
        type: 'WITHDRAWAL',
        description: 'Withdrawal to payout account',
        amount: -Math.abs(amount),
        status: 'completed',
        statusLabel: statusLabel('completed'),
        referenceType: 'withdrawal',
        referenceId: wid || row.id,
        orderId: null,
        spendable: false,
      })
    }
  }

  for (const row of withdrawals ?? []) {
    const id = String(row.id)
    const amount = Number(row.amount_php) || 0
    const snap = row.destination_snapshot && typeof row.destination_snapshot === 'object'
      ? row.destination_snapshot
      : {}
    const method = snap.payout_method === 'gcash' ? 'GCash' : snap.payout_method === 'bank' ? 'bank' : 'payout account'
    const txStatus = withdrawalStatusToTxStatus(row.status)

    transactions.push({
      id: `withdrawal:${id}`,
      date: row.created_at,
      type: 'WITHDRAWAL',
      description: `Withdrawal to ${method}`,
      amount: -Math.abs(amount),
      status: txStatus,
      statusLabel: statusLabel(txStatus),
      referenceType: 'withdrawal',
      referenceId: id,
      orderId: null,
      spendable: false,
      failureReason: row.failure_reason || null,
    })
  }

  transactions.sort((a, b) => {
    const ta = new Date(a.date).getTime()
    const tb = new Date(b.date).getTime()
    return (Number.isFinite(tb) ? tb : 0) - (Number.isFinite(ta) ? ta : 0)
  })

  return transactions
}

/**
 * @param {ReturnType<typeof buildSellerWalletTransactions>} transactions
 * @param {{ limit?: number, offset?: number }} [opts]
 */
export function paginateWalletTransactions(transactions, opts = {}) {
  const limit = Math.min(Math.max(1, opts.limit ?? 50), 100)
  const offset = Math.max(0, opts.offset ?? 0)
  const total = transactions.length
  const items = transactions.slice(offset, offset + limit)
  return {
    items,
    page: { limit, offset, total, hasMore: offset + limit < total },
  }
}

/** @param {Record<string, unknown> | null | undefined} summary */
export function mapWalletSummaryForApi(summary) {
  return {
    availableBalance: Number(summary?.availableNet) || 0,
    pendingBalance: Number(summary?.heldBalanceNet) || 0,
    processingWithdrawals: Number(summary?.pendingWithdrawalNet) || 0,
    lifetimeEarnings: Number(summary?.totalEarningsNet) || 0,
    currency: summary?.currency || 'PHP',
    walletBalanceNet: Number(summary?.walletBalanceNet) || 0,
    withdrawnNet: Number(summary?.withdrawnNet) || 0,
  }
}

export function mapWithdrawalForApi(row) {
  return {
    id: row.id,
    amountPhp: row.amount_php,
    feePhp: row.fee_php ?? 0,
    netAmountPhp: row.net_amount_php ?? row.amount_php,
    currency: row.currency,
    status: row.status,
    statusLabel: statusLabel(withdrawalStatusToTxStatus(row.status)),
    failureReason: row.failure_reason,
    submittedAt: row.submitted_at,
    settledAt: row.settled_at,
    createdAt: row.created_at,
  }
}
