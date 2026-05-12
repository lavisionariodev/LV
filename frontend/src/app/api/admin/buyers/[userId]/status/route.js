import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { requireAdminApiUser } from '@/lib/auth/requireAdminRoute'
import { notifyUser } from '@/lib/notifications/inAppServer'

const ALLOWED = new Set(['active', 'suspended'])

/**
 * POST /api/admin/buyers/[userId]/status
 *
 * Body: { status: 'active' | 'suspended' }
 *
 * Updates the buyer's account status and sends an in-app notification.
 */
export async function POST(request, context) {
  const { responseError } = await requireAdminApiUser()
  if (responseError) return responseError

  const params = await context.params
  const userId = String(params?.userId ?? '').trim()
  if (!userId) {
    return NextResponse.json({ error: 'Missing user id.' }, { status: 400 })
  }

  const body = await request.json().catch(() => ({}))
  const status = body?.status != null ? String(body.status).trim().toLowerCase() : ''
  if (!ALLOWED.has(status)) {
    return NextResponse.json({ error: 'status must be "active" or "suspended".' }, { status: 400 })
  }

  const supabaseAdmin = getSupabaseAdmin()

  const { data: before, error: beforeErr } = await supabaseAdmin
    .from('users')
    .select('id,role,status')
    .eq('id', userId)
    .maybeSingle()

  if (beforeErr || !before) {
    return NextResponse.json({ error: 'Buyer not found.' }, { status: 404 })
  }
  if (before.role !== 'buyer') {
    return NextResponse.json(
      { error: 'Status changes are only allowed on buyer accounts here.' },
      { status: 400 },
    )
  }

  if ((before.status || 'active') === status) {
    return NextResponse.json(
      { ok: true, buyer: { id: userId, status } },
      { status: 200 },
    )
  }

  const { error } = await supabaseAdmin
    .from('users')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', userId)

  if (error) {
    return NextResponse.json(
      { error: error.message ?? 'Failed to update status.' },
      { status: 500 },
    )
  }

  const title =
    status === 'suspended'
      ? 'Your account has been suspended'
      : 'Your account is active again'
  const note =
    status === 'suspended'
      ? 'An administrator has suspended your account. Please contact support if you believe this is in error.'
      : 'An administrator has reactivated your account. You may continue using the platform.'

  await notifyUser(supabaseAdmin, {
    userId,
    type: 'alerts',
    title,
    body: note,
    metadata: { kind: 'account_status', status },
    dedupeKey: `buyer_status:${userId}:${status}:${Date.now()}`,
  })

  return NextResponse.json(
    { ok: true, buyer: { id: userId, status } },
    { status: 200 },
  )
}

export const dynamic = 'force-dynamic'
