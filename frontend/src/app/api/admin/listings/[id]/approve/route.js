import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(_request, { params }) {
  const listingId = params?.id
  if (!listingId) {
    return NextResponse.json({ error: 'Missing listing id.' }, { status: 400 })
  }

  const supabase = await createClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 })
  }

  const { data: adminRow, error: adminErr } = await supabase
    .from('admins')
    .select('id')
    .eq('id', user.id)
    .maybeSingle()

  if (adminErr) {
    return NextResponse.json({ error: adminErr.message || 'Failed to verify admin.' }, { status: 500 })
  }
  if (!adminRow) {
    return NextResponse.json({ error: 'Forbidden.' }, { status: 403 })
  }

  const { data, error } = await supabase.rpc('approve_listing', { p_listing_id: listingId })
  if (error) {
    return NextResponse.json({ error: error.message || 'Failed to approve listing.' }, { status: 400 })
  }

  return NextResponse.json({ data }, { status: 200 })
}

