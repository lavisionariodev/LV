import {
  evaluateSellerPayoutSettingsForDisbursement,
  getPayoutVerificationError,
  isPaymongoDisbursementEnabled,
} from './disbursement.js'
import { getPlatformWithdrawalFeePhp, MIN_WITHDRAWAL_PHP } from './payout.js'
import { loadSellerWalletContext } from './wallet.js'
import { createPaymongoBatchTransfer } from '@/lib/paymongo/client'
import { recordPayoutReleaseLedgerEntry, recordWithdrawalLedgerEntry } from '@/lib/payments/walletLedgerEvents'

export { MIN_WITHDRAWAL_PHP, getPlatformWithdrawalFeePhp }

const IN_FLIGHT_WITHDRAWAL_STATUSES = ['pending', 'submitted']
const IN_FLIGHT_WITHDRAWAL_STATUSES_SET = new Set(['pending', 'submitted'])
const IN_FLIGHT_DISBURSEMENT_STATUSES = new Set(['pending', 'submitted'])

function snapshotPayoutSettings(row) {
  if (!row) return {}
  return {
    payout_method: row.payout_method,
    account_holder_name: row.account_holder_name,
    bank_name: row.bank_name,
    account_number: row.account_number,
    gcash_name: row.gcash_name,
    gcash_number: row.gcash_number,
    payout_email: row.payout_email,
    notes: row.notes,
    verification_status: row.verification_status,
  }
}

async function findInFlightWithdrawal(supabaseAdmin, sellerUserId) {
  const { data, error } = await supabaseAdmin
    .from('seller_withdrawals')
    .select('id, status')
    .eq('seller_user_id', sellerUserId)
    .in('status', IN_FLIGHT_WITHDRAWAL_STATUSES)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw error
  return data
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} supabaseAdmin
 * @param {{ sellerUserId: string, amountPhp: number, idempotencyKey: string }} input
 */
