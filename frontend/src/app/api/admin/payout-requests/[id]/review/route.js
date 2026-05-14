import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { requireAdminApiUser } from '@/lib/auth/requireAdminRoute'
import { notifySeller } from '@/lib/notifications/inAppServer'

const NOTE_MIN = 12
const NOTE_MAX = 2000

function mapRequestRow(row, seller) {
  return {
    id: row.id,
    sellerUserId: row.seller_user_id,
    requestedAmount: row.requested_amount,
    note: row.note,
    status: row.status,
    escrowSnapshot: row.escrow_snapshot,
    createdAt: row.created_at,
    reviewedAt: row.reviewed_at,
    reviewedBy: row.reviewed_by,
    adminNote: row.admin_note,
    sellerBusinessName: seller?.business_name || null,
    sellerContactName: seller?.contact_name || null,
    sellerEmail: seller?.email || null,
  }
}

export async function POST(request, { params }) {
  const { user, responseError } = await requireAdminApiUser()
  if (responseError || !user) return responseError

  const { id: requestId } = await params
  if (!requestId) {
    return NextResponse.json({ error: 'Missing payout request id.' }, { status: 400 })
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

  const adminNote = typeof body?.adminNote === 'string' ? body.adminNote.trim() : ''
  if (action === 'reject') {
    if (!adminNote) {
      return NextResponse.json({ error: 'A rejection note is required.' }, { status: 400 })
    }
    if (adminNote.length < NOTE_MIN) {
      return NextResponse.json(
        { error: `Please provide at least ${NOTE_MIN} characters explaining the decision.` },
        { status: 400 },
      )
    }
    if (adminNote.length > NOTE_MAX) {
      return NextResponse.json({ error: `Note must be ${NOTE_MAX} characters or fewer.` }, { status: 400 })
    }
  } else if (adminNote.length > NOTE_MAX) {
    return NextResponse.json({ error: `Note must be ${NOTE_MAX} characters or fewer.` }, { status: 400 })
  }

  const supabaseAdmin = getSupabaseAdmin()
  const { data: before, error: fetchErr } = await supabaseAdmin
    .from('seller_payout_requests')
    .select(
      'id,seller_user_id,requested_amount,note,status,escrow_snapshot,created_at,reviewed_at,reviewed_by,admin_note',
    )
    .eq('id', requestId)
    .maybeSingle()

  if (fetchErr) {
    return NextResponse.json({ error: fetchErr.message || 'Failed to load payout request.' }, { status: 500 })
  }
  if (!before) {
    return NextResponse.json({ error: 'Payout request not found.' }, { status: 404 })
  }

  const currentStatus = String(before.status || '').toLowerCase()
  if (currentStatus === 'approved' || currentStatus === 'rejected') {
    const { data: seller } = await supabaseAdmin
      .from('sellers')
      .select('user_id,business_name,contact_name,email')
      .eq('user_id', before.seller_user_id)
      .maybeSingle()
    return NextResponse.json(
      {
        ok: true,
        alreadyReviewed: true,
        request: mapRequestRow(before, seller),
      },
      { status: 200 },
    )
  }

  const nextStatus = action === 'approve' ? 'approved' : 'rejected'
  const reviewedAt = new Date().toISOString()
  const { data: updated, error: updErr } = await supabaseAdmin
    .from('seller_payout_requests')
    .update({
      status: nextStatus,
      reviewed_at: reviewedAt,
      reviewed_by: user.id,
      admin_note: adminNote || null,
    })
    .eq('id', requestId)
    .eq('status', 'pending')
    .select(
      'id,seller_user_id,requested_amount,note,status,escrow_snapshot,created_at,reviewed_at,reviewed_by,admin_note',
    )
    .maybeSingle()

  if (updErr) {
    return NextResponse.json({ error: updErr.message || 'Failed to update payout request.' }, { status: 500 })
  }
  if (!updated) {
    return NextResponse.json({ error: 'Payout request is no longer pending.' }, { status: 409 })
  }

  const { data: seller } = await supabaseAdmin
    .from('sellers')
    .select('user_id,business_name,contact_name,email')
    .eq('user_id', updated.seller_user_id)
    .maybeSingle()

  const sellerLabel = seller?.business_name || seller?.contact_name || 'your shop'
  const title =
    action === 'approve'
      ? 'Payout review request approved'
      : 'Payout review request needs follow-up'
  const notifyBody =
    action === 'approve'
      ? `Your payout review request was approved for release review. Funds are not sent automatically — eligible completed orders are released in Admin Payouts.${adminNote ? ` Note: ${adminNote}` : ''}`.trim()
      : `Your payout review request was not approved. ${adminNote}`

  await notifySeller(supabaseAdmin, updated.seller_user_id, {
    type: 'system',
    title,
    body: notifyBody,
    metadata: {
      source: 'seller_payout_request_review',
      requestId: updated.id,
      action,
      sellerBusinessName: sellerLabel,
      href: '/seller/analytics',
    },
    dedupeKey: `seller_payout_request_review:${updated.id}:${action}`,
  })

  return NextResponse.json({ ok: true, request: mapRequestRow(updated, seller) }, { status: 200 })
}
