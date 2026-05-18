import { getSellerWithdrawReadiness, isPaymongoDisbursementEnabled } from './disbursement.js'

// --- Ledger queries ---

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} supabaseAdmin
 * @param {{ sellerUserId?: string | null, escrowIds?: string[] | null }} params
 */
export async function fetchPayoutDisbursementsForSeller(supabaseAdmin, { sellerUserId, escrowIds } = {}) {
  let query = supabaseAdmin
    .from('payout_disbursements')
    .select(
      'id,escrow_id,order_id,seller_user_id,amount_php,currency,status,failure_reason,paymongo_batch_id,paymongo_transfer_id,submitted_at,settled_at,approved_request_id,created_at',
    )
    .order('created_at', { ascending: false })

  if (sellerUserId) query = query.eq('seller_user_id', sellerUserId)
  if (escrowIds?.length) query = query.in('escrow_id', escrowIds)

  const { data, error } = await query
  if (error) throw error
  return data ?? []
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} supabaseAdmin
 * @param {string} sellerUserId
 */
export async function fetchSellerWalletLedgerEntries(supabaseAdmin, sellerUserId) {
  const { data, error } = await supabaseAdmin
    .from('seller_wallet_ledger')
    .select('id,seller_user_id,order_id,escrow_id,disbursement_id,entry_type,amount_php,currency,metadata,created_at')
    .eq('seller_user_id', sellerUserId)
    .order('created_at', { ascending: false })
    .limit(5000)

  if (error) throw error
  return data ?? []
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} supabaseAdmin
 * @param {string} sellerUserId
 */
export async function fetchSellerWithdrawalsForSeller(supabaseAdmin, sellerUserId) {
  const { data, error } = await supabaseAdmin
    .from('seller_withdrawals')
    .select(
      'id,seller_user_id,amount_php,fee_php,net_amount_php,currency,status,failure_reason,paymongo_batch_id,paymongo_transfer_id,submitted_at,settled_at,created_at',
    )
    .eq('seller_user_id', sellerUserId)
    .order('created_at', { ascending: false })
    .limit(500)

  if (error) throw error
  return data ?? []
}

export async function insertWalletLedgerEntry(supabaseAdmin, entry) {
  const { data, error } = await supabaseAdmin
    .from('seller_wallet_ledger')
    .insert(entry)
    .select('id')
    .maybeSingle()

  if (error?.code === '23505') {
    return { ok: true, duplicate: true, id: null }
  }
  if (error) {
    return { ok: false, error: error.message || 'Could not write wallet ledger entry.' }
  }
  return { ok: true, duplicate: false, id: data?.id ?? null }
}

// --- Wallet summary ---

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

