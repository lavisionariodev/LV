import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { mergeAdminNotificationPreferences } from '@/lib/notifications/preferenceSchema'

async function requireAdminUser(supabase, userId) {
  const supabaseAdmin = getSupabaseAdmin()
  const { data: admin, error } = await supabaseAdmin
    .from('admins')
    .select('id, notification_preferences')
    .eq('id', userId)
    .maybeSingle()
  if (error || !admin) {
    return { response: NextResponse.json({ error: 'Admin account required.' }, { status: 403 }) }
  }
  return { admin }
}

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser()
  if (userErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const auth = await requireAdminUser(supabase, user.id)
  if (auth.response) return auth.response

  return NextResponse.json(
    { preferences: mergeAdminNotificationPreferences(auth.admin.notification_preferences) },
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

  const auth = await requireAdminUser(supabase, user.id)
  if (auth.response) return auth.response

  const body = await request.json().catch(() => ({}))
  const incoming = body?.preferences && typeof body.preferences === 'object' ? body.preferences : {}
  const next = mergeAdminNotificationPreferences(auth.admin.notification_preferences, incoming)

  const supabaseAdmin = getSupabaseAdmin()
  const { data, error } = await supabaseAdmin
    .from('admins')
    .update({
      notification_preferences: next,
      updated_at: new Date().toISOString(),
    })
    .eq('id', user.id)
    .select('notification_preferences')
    .maybeSingle()

  if (error) {
    return NextResponse.json({ error: error.message || 'Failed to save notification preferences.' }, { status: 500 })
  }

  return NextResponse.json(
    { preferences: mergeAdminNotificationPreferences(data?.notification_preferences) },
    { status: 200 },
  )
}