export async function processSellerWithdrawal(supabaseAdmin, input) {
  const sellerUserId = String(input.sellerUserId || '').trim()
  const amountPhp = Number(input.amountPhp)
  const clientKey = String(input.idempotencyKey || '').trim()

  if (!sellerUserId) {
    return { ok: false, error: 'Missing seller user.', status: 400 }
  }
  if (!Number.isFinite(amountPhp) || amountPhp <= 0) {
    return { ok: false, error: 'Withdrawal amount must be greater than zero.', status: 400 }
  }
  if (amountPhp < MIN_WITHDRAWAL_PHP) {
    return { ok: false, error: `Minimum withdrawal is ₱${MIN_WITHDRAWAL_PHP}.`, status: 400 }
  }
  if (!clientKey) {
    return { ok: false, error: 'Missing idempotency key.', status: 400 }
  }

  if (!isPaymongoDisbursementEnabled()) {
    return {
      ok: false,
      error: 'Automated withdrawals are not enabled. Contact platform support.',
      status: 503,
    }
  }

  const idempotencyKey = `withdraw:${sellerUserId}:${clientKey}`

  const { data: existing } = await supabaseAdmin
    .from('seller_withdrawals')
    .select('*')
    .eq('idempotency_key', idempotencyKey)
    .maybeSingle()

  if (existing) {
    const st = String(existing.status || '').toLowerCase()
    if (st === 'succeeded') {
      return { ok: true, withdrawal: existing, alreadyProcessed: true }
    }
    if (st === 'pending' || st === 'submitted') {
      return {
        ok: true,
        withdrawal: existing,
        pending: true,
        withdrawalStatus: st,
      }
    }
  }

  const inFlight = await findInFlightWithdrawal(supabaseAdmin, sellerUserId)
  if (inFlight) {
    return {
      ok: false,
      error: 'A withdrawal is already processing. Wait for it to complete before submitting another.',
      status: 409,
    }
  }

  const { summary } = await loadSellerWalletContext(supabaseAdmin, sellerUserId)
  if (amountPhp > summary.availableNet + 0.001) {
    return {
      ok: false,
      error: `Amount exceeds available balance (₱${summary.availableNet.toFixed(2)}).`,
      status: 400,
    }
  }

  const { data: payoutSettings, error: payoutErr } = await supabaseAdmin
    .from('seller_payout_settings')
    .select('*')
    .eq('seller_user_id', sellerUserId)
    .maybeSingle()

  if (payoutErr) {
    return { ok: false, error: payoutErr.message || 'Could not load payout settings.', status: 500 }
  }

  const verificationError = getPayoutVerificationError(payoutSettings)
  if (verificationError) {
    return { ok: false, error: verificationError, status: 400 }
  }

  const payoutDestination = evaluateSellerPayoutSettingsForDisbursement(payoutSettings)
  if (!payoutDestination.ok) {
    return { ok: false, error: payoutDestination.error, status: 400 }
  }

  const feePhp = getPlatformWithdrawalFeePhp()
  const netAmountPhp = Math.max(0, amountPhp - feePhp)
  if (netAmountPhp <= 0) {
    return {
      ok: false,
      error: 'Withdrawal amount is too low after platform fee.',
      status: 400,
    }
  }

  const { data: withdrawal, error: insertErr } = await supabaseAdmin
    .from('seller_withdrawals')
    .insert({
      seller_user_id: sellerUserId,
      amount_php: amountPhp,
      fee_php: feePhp,
      net_amount_php: netAmountPhp,
      payout_settings_seller_user_id: payoutSettings?.seller_user_id ?? sellerUserId,
      currency: summary.currency || 'PHP',
      destination_snapshot: snapshotPayoutSettings(payoutSettings),
      status: 'pending',
      idempotency_key: idempotencyKey,
    })
    .select('*')
    .maybeSingle()

  if (insertErr) {
    if (insertErr.code === '23505') {
      const { data: again } = await supabaseAdmin
        .from('seller_withdrawals')
        .select('*')
        .eq('idempotency_key', idempotencyKey)
        .maybeSingle()
      if (again) {
        const st = String(again.status || '').toLowerCase()
        if (st === 'pending' || st === 'submitted') {
          return {
            ok: false,
            error: 'A withdrawal is already processing. Wait for it to complete before submitting another.',
            status: 409,
          }
        }
        return { ok: true, withdrawal: again, alreadyProcessed: st === 'succeeded' }
      }
    }
    return { ok: false, error: insertErr.message || 'Could not create withdrawal.', status: 500 }
  }

  if (!withdrawal) {
    return { ok: false, error: 'Could not create withdrawal.', status: 500 }
  }

  const transfer = await createPaymongoBatchTransfer({
    amountPhp: netAmountPhp,
    destination: payoutDestination.destination,
    referenceNumber: `lv_withdraw_${withdrawal.id}`,
    metadata: {
      seller_user_id: sellerUserId,
      withdrawal_id: withdrawal.id,
    },
  })

  if (!transfer.ok) {
    await supabaseAdmin
      .from('seller_withdrawals')
      .update({
        status: 'failed',
        failure_reason: transfer.error,
        settled_at: new Date().toISOString(),
      })
      .eq('id', withdrawal.id)

    return { ok: false, error: transfer.error, status: transfer.status || 502 }
  }

  const submittedAt = new Date().toISOString()
  const { data: submittedWithdrawal, error: submitErr } = await supabaseAdmin
    .from('seller_withdrawals')
    .update({
      status: 'submitted',
      paymongo_batch_id: transfer.batchId,
      paymongo_transfer_id: transfer.transferId,
      submitted_at: submittedAt,
      failure_reason: null,
    })
    .eq('id', withdrawal.id)
    .select('*')
    .maybeSingle()

  if (submitErr || !submittedWithdrawal) {
    return { ok: false, error: submitErr?.message || 'Could not update withdrawal status.', status: 500 }
  }

  const transferStatus = String(transfer.transferStatus || '').toLowerCase()
  if (transferStatus === 'succeeded') {
    const finalized = await finalizeSuccessfulWithdrawal(supabaseAdmin, {
      withdrawal: submittedWithdrawal,
      releaseReference: transfer.transferId,
    })
    if (!finalized.ok) {
      return finalized
    }
    return { ok: true, withdrawal: { ...submittedWithdrawal, status: 'succeeded' } }
  }

  return {
    ok: true,
    withdrawal: submittedWithdrawal,
    pending: true,
    withdrawalStatus: 'submitted',
    paymongoTransferId: transfer.transferId,
  }
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} supabaseAdmin
 * @param {{ disbursement: any, escrow: any, orderId: string, adminUserId: string | null, releaseReference?: string | null }} params
 */
