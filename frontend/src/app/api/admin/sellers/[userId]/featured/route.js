import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAdminApiUser } from '@/lib/auth/requireAdminRoute'

export async function POST(request, { params }) {
  const { userId: sellerUserId } = await params
  if (!sellerUserId) {
    return NextResponse.json({ error: 'Missing seller id.' }, { status: 400 })
  }

  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 })
  }

  const featured = body?.featured
  if (typeof featured !== 'boolean') {
    return NextResponse.json({ error: 'Body must include featured: boolean.' }, { status: 400 })
  }

  const { responseError } = await requireAdminApiUser()
  if (responseError) return responseError

  const supabase = await createClient()

  const { data: before, error: fetchErr } = await supabase
    .from('sellers')
    .select('user_id')
    .eq('user_id', sellerUserId)
    .maybeSingle()

  if (fetchErr) {
    return NextResponse.json({ error: fetchErr.message || 'Failed to load seller.' }, { status: 500 })
  }
  if (!before) {
    return NextResponse.json({ error: 'Seller not found.' }, { status: 404 })
  }

  const { data, error } = await supabase
    .from('sellers')
    .update({ partners_featured: featured })
    .eq('user_id', sellerUserId)
    .select()
    .maybeSingle()

  if (error) {
    return NextResponse.json({ error: error.message || 'Failed to update featured state.' }, { status: 400 })
  }

  return NextResponse.json({ data }, { status: 200 })
}
