import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

function phpToCentavos(amount) {
  const num = Number(amount)
  if (!Number.isFinite(num)) return null
  return Math.round(num * 100)
}

function getBasicAuthHeader(secretKey) {
  const token = Buffer.from(`${secretKey}:`).toString('base64')
  return `Basic ${token}`
}

export async function POST(request) {
  const supabaseAdmin = getSupabaseAdmin()
  const supabase = await createClient()
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser()

  if (userErr || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Enforce buyer role (public.users.role is the app role source).
  const { data: userRow, error: roleErr } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  if (roleErr || !userRow || userRow.role !== 'buyer') {
    return NextResponse.json({ error: 'Only buyers can checkout.' }, { status: 403 })
  }

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

  const origin = new URL(request.url).origin
  const secretKey = process.env.PAYMONGO_SECRET_KEY
  // NOTE: Payment is no longer created during checkout creation.
  // New flow: buyer submits booking request -> seller confirms -> buyer pays.
  // PAYMONGO_SECRET_KEY is used later in /api/checkout/pay.
  if (!secretKey) {
    // Keep this as a soft failure only if buyer attempts to pay; for now, checkout creation can proceed.
  }

  return NextResponse.json(
    {
      ok: true,
      order_ids: orderIds,
      amount: amountPhp,
      currency,
      line_items: lineItems,
      next_step: 'await_seller_confirmation',
    },
    { status: 200 },
  )
}

