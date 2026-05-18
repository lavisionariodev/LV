import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { requireAdminApiUser } from '@/lib/auth/requireAdminRoute'
import { notifySeller } from '@/lib/notifications/inAppServer'
import { mapPayoutSettingsForAdmin } from '@/lib/payments/payoutSettings'

const REASON_MIN = 12
const REASON_MAX = 2000

export async function POST(request, { params }) {
  const { user, responseError } = await requireAdminApiUser()
  if (responseError || !user) return responseError

  const { userId } = await params
  if (!userId) {
    return NextResponse.json({ error: 'Missing seller id.' }, { status: 400 })
  }

  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 })
  }

  const action = String(body?.action || '').toLowerCase()
  if (action !== 'approve' && action !== 'reject') {
    return NextResponse.json({ error: 'action must be approve or reject.' }, { status: 400 })
  }

  const reason = typeof body?.reason === 'string' ? body.reason.trim() : ''
  if (action === 'reject') {
    if (!reason) {
      return NextResponse.json({ error: 'A rejection reason is required.' }, { status: 400 })
    }
    if (reason.length < REASON_MIN) {
      return NextResponse.json(
        { error: `Please provide at least ${REASON_MIN} characters explaining the decision.` },
        { status: 400 },
      )
    }
    if (reason.length > REASON_MAX) {
      return NextResponse.json({ error: `Reason must be ${REASON_MAX} characters or fewer.` }, { status: 400 })
    }
  }

  const supabaseAdmin = getSupabaseAdmin()
  const { data: settings, error: fetchErr } = await supabaseAdmin
    .from('seller_payout_settings')
    .select('*')
    .eq('seller_user_id', userId)
    .maybeSingle()

  if (fetchErr) {
    return NextResponse.json({ error: fetchErr.message || 'Failed to load payout settings.' }, { status: 500 })
  }
  if (!settings) {
    return NextResponse.json({ error: 'Seller has not saved payout settings yet.' }, { status: 404 })
  }

  const method = String(settings.payout_method || '').toLowerCase()
  if (method === 'manual') {
    return NextResponse.json(
      { error: 'Manual payout settings do not require verification for automated withdraw.' },
      { status: 400 },
    )
  }

  const currentStatus = String(settings.verification_status || '').toLowerCase()
  if (currentStatus === 'approved' && action === 'approve') {
    return NextResponse.json(
      { ok: true, alreadyReviewed: true, settings: mapPayoutSettingsForAdmin(settings) },
      { status: 200 },
    )
  }

  const reviewedAt = new Date().toISOString()
  const nextStatus = action === 'approve' ? 'approved' : 'rejected'

  const { data: updated, error: updErr } = await supabaseAdmin
    .from('seller_payout_settings')
    .update({
      verification_status: nextStatus,
      verified_at: reviewedAt,
      verified_by: user.id,
      verification_rejection_reason: action === 'reject' ? reason : null,
    })
    .eq('seller_user_id', userId)
    .select('*')
    .maybeSingle()

  if (updErr) {
    return NextResponse.json({ error: updErr.message || 'Failed to update payout settings.' }, { status: 500 })
  }
  if (!updated) {
    return NextResponse.json({ error: 'Could not update payout settings.' }, { status: 409 })
  }

  const title =
    action === 'approve' ? 'Payout details approved' : 'Payout details need revision'
  const notifyBody =
    action === 'approve'
      ? 'Your bank or GCash payout details were approved. You can withdraw from your wallet when funds are available.'
      : `Your payout details were not approved. ${reason}`

  await notifySeller(supabaseAdmin, userId, {
    type: 'system',
    title,
    body: notifyBody,
    metadata: {
      source: 'seller_payout_settings_review',
      action,
      href: '/seller/settings/payouts',
    },
    dedupeKey: `seller_payout_review:${userId}:${action}:${reviewedAt.slice(0, 10)}`,
  })

  return NextResponse.json(
    { ok: true, settings: mapPayoutSettingsForAdmin(updated) },
    { status: 200 },
  )
}
