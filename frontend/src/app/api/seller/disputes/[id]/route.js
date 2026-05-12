import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { notifyUser } from '@/lib/notifications/inAppServer'

const DISPUTE_ATTACHMENT_BUCKET = 'dispute-attachments'
const SIGNED_URL_TTL_SECONDS = 600

async function buildAttachments(supabaseAdmin, paths) {
  const list = Array.isArray(paths) ? paths.filter(Boolean) : []
  return Promise.all(
    list.map(async (path) => {
      const safePath = String(path)
      try {
        const { data, error } = await supabaseAdmin.storage
          .from(DISPUTE_ATTACHMENT_BUCKET)
          .createSignedUrl(safePath, SIGNED_URL_TTL_SECONDS)
        return {
          path: safePath,
          signedUrl: data?.signedUrl || null,
          expiresAt: new Date(Date.now() + SIGNED_URL_TTL_SECONDS * 1000).toISOString(),
          error: error?.message || null,
        }
      } catch (err) {
        return {
          path: safePath,
          signedUrl: null,
          expiresAt: null,
          error: err instanceof Error ? err.message : 'Unable to sign attachment URL.',
        }
      }
    }),
  )
}

export async function GET(_request, context) {
  const supabase = await createClient()
  const supabaseAdmin = getSupabaseAdmin()

  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser()

  if (userErr || !user) {
    return NextResponse.json({ error: 'You must be signed in to view requests.' }, { status: 401 })
  }

  const params = await context.params
  const id = String(params?.id ?? '').trim()
  if (!id) {
    return NextResponse.json({ error: 'Missing request id.' }, { status: 400 })
  }

  const { data: dispute, error: disputeErr } = await supabaseAdmin
    .from('disputes')
    .select('id,order_id,buyer_id,seller_user_id,reason,description,status,opened_at,resolution_notes,attachment_paths')
    .eq('id', id)
    .maybeSingle()

  if (disputeErr || !dispute) {
    return NextResponse.json({ error: 'Request not found.' }, { status: 404 })
  }

  if (dispute.seller_user_id !== user.id) {
    return NextResponse.json({ error: 'You are not authorized to view this request.' }, { status: 403 })
  }

  const attachments = await buildAttachments(supabaseAdmin, dispute.attachment_paths ?? [])
  return NextResponse.json(
    {
      dispute: {
        id: dispute.id,
        orderId: dispute.order_id,
        reason: dispute.reason,
        description: dispute.description || '',
        status: dispute.status,
        openedAt: dispute.opened_at,
        resolutionNotes: dispute.resolution_notes || '',
        attachmentPaths: dispute.attachment_paths ?? [],
        attachments,
      },
    },
    { status: 200 },
  )
}

export async function PATCH(request, context) {
  const supabase = await createClient()
  const supabaseAdmin = getSupabaseAdmin()

  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser()

  if (userErr || !user) {
    return NextResponse.json({ error: 'You must be signed in to manage requests.' }, { status: 401 })
  }

  const params = await context.params
  const id = String(params?.id ?? '').trim()
  if (!id) {
    return NextResponse.json({ error: 'Missing request id.' }, { status: 400 })
  }

  const body = await request.json().catch(() => ({}))
  const status = String(body?.status ?? '').trim().toLowerCase()
  const sellerNote =
    body?.sellerNote != null ? String(body.sellerNote).trim().slice(0, 2000) : ''

  if (!['under_review', 'resolved'].includes(status)) {
    return NextResponse.json({ error: 'Invalid request action.' }, { status: 400 })
  }

  const { data: dispute, error: disputeErr } = await supabaseAdmin
    .from('disputes')
    .select('id,order_id,buyer_id,seller_user_id,status,resolution_notes')
    .eq('id', id)
    .maybeSingle()

  if (disputeErr || !dispute) {
    return NextResponse.json({ error: 'Request not found.' }, { status: 404 })
  }

  if (dispute.seller_user_id !== user.id) {
    return NextResponse.json({ error: 'You are not authorized to update this request.' }, { status: 403 })
  }

  if (!['open', 'under_review'].includes(String(dispute.status || ''))) {
    return NextResponse.json({ error: 'This request is already closed.' }, { status: 400 })
  }

  const existingNotes = String(dispute.resolution_notes || '').trim()
  const nextNotes = sellerNote
    ? [existingNotes, `Seller note: ${sellerNote}`].filter(Boolean).join('\n\n')
    : existingNotes || null

  const { error: updateErr } = await supabaseAdmin
    .from('disputes')
    .update({
      status,
      resolution_notes: nextNotes,
    })
    .eq('id', id)

  if (updateErr) {
    return NextResponse.json({ error: 'Unable to update this request.' }, { status: 500 })
  }

  if (status === 'resolved') {
    await supabaseAdmin
      .from('order_escrows')
      .update({
        status: 'escrowed',
        hold_reason: null,
      })
      .eq('order_id', dispute.order_id)
      .eq('status', 'on_hold')
      .like('hold_reason', 'Buyer request opened%')
  }

  if (dispute.buyer_id) {
    const ordRef = String(dispute.order_id || '').slice(0, 8)
    const isResolved = status === 'resolved'
    await notifyUser(supabaseAdmin, {
      userId: dispute.buyer_id,
      type: 'alerts',
      title: isResolved ? 'Help request resolved' : 'Help request update',
      body: isResolved
        ? `Your provider resolved your request for order ${ordRef}.`
        : `Your provider marked your request for order ${ordRef} as under review.`,
      metadata: { orderId: dispute.order_id, disputeId: dispute.id },
      dedupeKey: `dispute_seller_status:${id}:${status}`,
    })
  }

  return NextResponse.json({ ok: true }, { status: 200 })
}
