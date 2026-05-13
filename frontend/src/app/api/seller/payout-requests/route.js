import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { notifyAllAdmins } from '@/lib/notifications/inAppServer'

async function requireActiveSeller(userId) {
  const supabaseAdmin = getSupabaseAdmin()
  const { data: seller, error } = await supabaseAdmin
    .from('sellers')
    .select('user_id, business_name, contact_name, email, status')
    .eq('user_id', userId)
    .maybeSingle()
  if (error || !seller) {
    return { response: NextResponse.json({ error: 'Seller account required.' }, { status: 403 }) }
  }
  if (String(seller.status || '').toLowerCase() !== 'active') {
    return { response: NextResponse.json({ error: 'Seller account must be active to request payouts.' }, { status: 403 }) }
  }
  return { seller, supabaseAdmin }
}

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser()
  if (userErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const auth = await requireActiveSeller(user.id)
  if (auth.response) return auth.response

  const { data, error } = await auth.supabaseAdmin
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
  const supabase = await createClient()
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser()
  if (userErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const auth = await requireActiveSeller(user.id)
  if (auth.response) return auth.response

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

  const { data: payoutSettings } = await auth.supabaseAdmin
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

  const { data: row, error } = await auth.supabaseAdmin
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

  await notifyAllAdmins(auth.supabaseAdmin, {
    type: 'system',
    title: `Seller payout request: ${auth.seller.business_name || auth.seller.contact_name || 'Seller'}`,
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
