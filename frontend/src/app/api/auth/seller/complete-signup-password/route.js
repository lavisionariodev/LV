import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { validateNewPassword } from '@/lib/validators/authSchemas'

const PENDING_KEY = 'seller_password_pending'

/**
 * Sets the initial password for seller email-OTP signup using the service role.
 * This avoids Supabase's "Your password has been changed" email, which is sent for
 * supabase.auth.updateUser({ password }) but not for admin.updateUserById.
 */
export async function POST(request) {
  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 })
  }

  const password = typeof body?.password === 'string' ? body.password : ''
  const confirmPassword = typeof body?.confirmPassword === 'string' ? body.confirmPassword : ''
  const fullName = typeof body?.fullName === 'string' ? body.fullName.trim() : ''

  if (!fullName) {
    return NextResponse.json({ error: 'Full name is required.' }, { status: 400 })
  }

  const validation = validateNewPassword(password, confirmPassword)
  if (!validation.valid) {
    return NextResponse.json({ error: validation.message }, { status: 400 })
  }

  const supabase = await createClient()
  const {
    data: { user: sessionUser },
    error: sessionError,
  } = await supabase.auth.getUser()

  if (sessionError || !sessionUser?.id) {
    return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 })
  }

  let admin
  try {
    admin = getSupabaseAdmin()
  } catch (e) {
    console.error('[complete-signup-password] Missing service role:', e)
    return NextResponse.json(
      { error: 'Server configuration error. Please try again later.' },
      { status: 500 },
    )
  }

  const { data: adminData, error: getErr } = await admin.auth.admin.getUserById(sessionUser.id)
  if (getErr || !adminData?.user) {
    return NextResponse.json({ error: 'Could not load account.' }, { status: 400 })
  }

  const u = adminData.user
  const meta = u.user_metadata || {}
  if (meta[PENDING_KEY] !== true) {
    return NextResponse.json(
      {
        error:
          'Initial password was already set or this flow is not active. Use account settings to change your password.',
      },
      { status: 400 },
    )
  }

  const nextMeta = {
    ...meta,
    full_name: fullName,
    role: 'seller',
    [PENDING_KEY]: false,
  }

  const { error: updErr } = await admin.auth.admin.updateUserById(sessionUser.id, {
    password,
    user_metadata: nextMeta,
  })

  if (updErr) {
    return NextResponse.json(
      { error: updErr.message || 'Failed to set password.' },
      { status: 400 },
    )
  }

  const { error: profileErr } = await admin
    .from('profiles')
    .update({ full_name: fullName })
    .eq('id', sessionUser.id)

  if (profileErr) {
    console.error('[complete-signup-password] Profile update:', profileErr)
  }

  return NextResponse.json({ ok: true }, { status: 200 })
}
