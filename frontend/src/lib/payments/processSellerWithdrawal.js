import { evaluateSellerPayoutSettingsForDisbursement } from '@/lib/payments/disbursementConfig'
import { buildSellerWalletSummary, isPaymongoDisbursementEnabled } from '@/lib/payments/sellerWalletSummary'
import { finalizeSuccessfulWithdrawal } from '@/lib/payments/withdrawalReconcile'
import {
  fetchPayoutDisbursementsForSeller,
  fetchSellerWalletLedgerEntries,
  fetchSellerWithdrawalsForSeller,
} from '@/lib/payments/walletLedger'
import { createPaymongoBatchTransfer } from '@/lib/paymongo/client'

export const MIN_WITHDRAWAL_PHP = 100

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
  }
}

async function loadSellerWalletContext(supabaseAdmin, sellerUserId) {
  const [{ data: escrows }, disbursements, withdrawals, ledgerEntries] = await Promise.all([
    supabaseAdmin.from('order_escrows').select('*').eq('seller_user_id', sellerUserId),
    fetchPayoutDisbursementsForSeller(supabaseAdmin, { sellerUserId }),
    fetchSellerWithdrawalsForSeller(supabaseAdmin, sellerUserId),
    fetchSellerWalletLedgerEntries(supabaseAdmin, sellerUserId),
  ])

  const summary = buildSellerWalletSummary(escrows ?? [], disbursements, withdrawals, ledgerEntries)
  return { escrows: escrows ?? [], summary, disbursements, withdrawals, ledgerEntries }
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

  const payoutDestination = evaluateSellerPayoutSettingsForDisbursement(payoutSettings)
  if (!payoutDestination.ok) {
    return { ok: false, error: payoutDestination.error, status: 400 }
  }

  const feePhp = 0
  const netAmountPhp = Math.max(0, amountPhp - feePhp)

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
        return { ok: true, withdrawal: again, alreadyProcessed: String(again.status).toLowerCase() === 'succeeded' }
      }
    }
    return { ok: false, error: insertErr.message || 'Could not create withdrawal.', status: 500 }
  }

  if (!withdrawal) {
    return { ok: false, error: 'Could not create withdrawal.', status: 500 }
  }

  const transfer = await createPaymongoBatchTransfer({
    amountPhp,
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

export { loadSellerWalletContext }
