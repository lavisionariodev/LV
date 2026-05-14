import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { requireAdminApiUser } from '@/lib/auth/requireAdminRoute'
import { notifySeller } from '@/lib/notifications/inAppServer'
import { mapSellerDocumentRow } from '@/lib/sellers/sellerDocuments'

const REASON_MIN = 12
const REASON_MAX = 2000

export async function POST(request, { params }) {
  const { user, responseError } = await requireAdminApiUser()
  if (responseError || !user) return responseError

  const { userId, documentId } = await params
  if (!userId || !documentId) {
    return NextResponse.json({ error: 'Missing seller or document id.' }, { status: 400 })
  }

  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 })
  }

  const action = String(body?.action || '').toLowerCase()
  if (action !== 'approve' && action !== 'reject') {
    return NextResponse.json({ error: 'action must be approve or reject.' }, { status: 400 })
  }

  const reason = typeof body?.reason === 'string' ? body.reason.trim() : ''
  if (action === 'reject') {
    if (!reason) {
      return NextResponse.json({ error: 'A rejection reason is required.' }, { status: 400 })
    }
    if (reason.length < REASON_MIN) {
      return NextResponse.json(
        { error: `Please provide at least ${REASON_MIN} characters explaining the decision.` },
        { status: 400 },
      )
    }
    if (reason.length > REASON_MAX) {
      return NextResponse.json({ error: `Reason must be ${REASON_MAX} characters or fewer.` }, { status: 400 })
    }
  }

  const supabaseAdmin = getSupabaseAdmin()
  const { data: doc, error: fetchErr } = await supabaseAdmin
    .from('seller_documents')
    .select('*')
    .eq('id', documentId)
    .eq('seller_user_id', userId)
    .maybeSingle()

  if (fetchErr) {
    return NextResponse.json({ error: fetchErr.message || 'Failed to load document.' }, { status: 500 })
  }
  if (!doc) {
    return NextResponse.json({ error: 'Document not found.' }, { status: 404 })
  }

  const currentStatus = String(doc.status || '').toLowerCase()
  if (currentStatus === 'approved' || currentStatus === 'rejected') {
    return NextResponse.json(
      {
        ok: true,
        alreadyReviewed: true,
        document: await mapSellerDocumentRow(doc, supabaseAdmin),
      },
      { status: 200 },
    )
  }

  const nextStatus = action === 'approve' ? 'approved' : 'rejected'
  const reviewedAt = new Date().toISOString()
  const { data: updated, error: updErr } = await supabaseAdmin
    .from('seller_documents')
    .update({
      status: nextStatus,
      reviewed_at: reviewedAt,
      reviewed_by: user.id,
      rejection_reason: action === 'reject' ? reason : null,
    })
    .eq('id', documentId)
    .eq('seller_user_id', userId)
    .in('status', ['submitted', 'rejected'])
    .select('*')
    .maybeSingle()

  if (updErr) {
    return NextResponse.json({ error: updErr.message || 'Failed to update document.' }, { status: 500 })
  }
  if (!updated) {
    return NextResponse.json({ error: 'Document is no longer reviewable.' }, { status: 409 })
  }

  const title =
    action === 'approve' ? 'Compliance document approved' : 'Compliance document needs revision'
  const notifyBody =
    action === 'approve'
      ? `${updated.display_name} was approved.`
      : `${updated.display_name} was not approved. ${reason}`

  await notifySeller(supabaseAdmin, userId, {
    type: 'system',
    title,
    body: notifyBody,
    metadata: {
      source: 'seller_document_review',
      documentId: updated.id,
      action,
      href: '/seller/settings/documents',
    },
    dedupeKey: `seller_document_review:${updated.id}:${action}`,
  })

  return NextResponse.json(
    { ok: true, document: await mapSellerDocumentRow(updated, supabaseAdmin) },
    { status: 200 },
  )
}
