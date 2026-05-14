import { recordPayoutReleaseLedgerEntry } from '@/lib/payments/walletLedgerEvents'

const IN_FLIGHT_DISBURSEMENT_STATUSES = new Set(['pending', 'submitted'])

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
 * @param {{ transferId?: string | null, batchId?: string | null, status?: string | null, failureReason?: string | null }} event
 */
export async function reconcilePaymongoDisbursementEvent(supabaseAdmin, event) {
  const transferId = event.transferId ? String(event.transferId) : ''
  const batchId = event.batchId ? String(event.batchId) : ''
  const status = String(event.status || '').toLowerCase()

  if (!transferId && !batchId) {
    return { ok: false, error: 'Missing transfer id.' }
  }

  let query = supabaseAdmin.from('payout_disbursements').select('*')
  if (transferId) query = query.eq('paymongo_transfer_id', transferId)
  else query = query.eq('paymongo_batch_id', batchId)

  const { data: disbursement, error } = await query.order('created_at', { ascending: false }).limit(1).maybeSingle()
  if (error) {
    return { ok: false, error: error.message || 'Could not load disbursement.' }
  }
  if (!disbursement) {
    return { ok: true, ignored: true }
  }

  const currentStatus = String(disbursement.status || '').toLowerCase()
  if (currentStatus === 'succeeded') {
    return { ok: true, alreadySettled: true, disbursementId: disbursement.id }
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
    return { ok: true, failed: true, disbursementId: disbursement.id }
  }

  if (status !== 'succeeded') {
    if (IN_FLIGHT_DISBURSEMENT_STATUSES.has(currentStatus) && status) {
      await supabaseAdmin.from('payout_disbursements').update({ status: 'submitted' }).eq('id', disbursement.id)
    }
    return { ok: true, pending: true, disbursementId: disbursement.id }
  }

  const { data: escrow } = await supabaseAdmin
    .from('order_escrows')
    .select('*')
    .eq('id', disbursement.escrow_id)
    .maybeSingle()

  if (!escrow) {
    return { ok: false, error: 'Escrow not found for disbursement.' }
  }

  return finalizeSuccessfulDisbursement(supabaseAdmin, {
    disbursement,
    escrow,
    orderId: disbursement.order_id,
    adminUserId: disbursement.created_by,
    releaseReference: transferId || batchId,
  })
}
