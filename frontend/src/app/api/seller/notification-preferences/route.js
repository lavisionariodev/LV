import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

const SELLER_BUCKETS = ['order', 'payment', 'listing', 'alert', 'system']

function mergePrefs(raw) {
  const src = raw && typeof raw === 'object' ? raw : {}
  const out = {}
  for (const bucket of SELLER_BUCKETS) {
    const row = src[bucket] && typeof src[bucket] === 'object' ? src[bucket] : {}
    out[bucket] = {
      push: row.push !== false,
      email: row.email !== false,
      sms: false,
    }
  }
  return out
}

async function requireSellerUser(supabase, userId) {
  const supabaseAdmin = getSupabaseAdmin()
  const { data: seller, error } = await supabaseAdmin
    .from('sellers')
    .select('user_id, notification_preferences')
    .eq('user_id', userId)
    .maybeSingle()
  if (error || !seller) {
    return { response: NextResponse.json({ error: 'Seller account required.' }, { status: 403 }) }
  }
  return { seller }
}

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser()
  if (userErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const auth = await requireSellerUser(supabase, user.id)
  if (auth.response) return auth.response

  return NextResponse.json(
    { preferences: mergePrefs(auth.seller.notification_preferences) },
    { status: 200 },
  )
}

export async function PATCH(request) {
  const supabase = await createClient()
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser()
  if (userErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const auth = await requireSellerUser(supabase, user.id)
  if (auth.response) return auth.response

  const body = await request.json().catch(() => ({}))
  const incoming = body?.preferences && typeof body.preferences === 'object' ? body.preferences : {}
  const next = mergePrefs(auth.seller.notification_preferences)
  for (const bucket of SELLER_BUCKETS) {
    if (!incoming[bucket] || typeof incoming[bucket] !== 'object') continue
    next[bucket] = {
      push: incoming[bucket].push !== false,
      email: incoming[bucket].email !== false,
      sms: false,
    }
  }

  const supabaseAdmin = getSupabaseAdmin()
  const { data, error } = await supabaseAdmin
    .from('sellers')
    .update({ notification_preferences: next })
    .eq('user_id', user.id)
    .select('notification_preferences')
    .maybeSingle()

  if (error) {
    return NextResponse.json({ error: error.message || 'Failed to save notification preferences.' }, { status: 500 })
  }

  return NextResponse.json({ preferences: mergePrefs(data?.notification_preferences) }, { status: 200 })
}
