import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { requireAdminApiUser } from '@/lib/auth/requireAdminRoute'
import { notifySeller } from '@/lib/notifications/inAppServer'

export async function POST(request, { params }) {
  const { id: listingId } = await params
  if (!listingId) {
    return NextResponse.json({ error: 'Missing listing id.' }, { status: 400 })
  }

  const { responseError } = await requireAdminApiUser()
  if (responseError) return responseError

  const supabase = await createClient()

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
    await notifySeller(supabaseAdmin, listingBefore.seller_user_id, {
      type: 'listing_rejected',
      title: 'Listing not approved',
      body: `${name} was not approved. Reason: ${reason.slice(0, 300)}${reason.length > 300 ? '…' : ''}`,
      metadata: { listingId },
      dedupeKey: `listing_rejected:${listingId}`,
    })
  }

  return NextResponse.json({ data }, { status: 200 })
}

