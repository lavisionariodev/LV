import { NextResponse } from 'next/server'
import { requireActiveSellerApiUser } from '@/lib/auth/requireApiUser'
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
  const { user, supabaseAdmin, responseError } = await requireActiveSellerApiUser()
  if (responseError) return responseError

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
  const { user, supabaseAdmin, responseError } = await requireActiveSellerApiUser()
  if (responseError) return responseError

  const params = await context.params
  const id = String(params?.id ?? '').trim()
  if (!id) {
    return NextResponse.json({ error: 'Missing request id.' }, { status: 400 })
  }

  const body = await request.json().catch(() => ({}))
  const status = String(body?.status ?? '').trim().toLowerCase()
  const sellerNote =
    body?.sellerNote != null ? String(body.sellerNote).trim().slice(0, 2000) : ''

  if (status !== 'under_review') {
    return NextResponse.json(
      { error: 'Sellers may only mark a request as under review. Platform admins close cases and handle refunds.' },
      { status: 400 },
    )
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

  if (dispute.buyer_id) {
    const ordRef = String(dispute.order_id || '').slice(0, 8)
    await notifyUser(supabaseAdmin, {
      userId: dispute.buyer_id,
      type: 'alerts',
      title: 'Help request update',
      body: `Your provider marked your request for order ${ordRef} as under review.`,
      metadata: { orderId: dispute.order_id, disputeId: dispute.id },
      dedupeKey: `dispute_seller_status:${id}:${status}`,
    })
  }

  return NextResponse.json({ ok: true }, { status: 200 })
}
