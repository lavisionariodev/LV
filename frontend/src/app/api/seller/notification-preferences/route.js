import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { mergeSellerNotificationPreferences } from '@/lib/notifications/preferences'

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
    { preferences: mergeSellerNotificationPreferences(auth.seller.notification_preferences) },
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
  const next = mergeSellerNotificationPreferences(auth.seller.notification_preferences, incoming)

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

  return NextResponse.json(
    { preferences: mergeSellerNotificationPreferences(data?.notification_preferences) },
    { status: 200 },
  )
}
