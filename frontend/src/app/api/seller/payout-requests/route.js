import { NextResponse } from 'next/server'
import { requireActiveSellerApiUser } from '@/lib/auth/requireApiUser'
import { notifyAllAdmins } from '@/lib/notifications/inAppServer'

export async function GET() {
  const { user, supabaseAdmin, responseError } = await requireActiveSellerApiUser()
  if (responseError) return responseError

  const { data, error } = await supabaseAdmin
    .from('seller_payout_requests')
    .select('id, requested_amount, note, status, escrow_snapshot, created_at')
    .eq('seller_user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) {
    return NextResponse.json({ error: error.message || 'Failed to load payout requests.' }, { status: 500 })
  }

  return NextResponse.json({ requests: data ?? [] }, { status: 200 })
}

export async function POST(request) {
  const { user, supabaseAdmin, responseError } = await requireActiveSellerApiUser()
  if (responseError) return responseError

  const { data: seller } = await supabaseAdmin
    .from('sellers')
    .select('user_id, business_name, contact_name, email')
    .eq('user_id', user.id)
    .maybeSingle()

  const body = await request.json().catch(() => ({}))
  const note = String(body?.note || '').trim().slice(0, 2000)
  const requestedAmountRaw = body?.requestedAmount
  const requestedAmount =
    requestedAmountRaw == null || requestedAmountRaw === ''
      ? null
      : Number(requestedAmountRaw)

  if (!note) {
    return NextResponse.json({ error: 'Please add a short note for this payout request.' }, { status: 400 })
  }
  if (requestedAmount != null && (!Number.isFinite(requestedAmount) || requestedAmount < 0)) {
    return NextResponse.json({ error: 'Requested amount must be a valid number.' }, { status: 400 })
  }

  const { data: payoutSettings } = await supabaseAdmin
    .from('seller_payout_settings')
    .select('payout_method')
    .eq('seller_user_id', user.id)
    .maybeSingle()

  if (!payoutSettings?.payout_method) {
    return NextResponse.json({ error: 'Save payout settings before requesting a release.' }, { status: 400 })
  }

  const escrowRes = await fetch(new URL('/api/seller/escrow-summary', request.url), {
    headers: { cookie: request.headers.get('cookie') || '' },
  }).catch(() => null)
  const escrowBody = escrowRes ? await escrowRes.json().catch(() => null) : null
  const escrowSnapshot = escrowBody?.summary && typeof escrowBody.summary === 'object' ? escrowBody.summary : {}

  const { data: row, error } = await supabaseAdmin
    .from('seller_payout_requests')
    .insert({
      seller_user_id: user.id,
      requested_amount: requestedAmount,
      note,
      status: 'pending',
      escrow_snapshot: escrowSnapshot,
    })
    .select('id, requested_amount, note, status, escrow_snapshot, created_at')
    .maybeSingle()

  if (error || !row) {
    return NextResponse.json({ error: error?.message || 'Failed to submit payout request.' }, { status: 500 })
  }

  const sellerLabel = seller?.business_name || seller?.contact_name || 'Seller'
  await notifyAllAdmins(supabaseAdmin, {
    type: 'system',
    title: `Seller payout review request: ${sellerLabel}`,
    body: note,
    metadata: {
      source: 'seller_payout_request',
      sellerUserId: user.id,
      requestId: row.id,
      requestedAmount,
    },
    dedupeKey: `seller_payout_request:${row.id}`,
  })

  return NextResponse.json({ request: row }, { status: 201 })
}
