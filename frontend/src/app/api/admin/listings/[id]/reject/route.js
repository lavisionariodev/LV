import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { notifyUser } from '@/lib/notifications/inAppServer'

export async function POST(request, { params }) {
  const { id: listingId } = await params
  if (!listingId) {
    return NextResponse.json({ error: 'Missing listing id.' }, { status: 400 })
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

  const body = await request.json().catch(() => ({}))
  const reason = String(body?.reason ?? '').trim()
  if (!reason) {
    return NextResponse.json({ error: 'Rejection reason is required.' }, { status: 400 })
  }

  const supabaseAdmin = getSupabaseAdmin()
  const { data: listingBefore } = await supabaseAdmin
    .from('seller_listings')
    .select('seller_user_id,listing_name')
    .eq('id', listingId)
    .maybeSingle()

  const { data, error } = await supabase.rpc('reject_listing', { p_listing_id: listingId, p_reason: reason })
  if (error) {
    return NextResponse.json({ error: error.message || 'Failed to reject listing.' }, { status: 400 })
  }

  if (listingBefore?.seller_user_id) {
    const name = listingBefore.listing_name || 'Your listing'
    await notifyUser(supabaseAdmin, {
      userId: listingBefore.seller_user_id,
      type: 'listing_rejected',
      title: 'Listing not approved',
      body: `${name} was not approved. Reason: ${reason.slice(0, 300)}${reason.length > 300 ? '…' : ''}`,
      metadata: { listingId },
      dedupeKey: `listing_rejected:${listingId}`,
    })
  }

  return NextResponse.json({ data }, { status: 200 })
}

