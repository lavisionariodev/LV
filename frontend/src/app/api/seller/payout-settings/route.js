import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import {
  evaluateSellerPayoutSettingsForDisbursement,
  validateSellerPayoutSettingsRow,
} from '@/lib/payments/disbursementConfig'
import { normalizeGcashNumber } from '@/lib/payments/payoutValidation'
import {
  mapPayoutSettingsForSeller,
  normalizePayoutPayload,
  sensitivePayoutFieldsChanged,
} from '@/lib/payments/payoutSettings'

function clean(body) {
  const method = String(body?.payoutMethod || body?.payout_method || 'bank').trim().toLowerCase()
  const accountNumber = String(body?.accountNumber || body?.account_number || '').trim()
  const gcashNumber = String(body?.gcashNumber || body?.gcash_number || '').trim()
  return {
    payout_method: ['bank', 'gcash', 'manual'].includes(method) ? method : 'bank',
    account_holder_name: String(body?.accountHolderName || '').trim() || null,
    bank_name: String(body?.bankName || '').trim() || null,
    account_number: accountNumber ? accountNumber.replace(/\D/g, '') : null,
    gcash_name: String(body?.gcashName || '').trim() || null,
    gcash_number: gcashNumber ? normalizeGcashNumber(gcashNumber) : null,
    payout_email: String(body?.payoutEmail || '').trim() || null,
    notes: String(body?.notes || '').trim() || null,
  }
}

async function requireActiveSeller(userId) {
  const supabaseAdmin = getSupabaseAdmin()
  const { data: seller, error } = await supabaseAdmin
    .from('sellers')
    .select('status')
    .eq('user_id', userId)
    .maybeSingle()
  if (error || !seller) {
    return NextResponse.json({ error: 'Seller account required.' }, { status: 403 })
  }
  const status = String(seller.status || '').toLowerCase()
  if (status !== 'active') {
    return NextResponse.json(
      { error: 'Seller account is not allowed to update payout settings.' },
      { status: 403 },
    )
  }
  return null
}

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser()
  if (userErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const sellerResponse = await requireActiveSeller(user.id)
  if (sellerResponse) return sellerResponse

  const { data, error } = await supabase
    .from('seller_payout_settings')
    .select('*')
    .eq('seller_user_id', user.id)
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message || 'Failed to load payout settings.' }, { status: 500 })
  return NextResponse.json(
    {
      settings: mapPayoutSettingsForSeller(data),
      disbursement: evaluateSellerPayoutSettingsForDisbursement(data),
    },
    { status: 200 },
  )
}

export async function PUT(request) {
  const supabase = await createClient()
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser()
  if (userErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const sellerResponse = await requireActiveSeller(user.id)
  if (sellerResponse) return sellerResponse

  const body = await request.json().catch(() => ({}))
  let cleaned = clean(body)

  const { data: existing } = await supabase
    .from('seller_payout_settings')
    .select('*')
    .eq('seller_user_id', user.id)
    .maybeSingle()

  if (cleaned.payout_method === 'bank' && !cleaned.account_number && existing?.account_number) {
    cleaned.account_number = existing.account_number
  }
  if (cleaned.payout_method === 'gcash' && !cleaned.gcash_number && existing?.gcash_number) {
    cleaned.gcash_number = existing.gcash_number
  }

  cleaned = normalizePayoutPayload(cleaned)

  const validationError = validateSellerPayoutSettingsRow(cleaned)
  if (validationError) return NextResponse.json({ error: validationError }, { status: 400 })

  const needsReview =
    cleaned.payout_method !== 'manual' &&
    (sensitivePayoutFieldsChanged(existing, cleaned) || !existing)

  const payload = {
    seller_user_id: user.id,
    ...cleaned,
  }

  if (cleaned.payout_method === 'manual') {
    payload.verification_status = 'approved'
    payload.verified_at = existing?.verified_at ?? new Date().toISOString()
    payload.verified_by = existing?.verified_by ?? null
    payload.verification_rejection_reason = null
  } else if (needsReview) {
    payload.verification_status = 'pending_review'
    payload.verified_at = null
    payload.verified_by = null
    payload.verification_rejection_reason = null
  } else {
    payload.verification_status = existing?.verification_status ?? 'pending_review'
    payload.verified_at = existing?.verified_at ?? null
    payload.verified_by = existing?.verified_by ?? null
    payload.verification_rejection_reason = existing?.verification_rejection_reason ?? null
  }

  const { data, error } = await supabase
    .from('seller_payout_settings')
    .upsert(payload, { onConflict: 'seller_user_id' })
    .select('*')
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message || 'Failed to save payout settings.' }, { status: 500 })
  return NextResponse.json(
    {
      settings: mapPayoutSettingsForSeller(data),
      disbursement: evaluateSellerPayoutSettingsForDisbursement(data),
    },
    { status: 200 },
  )
}
