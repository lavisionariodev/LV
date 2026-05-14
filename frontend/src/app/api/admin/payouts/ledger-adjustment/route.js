import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { requireAdminApiUser } from '@/lib/auth/requireAdminRoute'
import { recordAdjustmentLedgerEntry } from '@/lib/payments/walletLedgerEvents'

const REASON_MIN = 8
const REASON_MAX = 2000

export async function POST(request) {
  const { user, responseError } = await requireAdminApiUser()
  if (responseError || !user) return responseError

  const body = await request.json().catch(() => null)
  const sellerUserId = String(body?.sellerUserId ?? '').trim()
  const amountPhp = Number(body?.amountPhp)
  const reason = typeof body?.reason === 'string' ? body.reason.trim() : ''
  const idempotencyKey = String(body?.idempotencyKey ?? '').trim()
  const currency = typeof body?.currency === 'string' && body.currency.trim() ? body.currency.trim() : 'PHP'

  if (!sellerUserId) {
    return NextResponse.json({ error: 'Missing sellerUserId.' }, { status: 400 })
  }
  if (!Number.isFinite(amountPhp) || amountPhp === 0) {
    return NextResponse.json({ error: 'amountPhp must be a non-zero number.' }, { status: 400 })
  }
  if (!idempotencyKey) {
    return NextResponse.json({ error: 'Missing idempotencyKey.' }, { status: 400 })
  }
  if (!reason) {
    return NextResponse.json({ error: 'A reason is required for ledger adjustments.' }, { status: 400 })
  }
  if (reason.length < REASON_MIN) {
    return NextResponse.json(
      { error: `Please provide at least ${REASON_MIN} characters explaining the adjustment.` },
      { status: 400 },
    )
  }
  if (reason.length > REASON_MAX) {
    return NextResponse.json({ error: `Reason must be ${REASON_MAX} characters or fewer.` }, { status: 400 })
  }

  const supabaseAdmin = getSupabaseAdmin()
  const { data: seller, error: sellerErr } = await supabaseAdmin
    .from('sellers')
    .select('user_id')
    .eq('user_id', sellerUserId)
    .maybeSingle()

  if (sellerErr) {
    return NextResponse.json({ error: sellerErr.message || 'Failed to verify seller.' }, { status: 500 })
  }
  if (!seller) {
    return NextResponse.json({ error: 'Seller not found.' }, { status: 404 })
  }

  const result = await recordAdjustmentLedgerEntry(supabaseAdmin, {
    sellerUserId,
    amountPhp,
    currency,
    reason,
    adminUserId: user.id,
    idempotencyKey,
    metadata: {
      source: 'admin_ledger_adjustment',
    },
  })

  if (!result?.ok) {
    return NextResponse.json({ error: result?.error || 'Failed to write ledger adjustment.' }, { status: 400 })
  }

  return NextResponse.json(
    {
      ok: true,
      duplicate: Boolean(result.duplicate),
      ledgerEntryId: result.id,
    },
    { status: result.duplicate ? 200 : 201 },
  )
}
