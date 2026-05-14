import { canReleaseEscrow } from '@/lib/payments/orderMoneyState'
import { isPaymongoDisbursementEnabled } from '@/lib/payments/sellerWalletSummary'
import { finalizeSuccessfulDisbursement } from '@/lib/payments/disbursementReconcile'
import {
  buildPaymongoDestinationAccount,
  createPaymongoBatchTransfer,
} from '@/lib/paymongo/client'

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
  }
}

async function loadReleaseContext(supabaseAdmin, orderId) {
  const [{ data: order }, { data: escrow }, { data: activeDispute }] = await Promise.all([
    supabaseAdmin
      .from('orders')
      .select('id,payment_status,status,refund_status,fulfillment_status')
      .eq('id', orderId)
      .maybeSingle(),
    supabaseAdmin.from('order_escrows').select('*').eq('order_id', orderId).maybeSingle(),
    supabaseAdmin
      .from('disputes')
      .select('id,status')
      .eq('order_id', orderId)
      .in('status', ['open', 'under_review'])
      .limit(1)
      .maybeSingle(),
  ])

  return { order, escrow, activeDispute }
}

async function releaseEscrowManually(supabaseAdmin, { orderId, escrow, adminUserId, releaseReference }) {
  const { data: updated, error: updErr } = await supabaseAdmin
    .from('order_escrows')
    .update({
      status: 'released',
      released_at: new Date().toISOString(),
      released_by: adminUserId,
      release_reference: releaseReference || null,
    })
    .eq('order_id', orderId)
    .eq('status', 'escrowed')
    .select('id')
    .maybeSingle()

  if (updErr) {
    return { ok: false, error: updErr.message ?? 'Release failed.', status: 500 }
  }

  if (!updated) {
    const { data: again } = await supabaseAdmin
      .from('order_escrows')
      .select('status')
      .eq('order_id', orderId)
      .maybeSingle()
    if (again?.status === 'released') {
      return { ok: true, alreadyReleased: true, mode: 'manual' }
    }
    return { ok: false, error: 'Could not release escrow (state changed).', status: 409 }
  }

  return { ok: true, mode: 'manual' }
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} supabaseAdmin
 * @param {{ orderId: string, adminUserId: string, releaseReference?: string, manualOverride?: boolean, approvedRequestId?: string | null }} input
 */