function disbursementRank(status) {
  const value = String(status || '').toLowerCase()
  if (value === SUCCEEDED_DISBURSEMENT_STATUS) return 4
  if (value === 'submitted') return 3
  if (value === 'pending') return 2
  if (value === 'failed') return 1
  return 0
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

export { indexDisbursementsByEscrowId, isPaymongoDisbursementEnabled }

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

export async function loadSellerWalletContext(supabaseAdmin, sellerUserId) {
  const [{ data: escrows }, disbursements, withdrawals, ledgerEntries] = await Promise.all([
    supabaseAdmin.from('order_escrows').select('*').eq('seller_user_id', sellerUserId),
    fetchPayoutDisbursementsForSeller(supabaseAdmin, { sellerUserId }),
    fetchSellerWithdrawalsForSeller(supabaseAdmin, sellerUserId),
    fetchSellerWalletLedgerEntries(supabaseAdmin, sellerUserId),
  ])

  const summary = buildSellerWalletSummary(escrows ?? [], disbursements, withdrawals, ledgerEntries)
  return { escrows: escrows ?? [], summary, disbursements, withdrawals, ledgerEntries }
}

// --- Transaction feed ---

export const WALLET_TX_TYPES = [
  'ORDER_EARNING',
  'REFUND',
  'WITHDRAWAL',
  'ADMIN_ADJUSTMENT',
  'FEE',
]

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

const LEDGER_ENTRY_LABELS = {
  order_payment: 'Payment received',
  held_funds: 'In escrow',
  payout_release: 'Released to wallet',
  withdrawal: 'Withdrawal',
  refund: 'Refund',
  adjustment: 'Adjustment',
}

function shortLedgerOrderRef(orderId) {
  if (!orderId) return null
  const id = String(orderId)
  return `Order ${id.slice(0, 8).toUpperCase()}`
}

/**
 * @param {{
 *   entryType?: string,
 *   amountPhp?: number,
 *   orderId?: string | null,
 *   metadata?: Record<string, unknown>,
 *   createdAt?: string,
 * }} entry
 */
export function formatSellerLedgerEntry(entry) {
  const type = String(entry.entryType || '').toLowerCase()
  const amount = Number(entry.amountPhp) || 0
  const orderId = entry.orderId ? String(entry.orderId) : null
  const meta = entry.metadata && typeof entry.metadata === 'object' ? entry.metadata : {}
  const orderRef = shortLedgerOrderRef(orderId)

  const label = LEDGER_ENTRY_LABELS[type] || 'Wallet activity'

  let description = 'Wallet movement'
  let amountSign = 'neutral'

  switch (type) {
    case 'order_payment': {
      const commission = Number(meta.commission_amount) || 0
      const rate = Number(meta.commission_rate_percent) || 0
      description = orderRef
        ? `Buyer paid for ${orderRef}${commission > 0 ? ` (platform fee ${rate}% applies)` : ''}`
        : 'Buyer payment recorded for an order'
      amountSign = 'positive'
      break
    }
    case 'held_funds':
      description = orderRef
        ? `${orderRef} — earnings held until the booking is completed and released by admin`
        : 'Earnings held in escrow until admin release'
      amountSign = 'pending'
      break
    case 'payout_release':
      description = orderRef
        ? `${orderRef} — funds are now in your wallet and can be withdrawn`
        : 'Funds released to your wallet'
      amountSign = 'positive'
      break
    case 'withdrawal':
      description =
        meta.withdrawal_id != null
          ? 'Transfer to your saved bank or GCash account'
          : 'Withdrawal from your wallet'
      amountSign = 'negative'
      break
    case 'refund':
      description = orderRef
        ? `Refund processed for ${orderRef}`
        : 'Refund deducted from your earnings'
      amountSign = 'negative'
      break
    case 'adjustment':
      description =
        typeof meta.reason === 'string' && meta.reason.trim()
          ? meta.reason.trim()
          : 'Balance adjustment by platform admin'
      amountSign = amount >= 0 ? 'positive' : 'negative'
      break
    default:
      description = orderRef ? `Activity for ${orderRef}` : 'Wallet activity'
      amountSign = amount >= 0 ? 'positive' : 'negative'
  }

  const displayAmount = amountSign === 'negative' ? -Math.abs(amount) : Math.abs(amount)

  return {
    label,
    description,
    amountSign,
    displayAmount,
    orderId,
    orderRef,
    createdAt: entry.createdAt || null,
  }
}

// --- Wallet API route handlers ---

export async function loadSellerWalletApiContext(supabaseAdmin, sellerUserId) {
  const { escrows, summary, disbursements, withdrawals, ledgerEntries } =
    await loadSellerWalletContext(supabaseAdmin, sellerUserId)
  return { escrows, summary, disbursements, withdrawals, ledgerEntries }
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} supabaseAdmin
 * @param {string[]} orderIds
 */
export async function fetchOrderNumbersById(supabaseAdmin, orderIds) {
  const unique = [...new Set(orderIds.filter(Boolean))]
  if (unique.length === 0) return {}

  const { data, error } = await supabaseAdmin
    .from('orders')
    .select('id, order_number')
    .in('id', unique)

  if (error) throw error
  const map = {}
  for (const row of data ?? []) {
    if (row?.id) {
      map[String(row.id)] = row.order_number ? String(row.order_number) : String(row.id).slice(0, 8)
    }
  }
  return map
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} supabaseAdmin
 * @param {string} sellerUserId
 * @param {{ limit?: number, offset?: number }} [opts]
 */
export async function loadSellerWalletTransactionsPage(supabaseAdmin, sellerUserId, opts = {}) {
  const { escrows, ledgerEntries, withdrawals } = await loadSellerWalletApiContext(
    supabaseAdmin,
    sellerUserId,
  )

  const orderIds = [
    ...(escrows ?? []).map((e) => e.order_id),
    ...(ledgerEntries ?? []).map((e) => e.order_id),
  ].filter(Boolean)

  const orderNumberById = await fetchOrderNumbersById(supabaseAdmin, orderIds.map(String))
  const all = buildSellerWalletTransactions(escrows, ledgerEntries, withdrawals, { orderNumberById })

  const { items: pageItems, page } = paginateWalletTransactions(all, opts)
  const items = pageItems.map((tx) => ({
    id: tx.id,
    date: tx.date,
    type: tx.type,
    description: tx.description,
    amount: tx.amount,
    status: tx.status,
    statusLabel: tx.statusLabel,
    referenceType: tx.referenceType,
    referenceId: tx.referenceId,
    orderId: tx.orderId,
  }))

  return {
    transactions: items,
    page,
  }
}

export async function handleSellerWalletGet(supabaseAdmin, sellerUserId) {
  const { NextResponse } = await import('next/server')
  const [{ summary, withdrawals }, payoutSettingsResult] = await Promise.all([
    loadSellerWalletApiContext(supabaseAdmin, sellerUserId),
    supabaseAdmin.from('seller_payout_settings').select('*').eq('seller_user_id', sellerUserId).maybeSingle(),
  ])

  if (payoutSettingsResult.error) {
    return NextResponse.json(
      { error: payoutSettingsResult.error.message || 'Failed to load payout settings.' },
      { status: 500 },
    )
  }

  const payoutSettings = payoutSettingsResult.data ?? null
  const withdrawConfig = getSellerWithdrawReadiness(payoutSettings)

  return NextResponse.json({
    summary: mapWalletSummaryForApi(summary),
    /** @deprecated legacy snake_case fields for analytics withdraw panel */
    summaryLegacy: summary,
    withdrawConfig,
    withdrawals: (withdrawals ?? []).slice(0, 50).map(mapWithdrawalForApi),
  })
}

export async function handleSellerWalletWithdrawPost(supabaseAdmin, sellerUserId, body) {
  const { NextResponse } = await import('next/server')
  const amountPhp = Number(body?.amountPhp)
  const idempotencyKey =
    body?.idempotencyKey != null
      ? String(body.idempotencyKey).trim()
      : `client-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`

  const { processSellerWithdrawal } = await import('./withdrawal.js')
  const result = await processSellerWithdrawal(supabaseAdmin, {
    sellerUserId,
    amountPhp,
    idempotencyKey,
  })

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status || 400 })
  }

  const withdrawal = result.withdrawal
  return NextResponse.json(
    {
      ok: true,
      pending: Boolean(result.pending),
      alreadyProcessed: Boolean(result.alreadyProcessed),
      withdrawal: withdrawal ? mapWithdrawalForApi(withdrawal) : null,
    },
    { status: result.alreadyProcessed || result.pending ? 200 : 201 },
  )
}
