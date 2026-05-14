import { NextResponse } from 'next/server'
import { requireActiveBuyerApiUser } from '@/lib/auth/requireApiUser'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

function paymentStatusLabel(status) {
  const normalized = String(status || '').toLowerCase()
  if (normalized === 'paid') return 'paid'
  if (normalized === 'failed') return 'failed'
  if (normalized === 'pending') return 'pending'
  return normalized || 'unknown'
}

export async function GET(_request, { params }) {
  const { user, responseError } = await requireActiveBuyerApiUser()
  if (responseError) return responseError

  const supabaseAdmin = getSupabaseAdmin()

  const { paymentId } = await params
  if (!paymentId) {
    return NextResponse.json({ error: 'Missing payment id.' }, { status: 400 })
  }

  const { data: payment, error: paymentErr } = await supabaseAdmin
    .from('payments')
    .select('id,buyer_id,status,amount,currency,paymongo_reference,created_at,updated_at')
    .eq('id', paymentId)
    .maybeSingle()

  if (paymentErr) {
    return NextResponse.json({ error: paymentErr.message || 'Failed to load payment.' }, { status: 500 })
  }
  if (!payment || payment.buyer_id !== user.id) {
    return NextResponse.json({ error: 'Payment not found.' }, { status: 404 })
  }

  const { data: links } = await supabaseAdmin
    .from('payment_orders')
    .select('order_id')
    .eq('payment_id', payment.id)

  const orderIds = (links ?? []).map((row) => row.order_id).filter(Boolean)
  let orderPaymentStatuses = []
  if (orderIds.length) {
    const { data: orders } = await supabaseAdmin
      .from('orders')
      .select('id,payment_status,status')
      .in('id', orderIds)
    orderPaymentStatuses = orders ?? []
  }

  const status = paymentStatusLabel(payment.status)
  const settled = status === 'paid' || status === 'failed'

  return NextResponse.json(
    {
      paymentId: payment.id,
      status,
      settled,
      amount: payment.amount,
      currency: payment.currency,
      reference: payment.paymongo_reference,
      orderIds,
      orderPaymentStatuses,
    },
    { status: 200 },
  )
}

export const dynamic = 'force-dynamic'
