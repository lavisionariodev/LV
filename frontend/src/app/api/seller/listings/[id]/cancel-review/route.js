import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { hasPendingSellerChanges } from '@/lib/seller-listings/pendingChanges'

async function requireOwnedListing(listingId) {
  const supabase = await createClient()
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser()

  if (userErr || !user) {
    return { response: NextResponse.json({ error: 'Not authenticated.' }, { status: 401 }) }
  }

  const supabaseAdmin = getSupabaseAdmin()
  const { data: existing, error: fetchErr } = await supabaseAdmin
    .from('seller_listings')
    .select('*')
    .eq('id', listingId)
    .maybeSingle()

  if (fetchErr) {
    return { response: NextResponse.json({ error: fetchErr.message || 'Failed to load listing.' }, { status: 500 }) }
  }
  if (!existing) {
    return { response: NextResponse.json({ error: 'Listing not found.' }, { status: 404 }) }
  }
  if (existing.seller_user_id !== user.id) {
    return { response: NextResponse.json({ error: 'Forbidden.' }, { status: 403 }) }
  }

  return { user, supabaseAdmin, existing }
}

function buildCancelReviewPayload(row) {
  const approval = String(row?.approval_status || 'draft').toLowerCase()
  const hasStaged = hasPendingSellerChanges(row)

  if (approval === 'approved' && hasStaged) {
    return {
      pending_changes: {},
      pending_changes_submitted_at: null,
      staged_rejection_reason: null,
    }
  }

  if (approval === 'pending' || approval === 'rejected') {
    return {
      approval_status: 'draft',
      submitted_at: null,
      rejection_reason: null,
      reviewed_at: null,
      reviewed_by: null,
      status: 'draft',
    }
  }

  return null
}

/**
 * POST — seller withdraws a pending new-listing review or staged update request.
 */
export async function POST(_request, context) {
  const params = await context.params
  const listingId = String(params?.id ?? '').trim()
  if (!listingId) {
    return NextResponse.json({ error: 'Missing listing id.' }, { status: 400 })
  }

  const auth = await requireOwnedListing(listingId)
  if (auth.response) return auth.response

  const payload = buildCancelReviewPayload(auth.existing)
  if (!payload) {
    return NextResponse.json({ error: 'This listing does not have a review request to cancel.' }, { status: 400 })
  }

  const { data, error } = await auth.supabaseAdmin
    .from('seller_listings')
    .update(payload)
    .eq('id', listingId)
    .eq('seller_user_id', auth.user.id)
    .select('*')
    .maybeSingle()

  if (error || !data) {
    return NextResponse.json({ error: error?.message || 'Failed to cancel review request.' }, { status: 500 })
  }

  return NextResponse.json({ data }, { status: 200 })
}
