import { apiLog, errorMessage } from '@/lib/observability/apiLog'
import { insertUserNotification, notifySeller } from '@/lib/notifications/inAppServer'

export { insertUserNotification }

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} supabaseAdmin
 * @param {{ orderId: string, paymentId?: string | null, actor: string, action: string, paymongoRefundId?: string | null, payload?: unknown }} p
 */
export async function insertOrderRefundEvent(supabaseAdmin, p) {
  const { error } = await supabaseAdmin.from('order_refund_events').insert({
    order_id: p.orderId,
    payment_id: p.paymentId ?? null,
    actor: p.actor,
    action: p.action,
    paymongo_refund_id: p.paymongoRefundId ?? null,
    payload: p.payload ?? null,
  })
  if (error) {
    apiLog('order_refund_event.insert_failed', { err: errorMessage(error) })
  }
}

/**
 * Mark order + escrow terminal refunded after PayMongo confirms refund.
 * Idempotent: skips if order already refund_status completed and payment_status refunded.
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} supabaseAdmin
 * @param {{ orderId: string, paymongoRefundId: string, paymentId: string, amountPhp: number }} p
 */
export async function applyTerminalRefundToOrder(supabaseAdmin, p) {
  const { data: order, error: oErr } = await supabaseAdmin
    .from('orders')
    .select('id,buyer_id,seller_user_id,refund_status,payment_status,paymongo_refund_id')
    .eq('id', p.orderId)
    .maybeSingle()

  if (oErr || !order) return

  if (order.refund_status === 'completed' && order.payment_status === 'refunded') {
    return
  }

  const nowIso = new Date().toISOString()

  const { error: updErr } = await supabaseAdmin
    .from('orders')
    .update({
      refund_status: 'completed',
      payment_status: 'refunded',
      status: 'cancelled',
      fulfillment_status: 'cancelled',
      refund_completed_at: nowIso,
      paymongo_refund_id: p.paymongoRefundId,
    })
    .eq('id', p.orderId)

  if (updErr) {
    apiLog('refund_reconcile.order_update_failed', { err: errorMessage(updErr), orderId: p.orderId })
    return
  }

  await supabaseAdmin
    .from('order_escrows')
    .update({
      status: 'refunded',
      hold_reason: 'Buyer refunded via PayMongo; do not release payout for this order.',
    })
    .eq('order_id', p.orderId)

  await insertOrderRefundEvent(supabaseAdmin, {
    orderId: p.orderId,
    paymentId: p.paymentId,
    actor: 'webhook',
    action: 'refund_succeeded',
    paymongoRefundId: p.paymongoRefundId,
    payload: { amount_php: p.amountPhp },
  })

  const amountLabel = `\u20B1${Number(p.amountPhp).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`
  const ordRef = String(p.orderId || '').slice(0, 8)

  if (order.buyer_id) {
    await insertUserNotification(supabaseAdmin, {
      userId: order.buyer_id,
      type: 'payment_refund',
      title: 'Refund completed',
      body: `Your refund of ${amountLabel} has been issued to your original payment method. It may take a few business days to reflect on your statement, depending on your bank or e-wallet.`,
      metadata: { orderId: p.orderId, paymongoRefundId: p.paymongoRefundId },
      dedupeKey: `refund_completed:${p.orderId}:${p.paymongoRefundId}`,
    })
  }

  if (order.seller_user_id) {
    await notifySeller(supabaseAdmin, order.seller_user_id, {
      type: 'payment_refund',
      title: 'Refund completed for your booking',
      body: `Order ${ordRef}: the buyer’s refund (${amountLabel}) has been completed. This booking is closed and will not receive a payout.`,
      metadata: { orderId: p.orderId, paymongoRefundId: p.paymongoRefundId },
      dedupeKey: `refund_completed_seller:${p.orderId}:${p.paymongoRefundId}`,
    })
  }
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} supabaseAdmin
 * @param {{ internalPaymentId: string, paymongoRefundId: string, paymongoRefundStatus: string, amountCentavos?: number | null, skipAmountIncrement?: boolean }} p
 */
