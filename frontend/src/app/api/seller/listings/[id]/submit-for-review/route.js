import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { requireActiveSellerApiUser } from '@/lib/auth/requireApiUser'
import { notifyAdminsNewListingPendingReview } from '@/lib/notifications/listingAdminNotify'

/**
 * POST — seller submits a listing for admin approval (replaces direct client updates so we can fan-out admin in-app rows).
 */
export async function POST(_request, context) {
  const params = await context.params
  const listingId = String(params?.id ?? '').trim()
  if (!listingId) {
    return NextResponse.json({ error: 'Missing listing id.' }, { status: 400 })
  }

  const { user, responseError } = await requireActiveSellerApiUser()
  if (responseError) return responseError

  const supabase = await createClient()

  const { data: existing, error: fetchErr } = await supabase
    .from('seller_listings')
    .select('id,approval_status,seller_user_id,listing_name')
    .eq('id', listingId)
    .maybeSingle()

  if (fetchErr) {
    return NextResponse.json({ error: fetchErr.message || 'Failed to load listing.' }, { status: 500 })
  }
  if (!existing) {
    return NextResponse.json({ error: 'Listing not found.' }, { status: 404 })
  }
  if (existing.seller_user_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden.' }, { status: 403 })
  }

  if (String(existing.approval_status || '').toLowerCase() === 'approved') {
    const { data: row, error: selErr } = await supabase.from('seller_listings').select('*').eq('id', listingId).maybeSingle()
    if (selErr) {
      return NextResponse.json({ error: selErr.message || 'Failed to load listing.' }, { status: 500 })
    }
    return NextResponse.json({ data: row }, { status: 200 })
  }

  const nowIso = new Date().toISOString()
  const { data: updated, error: updErr } = await supabase
    .from('seller_listings')
    .update({
      approval_status: 'pending',
      submitted_at: nowIso,
      status: 'active',
    })
    .eq('id', listingId)
    .select('*')
    .maybeSingle()

  if (updErr || !updated) {
    return NextResponse.json({ error: updErr?.message || 'Failed to submit listing for review.' }, { status: 500 })
  }

  const supabaseAdmin = getSupabaseAdmin()
  await notifyAdminsNewListingPendingReview(supabaseAdmin, {
    listingId,
    listingName: updated.listing_name || existing.listing_name,
    submittedAt: String(updated.submitted_at || nowIso),
  })

  return NextResponse.json({ data: updated }, { status: 200 })
}
