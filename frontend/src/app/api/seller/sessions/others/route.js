import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireActiveSellerApiUser } from '@/lib/auth/requireApiUser'
import {
  removeOtherSellerPortalSessions,
  resolveSellerPortalDeviceKeyFromRequest,
} from '@/lib/auth/sellerPortalSessionsServer'

export async function POST(request) {
  const { user, supabaseAdmin, responseError } = await requireActiveSellerApiUser()
  if (responseError) return responseError

  const supabase = await createClient()
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession()

  if (sessionError || !session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const currentDeviceKey = resolveSellerPortalDeviceKeyFromRequest(request, user.id)

  const { error: signOutError } = await supabase.auth.signOut({ scope: 'others' })
  const deleteError = await removeOtherSellerPortalSessions(supabaseAdmin, user.id, currentDeviceKey)

  if (signOutError) {
    return NextResponse.json(
      { error: signOutError.message || 'Could not sign out other browsers.' },
      { status: 500 },
    )
  }

  if (deleteError) {
    return NextResponse.json({
      ok: true,
      warning:
        'Other browsers were signed out, but we could not refresh the signed-in browser list. Reload this page to try again.',
    })
  }

  return NextResponse.json({ ok: true })
}
