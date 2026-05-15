import { recordWithdrawalLedgerEntry } from '@/lib/payments/walletLedgerEvents'
import { finalizeSuccessfulDisbursement } from '@/lib/payments/disbursementReconcile'

const IN_FLIGHT_WITHDRAWAL_STATUSES = new Set(['pending', 'submitted'])
const IN_FLIGHT_DISBURSEMENT_STATUSES = new Set(['pending', 'submitted'])

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
    if (IN_FLIGHT_WITHDRAWAL_STATUSES.has(currentStatus) && status) {
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
