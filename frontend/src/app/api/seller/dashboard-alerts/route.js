import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { notifySeller } from '@/lib/notifications/inAppServer'

async function requireSeller(supabaseAdmin, userId) {
  const { data: seller, error } = await supabaseAdmin
    .from('sellers')
    .select('user_id')
    .eq('user_id', userId)
    .maybeSingle()
  if (error || !seller) {
    return { response: NextResponse.json({ error: 'Seller account required.' }, { status: 403 }) }
  }
  return { seller }
}

function normalizeAlerts(raw) {
  return (Array.isArray(raw) ? raw : [])
    .map((a) => ({
      id: String(a?.id || '').trim().slice(0, 160),
      type: String(a?.type || 'Alert').trim().slice(0, 120),
      message: String(a?.message || '').trim().slice(0, 1000),
      priority: String(a?.priority || 'medium').trim().slice(0, 40),
    }))
    .filter((a) => a.id && a.message)
    .slice(0, 20)
}

async function listDashboardNotifications(supabaseAdmin, userId) {
  const { data } = await supabaseAdmin
    .from('user_notifications')
    .select('id,type,title,body,read_at,resolved_at,metadata,created_at')
    .eq('user_id', userId)
    .eq('metadata->>source', 'seller_dashboard')
    .order('created_at', { ascending: false })
    .limit(100)
  return data || []
}

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser()
  if (userErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabaseAdmin = getSupabaseAdmin()
  const auth = await requireSeller(supabaseAdmin, user.id)
  if (auth.response) return auth.response

  return NextResponse.json(
    { notifications: await listDashboardNotifications(supabaseAdmin, user.id) },
    { status: 200 },
  )
}

export async function POST(request) {
  const supabase = await createClient()
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser()
  if (userErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const alerts = normalizeAlerts(body?.alerts)
  const supabaseAdmin = getSupabaseAdmin()
  const auth = await requireSeller(supabaseAdmin, user.id)
  if (auth.response) return auth.response

  await Promise.all(
    alerts.map((alert) =>
      notifySeller(supabaseAdmin, user.id, {
        type: 'alerts',
        title: alert.type,
        body: alert.message,
        metadata: {
          source: 'seller_dashboard',
          alertId: alert.id,
          priority: alert.priority,
        },
        dedupeKey: `seller_dashboard:${user.id}:${alert.id}`,
      }),
    ),
  )

  return NextResponse.json(
    { notifications: await listDashboardNotifications(supabaseAdmin, user.id) },
    { status: 200 },
  )
}