export async function syncPaymentRefundMirror(supabaseAdmin, p) {
  const { data: pay, error } = await supabaseAdmin
    .from('payments')
    .select('id,amount,status,refunded_amount_php,metadata')
    .eq('id', p.internalPaymentId)
    .maybeSingle()

  if (error || !pay) return

  const meta = pay.metadata && typeof pay.metadata === 'object' ? pay.metadata : {}
  const processed = Array.isArray(meta.processed_refund_ids) ? meta.processed_refund_ids.map(String) : []
  const rid = String(p.paymongoRefundId || '').trim()

  const st = String(p.paymongoRefundStatus || '').toLowerCase()
  const terminal = st === 'succeeded' || st === 'succeeded_at' || st === 'paid'

  const skipInc = Boolean(p.skipAmountIncrement) || !terminal
  if (rid && terminal && processed.includes(rid)) {
    return
  }

  const addPhp =
    !skipInc && p.amountCentavos != null && Number.isFinite(Number(p.amountCentavos))
      ? Number(p.amountCentavos) / 100
      : 0

  const prevRefunded = Number(pay.refunded_amount_php) || 0
  const totalAmt = Number(pay.amount) || 0
  const nextRefunded = prevRefunded + addPhp

  let nextStatus = pay.status
  if (terminal && totalAmt > 0 && nextRefunded + 0.005 >= totalAmt) {
    nextStatus = 'refunded'
  } else if (nextRefunded > 0.005) {
    nextStatus = 'partially_refunded'
  }

  const nextProcessed = rid && terminal ? [...processed, rid] : processed

  const patch = {
    paymongo_refund_id: p.paymongoRefundId,
    paymongo_refund_status: p.paymongoRefundStatus,
    refunded_amount_php: Math.min(nextRefunded, totalAmt || nextRefunded),
    refunded_at: terminal ? new Date().toISOString() : pay.refunded_at,
    status: nextStatus,
    metadata: { ...meta, processed_refund_ids: nextProcessed },
  }

  await supabaseAdmin.from('payments').update(patch).eq('id', p.internalPaymentId)
}

/**
 * Find internal payment UUID by PayMongo payment id (pay_xxx).
 * @param {import('@supabase/supabase-js').SupabaseClient} supabaseAdmin
 * @param {string} paymongoPaymentId
 */
export async function findPaymentByPaymongoPaymentId(supabaseAdmin, paymongoPaymentId) {
  const id = String(paymongoPaymentId || '').trim()
  if (!id) return null
  const { data, error } = await supabaseAdmin
    .from('payments')
    .select('id,status,amount,refunded_amount_php')
    .eq('paymongo_payment_id', id)
    .maybeSingle()
  if (error || !data) return null
  return data
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} supabaseAdmin
 * @param {string} paymongoRefundId
 */
export async function findOrderIdsByPaymongoRefundId(supabaseAdmin, paymongoRefundId) {
  const rid = String(paymongoRefundId || '').trim()
  if (!rid) return []
  const { data, error } = await supabaseAdmin.from('orders').select('id').eq('paymongo_refund_id', rid)
  if (error || !data?.length) return []
  return data.map((r) => r.id)
}

/**
 * Apply PayMongo refund webhook data: mirror payment row; on success, complete matching orders.
 * @param {import('@supabase/supabase-js').SupabaseClient} supabaseAdmin
 * @param {{ paymongoPaymentId: string, refundId: string, amountCentavos: number | null, status: string }} p
 */
export async function reconcilePaymongoRefundEvent(supabaseAdmin, p) {
  const paymongoPaymentId = String(p.paymongoPaymentId || '').trim()
  const refundId = String(p.refundId || '').trim()
  if (!paymongoPaymentId || !refundId) return

  const internal = await findPaymentByPaymongoPaymentId(supabaseAdmin, paymongoPaymentId)
  if (!internal?.id) return

  const st = String(p.status || '').toLowerCase()
  const terminal = st === 'succeeded' || st === 'succeeded_at' || st === 'paid'

  if (terminal) {
    const expectPhp =
      p.amountCentavos != null && Number.isFinite(Number(p.amountCentavos))
        ? Number(p.amountCentavos) / 100
        : 0

    let orderIds = await findOrderIdsByPaymongoRefundId(supabaseAdmin, refundId)
    let usedMultiOrderFallback = false

    if (orderIds.length === 0) {
      const { data: po } = await supabaseAdmin
        .from('payment_orders')
        .select('order_id')
        .eq('payment_id', internal.id)
      const cand = [...new Set((po ?? []).map((r) => r.order_id).filter(Boolean))]
      if (cand.length) {
        const { data: ords } = await supabaseAdmin
          .from('orders')
          .select('id,refund_status')
          .in('id', cand)
          .in('refund_status', ['processing', 'requested'])

        const processing = (ords ?? []).map((o) => o.id)
        const paymentTotal = Number(internal.amount) || 0
        const already = Number(internal.refunded_amount_php) || 0
        const remaining = Math.max(0, paymentTotal - already)

        if (processing.length === 1) {
          orderIds = processing
          usedMultiOrderFallback = true
        } else if (
          processing.length > 1 &&
          expectPhp > 0 &&
          Math.abs(expectPhp - remaining) < 0.02
        ) {
          // One PayMongo refund settling the full remaining balance for a multi-order checkout.
          orderIds = processing
          usedMultiOrderFallback = true
        }
      }
    }

    const amtPhp =
      usedMultiOrderFallback && orderIds.length > 1 && expectPhp > 0
        ? expectPhp / orderIds.length
        : expectPhp

    for (const oid of orderIds) {
      await applyTerminalRefundToOrder(supabaseAdmin, {
        orderId: oid,
        paymongoRefundId: refundId,
        paymentId: internal.id,
        amountPhp: amtPhp,
      })
    }
  }

  await syncPaymentRefundMirror(supabaseAdmin, {
    internalPaymentId: internal.id,
    paymongoRefundId: refundId,
    paymongoRefundStatus: p.status,
    amountCentavos: terminal ? p.amountCentavos : null,
    skipAmountIncrement: !terminal,
  })
}
