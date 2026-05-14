import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { requireAdminApiUser } from '@/lib/auth/requireAdminRoute'
import { computeCommissionSnapshot } from '@/shared/utils/commissionSnapshot'
import { recordCommissionChangeLog } from '@/lib/admin/commissionChangeLog'

/**
 * PATCH — update per-order escrow commission rate and recalculated fee / net (admin only).
 * Blocked when escrow is already released.
 */
export async function PATCH(request) {
  const { user, responseError } = await requireAdminApiUser()
  if (responseError) return responseError

  const body = await request.json().catch(() => ({}))
  const orderId = String(body?.orderId ?? '').trim()
  const raw = body?.commissionRatePercent

  if (!orderId) {
    return NextResponse.json({ error: 'Missing orderId.' }, { status: 400 })
  }

  const rateNum =
    typeof raw === 'number' ? raw : typeof raw === 'string' ? Number.parseFloat(raw.replace(',', '.')) : NaN

  if (!Number.isFinite(rateNum) || rateNum < 0 || rateNum > 100) {
    return NextResponse.json(
      { error: 'commissionRatePercent must be a number from 0 through 100.' },
      { status: 400 },
    )
  }

  const roundedRate = Math.round(rateNum * 100) / 100
  const supabaseAdmin = getSupabaseAdmin()

  const { data: escrow, error: escErr } = await supabaseAdmin
    .from('order_escrows')
    .select('id,order_id,status,gross_amount,commission_rate_percent,commission_amount,net_amount')
    .eq('order_id', orderId)
    .maybeSingle()

  if (escErr) {
    return NextResponse.json({ error: escErr.message ?? 'Escrow lookup failed.' }, { status: 500 })
  }

  if (!escrow) {
    return NextResponse.json({ error: 'No escrow record for this order.' }, { status: 404 })
  }

  if (escrow.status === 'released') {
    return NextResponse.json(
      { error: 'Commission cannot be changed after this order has been released.' },
      { status: 409 },
    )
  }

  const gross = Number(escrow.gross_amount) || 0
  const snap = computeCommissionSnapshot(gross, roundedRate)

  const { data: updated, error: updErr } = await supabaseAdmin
    .from('order_escrows')
    .update({
      commission_rate_percent: snap.commissionRatePercent,
      commission_amount: snap.commissionAmountPhp,
      net_amount: snap.netAmountPhp,
    })
    .eq('order_id', orderId)
    .select('commission_rate_percent, commission_amount, net_amount')
    .maybeSingle()

  if (updErr) {
    return NextResponse.json({ error: updErr.message ?? 'Commission update failed.' }, { status: 500 })
  }

  await recordCommissionChangeLog(supabaseAdmin, {
    changedBy: user.id,
    scope: 'order_escrow',
    orderId,
    label: `Order ${orderId}`,
    fromPercent:
      escrow.commission_rate_percent != null ? Number(escrow.commission_rate_percent) : null,
    toPercent: snap.commissionRatePercent,
  })

  return NextResponse.json({ ok: true, escrow: updated })
}
