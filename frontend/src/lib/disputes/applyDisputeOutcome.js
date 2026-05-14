import { createPaymongoRefund, phpToCentavos } from '@/lib/paymongo/client'
import { insertOrderRefundEvent } from '@/lib/payments/refundReconcile'
import { isDisputeEscrowHoldReason } from '@/lib/payments/orderMoneyState'

export const DISPUTE_CLOSE_STATUSES = new Set(['resolved', 'closed'])
export const DISPUTE_OUTCOMES = new Set(['continue_service', 'refund_buyer', 'no_financial_change'])

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} supabaseAdmin
 * @param {{ orderId: string, adminUserId: string, disputeId: string }} p
 */
async function initiateAdminDisputeRefund(supabaseAdmin, p) {
  const { data: order, error: orderErr } = await supabaseAdmin
    .from('orders')
    .select('id,subtotal,refund_status,payment_status,status')
    .eq('id', p.orderId)
    .maybeSingle()

  if (orderErr || !order) {
    return { ok: false, error: 'Order not found.', status: 404 }
  }

  const refundStatus = String(order.refund_status || '').toLowerCase()
  if (refundStatus === 'completed' || order.payment_status === 'refunded') {
    return { ok: true, refundAlreadyTerminal: true }
  }

  const { data: joinRows } = await supabaseAdmin
    .from('payment_orders')
    .select('payment_id')
    .eq('order_id', p.orderId)
    .limit(1)

  const paymentId = joinRows?.[0]?.payment_id ? String(joinRows[0].payment_id) : ''
  if (!paymentId) {
    await supabaseAdmin
      .from('orders')
      .update({
        refund_status: 'requested',
        payment_status: 'refund_pending',
      })
      .eq('id', p.orderId)

    await insertOrderRefundEvent(supabaseAdmin, {
      orderId: p.orderId,
      actor: 'admin',
      action: 'dispute_refund_requested',
      payload: { adminUserId: p.adminUserId, disputeId: p.disputeId },
    })

    return { ok: true, refundRequestedOnly: true }
  }

  const { data: payRow } = await supabaseAdmin
    .from('payments')
    .select('id,paymongo_payment_id,amount,refunded_amount_php')
    .eq('id', paymentId)
    .maybeSingle()

  const paymongoPid = String(payRow?.paymongo_payment_id || '').trim()
  if (!payRow || !paymongoPid) {
    await supabaseAdmin
      .from('orders')
      .update({
        refund_status: 'requested',
        payment_status: 'refund_pending',
      })
      .eq('id', p.orderId)

    await insertOrderRefundEvent(supabaseAdmin, {
      orderId: p.orderId,
      paymentId,
      actor: 'admin',
      action: 'dispute_refund_requested',
      payload: { adminUserId: p.adminUserId, disputeId: p.disputeId },
    })

    return { ok: true, refundRequestedOnly: true }
  }

  const paymentTotal = Number(payRow.amount) || 0
  const alreadyRefunded = Number(payRow.refunded_amount_php) || 0
  const orderSubtotal = Number(order.subtotal) || 0
  const remaining = Math.max(0, paymentTotal - alreadyRefunded)
  const refundPhp = Math.min(orderSubtotal, remaining)
  const centavos = phpToCentavos(refundPhp)
  if (!centavos || centavos <= 0) {
    return { ok: false, error: 'Invalid refund amount.', status: 400 }
  }

  const pm = await createPaymongoRefund({
    paymentId: paymongoPid,
    amountCentavos: centavos,
    notes: `Admin dispute refund order ${p.orderId}`,
    reason: 'requested_by_customer',
  })

  if (!pm.ok) {
    return { ok: false, error: pm.error || 'PayMongo refund failed.', status: 502 }
  }

  await supabaseAdmin
    .from('orders')
    .update({
      refund_status: 'processing',
      payment_status: 'refund_pending',
      paymongo_refund_id: pm.refundId,
    })
    .eq('id', p.orderId)

  await insertOrderRefundEvent(supabaseAdmin, {
    orderId: p.orderId,
    paymentId,
    actor: 'admin',
    action: 'dispute_refund_processing',
    paymongoRefundId: pm.refundId,
    payload: { adminUserId: p.adminUserId, disputeId: p.disputeId },
  })

  return { ok: true, paymongoRefundId: pm.refundId }
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} supabaseAdmin
 * @param {{
 *   disputeId: string,
 *   orderId: string,
 *   toStatus: string,
 *   outcome: string,
 *   adminUserId: string,
 * }} p
 */
export async function applyDisputeOutcome(supabaseAdmin, p) {
  const toStatus = String(p.toStatus || '').toLowerCase()
  const outcome = String(p.outcome || '').toLowerCase()

  if (!DISPUTE_CLOSE_STATUSES.has(toStatus)) {
    return { ok: true, skipped: true }
  }
  if (!DISPUTE_OUTCOMES.has(outcome)) {
    return { ok: false, error: 'Invalid dispute outcome.', status: 400 }
  }

  const [{ data: escrow }, { data: order }] = await Promise.all([
    supabaseAdmin.from('order_escrows').select('id,status,hold_reason').eq('order_id', p.orderId).maybeSingle(),
    supabaseAdmin
      .from('orders')
      .select('id,payment_status,status,refund_status,fulfillment_status')
      .eq('id', p.orderId)
      .maybeSingle(),
  ])

  if (!order) {
    return { ok: false, error: 'Order not found.', status: 404 }
  }

  if (escrow && String(escrow.status || '').toLowerCase() === 'released' && outcome === 'refund_buyer') {
    return {
      ok: false,
      error:
        'Escrow has already been released. Recover funds from the seller before marking a buyer refund outcome.',
      status: 409,
    }
  }

  if (outcome === 'refund_buyer') {
    await supabaseAdmin
      .from('order_escrows')
      .update({
        status: 'on_hold',
        hold_reason: `Admin dispute refund (${p.disputeId.slice(0, 8)}).`,
      })
      .eq('order_id', p.orderId)
      .neq('status', 'released')

    const refundResult = await initiateAdminDisputeRefund(supabaseAdmin, {
      orderId: p.orderId,
      adminUserId: p.adminUserId,
      disputeId: p.disputeId,
    })
    if (!refundResult.ok) return refundResult
    return { ok: true, refund: refundResult }
  }

  if (outcome === 'continue_service' || outcome === 'no_financial_change') {
    if (escrow && String(escrow.status || '').toLowerCase() === 'on_hold') {
      const holdReason = String(escrow.hold_reason || '')
      if (isDisputeEscrowHoldReason(holdReason)) {
        await supabaseAdmin
          .from('order_escrows')
          .update({
            status: 'escrowed',
            hold_reason: null,
          })
          .eq('order_id', p.orderId)
          .eq('status', 'on_hold')
      }
    }
  }

  return { ok: true }
}
