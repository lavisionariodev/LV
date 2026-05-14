import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { requireAdminApiUser } from '@/lib/auth/requireAdminRoute'
import { releaseEscrowWithDisbursement } from '@/lib/payments/releaseEscrowWithDisbursement'

export async function POST(request) {
  const { user, responseError } = await requireAdminApiUser()
  if (responseError || !user) return responseError

  const body = await request.json().catch(() => ({}))
  const orderId = String(body?.orderId ?? '').trim()
  const releaseReference = body?.releaseReference != null ? String(body.releaseReference).trim() : ''
  const manualOverride = Boolean(body?.manualOverride)
  const approvedRequestId = body?.approvedRequestId != null ? String(body.approvedRequestId).trim() : null

  if (!orderId) {
    return NextResponse.json({ error: 'Missing orderId.' }, { status: 400 })
  }

  const supabaseAdmin = getSupabaseAdmin()
  const result = await releaseEscrowWithDisbursement(supabaseAdmin, {
    orderId,
    adminUserId: user.id,
    releaseReference,
    manualOverride,
    approvedRequestId,
  })

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status || 400 })
  }

  return NextResponse.json({
    ok: true,
    alreadyReleased: Boolean(result.alreadyReleased),
    pendingDisbursement: Boolean(result.pendingDisbursement),
    disbursementId: result.disbursementId ?? null,
    disbursementStatus: result.disbursementStatus ?? null,
    paymongoTransferId: result.paymongoTransferId ?? null,
    mode: result.mode ?? (result.pendingDisbursement ? 'automated_pending' : 'automated'),
  })
}
