import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { requireAdminApiUser } from '@/lib/auth/requireAdminRoute'
import { resolveStoredAvatar } from '@/shared/utils'
import {
  pickOrder,
  utcDateKeysLastN,
  summarizeEscrowsForPayoutStats,
  fetchDailyReleasedCommissionSeries,
} from '@/lib/admin/adminPortalMetrics'
import {
  fetchPayoutDisbursementsForSeller,
  indexDisbursementsByEscrowId,
  resolveEscrowDisbursementState,
} from '@/lib/payments/wallet'

const MAX_ROWS = 500

function buildServiceLabel(items) {
  if (!items?.length) return 'Booking'
  if (items.length === 1) return items[0]?.name || 'Booking'
  return `${items.length} items`
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} admin
 * @param {{ summary?: string | null, q?: string | null, seller?: string | null, payment?: string | null, escrow?: string | null, from?: string | null, to?: string | null }} searchParams
 */
export async function GET(request) {
  const { responseError } = await requireAdminApiUser()
  if (responseError) return responseError

  const { searchParams } = new URL(request.url)
  const summary = searchParams.get('summary')
  const q = (searchParams.get('q') || '').trim().toLowerCase()
  const seller = searchParams.get('seller') || 'all'
  const payment = searchParams.get('payment') || 'all'
  const escrow = searchParams.get('escrow') || searchParams.get('payout') || 'all'
  const from = searchParams.get('from') || ''
  const to = searchParams.get('to') || ''

  const supabaseAdmin = getSupabaseAdmin()

  const { data: billing } = await supabaseAdmin
    .from('platform_billing')
    .select('default_commission_percent')
    .eq('id', 1)
    .maybeSingle()

  const defaultCommissionPercent =
    billing?.default_commission_percent != null ? Number(billing.default_commission_percent) : 10

  const { data: escrowRows, error: escErr } = await supabaseAdmin
    .from('order_escrows')
    .select(
      `
      id,
      order_id,
      seller_user_id,
      payment_id,
      gross_amount,
      commission_rate_percent,
      commission_amount,
      net_amount,
      currency,
      status,
      hold_reason,
      released_at,
      release_reference,
      released_by,
      created_at,
      orders (
        id,
        order_number,
        buyer_id,
        seller_user_id,
        fulfillment_status,
        payment_status,
        subtotal,
        currency,
        created_at,
        contact_name,
        contact_email,
        contact_phone,
        preferred_date
      )
    `,
    )
    .order('created_at', { ascending: false })
    .limit(MAX_ROWS + 1)

  if (escErr) {
    return NextResponse.json({ error: escErr.message ?? 'Failed to load payouts.' }, { status: 500 })
  }

  const fetchedRows = escrowRows ?? []
  const truncated = fetchedRows.length > MAX_ROWS
  const rows = truncated ? fetchedRows.slice(0, MAX_ROWS) : fetchedRows

  if (summary === '1' || summary === 'true') {
    const agg = summarizeEscrowsForPayoutStats(rows)
    const chartDayKeys = utcDateKeysLastN(7)
    const dailyReleasedCommission = await fetchDailyReleasedCommissionSeries(supabaseAdmin, chartDayKeys)

    return NextResponse.json({
      defaultCommissionPercent,
      summary: {
        platformRevenue30d: agg.platformRevenue30d,
        pendingPayoutAmt: agg.pendingPayoutAmt,
        completedReleasedAmt: agg.completedReleasedAmt,
        totalEscrows: agg.totalEscrows,
      },
      dailyReleasedCommission,
    })
  }

  const buyerIds = [...new Set(rows.map((r) => pickOrder(r.orders)?.buyer_id).filter(Boolean))]
  const sellerUserIds = [...new Set(rows.map((r) => r.seller_user_id).filter(Boolean))]
  const orderIds = rows.map((r) => r.order_id).filter(Boolean)
  const escrowIds = rows.map((r) => r.id).filter(Boolean)

  const [buyerUsersRes, buyerProfilesRes, sellerProfilesRes, sellersRes, itemsRes, disbursementsRes] =
    await Promise.all([
    buyerIds.length
      ? supabaseAdmin.from('users').select('id,email').in('id', buyerIds)
      : Promise.resolve({ data: [] }),
    buyerIds.length
      ? supabaseAdmin.from('profiles').select('id,full_name').in('id', buyerIds)
      : Promise.resolve({ data: [] }),
    sellerUserIds.length
      ? supabaseAdmin.from('profiles').select('id, avatar_url').in('id', sellerUserIds)
      : Promise.resolve({ data: [] }),
    sellerUserIds.length
      ? supabaseAdmin
          .from('sellers')
          .select('user_id,business_name,email,phone,commission_percent_override')
          .in('user_id', sellerUserIds)
      : Promise.resolve({ data: [] }),
    orderIds.length
      ? supabaseAdmin.from('order_items').select('order_id,name,quantity').in('order_id', orderIds)
      : Promise.resolve({ data: [] }),
    escrowIds.length
      ? fetchPayoutDisbursementsForSeller(supabaseAdmin, { escrowIds })
      : Promise.resolve([]),
  ])

  const disbursementByEscrowId = indexDisbursementsByEscrowId(disbursementsRes)

  const emailByBuyer = new Map((buyerUsersRes.data ?? []).map((u) => [u.id, u.email]))
  const nameByBuyer = new Map((buyerProfilesRes.data ?? []).map((p) => [p.id, p.full_name]))
  const avatarBySellerUserId = new Map(
    (sellerProfilesRes.data ?? []).map((p) => {
      const { avatarUrl } = resolveStoredAvatar(supabaseAdmin, p.avatar_url)
      return [p.id, avatarUrl || null]
    }),
  )
  const sellerByUserId = new Map(
    (sellersRes.data ?? []).map((s) => [s.user_id, s]),
  )

  const itemsByOrder = new Map()
  for (const it of itemsRes.data ?? []) {
    const list = itemsByOrder.get(it.order_id) ?? []
    list.push(it)
    itemsByOrder.set(it.order_id, list)
  }

  const sellersDropdown = sellerUserIds.map((id) => {
    const s = sellerByUserId.get(id)
    const overrideRaw = s?.commission_percent_override
    const overrideNum = overrideRaw == null ? null : Number(overrideRaw)
    return {
      id,
      name: s?.business_name || `Seller ${String(id).slice(0, 8)}`,
      avatarUrl: avatarBySellerUserId.get(id) ?? null,
      commissionPercentOverride:
        overrideNum != null && Number.isFinite(overrideNum) ? overrideNum : null,
    }
  })
  sellersDropdown.sort((a, b) => a.name.localeCompare(b.name))

  /** @type {any[]} */
  const normalized = []

  for (const e of rows) {
    const ord = pickOrder(e.orders)
    if (!ord) continue
    if (payment !== 'all' && ord.payment_status !== payment) continue
    if (escrow !== 'all' && e.status !== escrow) continue
    if (seller !== 'all' && ord.seller_user_id !== seller) continue

    const dateStr = ord.created_at ? String(ord.created_at).slice(0, 10) : ''
    if (from && dateStr && dateStr < from) continue
    if (to && dateStr && dateStr > to) continue

    const sel = sellerByUserId.get(e.seller_user_id)
    const buyerId = ord.buyer_id
    const buyerEmail = emailByBuyer.get(buyerId) || ord.contact_email || ''
    const buyerName =
      (nameByBuyer.get(buyerId) || ord.contact_name || buyerEmail || 'Buyer').trim() || 'Buyer'

    const items = itemsByOrder.get(ord.id) ?? []
    const service = buildServiceLabel(items)

    const orderLabel = ord.order_number || ord.id
    const txnLabel = e.id
    if (
      q &&
      !orderLabel.toLowerCase().includes(q) &&
      !String(ord.id).toLowerCase().includes(q) &&
      !String(txnLabel).toLowerCase().includes(q) &&
      !String(buyerId || '').toLowerCase().includes(q) &&
      !buyerName.toLowerCase().includes(q) &&
      !buyerEmail.toLowerCase().includes(q)
    ) {
      continue
    }

    const disbursement = disbursementByEscrowId.get(e.id) ?? null
    const disbursementState = resolveEscrowDisbursementState(e, disbursement)

    normalized.push({
      id: e.id,
      escrowId: e.id,
      orderUuid: ord.id,
      orderId: orderLabel,
      sellerId: e.seller_user_id,
      sellerName: sel?.business_name || 'Seller',
      sellerAvatarUrl: avatarBySellerUserId.get(e.seller_user_id) ?? null,
      sellerEmail: sel?.email || '',
      sellerPhone: sel?.phone || '',
      buyerId,
      buyerName,
      buyerEmail,
      buyerPhone: ord.contact_phone || '',
      service,
      amount: Number(e.gross_amount) || 0,
      gross_amount: Number(e.gross_amount) || 0,
      commission_rate_percent: Number(e.commission_rate_percent) || 0,
      commission_amount: Number(e.commission_amount) || 0,
      net_amount: Number(e.net_amount) || 0,
      currency: e.currency || ord.currency || 'PHP',
      paymentMethod: 'PayMongo',
      paymentStatus: ord.payment_status,
      fulfillmentStatus: ord.fulfillment_status,
      payoutStatus: e.status,
      escrowStatus: e.status,
      hold_reason: e.hold_reason,
      payoutReference: e.release_reference || disbursement?.paymongo_transfer_id || '',
      disbursementStatus: disbursement?.status ?? null,
      disbursementState,
      paymongoTransferId: disbursement?.paymongo_transfer_id ?? null,
      disbursementFailureReason: disbursement?.failure_reason ?? null,
      payoutDate: e.released_at ? String(e.released_at).slice(0, 10) : '',
      released_at: e.released_at,
      date: dateStr,
      dateObj: ord.created_at ? new Date(ord.created_at) : null,
    })
  }

  return NextResponse.json({
    defaultCommissionPercent,
    sellers: sellersDropdown,
    transactions: normalized,
    truncated,
    maxRows: MAX_ROWS,
  })
}
