import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { requireAdminApiUser } from '@/lib/auth/requireAdminRoute'
import { releaseEscrowToWallet } from '@/lib/payments/releaseEscrowToWallet'

export async function POST(request) {
  const { user, responseError } = await requireAdminApiUser()
  if (responseError || !user) return responseError

  const body = await request.json().catch(() => ({}))
  const orderIds = Array.isArray(body?.orderIds) ? body.orderIds.map((id) => String(id).trim()).filter(Boolean) : []
  const releaseReference = body?.releaseReference != null ? String(body.releaseReference).trim() : ''

  if (!orderIds.length) {
    return NextResponse.json({ error: 'Missing orderIds.' }, { status: 400 })
  }

  const supabaseAdmin = getSupabaseAdmin()
  const results = []

  for (const orderId of orderIds) {
    const result = await releaseEscrowToWallet(supabaseAdmin, {
      orderId,
      adminUserId: user.id,
      releaseReference,
    })
    results.push({
      orderId,
      ok: Boolean(result.ok),
      error: result.error ?? null,
      alreadyReleased: Boolean(result.alreadyReleased),
      mode: result.mode ?? 'wallet',
    })
  }

  const failed = results.filter((row) => !row.ok).length
  return NextResponse.json({ ok: failed === 0, failed, results }, { status: failed ? 207 : 200 })
}
