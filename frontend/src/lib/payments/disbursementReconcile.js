import { recordPayoutReleaseLedgerEntry } from '@/lib/payments/walletLedgerEvents'

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

export { reconcilePaymongoTransferEvent as reconcilePaymongoDisbursementEvent } from '@/lib/payments/withdrawalReconcile'