export async function finalizeSuccessfulDisbursement(supabaseAdmin, params) {
  const { disbursement, escrow, orderId, adminUserId, releaseReference } = params
  const now = new Date().toISOString()
  const releaseRef =
    releaseReference ||
    disbursement.paymongo_transfer_id ||
    disbursement.paymongo_batch_id ||
    null

  const { data: updatedEscrow, error: escrowErr } = await supabaseAdmin
    .from('order_escrows')
    .update({
      status: 'released',
      released_at: now,
      released_by: adminUserId,
      release_reference: releaseRef,
    })
    .eq('id', escrow.id)
    .eq('status', 'escrowed')
    .select('id')
    .maybeSingle()

  if (escrowErr) {
    return { ok: false, error: escrowErr.message || 'Could not release escrow.', status: 500 }
  }

  if (!updatedEscrow) {
    const { data: again } = await supabaseAdmin
      .from('order_escrows')
      .select('status')
      .eq('id', escrow.id)
      .maybeSingle()
    if (again?.status === 'released') {
      return { ok: true, alreadyReleased: true, disbursementId: disbursement.id }
    }
    return { ok: false, error: 'Could not release escrow (state changed).', status: 409 }
  }

  await supabaseAdmin
    .from('payout_disbursements')
    .update({
      status: 'succeeded',
      settled_at: now,
      failure_reason: null,
    })
    .eq('id', disbursement.id)

  await recordPayoutReleaseLedgerEntry(supabaseAdmin, {
    escrow,
    orderId,
    disbursementId: disbursement.id,
    releaseReference: releaseRef,
    mode: 'automated',
    metadata: {
      paymongo_batch_id: disbursement.paymongo_batch_id,
      paymongo_transfer_id: disbursement.paymongo_transfer_id,
    },
  })

  return { ok: true, disbursementId: disbursement.id }
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} supabaseAdmin
 * @param {{ withdrawal: any, releaseReference?: string | null }} params
 */
export async function finalizeSuccessfulWithdrawal(supabaseAdmin, params) {
  const { withdrawal, releaseReference } = params
  const now = new Date().toISOString()
  const ref =
    releaseReference || withdrawal.paymongo_transfer_id || withdrawal.paymongo_batch_id || null

  const currentStatus = String(withdrawal.status || '').toLowerCase()
  if (currentStatus === 'succeeded') {
    return { ok: true, alreadySettled: true, withdrawalId: withdrawal.id }
  }

  const { data: updated, error: updErr } = await supabaseAdmin
    .from('seller_withdrawals')
    .update({
      status: 'succeeded',
      settled_at: now,
      failure_reason: null,
    })
    .eq('id', withdrawal.id)
    .select('*')
    .maybeSingle()

  if (updErr || !updated) {
    return { ok: false, error: updErr?.message || 'Could not settle withdrawal.', status: 500 }
  }

  await recordWithdrawalLedgerEntry(supabaseAdmin, {
    withdrawalId: updated.id,
    sellerUserId: updated.seller_user_id,
    amountPhp: Number(updated.amount_php) || 0,
    currency: updated.currency || 'PHP',
    metadata: {
      paymongo_batch_id: updated.paymongo_batch_id,
      paymongo_transfer_id: updated.paymongo_transfer_id,
      release_reference: ref,
    },
  })

  return { ok: true, withdrawalId: updated.id }
}

