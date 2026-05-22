import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { requireActiveBuyerApiUser } from '@/lib/auth/requireApiUser'
import { apiLog, errorMessage } from '@/lib/observability/apiLog'
import { validateCheckoutContactPayload } from '@/lib/checkout/deliveryAddress'
import {
  buildListingKindById,
  checkoutLaneFromCartItems,
  resolveCartItemKind,
} from '@/lib/listings/kind'
import { listingIdFromOrderItemProductId } from '@/lib/orders/listingIdFromProductId'

function formatDateForInput(value) {
  if (!value) return ''
  const s = String(value).trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s
  const d = new Date(s)
  if (Number.isNaN(d.getTime())) return ''
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export async function GET(request) {
  const { user, responseError } = await requireActiveBuyerApiUser()
  if (responseError) return responseError

  const paymentId = new URL(request.url).searchParams.get('payment')?.trim()
  if (!paymentId) {
    return NextResponse.json({ error: 'Missing payment id.' }, { status: 400 })
  }

  const supabaseAdmin = getSupabaseAdmin()

  const { data: payment, error: paymentErr } = await supabaseAdmin
    .from('payments')
    .select('id,buyer_id,status,metadata')
    .eq('id', paymentId)
    .maybeSingle()

  if (paymentErr || !payment) {
    return NextResponse.json({ error: 'Payment not found.' }, { status: 404 })
  }
  if (payment.buyer_id !== user.id) {
    return NextResponse.json({ error: 'Not allowed.' }, { status: 403 })
  }

  const { data: links, error: linksErr } = await supabaseAdmin
    .from('payment_orders')
    .select('order_id')
    .eq('payment_id', paymentId)

  if (linksErr) {
    return NextResponse.json({ error: linksErr.message || 'Failed to load orders.' }, { status: 500 })
  }

  const orderIds = (links ?? []).map((r) => r.order_id).filter(Boolean)
  if (orderIds.length === 0) {
    return NextResponse.json({ error: 'No orders linked to this payment.' }, { status: 404 })
  }

  const paymentStatus = String(payment.status || '').toLowerCase()

  if (paymentStatus === 'paid') {
    return NextResponse.json(
      { error: 'This payment is already complete.', redirect: '/checkout/success' },
      { status: 400 },
    )
  }

  if (paymentStatus === 'pending') {
    const nowIso = new Date().toISOString()
    const { error: payUpdErr } = await supabaseAdmin
      .from('payments')
      .update({
        status: 'failed',
        metadata: {
          ...(payment.metadata ?? {}),
          abandoned_at: nowIso,
          abandon_reason: 'buyer_returned_from_paymongo',
        },
      })
      .eq('id', paymentId)

    if (payUpdErr) {
      apiLog('checkout.resume.payment_abandon_failed', { err: errorMessage(payUpdErr) })
      return NextResponse.json(
        { error: 'Could not resume checkout. Please try again.' },
        { status: 500 },
      )
    }

    const { error: ordersUpdErr } = await supabaseAdmin
      .from('orders')
      .update({
        payment_status: 'unpaid',
        status: 'pending_payment',
      })
      .in('id', orderIds)
      .eq('buyer_id', user.id)

    if (ordersUpdErr) {
      apiLog('checkout.resume.orders_reset_failed', { err: errorMessage(ordersUpdErr) })
    }
  }

  const { data: orders, error: ordersErr } = await supabaseAdmin
    .from('orders')
    .select(
      'id,contact_name,contact_email,contact_phone,preferred_date,notes,service_location,deceased_name,date_of_death,wake_duration_days,fulfillment_status,payment_status',
    )
    .in('id', orderIds)
    .eq('buyer_id', user.id)

  if (ordersErr || !orders?.length) {
    return NextResponse.json({ error: 'Orders not found.' }, { status: 404 })
  }

  const notResumable = orders.some((o) => {
    const f = o.fulfillment_status || 'pending'
    return f !== 'pending'
  })
  if (notResumable) {
    return NextResponse.json(
      {
        error:
          'This order can no longer be completed from checkout. See My purchases for status.',
      },
      { status: 400 },
    )
  }

  const { data: orderItems, error: itemsErr } = await supabaseAdmin
    .from('order_items')
    .select('id,order_id,product_id,name,price,quantity,seller_user_id')
    .in('order_id', orderIds)

  if (itemsErr) {
    return NextResponse.json({ error: itemsErr.message || 'Failed to load order items.' }, { status: 500 })
  }

  const listingIdSet = new Set()
  for (const item of orderItems ?? []) {
    const lid = listingIdFromOrderItemProductId(item.product_id)
    if (lid) listingIdSet.add(lid)
  }

  let kindByListingId = {}
  if (listingIdSet.size > 0) {
    const { data: listingRows } = await supabaseAdmin
      .from('seller_listings')
      .select('id,listing_kind')
      .in('id', [...listingIdSet])
    kindByListingId = buildListingKindById(
      (listingRows ?? []).map((row) => ({
        listing_id: row.id,
        listing_kind: row.listing_kind,
      })),
    )
  }

  const cartItemsForLane = (orderItems ?? []).map((item) => ({
    id: String(item.product_id),
    listingKind: resolveCartItemKind(String(item.product_id), kindByListingId),
  }))
  const lane = checkoutLaneFromCartItems(cartItemsForLane, kindByListingId)
  const checkoutLane = lane === 'product' ? 'product' : 'booking'

  const primary = orders[0]
  const lineItems = (orderItems ?? []).map((item) => ({
    id: String(item.product_id),
    orderItemId: item.id,
    name: item.name,
    price: Number(item.price) || 0,
    qty: item.quantity ?? 1,
    sellerUserId: item.seller_user_id,
    listingKind: resolveCartItemKind(String(item.product_id), kindByListingId),
  }))

  apiLog('checkout.resume.ok', { orderCount: orderIds.length })

  return NextResponse.json({
    ok: true,
    paymentId,
    orderIds,
    lane: checkoutLane,
    contact: {
      contactName: primary.contact_name ?? '',
      contactEmail: primary.contact_email ?? '',
      contactPhone: primary.contact_phone ?? '',
      preferredDate: formatDateForInput(primary.preferred_date),
      notes: primary.notes ?? '',
      deceasedName: primary.deceased_name ?? '',
      dateOfDeath: formatDateForInput(primary.date_of_death),
      wakeDurationDays:
        primary.wake_duration_days != null ? String(primary.wake_duration_days) : '',
      serviceLocation: primary.service_location ?? '',
    },
    lineItems,
  })
}

export async function PATCH(request) {
  const { user, responseError } = await requireActiveBuyerApiUser()
  if (responseError) return responseError

  const body = await request.json().catch(() => ({}))
  const orderIdsRaw = Array.isArray(body?.orderIds) ? body.orderIds : null
  const orderIds = orderIdsRaw?.map((v) => String(v).trim()).filter(Boolean) ?? []
  const lane = body?.lane === 'product' ? 'product' : 'booking'

  const contact = {
    contact_name: String(body?.contact?.contact_name ?? '').trim(),
    contact_email: String(body?.contact?.contact_email ?? '').trim(),
    contact_phone: String(body?.contact?.contact_phone ?? '').trim(),
    service_location: String(body?.contact?.service_location ?? '').trim(),
    deceased_name: String(body?.contact?.deceased_name ?? '').trim(),
    date_of_death: String(body?.contact?.date_of_death ?? '').trim(),
    wake_duration_days: String(body?.contact?.wake_duration_days ?? '').trim(),
    preferred_date: String(body?.contact?.preferred_date ?? '').trim(),
    notes: String(body?.contact?.notes ?? '').trim(),
  }

  if (!orderIds.length) {
    return NextResponse.json({ error: 'Missing order ids.' }, { status: 400 })
  }

  const contactValidation = validateCheckoutContactPayload({
    lane: lane === 'product' ? 'product' : 'booking',
    contact,
  })
  if (!contactValidation.ok) {
    return NextResponse.json({ error: contactValidation.message }, { status: 400 })
  }

  const supabaseAdmin = getSupabaseAdmin()
  const wakeRaw = contact.wake_duration_days
  const wakeDays = wakeRaw === '' ? null : Number(wakeRaw)

  const { error: updErr } = await supabaseAdmin
    .from('orders')
    .update({
      contact_name: contact.contact_name || null,
      contact_email: contact.contact_email || null,
      contact_phone: contact.contact_phone || null,
      service_location: contact.service_location || null,
      deceased_name: contact.deceased_name || null,
      date_of_death: contact.date_of_death || null,
      wake_duration_days:
        wakeDays != null && Number.isFinite(wakeDays) && wakeDays >= 0 ? wakeDays : null,
      preferred_date: contact.preferred_date || null,
      notes: contact.notes || null,
    })
    .in('id', orderIds)
    .eq('buyer_id', user.id)
    .eq('fulfillment_status', 'pending')

  if (updErr) {
    return NextResponse.json(
      { error: updErr.message || 'Could not update order details.' },
      { status: 500 },
    )
  }

  return NextResponse.json({ ok: true })
}

export const dynamic = 'force-dynamic'