export async function releaseEscrowWithDisbursement(supabaseAdmin, input) {
  const orderId = String(input.orderId || '').trim()
  const adminUserId = String(input.adminUserId || '').trim()
  const releaseReference = input.releaseReference != null ? String(input.releaseReference).trim() : ''
  const manualOverride = Boolean(input.manualOverride)
  const approvedRequestId = input.approvedRequestId ? String(input.approvedRequestId) : null

  if (!orderId || !adminUserId) {
    return { ok: false, error: 'Missing orderId or admin user.', status: 400 }
  }

  const { order, escrow, activeDispute } = await loadReleaseContext(supabaseAdmin, orderId)
  const gate = canReleaseEscrow({ order, escrow, activeDispute })
  if (!gate.ok) {
    if (gate.alreadyReleased) {
      return { ok: true, alreadyReleased: true }
    }
    return { ok: false, error: gate.error, status: gate.status || 400 }
  }

  const { data: existingDisbursement } = await supabaseAdmin
    .from('payout_disbursements')
    .select('*')
    .eq('escrow_id', escrow.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (existingDisbursement) {
    const existingStatus = String(existingDisbursement.status || '').toLowerCase()
    if (existingStatus === 'succeeded') {
      return { ok: true, alreadyReleased: true, disbursementId: existingDisbursement.id }
    }
    if (IN_FLIGHT_DISBURSEMENT_STATUSES.has(existingStatus)) {
      return {
        ok: true,
        pendingDisbursement: true,
        disbursementId: existingDisbursement.id,
        disbursementStatus: existingStatus,
      }
    }
  }

  if (!isPaymongoDisbursementEnabled() || manualOverride) {
    return releaseEscrowManually(supabaseAdmin, { orderId, escrow, adminUserId, releaseReference })
  }

  const { data: payoutSettings, error: payoutErr } = await supabaseAdmin
    .from('seller_payout_settings')
    .select('*')
    .eq('seller_user_id', escrow.seller_user_id)
    .maybeSingle()

  if (payoutErr) {
    return { ok: false, error: payoutErr.message || 'Could not load seller payout settings.', status: 500 }
  }

  const destination = buildPaymongoDestinationAccount(payoutSettings)
  if (!destination.ok) {
    return { ok: false, error: destination.error, status: 400 }
  }

  const idempotencyKey = `escrow:${escrow.id}:release`
  const { data: disbursement, error: insertErr } = await supabaseAdmin
    .from('payout_disbursements')
    .insert({
      escrow_id: escrow.id,
      order_id: orderId,
      seller_user_id: escrow.seller_user_id,
      amount_php: Number(escrow.net_amount) || 0,
      currency: escrow.currency || 'PHP',
      destination_snapshot: snapshotPayoutSettings(payoutSettings),
      status: 'pending',
      created_by: adminUserId,
      approved_request_id: approvedRequestId,
      idempotency_key: idempotencyKey,
    })
    .select('*')
    .maybeSingle()

  if (insertErr) {
    if (insertErr.code === '23505') {
      const { data: again } = await supabaseAdmin
        .from('payout_disbursements')
        .select('*')
        .eq('idempotency_key', idempotencyKey)
        .maybeSingle()
      if (again) {
        const againStatus = String(again.status || '').toLowerCase()
        if (againStatus === 'succeeded') {
          return { ok: true, alreadyReleased: true, disbursementId: again.id }
        }
        if (IN_FLIGHT_DISBURSEMENT_STATUSES.has(againStatus)) {
          return {
            ok: true,
            pendingDisbursement: true,
            disbursementId: again.id,
            disbursementStatus: againStatus,
          }
        }
      }
    }
    return { ok: false, error: insertErr.message || 'Could not create disbursement record.', status: 500 }
  }

  const transfer = await createPaymongoBatchTransfer({
    amountPhp: Number(escrow.net_amount) || 0,
    destination: destination.destination,
    referenceNumber: `lv_escrow_${escrow.id}`,
    metadata: {
      order_id: orderId,
      escrow_id: escrow.id,
      disbursement_id: disbursement.id,
    },
  })

  if (!transfer.ok) {
    await supabaseAdmin
      .from('payout_disbursements')
      .update({
        status: 'failed',
        failure_reason: transfer.error,
      })
      .eq('id', disbursement.id)

    return { ok: false, error: transfer.error, status: transfer.status || 502 }
  }

  const submittedAt = new Date().toISOString()
  const { data: submittedDisbursement, error: submitErr } = await supabaseAdmin
    .from('payout_disbursements')
    .update({
      status: 'submitted',
      paymongo_batch_id: transfer.batchId,
      paymongo_transfer_id: transfer.transferId,
      submitted_at: submittedAt,
      failure_reason: null,
    })
    .eq('id', disbursement.id)
    .select('*')
    .maybeSingle()

  if (submitErr || !submittedDisbursement) {
    return { ok: false, error: submitErr?.message || 'Could not update disbursement status.', status: 500 }
  }

  const transferStatus = String(transfer.transferStatus || '').toLowerCase()
  if (transferStatus === 'succeeded') {
    return finalizeSuccessfulDisbursement(supabaseAdmin, {
      disbursement: submittedDisbursement,
      escrow,
      orderId,
      adminUserId,
      releaseReference: releaseReference || transfer.transferId,
    })
  }

  return {
    ok: true,
    pendingDisbursement: true,
    disbursementId: submittedDisbursement.id,
    disbursementStatus: 'submitted',
    paymongoTransferId: transfer.transferId,
  }
}
