const SUCCEEDED_DISBURSEMENT_STATUS = 'succeeded'
const ACTIVE_WITHDRAWAL_STATUSES = new Set(['pending', 'submitted', 'succeeded'])
const PENDING_WITHDRAWAL_STATUSES = new Set(['pending', 'submitted'])

function sumAmount(rows, field, predicate = () => true) {
  return rows.reduce((total, row) => {
    if (!predicate(row)) return total
    const value = Number(row[field])
    return total + (Number.isFinite(value) ? value : 0)
  }, 0)
}

function indexDisbursementsByEscrowId(disbursements) {
  const byEscrowId = new Map()
  for (const row of disbursements ?? []) {
    if (!row?.escrow_id) continue
    const existing = byEscrowId.get(row.escrow_id)
    if (!existing) {
      byEscrowId.set(row.escrow_id, row)
      continue
    }
    const existingRank = disbursementRank(existing.status)
    const nextRank = disbursementRank(row.status)
    if (nextRank > existingRank) {
      byEscrowId.set(row.escrow_id, row)
    }
  }
  return byEscrowId
}

export { indexDisbursementsByEscrowId }

function disbursementRank(status) {
  const value = String(status || '').toLowerCase()
  if (value === SUCCEEDED_DISBURSEMENT_STATUS) return 4
  if (value === 'submitted') return 3
  if (value === 'pending') return 2
  if (value === 'failed') return 1
  return 0
}

/**
 * @param {any[]} escrows
 * @param {any[]} disbursements
 * @param {any[]} withdrawals
 * @param {any[]} ledgerEntries
 */
export function buildSellerWalletSummary(
  escrows,
  disbursements = [],
  withdrawals = [],
  ledgerEntries = [],
) {
  const rows = escrows ?? []
  const disbursementByEscrowId = indexDisbursementsByEscrowId(disbursements)
  const currency =
    rows[0]?.currency || disbursements[0]?.currency || withdrawals[0]?.currency || 'PHP'

  let walletBalanceNet = 0
  let legacyPaidViaDisbursementNet = 0

  for (const escrow of rows) {
    if (String(escrow.status || '').toLowerCase() !== 'released') continue
    const net = Number(escrow.net_amount) || 0
    const disbursement = disbursementByEscrowId.get(escrow.id)
    if (disbursement?.status === SUCCEEDED_DISBURSEMENT_STATUS) {
      legacyPaidViaDisbursementNet += net
    } else {
      walletBalanceNet += net
    }
  }

  const heldBalanceNet = sumAmount(rows, 'net_amount', (row) => {
    const status = String(row.status || '').toLowerCase()
    return status === 'escrowed' || status === 'on_hold'
  })
  const escrowedNet = sumAmount(rows, 'net_amount', (row) => String(row.status || '').toLowerCase() === 'escrowed')
  const heldNet = sumAmount(rows, 'net_amount', (row) => String(row.status || '').toLowerCase() === 'on_hold')
  const onHoldNet = heldNet
  const refundedNet = sumAmount(rows, 'net_amount', (row) => String(row.status || '').toLowerCase() === 'refunded')
  const releasedNet = sumAmount(rows, 'net_amount', (row) => String(row.status || '').toLowerCase() === 'released')

  const pendingWithdrawalNet = sumAmount(withdrawals, 'amount_php', (row) =>
    PENDING_WITHDRAWAL_STATUSES.has(String(row.status || '').toLowerCase()),
  )

  const reservedWithdrawalNet = sumAmount(withdrawals, 'amount_php', (row) =>
    ACTIVE_WITHDRAWAL_STATUSES.has(String(row.status || '').toLowerCase()),
  )

  const succeededWithdrawalNet = sumAmount(withdrawals, 'amount_php', (row) =>
    String(row.status || '').toLowerCase() === 'succeeded',
  )

  const adjustmentNet = sumAmount(ledgerEntries, 'amount_php', (row) => row.entry_type === 'adjustment')
  const payoutReleaseLedgerNet = sumAmount(ledgerEntries, 'amount_php', (row) => row.entry_type === 'payout_release')

  const gross = sumAmount(rows, 'gross_amount')
  const commission = sumAmount(rows, 'commission_amount')
  const net = sumAmount(rows, 'net_amount')

  const paidOutNet = legacyPaidViaDisbursementNet + succeededWithdrawalNet
  const availableNet = Math.max(0, walletBalanceNet - reservedWithdrawalNet + adjustmentNet)

  return {
    count: rows.length,
    currency,
    gross,
    commission,
    net,
    escrowedNet,
    heldNet,
    onHoldNet,
    releasedNet,
    refundedNet,
    heldBalanceNet,
    walletBalanceNet,
    pendingWithdrawalNet,
    availableNet,
    paidOutNet,
    withdrawnNet: succeededWithdrawalNet,
    payoutReleaseLedgerNet,
    adjustmentNet,
    totalEarningsGross: gross,
    totalEarningsNet: net,
    legacyPaidViaDisbursementNet,
    /** @deprecated use pendingWithdrawalNet */
    pendingDisbursementNet: pendingWithdrawalNet,
  }
}

/**
 * @param {any} escrow
 * @param {any | null | undefined} disbursement
 */
export function resolveEscrowDisbursementState(escrow, disbursement) {
  const escrowStatus = String(escrow?.status || '').toLowerCase()
  const disbursementStatus = String(disbursement?.status || '').toLowerCase()

  if (disbursementStatus === SUCCEEDED_DISBURSEMENT_STATUS) return 'legacy_paid'
  if (escrowStatus === 'released') return 'wallet_credited'
  return 'none'
}

export function isPaymongoDisbursementEnabled() {
  return String(process.env.PAYMONGO_DISBURSEMENT_ENABLED || '').toLowerCase() === 'true'
}
