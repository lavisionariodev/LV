import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

const CREATE_ALLOWED_KEYS = new Set([
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

function pickCreatePayload(body) {
  const out = {}
  if (!body || typeof body !== 'object' || Array.isArray(body)) return out
  for (const [key, value] of Object.entries(body)) {
    if (CREATE_ALLOWED_KEYS.has(key)) out[key] = value
  }
  if (Array.isArray(out.image_urls)) {
    out.image_urls = out.image_urls.map((url) => String(url || '').trim()).filter(Boolean).slice(0, 10)
  }
  if (out.status && !['draft', 'active'].includes(String(out.status).toLowerCase())) {
    out.status = 'draft'
  }
  return out
}

export async function POST(request) {
  const supabase = await createClient()
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser()

  if (userErr || !user) {
    return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 })
  }

  const supabaseAdmin = getSupabaseAdmin()
  const { data: seller, error: sellerErr } = await supabaseAdmin
    .from('sellers')
    .select('status')
    .eq('user_id', user.id)
    .maybeSingle()

  if (sellerErr || !seller) {
    return NextResponse.json({ error: 'Seller account required.' }, { status: 403 })
  }
  if (['rejected', 'suspended'].includes(String(seller.status || '').toLowerCase())) {
    return NextResponse.json({ error: 'Seller account is not allowed to create listings.' }, { status: 403 })
  }

  const body = await request.json().catch(() => ({}))
  const payload = pickCreatePayload(body)

  if (!String(payload.listing_name || '').trim()) {
    return NextResponse.json({ error: 'Listing name is required.' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('seller_listings')
    .insert({
      ...payload,
      seller_user_id: user.id,
    })
    .select('*')
    .maybeSingle()

  if (error || !data) {
    return NextResponse.json({ error: error?.message || 'Failed to create listing.' }, { status: 500 })
  }

  return NextResponse.json({ data }, { status: 201 })
}
