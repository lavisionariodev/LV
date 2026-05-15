import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { requireAdminApiUser } from '@/lib/auth/requireAdminRoute'
import { releaseEscrowToWallet } from '@/lib/payments/releaseEscrowToWallet'

export async function POST(request) {
  const { user, responseError } = await requireAdminApiUser()
  if (responseError || !user) return responseError

  const body = await request.json().catch(() => ({}))
  const orderId = String(body?.orderId ?? '').trim()
  const releaseReference = body?.releaseReference != null ? String(body.releaseReference).trim() : ''

  if (!orderId) {
    return NextResponse.json({ error: 'Missing orderId.' }, { status: 400 })
  }

  const supabaseAdmin = getSupabaseAdmin()
  const result = await releaseEscrowToWallet(supabaseAdmin, {
    orderId,
    adminUserId: user.id,
    releaseReference,
  })

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status || 400 })
  }

  return NextResponse.json({
    ok: true,
    alreadyReleased: Boolean(result.alreadyReleased),
    mode: result.mode ?? 'wallet',
  })
}
