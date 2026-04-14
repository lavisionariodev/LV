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
  if (!secretKey) {
    return NextResponse.json(
      { error: 'Missing PAYMONGO_SECRET_KEY on server.' },
      { status: 500 },
    )
  }

  const paymongoReference = `lv_${crypto.randomUUID()}`

  // Create DB payment first so success/cancel URLs can reference it.
  const { data: paymentRow, error: paymentErr } = await supabaseAdmin
    .from('payments')
    .insert({
      buyer_id: user.id,
      provider: 'paymongo',
      status: 'pending',
      amount: amountPhp,
      currency,
      paymongo_reference: paymongoReference,
      metadata: { order_ids: orderIds },
    })
    .select('*')
    .single()

  if (paymentErr) {
    return NextResponse.json(
      { error: paymentErr.message ?? 'Failed to create payment record.' },
      { status: 500 },
    )
  }

  if (Array.isArray(orderIds) && orderIds.length > 0) {
    const rows = orderIds.map((orderId) => ({
      payment_id: paymentRow.id,
      order_id: orderId,
    }))
    await supabaseAdmin.from('payment_orders').insert(rows)
  }

  const successUrl = `${origin}/checkout/success?payment=${encodeURIComponent(
    paymentRow.id,
  )}`
  const cancelUrl = `${origin}/checkout/failed?payment=${encodeURIComponent(
    paymentRow.id,
  )}`

  const paymongoRes = await fetch('https://api.paymongo.com/v1/checkout_sessions', {
    method: 'POST',
    headers: {
      Authorization: getBasicAuthHeader(secretKey),
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      data: {
        attributes: {
          line_items: [
            // Keep checkout summary concise; detailed breakdown is stored in metadata + DB.
            {
              name: 'Booking request',
              amount: amountCentavos,
              quantity: 1,
              currency,
            },
          ],
          payment_method_types: ['card', 'gcash'],
          success_url: successUrl,
          cancel_url: cancelUrl,
          reference_number: paymongoReference,
          metadata: {
            payment_id: paymentRow.id,
            order_ids: orderIds,
            line_items: lineItems,
          },
        },
      },
    }),
  })

  const paymongoBody = await paymongoRes.json().catch(() => null)

  if (!paymongoRes.ok) {
    await supabaseAdmin
      .from('payments')
      .update({
        status: 'failed',
        metadata: {
          ...(paymentRow.metadata ?? {}),
          paymongo_error: paymongoBody,
        },
      })
      .eq('id', paymentRow.id)

    return NextResponse.json(
      { error: 'Failed to create PayMongo checkout session.' },
      { status: 502 },
    )
  }

  const checkoutId = paymongoBody?.data?.id ?? null
  const checkoutUrl = paymongoBody?.data?.attributes?.checkout_url ?? null

  if (!checkoutId || !checkoutUrl) {
    return NextResponse.json(
      { error: 'PayMongo response missing checkout_url.' },
      { status: 502 },
    )
  }

  await supabaseAdmin
    .from('payments')
    .update({
      paymongo_checkout_id: checkoutId,
      metadata: {
        ...(paymentRow.metadata ?? {}),
        paymongo_checkout_id: checkoutId,
      },
    })
    .eq('id', paymentRow.id)

  return NextResponse.json({ redirect_url: checkoutUrl }, { status: 200 })
}

