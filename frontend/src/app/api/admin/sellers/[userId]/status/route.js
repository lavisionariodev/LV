import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAppBaseUrl } from '@/lib/email/appBaseUrl'
import { sendSellerApprovedEmail } from '@/lib/email/sendSellerApprovedEmail'

const ALLOWED = new Set(['pending', 'active', 'suspended'])

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

  const nextStatus = typeof body?.status === 'string' ? body.status.trim().toLowerCase() : ''
  if (!ALLOWED.has(nextStatus)) {
    return NextResponse.json({ error: 'Invalid status.' }, { status: 400 })
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
  const updatePayload = { status: nextStatus }

  if (nextStatus === 'active' && (previousStatus === 'pending' || previousStatus === 'rejected')) {
    updatePayload.approved_at = new Date().toISOString()
    if (previousStatus === 'rejected') {
      updatePayload.rejection_reason = null
      updatePayload.rejected_at = null
    }
  }

  const { data, error } = await supabase
    .from('sellers')
    .update(updatePayload)
    .eq('user_id', sellerUserId)
    .select()
    .maybeSingle()

  if (error) {
    return NextResponse.json({ error: error.message || 'Failed to update seller status.' }, { status: 400 })
  }

  if (
    nextStatus === 'active' &&
    (previousStatus === 'pending' || previousStatus === 'rejected') &&
    data?.email
  ) {
    const loginUrl = `${getAppBaseUrl()}/seller/login`
    try {
      await sendSellerApprovedEmail({
        to: data.email,
        businessName: data.business_name,
        loginUrl,
      })
    } catch (mailErr) {
      console.error('[email] Failed to send seller approval email:', mailErr)
    }
  }

  return NextResponse.json({ data }, { status: 200 })
}
