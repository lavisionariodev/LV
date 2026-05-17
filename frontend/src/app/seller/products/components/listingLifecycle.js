import { readEnum } from '@/shared/utils'
import {
  hasPendingSellerChanges,
  hasStagedRejection,
  sellerShowsInUpdatesPending,
} from '@/lib/seller-listings/pendingChanges'
export const LISTING_TAB_IDS = ['active', 'under_review', 'updates_pending']

export const LISTING_TABS = [
  { id: 'active', label: 'Active' },
  { id: 'under_review', label: 'Under review' },
  { id: 'updates_pending', label: 'Submitted updates' },
]

export const DEFAULT_LISTING_TAB = 'active'

export function readListingTab(searchParams, allowed = LISTING_TAB_IDS) {
  return readEnum(searchParams, 'tab', allowed, DEFAULT_LISTING_TAB)
}

export function getListingApprovalStatus(row) {
  return String(row?.approval_status ?? row?.approvalStatus ?? 'draft').toLowerCase()
}

export function listingHasStagedChanges(row) {
  if (row?.hasPendingUpdate != null) return Boolean(row.hasPendingUpdate)
  return hasPendingSellerChanges(row)
}

export function listingHasStagedRejection(row) {
  if (row?.stagedRejectionReason != null) {
    return typeof row.stagedRejectionReason === 'string' && row.stagedRejectionReason.trim().length > 0
  }
  return hasStagedRejection(row)
}

export function listingShowsInUpdatesPending(row) {
  if (row?.showsInUpdatesPending != null) return Boolean(row.showsInUpdatesPending)
  return sellerShowsInUpdatesPending(row)
}

export function canCancelListingReview(row) {
  const approval = getListingApprovalStatus(row)
  if (approval === 'pending' || approval === 'rejected') return true
  if (approval === 'approved' && listingShowsInUpdatesPending(row)) return true
  return false
}

export function classifyListingRow(row) {
  const approval = getListingApprovalStatus(row)
  if (approval === 'pending' || approval === 'rejected') return 'under_review'
  if (approval === 'approved' && listingShowsInUpdatesPending(row)) return 'updates_pending'
  if (approval === 'draft' || approval === 'approved') return 'active'
  return 'active'
}

export function filterByTab(rows, tab) {
  const target = String(tab || DEFAULT_LISTING_TAB)
  return (Array.isArray(rows) ? rows : []).filter((row) => classifyListingRow(row) === target)
}

export function countByTab(rows) {
  const counts = { active: 0, under_review: 0, updates_pending: 0 }
  for (const row of Array.isArray(rows) ? rows : []) {
    const tab = classifyListingRow(row)
    if (Object.prototype.hasOwnProperty.call(counts, tab)) counts[tab] += 1
  }
  return counts
}

export function awaitingAdminCount(rows) {
  const counts = countByTab(rows)
  return counts.under_review + counts.updates_pending
}

export function listingsReviewAlertHref(rows) {
  const counts = countByTab(rows)
  if (counts.under_review > 0) return '/seller/products/catalog?tab=under_review'
  if (counts.updates_pending > 0) return '/seller/products/catalog?tab=updates_pending'
  return '/seller/products/catalog'
}

/** Short status for the submitted-updates tab table and submission view modal. */
export function submittedUpdateStatusLabel(product) {
  if (product?.stagedRejectionReason) return 'Rejected'
  if (product?.hasPendingUpdate) return 'Pending'
  return '—'
}

export function isProductShopActive(product) {
  return product?.status === 'active' && product?.approvalStatus === 'approved'
}

export function productStateLabel(product) {
  const approval = String(product?.approvalStatus || 'draft').toLowerCase()
  const status = String(product?.status || 'draft').toLowerCase()
  if (approval === 'pending') return 'Pending review'
  if (approval === 'rejected') return 'Rejected'
  if (status === 'archived') return 'Archived'
  if (approval === 'approved' && product?.stagedRejectionReason) return 'Rejected'
  if (approval === 'approved' && product?.hasPendingUpdate) return 'Pending'
  if (isProductShopActive(product)) return 'Active'
  return 'Draft'
}
