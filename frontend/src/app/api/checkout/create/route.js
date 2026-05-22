import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { requireActiveBuyerApiUser } from '@/lib/auth/requireApiUser'
import { validateCheckoutContactPayload } from '@/lib/checkout/deliveryAddress'
import {
  buildListingKindById,
  checkoutLaneFromCartItems,
  resolveCartItemKind,
} from '@/lib/listings/kind'
import { phpToCentavos } from '@/lib/paymongo/client'

export async function POST(request) {
  const { user, responseError } = await requireActiveBuyerApiUser()
  if (responseError) return responseError

  const supabaseAdmin = getSupabaseAdmin()

  const body = await request.json().catch(() => ({}))
  const productIdsRaw = Array.isArray(body?.productIds) ? body.productIds : null
  const productIds =
    productIdsRaw?.map((v) => String(v).trim()).filter(Boolean) ?? null

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

  if (!productIds || productIds.length === 0) {
    return NextResponse.json({ error: 'No items selected for checkout.' }, { status: 400 })
  }

  const listingIds = [
    ...new Set(productIds.map((id) => String(id).split('::pkg::')[0].trim()).filter(Boolean)),
  ]

  const { data: listingRows, error: listingsErr } = await supabaseAdmin
    .from('seller_listings')
    .select('id, listing_kind')
    .in('id', listingIds)

  if (listingsErr) {
    return NextResponse.json(
      { error: listingsErr.message ?? 'Could not verify cart items.' },
      { status: 400 },
    )
  }

  const kindByListingId = buildListingKindById(
    (listingRows || []).map((row) => ({
      listing_id: row.id,
      listing_kind: row.listing_kind,
    })),
  )
  const cartItemsForLane = productIds.map((id) => ({
    id,
    listingKind: resolveCartItemKind(id, kindByListingId),
  }))
  const checkoutLane = checkoutLaneFromCartItems(cartItemsForLane, kindByListingId)

  if (checkoutLane === 'mixed') {
    return NextResponse.json(
      { error: 'Services and products must be checked out separately.' },
      { status: 400 },
    )
  }

  const contactValidation = validateCheckoutContactPayload({
    lane: checkoutLane === 'product' ? 'product' : 'booking',
    contact,
  })
  if (!contactValidation.ok) {
    return NextResponse.json({ error: contactValidation.message }, { status: 400 })
  }

  const { data: checkoutData, error: checkoutErr } = await supabaseAdmin.rpc(
    'create_checkout_from_cart',
    {
      p_buyer_id: user.id,
      p_product_ids: productIds,
      p_contact: contact,
    },
  )

  if (checkoutErr) {
    return NextResponse.json(
      { error: checkoutErr.message ?? 'Failed to create checkout from cart.' },
      { status: 400 },
    )
  }

  const orderIds = checkoutData?.[0]?.order_ids ?? checkoutData?.order_ids
  const amountPhp = checkoutData?.[0]?.amount ?? checkoutData?.amount
  const currency = checkoutData?.[0]?.currency ?? checkoutData?.currency ?? 'PHP'
  const lineItems = checkoutData?.[0]?.line_items ?? checkoutData?.line_items ?? []

  const amountCentavos = phpToCentavos(amountPhp)
  if (!amountCentavos || amountCentavos <= 0) {
    return NextResponse.json(
      { error: 'Invalid total amount.' },
      { status: 400 },
    )
  }

  return NextResponse.json(
    {
      ok: true,
      order_ids: orderIds,
      amount: amountPhp,
      currency,
      line_items: lineItems,
      next_step: 'pay',
    },
    { status: 200 },
  )
}

