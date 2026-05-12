import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

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

function mapRow(row) {
  if (!row) return null
  return {
    payoutMethod: row.payout_method || 'bank',
    accountHolderName: row.account_holder_name || '',
    bankName: row.bank_name || '',
    accountNumber: row.account_number || '',
    gcashName: row.gcash_name || '',
    gcashNumber: row.gcash_number || '',
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

  const { data, error } = await supabase
    .from('seller_payout_settings')
    .select('*')
    .eq('seller_user_id', user.id)
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message || 'Failed to load payout settings.' }, { status: 500 })
  return NextResponse.json({ settings: mapRow(data) }, { status: 200 })
}

export async function PUT(request) {
  const supabase = await createClient()
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser()
  if (userErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const payload = { seller_user_id: user.id, ...clean(body) }

  const { data, error } = await supabase
    .from('seller_payout_settings')
    .upsert(payload, { onConflict: 'seller_user_id' })
    .select('*')
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message || 'Failed to save payout settings.' }, { status: 500 })
  return NextResponse.json({ settings: mapRow(data) }, { status: 200 })
}
