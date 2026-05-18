import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { requireAdminApiUser } from '@/lib/auth/requireAdminRoute'
import { mapPayoutSettingsForAdmin } from '@/lib/payments/payout'

export async function GET(_request, { params }) {
  const { responseError } = await requireAdminApiUser()
  if (responseError) return responseError

  const { userId } = await params
  if (!userId) {
    return NextResponse.json({ error: 'Missing seller id.' }, { status: 400 })
  }

  const supabaseAdmin = getSupabaseAdmin()
  const { data: seller, error: sellerErr } = await supabaseAdmin
    .from('sellers')
    .select('user_id')
    .eq('user_id', userId)
    .maybeSingle()

  if (sellerErr) {
    return NextResponse.json({ error: sellerErr.message || 'Failed to load seller.' }, { status: 500 })
  }
  if (!seller) {
    return NextResponse.json({ error: 'Seller not found.' }, { status: 404 })
  }

  const { data, error } = await supabaseAdmin
    .from('seller_payout_settings')
    .select('*')
    .eq('seller_user_id', userId)
    .maybeSingle()

  if (error) {
    return NextResponse.json({ error: error.message || 'Failed to load payout settings.' }, { status: 500 })
  }

  return NextResponse.json({ settings: mapPayoutSettingsForAdmin(data) }, { status: 200 })
}
