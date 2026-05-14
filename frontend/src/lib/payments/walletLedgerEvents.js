import { insertWalletLedgerEntry } from './walletLedger.js'

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} supabaseAdmin
 * @param {Record<string, unknown>} escrow
 */
export async function recordEscrowFundingLedgerEntries(supabaseAdmin, escrow) {
  const escrowId = escrow?.id ? String(escrow.id) : ''
  const sellerUserId = escrow?.seller_user_id ? String(escrow.seller_user_id) : ''
  const orderId = escrow?.order_id ? String(escrow.order_id) : null
  if (!escrowId || !sellerUserId) return

  const currency = escrow.currency || 'PHP'
  const grossAmount = Number(escrow.gross_amount) || 0
  const netAmount = Number(escrow.net_amount) || 0
  const paymentId = escrow.payment_id ? String(escrow.payment_id) : null

  if (grossAmount > 0) {
    await insertWalletLedgerEntry(supabaseAdmin, {
      seller_user_id: sellerUserId,
      order_id: orderId,
      escrow_id: escrowId,
      disbursement_id: null,
      entry_type: 'order_payment',
      amount_php: grossAmount,
      currency,
      metadata: {
        payment_id: paymentId,
        commission_amount: Number(escrow.commission_amount) || 0,
        commission_rate_percent: Number(escrow.commission_rate_percent) || 0,
      },
      idempotency_key: `order_payment:${escrowId}`,
    })
  }

  if (netAmount > 0) {
    await insertWalletLedgerEntry(supabaseAdmin, {
      seller_user_id: sellerUserId,
      order_id: orderId,
      escrow_id: escrowId,
      disbursement_id: null,
      entry_type: 'held_funds',
      amount_php: netAmount,
      currency,
      metadata: {
        payment_id: paymentId,
        gross_amount: grossAmount,
      },
      idempotency_key: `held_funds:${escrowId}`,
    })
  }
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} supabaseAdmin
 * @param {{
 *   escrow: Record<string, unknown>,
 *   orderId: string,
 *   disbursementId?: string | null,
 *   releaseReference?: string | null,
 *   mode?: 'automated' | 'manual',
 *   metadata?: Record<string, unknown>,
 * }} params
 */
export async function recordPayoutReleaseLedgerEntry(supabaseAdmin, params) {
  const { escrow, orderId, disbursementId, releaseReference, mode = 'automated', metadata = {} } = params
  const escrowId = escrow?.id ? String(escrow.id) : ''
  const sellerUserId = escrow?.seller_user_id ? String(escrow.seller_user_id) : ''
  if (!escrowId || !sellerUserId || !orderId) return

  const amountPhp = Number(escrow.net_amount) || 0
  if (amountPhp <= 0) return

  const idempotencyKey = disbursementId
    ? `payout_release:${disbursementId}`
    : `payout_release:manual:${escrowId}`

  await insertWalletLedgerEntry(supabaseAdmin, {
    seller_user_id: sellerUserId,
    order_id: orderId,
    escrow_id: escrowId,
    disbursement_id: disbursementId || null,
    entry_type: 'payout_release',
    amount_php: amountPhp,
    currency: escrow.currency || 'PHP',
    metadata: {
      release_reference: releaseReference || null,
      release_mode: mode,
      ...metadata,
    },
    idempotency_key: idempotencyKey,
  })
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} supabaseAdmin
 * @param {{
 *   escrow: Record<string, unknown>,
 *   orderId: string,
 *   refundId?: string | null,
 *   amountPhp?: number | null,
 * }} params
 */
export async function recordRefundLedgerEntry(supabaseAdmin, params) {
  const { escrow, orderId, refundId, amountPhp } = params
  const escrowId = escrow?.id ? String(escrow.id) : ''
  const sellerUserId = escrow?.seller_user_id ? String(escrow.seller_user_id) : ''
  if (!escrowId || !sellerUserId || !orderId) return

  const amount = Number(amountPhp ?? escrow.net_amount) || 0
  if (amount <= 0) return

  const refundKey = refundId ? String(refundId) : 'terminal'
  await insertWalletLedgerEntry(supabaseAdmin, {
    seller_user_id: sellerUserId,
    order_id: orderId,
    escrow_id: escrowId,
    disbursement_id: null,
    entry_type: 'refund',
    amount_php: amount,
    currency: escrow.currency || 'PHP',
    metadata: {
      paymongo_refund_id: refundId || null,
    },
    idempotency_key: `refund:${orderId}:${refundKey}`,
  })
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} supabaseAdmin
 * @param {{
 *   payoutRequestId: string,
 *   sellerUserId: string,
 *   amountPhp: number,
 *   currency?: string,
 *   metadata?: Record<string, unknown>,
 * }} params
 */
export async function recordWithdrawalLedgerEntry(supabaseAdmin, params) {
  const { payoutRequestId, sellerUserId, amountPhp, currency = 'PHP', metadata = {} } = params
  const requestId = payoutRequestId ? String(payoutRequestId) : ''
  const sellerId = sellerUserId ? String(sellerUserId) : ''
  const amount = Number(amountPhp) || 0
  if (!requestId || !sellerId || amount <= 0) return

  await insertWalletLedgerEntry(supabaseAdmin, {
    seller_user_id: sellerId,
    order_id: null,
    escrow_id: null,
    disbursement_id: null,
    entry_type: 'withdrawal',
    amount_php: amount,
    currency,
    metadata: {
      payout_request_id: requestId,
      ...metadata,
    },
    idempotency_key: `withdrawal:payout_request:${requestId}`,
  })
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} supabaseAdmin
 * @param {{
 *   sellerUserId: string,
 *   amountPhp: number,
 *   currency?: string,
 *   reason: string,
 *   adminUserId: string,
 *   idempotencyKey: string,
 *   metadata?: Record<string, unknown>,
 * }} params
 */
export async function recordAdjustmentLedgerEntry(supabaseAdmin, params) {
  const {
    sellerUserId,
    amountPhp,
    currency = 'PHP',
    reason,
    adminUserId,
    idempotencyKey,
    metadata = {},
  } = params
  const sellerId = sellerUserId ? String(sellerUserId) : ''
  const amount = Number(amountPhp)
  const key = idempotencyKey ? String(idempotencyKey).trim() : ''
  const auditReason = typeof reason === 'string' ? reason.trim() : ''

  if (!sellerId || !Number.isFinite(amount) || amount === 0) {
    return { ok: false, error: 'A non-zero adjustment amount and seller are required.' }
  }
  if (!key) {
    return { ok: false, error: 'Missing adjustment idempotency key.' }
  }
  if (!auditReason) {
    return { ok: false, error: 'A reason is required for ledger adjustments.' }
  }

  return insertWalletLedgerEntry(supabaseAdmin, {
    seller_user_id: sellerId,
    order_id: null,
    escrow_id: null,
    disbursement_id: null,
    entry_type: 'adjustment',
    amount_php: amount,
    currency,
    metadata: {
      reason: auditReason,
      admin_user_id: adminUserId,
      ...metadata,
    },
    idempotency_key: key,
  })
}
