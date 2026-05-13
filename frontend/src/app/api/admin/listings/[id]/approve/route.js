import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { notifySeller } from '@/lib/notifications/inAppServer'

export async function POST(_request, { params }) {
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

  const { data, error } = await supabase.rpc('approve_listing', { p_listing_id: listingId })
  if (error) {
    return NextResponse.json({ error: error.message || 'Failed to approve listing.' }, { status: 400 })
  }

  const supabaseAdmin = getSupabaseAdmin()
  const { data: listing } = await supabaseAdmin
    .from('seller_listings')
    .select('seller_user_id,listing_name')
    .eq('id', listingId)
    .maybeSingle()

  if (listing?.seller_user_id) {
    const name = listing.listing_name || 'Your listing'
    await notifySeller(supabaseAdmin, listing.seller_user_id, {
      type: 'listing_approval',
      title: 'Listing approved',
      body: `${name} was approved and is available on the shop.`,
      metadata: { listingId },
      dedupeKey: `listing_approved:${listingId}`,
    })
  }

  return NextResponse.json({ data }, { status: 200 })
}

