import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { notifyAllAdmins } from '@/lib/notifications/inAppServer'

async function requireSeller(supabaseAdmin, userId) {
  const { data: seller, error: sellerErr } = await supabaseAdmin
    .from('sellers')
    .select('business_name,contact_name,email,status')
    .eq('user_id', userId)
    .maybeSingle()

  if (sellerErr || !seller) {
    return { response: NextResponse.json({ error: 'Seller account required.' }, { status: 403 }) }
  }
  if (['rejected', 'suspended'].includes(String(seller.status || '').toLowerCase())) {
    return {
      response: NextResponse.json(
        { error: 'Seller account is not allowed to submit support requests.' },
        { status: 403 },
      ),
    }
  }
  return { seller }
}

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser()

  if (userErr || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabaseAdmin = getSupabaseAdmin()
  const auth = await requireSeller(supabaseAdmin, user.id)
  if (auth.response) return auth.response

  const { data, error } = await supabaseAdmin
    .from('seller_support_requests')
    .select('id, subject, message, status, created_at')
    .eq('seller_user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) {
    return NextResponse.json({ error: error.message || 'Failed to load support requests.' }, { status: 500 })
  }

  return NextResponse.json({ requests: data ?? [] }, { status: 200 })
}

export async function POST(request) {
  const supabase = await createClient()
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser()

  if (userErr || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabaseAdmin = getSupabaseAdmin()
  const auth = await requireSeller(supabaseAdmin, user.id)
  if (auth.response) return auth.response

  const body = await request.json().catch(() => ({}))
  const subject = String(body?.subject || 'Seller Help Request').trim().slice(0, 160)
  const message = String(body?.message || '').trim().slice(0, 4000)

  if (!message) {
    return NextResponse.json({ error: 'Please enter your message before submitting.' }, { status: 400 })
  }

  const { data: row, error } = await supabaseAdmin
    .from('seller_support_requests')
    .insert({
      seller_user_id: user.id,
      subject,
      message,
      status: 'open',
    })
    .select('id, subject, message, status, created_at')
    .maybeSingle()

  if (error || !row) {
    return NextResponse.json({ error: error?.message || 'Failed to submit support request.' }, { status: 500 })
  }

  await notifyAllAdmins(supabaseAdmin, {
    type: 'system',
    title: `Seller support: ${subject || 'Help Request'}`,
    body: message,
    metadata: {
      source: 'seller_help_email_support',
      senderRole: 'seller',
      senderId: user.id,
      senderEmail: user.email || auth.seller?.email || null,
      sellerBusinessName: auth.seller?.business_name || null,
      sellerContactName: auth.seller?.contact_name || null,
      subject,
      priority: 'medium',
      supportRequestId: row.id,
    },
    dedupeKey: `seller_support:${row.id}`,
  })

  return NextResponse.json({ ok: true, request: row }, { status: 201 })
}
