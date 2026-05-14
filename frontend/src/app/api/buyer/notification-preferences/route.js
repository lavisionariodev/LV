import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { requireActiveBuyerApiUser } from '@/lib/auth/requireApiUser'
import { mergeBuyerNotificationPreferences } from '@/lib/notifications/preferenceSchema'

export async function GET() {
  const { user, responseError } = await requireActiveBuyerApiUser()
  if (responseError) return responseError

  const supabaseAdmin = getSupabaseAdmin()
  const { data: profile, error } = await supabaseAdmin
    .from('profiles')
    .select('notification_preferences')
    .eq('id', user.id)
    .maybeSingle()

  if (error) {
    return NextResponse.json(
      { error: error.message || 'Failed to load notification preferences.' },
      { status: 500 },
    )
  }

  return NextResponse.json(
    { preferences: mergeBuyerNotificationPreferences(profile?.notification_preferences) },
    { status: 200 },
  )
}

export async function PATCH(request) {
  const { user, responseError } = await requireActiveBuyerApiUser()
  if (responseError) return responseError

  const body = await request.json().catch(() => ({}))
  const incoming = body?.preferences && typeof body.preferences === 'object' ? body.preferences : {}

  const supabaseAdmin = getSupabaseAdmin()
  const { data: profile, error: readErr } = await supabaseAdmin
    .from('profiles')
    .select('notification_preferences')
    .eq('id', user.id)
    .maybeSingle()

  if (readErr) {
    return NextResponse.json(
      { error: readErr.message || 'Failed to load notification preferences.' },
      { status: 500 },
    )
  }

  const next = mergeBuyerNotificationPreferences(profile?.notification_preferences, incoming)
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .update({ notification_preferences: next })
    .eq('id', user.id)
    .select('notification_preferences')
    .maybeSingle()

  if (error) {
    return NextResponse.json(
      { error: error.message || 'Failed to save notification preferences.' },
      { status: 500 },
    )
  }

  return NextResponse.json(
    { preferences: mergeBuyerNotificationPreferences(data?.notification_preferences) },
    { status: 200 },
  )
}

export const dynamic = 'force-dynamic'
