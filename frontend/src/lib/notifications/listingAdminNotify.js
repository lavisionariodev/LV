import { notifyAllAdmins } from '@/lib/notifications/inAppServer'
import { getPendingChangeFieldLabels } from '@/lib/seller-listings/pendingChanges'

const ADMIN_LISTING_APPROVALS_HREF = '/admin/listings/approvals'

/**
 * Admin inbox: seller submitted a new listing (approval_status → pending).
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} supabaseAdmin
 * @param {{ listingId: string, listingName?: string | null, submittedAt: string }} p
 */
export async function notifyAdminsNewListingPendingReview(supabaseAdmin, p) {
  const listingId = String(p.listingId || '').trim()
  const submittedAt = String(p.submittedAt || '').trim()
  if (!listingId || !submittedAt) return

  const name = String(p.listingName || '').trim() || 'A listing'
  await notifyAllAdmins(supabaseAdmin, {
    type: 'listing_pending_review',
    title: 'New listing submitted for review',
    body: `${name} is pending approval.`,
    metadata: { listingId, listingSubmissionKind: 'new', href: ADMIN_LISTING_APPROVALS_HREF },
    dedupeKey: `admin_listing_pending:${listingId}:${submittedAt}`,
  })
}

/**
 * Admin inbox: seller saved edits on an approved listing (pending_changes staged).
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} supabaseAdmin
 * @param {{ listingId: string, listingName?: string | null, submittedAt: string, pendingChanges?: unknown }} p
 */
export async function notifyAdminsListingStagedUpdate(supabaseAdmin, p) {
  const listingId = String(p.listingId || '').trim()
  const submittedAt = String(p.submittedAt || '').trim()
  if (!listingId || !submittedAt) return

  const name = String(p.listingName || '').trim() || 'A listing'
  const fields = getPendingChangeFieldLabels(p.pendingChanges)
  const fieldsHint = fields.length ? ` Changed fields: ${fields.join(', ')}.` : ''

  await notifyAllAdmins(supabaseAdmin, {
    type: 'listing_staged_update',
    title: 'Listing update submitted for review',
    body: `${name} has staged changes awaiting approval.${fieldsHint}`,
    metadata: { listingId, listingSubmissionKind: 'staged', href: ADMIN_LISTING_APPROVALS_HREF },
    dedupeKey: `admin_listing_staged:${listingId}:${submittedAt}`,
  })
}
