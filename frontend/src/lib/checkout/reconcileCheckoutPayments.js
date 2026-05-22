/** Stale PayMongo checkout sessions older than this are auto-abandoned on buyer order list. */
const STALE_CHECKOUT_MS = 90 * 60 * 1000

/**
 * Reset orders left at `payment_status: pending` when checkout was abandoned or failed.
 * @param {import('@supabase/supabase-js').SupabaseClient} supabaseAdmin
 * @param {string} buyerId
 * @param {string[]} orderIds
 */
export async function reconcileStaleCheckoutPayments(supabaseAdmin, buyerId, orderIds) {
  if (!orderIds.length) return

  const { data: staleOrders } = await supabaseAdmin
    .from('orders')
    .select('id,payment_status')
    .in('id', orderIds)
    .eq('buyer_id', buyerId)
    .eq('payment_status', 'pending')

  const staleOrderIds = (staleOrders ?? []).map((o) => o.id).filter(Boolean)
  if (!staleOrderIds.length) return

  const { data: links } = await supabaseAdmin
    .from('payment_orders')
    .select('order_id,payment_id')
    .in('order_id', staleOrderIds)

  if (!links?.length) {
    await supabaseAdmin
      .from('orders')
      .update({ payment_status: 'unpaid', status: 'pending_payment' })
      .in('id', staleOrderIds)
      .eq('buyer_id', buyerId)
    return
  }

  const paymentIds = [...new Set(links.map((r) => r.payment_id).filter(Boolean))]
  const { data: payments } = await supabaseAdmin
    .from('payments')
    .select('id,status,created_at,updated_at')
    .in('id', paymentIds)

  const paymentById = new Map((payments ?? []).map((p) => [p.id, p]))
  const now = Date.now()
  const ordersToReset = new Set()

  for (const link of links) {
    const pay = paymentById.get(link.payment_id)
    if (!pay) {
      ordersToReset.add(link.order_id)
      continue
    }
    const st = String(pay.status || '').toLowerCase()
    if (st === 'failed') {
      ordersToReset.add(link.order_id)
      continue
    }
    if (st === 'pending') {
      const ts = pay.updated_at || pay.created_at
      const age = ts ? now - new Date(ts).getTime() : STALE_CHECKOUT_MS + 1
      if (age > STALE_CHECKOUT_MS) {
        await supabaseAdmin
          .from('payments')
          .update({
            status: 'failed',
            metadata: { abandon_reason: 'stale_checkout_session' },
          })
          .eq('id', pay.id)
          .eq('status', 'pending')
        ordersToReset.add(link.order_id)
      }
    }
  }

  if (ordersToReset.size > 0) {
    await supabaseAdmin
      .from('orders')
      .update({ payment_status: 'unpaid', status: 'pending_payment' })
      .in('id', [...ordersToReset])
      .eq('buyer_id', buyerId)
      .eq('payment_status', 'pending')
  }
}

/**
 * Orders with a live PayMongo checkout (`payments.status === pending`, not stale).
 * @param {import('@supabase/supabase-js').SupabaseClient} supabaseAdmin
 * @param {string[]} orderIds
 * @returns {Promise<Map<string, boolean>>}
 */
export async function fetchActivePaymongoCheckoutByOrderId(supabaseAdmin, orderIds) {
  const map = new Map()
  if (!orderIds.length) return map

  const { data: links } = await supabaseAdmin
    .from('payment_orders')
    .select('order_id,payment_id')
    .in('order_id', orderIds)

  if (!links?.length) return map

  const paymentIds = [...new Set(links.map((r) => r.payment_id).filter(Boolean))]
  const { data: payments } = await supabaseAdmin
    .from('payments')
    .select('id,status,created_at,updated_at')
    .in('id', paymentIds)
    .eq('status', 'pending')

  const now = Date.now()
  const livePaymentIds = new Set()
  for (const pay of payments ?? []) {
    const ts = pay.updated_at || pay.created_at
    const age = ts ? now - new Date(ts).getTime() : 0
    if (age <= STALE_CHECKOUT_MS) livePaymentIds.add(pay.id)
  }

  for (const link of links) {
    if (livePaymentIds.has(link.payment_id)) map.set(link.order_id, true)
  }
  return map
}
