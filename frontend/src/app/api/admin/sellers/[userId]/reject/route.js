import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendSellerRejectedEmail } from '@/lib/email/sendSellerRejectedEmail'

const REASON_MIN = 12
const REASON_MAX = 8000

export async function POST(request, { params }) {
  const { userId: sellerUserId } = await params
  if (!sellerUserId) {
    return NextResponse.json({ error: 'Missing seller id.' }, { status: 400 })
  }

  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 })
  }

  const reason =
    typeof body?.reason === 'string' ? body.reason.trim() : typeof body?.message === 'string'
      ? body.message.trim()
      : ''

  if (!reason) {
    return NextResponse.json({ error: 'A rejection reason is required.' }, { status: 400 })
  }
  if (reason.length < REASON_MIN) {
    return NextResponse.json(
      { error: `Please provide at least ${REASON_MIN} characters explaining the decision.` },
      { status: 400 },
    )
  }
  if (reason.length > REASON_MAX) {
    return NextResponse.json({ error: `Reason must be ${REASON_MAX} characters or fewer.` }, { status: 400 })
  }

  const supabase = await createClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 })
  }

  const { data: adminRow, error: adminErr } = await supabase
    .from('admins')
    .select('id')
    .eq('id', user.id)
    .maybeSingle()

  if (adminErr) {
    return NextResponse.json({ error: adminErr.message || 'Failed to verify admin.' }, { status: 500 })
  }
  if (!adminRow) {
    return NextResponse.json({ error: 'Forbidden.' }, { status: 403 })
  }

  const { data: before, error: fetchErr } = await supabase
    .from('sellers')
    .select('user_id, status, email, business_name')
    .eq('user_id', sellerUserId)
    .maybeSingle()

  if (fetchErr) {
    return NextResponse.json({ error: fetchErr.message || 'Failed to load seller.' }, { status: 500 })
  }
  if (!before) {
    return NextResponse.json({ error: 'Seller not found.' }, { status: 404 })
  }

  const previousStatus = String(before.status || '').toLowerCase()
  if (previousStatus !== 'pending') {
    return NextResponse.json(
      { error: 'Only applications pending review can be rejected.' },
      { status: 400 },
    )
  }

  const rejectedAt = new Date().toISOString()

  const { data, error } = await supabase
    .from('sellers')
    .update({
      status: 'rejected',
      rejection_reason: reason,
      rejected_at: rejectedAt,
      approved_at: null,
    })
    .eq('user_id', sellerUserId)
    .select()
    .maybeSingle()

  if (error) {
    return NextResponse.json({ error: error.message || 'Failed to reject application.' }, { status: 400 })
  }

  if (data?.email) {
    try {
      await sendSellerRejectedEmail({
        to: data.email,
        businessName: data.business_name,
        reason,
      })
    } catch (mailErr) {
      console.error('[email] Failed to send seller rejection email:', mailErr)
    }
  }

  return NextResponse.json({ data }, { status: 200 })
}