async function reconcileLegacyDisbursement(supabaseAdmin, event) {
  const transferId = event.transferId ? String(event.transferId) : ''
  const batchId = event.batchId ? String(event.batchId) : ''
  const status = String(event.status || '').toLowerCase()

  let query = supabaseAdmin.from('payout_disbursements').select('*')
  if (transferId) query = query.eq('paymongo_transfer_id', transferId)
  else query = query.eq('paymongo_batch_id', batchId)

  const { data: disbursement, error } = await query
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    return { ok: false, error: error.message || 'Could not load disbursement.' }
  }
  if (!disbursement) {
    return { ok: true, ignored: true }
  }

  const currentStatus = String(disbursement.status || '').toLowerCase()
  if (currentStatus === 'succeeded') {
    return { ok: true, alreadySettled: true, disbursementId: disbursement.id, legacy: true }
  }

  if (status === 'failed' || status === 'cancelled') {
    await supabaseAdmin
      .from('payout_disbursements')
      .update({
        status,
        failure_reason: event.failureReason || `PayMongo transfer ${status}`,
        settled_at: new Date().toISOString(),
      })
      .eq('id', disbursement.id)
    return { ok: true, failed: true, disbursementId: disbursement.id, legacy: true }
  }

  if (status !== 'succeeded') {
    if (IN_FLIGHT_DISBURSEMENT_STATUSES.has(currentStatus) && status) {
      await supabaseAdmin.from('payout_disbursements').update({ status: 'submitted' }).eq('id', disbursement.id)
    }
    return { ok: true, pending: true, disbursementId: disbursement.id, legacy: true }
  }

  const { data: escrow } = await supabaseAdmin
    .from('order_escrows')
    .select('*')
    .eq('id', disbursement.escrow_id)
    .maybeSingle()

  if (!escrow) {
    return { ok: false, error: 'Escrow not found for legacy disbursement.' }
  }

  return finalizeSuccessfulDisbursement(supabaseAdmin, {
    disbursement,
    escrow,
    orderId: disbursement.order_id,
    adminUserId: disbursement.created_by,
    releaseReference: transferId || batchId,
  })
}

async function reconcileSellerWithdrawal(supabaseAdmin, event) {
  const transferId = event.transferId ? String(event.transferId) : ''
  const batchId = event.batchId ? String(event.batchId) : ''
  const status = String(event.status || '').toLowerCase()

  let query = supabaseAdmin.from('seller_withdrawals').select('*')
  if (transferId) query = query.eq('paymongo_transfer_id', transferId)
  else query = query.eq('paymongo_batch_id', batchId)

  const { data: withdrawal, error } = await query
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    return { ok: false, error: error.message || 'Could not load withdrawal.' }
  }
  if (!withdrawal) {
    return null
  }

  const currentStatus = String(withdrawal.status || '').toLowerCase()
  if (currentStatus === 'succeeded') {
    return { ok: true, alreadySettled: true, withdrawalId: withdrawal.id }
  }

  if (status === 'failed' || status === 'cancelled') {
    await supabaseAdmin
      .from('seller_withdrawals')
      .update({
        status,
        failure_reason: event.failureReason || `PayMongo transfer ${status}`,
        settled_at: new Date().toISOString(),
      })
      .eq('id', withdrawal.id)
    return { ok: true, failed: true, withdrawalId: withdrawal.id }
  }

  if (status !== 'succeeded') {
    if (IN_FLIGHT_WITHDRAWAL_STATUSES_SET.has(currentStatus) && status) {
      await supabaseAdmin.from('seller_withdrawals').update({ status: 'submitted' }).eq('id', withdrawal.id)
    }
    return { ok: true, pending: true, withdrawalId: withdrawal.id }
  }

  return finalizeSuccessfulWithdrawal(supabaseAdmin, {
    withdrawal,
    releaseReference: transferId || batchId,
  })
}

/**
 * PayMongo transfer webhook: seller withdrawals first, then legacy per-escrow disbursements.
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} supabaseAdmin
 * @param {{ transferId?: string | null, batchId?: string | null, status?: string | null, failureReason?: string | null }} event
 */
export async function reconcilePaymongoTransferEvent(supabaseAdmin, event) {
  const transferId = event.transferId ? String(event.transferId) : ''
  const batchId = event.batchId ? String(event.batchId) : ''

  if (!transferId && !batchId) {
    return { ok: false, error: 'Missing transfer id.' }
  }

  const withdrawalResult = await reconcileSellerWithdrawal(supabaseAdmin, event)
  if (withdrawalResult) {
    return withdrawalResult
  }

  return reconcileLegacyDisbursement(supabaseAdmin, event)
}

/** @deprecated use reconcilePaymongoTransferEvent */
export async function reconcilePaymongoDisbursementEvent(supabaseAdmin, event) {
  return reconcilePaymongoTransferEvent(supabaseAdmin, event)
}
