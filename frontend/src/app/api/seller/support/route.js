import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { notifyAllAdmins } from '@/lib/notifications/inAppServer'

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
  const { data: seller, error: sellerErr } = await supabaseAdmin
    .from('sellers')
    .select('business_name,contact_name,email,status')
    .eq('user_id', user.id)
    .maybeSingle()

  if (sellerErr || !seller) {
    return NextResponse.json({ error: 'Seller account required.' }, { status: 403 })
  }
  if (['rejected', 'suspended'].includes(String(seller.status || '').toLowerCase())) {
    return NextResponse.json({ error: 'Seller account is not allowed to submit support requests.' }, { status: 403 })
  }

  const body = await request.json().catch(() => ({}))
  const subject = String(body?.subject || 'Seller Help Request').trim().slice(0, 160)
  const message = String(body?.message || '').trim().slice(0, 4000)

  if (!message) {
    return NextResponse.json({ error: 'Please enter your message before submitting.' }, { status: 400 })
  }

  await notifyAllAdmins(supabaseAdmin, {
    type: 'system',
    title: `Seller support: ${subject || 'Help Request'}`,
    body: message,
    metadata: {
      source: 'seller_help_email_support',
      senderRole: 'seller',
      senderId: user.id,
      senderEmail: user.email || seller?.email || null,
      sellerBusinessName: seller?.business_name || null,
      sellerContactName: seller?.contact_name || null,
      subject,
      priority: 'medium',
    },
    dedupeKey: `seller_support:${user.id}:${Date.now()}`,
  })

  return NextResponse.json({ ok: true }, { status: 200 })
}
