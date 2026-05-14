import { NextResponse } from 'next/server'
import { requireActiveSellerApiUser } from '@/lib/auth/requireApiUser'
import { notifySeller } from '@/lib/notifications/inAppServer'

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
  const { user, supabaseAdmin, responseError } = await requireActiveSellerApiUser()
  if (responseError) return responseError

  return NextResponse.json(
    { notifications: await listDashboardNotifications(supabaseAdmin, user.id) },
    { status: 200 },
  )
}

export async function POST(request) {
  const { user, supabaseAdmin, responseError } = await requireActiveSellerApiUser()
  if (responseError) return responseError

  const body = await request.json().catch(() => ({}))
  const alerts = normalizeAlerts(body?.alerts)

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

export async function PATCH(request) {
  const { user, supabaseAdmin, responseError } = await requireActiveSellerApiUser()
  if (responseError) return responseError

  const body = await request.json().catch(() => ({}))
  const alertId = String(body?.alertId || '').trim().slice(0, 160)
  const resolutionNote = String(body?.resolutionNote || '').trim().slice(0, 2000)
  const alertType = String(body?.type || 'Alert').trim().slice(0, 120)
  const alertMessage = String(body?.message || '').trim().slice(0, 1000)
  const alertPriority = String(body?.priority || 'medium').trim().slice(0, 40)

  if (!alertId) {
    return NextResponse.json({ error: 'Missing alertId.' }, { status: 400 })
  }

  const existing = (await listDashboardNotifications(supabaseAdmin, user.id)).find(
    (row) => String(row?.metadata?.alertId || '') === alertId,
  )

  if (!existing) {
    if (!alertMessage) {
      return NextResponse.json({ error: 'Alert message is required to resolve.' }, { status: 400 })
    }
    await notifySeller(supabaseAdmin, user.id, {
      type: 'alerts',
      title: alertType,
      body: alertMessage,
      metadata: {
        source: 'seller_dashboard',
        alertId,
        priority: alertPriority,
        ...(resolutionNote ? { resolutionNote, resolutionNoteAt: new Date().toISOString() } : {}),
      },
      dedupeKey: `seller_dashboard:${user.id}:${alertId}`,
    })
  }

  const rows = await listDashboardNotifications(supabaseAdmin, user.id)
  const target = rows.find((row) => String(row?.metadata?.alertId || '') === alertId)
  if (!target?.id) {
    return NextResponse.json({ error: 'Could not resolve alert.' }, { status: 404 })
  }

  const nowIso = new Date().toISOString()
  const nextMetadata = {
    ...(target.metadata || {}),
    ...(resolutionNote ? { resolutionNote, resolutionNoteAt: nowIso } : {}),
  }

  const { error: updateErr } = await supabaseAdmin
    .from('user_notifications')
    .update({
      read_at: target.read_at || nowIso,
      resolved_at: nowIso,
      metadata: nextMetadata,
    })
    .eq('id', target.id)
    .eq('user_id', user.id)

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message || 'Failed to resolve alert.' }, { status: 500 })
  }

  return NextResponse.json(
    { notifications: await listDashboardNotifications(supabaseAdmin, user.id) },
    { status: 200 },
  )
}
