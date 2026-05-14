import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { evaluateSellerPayoutSettingsForDisbursement } from '@/lib/payments/disbursementConfig'

function clean(body) {
  const method = String(body?.payoutMethod || body?.payout_method || 'bank').trim().toLowerCase()
  return {
    payout_method: ['bank', 'gcash', 'manual'].includes(method) ? method : 'bank',
    account_holder_name: String(body?.accountHolderName || '').trim() || null,
    bank_name: String(body?.bankName || '').trim() || null,
    account_number: String(body?.accountNumber || '').trim() || null,
    gcash_name: String(body?.gcashName || '').trim() || null,
    gcash_number: String(body?.gcashNumber || '').trim() || null,
    payout_email: String(body?.payoutEmail || '').trim() || null,
    notes: String(body?.notes || '').trim() || null,
  }
}

function mask(value) {
  const s = String(value || '').trim()
  if (!s) return ''
  if (s.length <= 4) return '*'.repeat(s.length)
  return `${'*'.repeat(Math.max(0, s.length - 4))}${s.slice(-4)}`
}

function validate(payload) {
  if (payload.payout_method === 'bank') {
    if (!payload.account_holder_name) return 'Account holder name is required for bank payouts.'
    if (!payload.bank_name) return 'Bank name is required for bank payouts.'
    if (!payload.account_number) return 'Account number is required for bank payouts.'
  }
  if (payload.payout_method === 'gcash') {
    if (!payload.gcash_name) return 'GCash account name is required.'
    if (!payload.gcash_number) return 'GCash number is required.'
  }
  if (payload.payout_method === 'manual' && !payload.notes) {
    return 'Please add admin notes for manual payout instructions.'
  }
  if (payload.payout_email && !/^\S+@\S+\.\S+$/.test(payload.payout_email)) {
    return 'Please enter a valid payout email.'
  }
  return ''
}

async function requireSeller(userId) {
  const supabaseAdmin = getSupabaseAdmin()
  const { data: seller, error } = await supabaseAdmin
    .from('sellers')
    .select('status')
    .eq('user_id', userId)
    .maybeSingle()
  if (error || !seller) {
    return NextResponse.json({ error: 'Seller account required.' }, { status: 403 })
  }
  if (['rejected', 'suspended'].includes(String(seller.status || '').toLowerCase())) {
    return NextResponse.json({ error: 'Seller account is not allowed to update payout settings.' }, { status: 403 })
  }
  return null
}

function mapRow(row) {
  if (!row) return null
  return {
    payoutMethod: row.payout_method || 'bank',
    accountHolderName: row.account_holder_name || '',
    bankName: row.bank_name || '',
    accountNumber: row.account_number || '',
    maskedAccountNumber: mask(row.account_number),
    gcashName: row.gcash_name || '',
    gcashNumber: row.gcash_number || '',
    maskedGcashNumber: mask(row.gcash_number),
    payoutEmail: row.payout_email || '',
    notes: row.notes || '',
    updatedAt: row.updated_at,
  }
}

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser()
  if (userErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const sellerResponse = await requireSeller(user.id)
  if (sellerResponse) return sellerResponse

  const { data, error } = await supabase
    .from('seller_payout_settings')
    .select('*')
    .eq('seller_user_id', user.id)
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message || 'Failed to load payout settings.' }, { status: 500 })
  return NextResponse.json(
    {
      settings: mapRow(data),
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
  const sellerResponse = await requireSeller(user.id)
  if (sellerResponse) return sellerResponse

  const body = await request.json().catch(() => ({}))
  const cleaned = clean(body)
  const validationError = validate(cleaned)
  if (validationError) return NextResponse.json({ error: validationError }, { status: 400 })
  const payload = { seller_user_id: user.id, ...cleaned }

  const { data, error } = await supabase
    .from('seller_payout_settings')
    .upsert(payload, { onConflict: 'seller_user_id' })
    .select('*')
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message || 'Failed to save payout settings.' }, { status: 500 })
  return NextResponse.json({ settings: mapRow(data) }, { status: 200 })
}
