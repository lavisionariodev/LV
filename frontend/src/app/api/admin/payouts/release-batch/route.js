import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { requireAdminApiUser } from '@/lib/auth/requireAdminRoute'
import { releaseEscrowWithDisbursement } from '@/lib/payments/releaseEscrowWithDisbursement'

export async function POST(request) {
  const { user, responseError } = await requireAdminApiUser()
  if (responseError || !user) return responseError

  const body = await request.json().catch(() => ({}))
  const orderIds = Array.isArray(body?.orderIds) ? body.orderIds.map((id) => String(id).trim()).filter(Boolean) : []
  const releaseReference = body?.releaseReference != null ? String(body.releaseReference).trim() : ''
  const manualOverride = Boolean(body?.manualOverride)
  const approvedRequestId = body?.approvedRequestId != null ? String(body.approvedRequestId).trim() : null

  if (!orderIds.length) {
    return NextResponse.json({ error: 'Missing orderIds.' }, { status: 400 })
  }

  const supabaseAdmin = getSupabaseAdmin()
  const results = []

  for (const orderId of orderIds) {
    const result = await releaseEscrowWithDisbursement(supabaseAdmin, {
      orderId,
      adminUserId: user.id,
      releaseReference,
      manualOverride,
      approvedRequestId,
    })
    results.push({
      orderId,
      ok: Boolean(result.ok),
      error: result.error ?? null,
      alreadyReleased: Boolean(result.alreadyReleased),
      pendingDisbursement: Boolean(result.pendingDisbursement),
      disbursementId: result.disbursementId ?? null,
    })
  }

  const failed = results.filter((row) => !row.ok).length
  return NextResponse.json({ ok: failed === 0, failed, results }, { status: failed ? 207 : 200 })
}
