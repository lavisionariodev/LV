import { buildOrderLaneByOrderId } from '@/lib/orders/orderKindFromItems'
import {
  mapSellerOrderForOrdersPage,
  SELLER_ORDER_DETAIL_SELECT,
} from '@/lib/seller/sellerOrderAnalytics'

function paymentMethodLabel(payment) {
  const provider = String(payment?.provider || '').trim()
  const status = String(payment?.status || '').trim()
  const reference = String(payment?.paymongo_reference || '').trim()
  const label = provider
    ? provider.charAt(0).toUpperCase() + provider.slice(1)
    : status || reference
      ? 'Payment provider'
      : '—'
  return reference ? `${label} · ${reference}` : label
}

const IMAGE_EXT_RE = /\.(png|jpe?g|webp|gif)$/i
const PDF_EXT_RE = /\.pdf$/i

function fileNameFromPath(path) {
  const s = String(path || '').split('?')[0]
  return s.split('/').filter(Boolean).pop() || 'Attachment'
}

function attachmentKind(name) {
  if (IMAGE_EXT_RE.test(name)) return 'photo'
  if (PDF_EXT_RE.test(name)) return 'pdf'
  return 'file'
}

function mapDisputeAttachmentPaths(dispute) {
  const paths = Array.isArray(dispute?.attachment_paths) ? dispute.attachment_paths : []
  return paths.map((path, idx) => {
    const label = fileNameFromPath(path)
    return {
      id: `${dispute.id}-${idx}`,
      label,
      path,
      disputeId: dispute.id,
      type: attachmentKind(label),
    }
  })
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} supabaseAdmin
 * @param {string} sellerUserId
 */
export async function listSellerOrdersForApi(supabaseAdmin, sellerUserId) {
  const { data: orders, error } = await supabaseAdmin
    .from('orders')
    .select(SELLER_ORDER_DETAIL_SELECT)
    .eq('seller_user_id', sellerUserId)
    .order('created_at', { ascending: false })

  if (error) {
    return { orders: [], error: error.message || 'Failed to load orders.' }
  }

  const { data: disputeRows } = await supabaseAdmin
    .from('disputes')
    .select('id,order_id,reason,description,status,opened_at,resolution_notes,attachment_paths')
    .eq('seller_user_id', sellerUserId)
    .in('status', ['open', 'under_review'])
    .order('opened_at', { ascending: false })

  const orderIds = (orders ?? []).map((o) => o.id).filter(Boolean)
  const paymentByOrder = new Map()
  if (orderIds.length) {
    const { data: paymentLinks } = await supabaseAdmin
      .from('payment_orders')
      .select('order_id,payments(provider,status,paymongo_reference,created_at)')
      .in('order_id', orderIds)

    for (const link of paymentLinks ?? []) {
      const payment = Array.isArray(link.payments) ? link.payments[0] : link.payments
      if (link.order_id && payment && !paymentByOrder.has(link.order_id)) {
        paymentByOrder.set(link.order_id, payment)
      }
    }
  }

  const disputeByOrder = new Map()
  for (const dispute of disputeRows ?? []) {
    if (!disputeByOrder.has(dispute.order_id)) {
      disputeByOrder.set(dispute.order_id, dispute)
    }
  }

  const laneByOrderId = await buildOrderLaneByOrderId(supabaseAdmin, orders ?? [])

  const mapped = (orders ?? []).map((row) => {
    const helpRequest = disputeByOrder.get(row.id) ?? null
    const payment = paymentByOrder.get(row.id) ?? null
    return mapSellerOrderForOrdersPage(row, {
      orderLane: laneByOrderId.get(row.id) ?? 'booking',
      paymentMethod: paymentMethodLabel(payment),
      helpRequest,
      helpAttachments: mapDisputeAttachmentPaths(helpRequest),
    })
  })

  return { orders: mapped, error: null }
}
