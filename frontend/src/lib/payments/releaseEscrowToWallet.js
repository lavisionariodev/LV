import { canReleaseEscrow } from '@/lib/payments/orderMoneyState'
import { recordPayoutReleaseLedgerEntry } from '@/lib/payments/walletLedgerEvents'

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

/**
 * Admin release: mark escrow released and credit seller platform wallet (ledger only).
 * PayMongo transfer happens when the seller withdraws.
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} supabaseAdmin
 * @param {{ orderId: string, adminUserId: string, releaseReference?: string }} input
 */
export async function releaseEscrowToWallet(supabaseAdmin, input) {
  const orderId = String(input.orderId || '').trim()
  const adminUserId = String(input.adminUserId || '').trim()
  const releaseReference = input.releaseReference != null ? String(input.releaseReference).trim() : ''

  if (!orderId || !adminUserId) {
    return { ok: false, error: 'Missing orderId or admin user.', status: 400 }
  }

  const { order, escrow, activeDispute } = await loadReleaseContext(supabaseAdmin, orderId)
  const gate = canReleaseEscrow({ order, escrow, activeDispute })
  if (!gate.ok) {
    if (gate.alreadyReleased) {
      return { ok: true, alreadyReleased: true, mode: 'wallet' }
    }
    return { ok: false, error: gate.error, status: gate.status || 400 }
  }

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
      return { ok: true, alreadyReleased: true, mode: 'wallet' }
    }
    return { ok: false, error: 'Could not release escrow (state changed).', status: 409 }
  }

  await recordPayoutReleaseLedgerEntry(supabaseAdmin, {
    escrow,
    orderId,
    releaseReference: releaseReference || null,
    mode: 'wallet',
  })

  return { ok: true, mode: 'wallet' }
}
