import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

const PATCH_ALLOWED_KEYS = new Set([
  'listing_name',
  'category',
  'funeral_category',
  'description',
  'duration',
  'location',
  'listing_kind',
  'base_price',
  'package_options',
  'stock_status',
  'inclusions',
  'who_this_is_for',
  'important_notes',
  'status',
  'image_urls',
])

function pickPatchPayload(body) {
  const out = {}
  if (!body || typeof body !== 'object' || Array.isArray(body)) return out
  for (const [key, value] of Object.entries(body)) {
    if (PATCH_ALLOWED_KEYS.has(key)) out[key] = value
  }
  return out
}

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
    .select('id,seller_user_id')
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

export async function PATCH(request, context) {
  const params = await context.params
  const listingId = String(params?.id ?? '').trim()
  if (!listingId) {
    return NextResponse.json({ error: 'Missing listing id.' }, { status: 400 })
  }

  const auth = await requireOwnedListing(listingId)
  if (auth.response) return auth.response

  const body = await request.json().catch(() => ({}))
  const payload = pickPatchPayload(body)
  if (Object.keys(payload).length === 0) {
    return NextResponse.json({ error: 'No valid listing fields to update.' }, { status: 400 })
  }

  const { data, error } = await auth.supabaseAdmin
    .from('seller_listings')
    .update(payload)
    .eq('id', listingId)
    .eq('seller_user_id', auth.user.id)
    .select('*')
    .maybeSingle()

  if (error || !data) {
    return NextResponse.json({ error: error?.message || 'Failed to update listing.' }, { status: 500 })
  }

  return NextResponse.json({ data }, { status: 200 })
}

export async function DELETE(_request, context) {
  const params = await context.params
  const listingId = String(params?.id ?? '').trim()
  if (!listingId) {
    return NextResponse.json({ error: 'Missing listing id.' }, { status: 400 })
  }

  const auth = await requireOwnedListing(listingId)
  if (auth.response) return auth.response

  const { error } = await auth.supabaseAdmin
    .from('seller_listings')
    .delete()
    .eq('id', listingId)
    .eq('seller_user_id', auth.user.id)

  if (error) {
    return NextResponse.json({ error: error.message || 'Failed to remove listing.' }, { status: 500 })
  }

  return NextResponse.json({ ok: true }, { status: 200 })
}
