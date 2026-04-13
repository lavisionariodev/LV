'use client'

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { BsThreeDots } from 'react-icons/bs'
import styles from '../listings.module.css'
import {
  approveListing,
  listSellerListingsForAdmin,
  rejectListing,
} from '@/lib/seller-listings/client'
import { formatPhpAmount } from '@/lib/cart/formatPhp'
import { hasPendingSellerChanges } from '@/lib/seller-listings/pendingChanges'

function formatDateTime(raw) {
  if (!raw) return '—'
  try {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(raw))
  } catch {
    return String(raw)
  }
}

function kindLabelFromRow(row) {
  const k = typeof row.listing_kind === 'string' ? row.listing_kind.trim().toLowerCase() : ''
  if (k === 'service') return 'Service'
  if (k === 'package') return 'Package'
  if (k === 'product') return 'Product'
  if (typeof row.listing_kind === 'string' && row.listing_kind.trim()) {
    const t = row.listing_kind.trim()
    return t.charAt(0).toUpperCase() + t.slice(1)
  }
  return '—'
}

function StatusBadge({ status }) {
  const s = String(status || 'draft').toLowerCase()
  const tone = styles[`status_${s}`] ? styles[`status_${s}`] : styles.status_draft
  return (
    <span className={`${styles.statusBadge} ${tone}`}>
      <span className={styles.statusDot} />
      {s}
    </span>
  )
}

function ApprovalBadge({ approvalStatus }) {
  const s = String(approvalStatus || 'draft').toLowerCase()
  const tone = styles[`approval_${s}`] ? styles[`approval_${s}`] : styles.approval_draft
  const label = s === 'pending' ? 'pending review' : s
  return (
    <span className={`${styles.approvalBadge} ${tone}`}>
      <span className={styles.statusDot} />
      {label}
    </span>
  )
}

function ListingApprovalActionsMenu({ row, isUpdating, onApprove, onReject }) {
  const [open, setOpen] = useState(false)
  const [menuPos, setMenuPos] = useState({ top: 0, right: 0 })
  const wrapRef = useRef(null)
  const triggerRef = useRef(null)

  function placeMenu() {
    const el = triggerRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    setMenuPos({ top: r.bottom + 6, right: window.innerWidth - r.right })
  }

  useLayoutEffect(() => {
    if (!open) return
    placeMenu()
  }, [open])

  useEffect(() => {
    if (!open) return
    function handle(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handle)
    window.addEventListener('scroll', placeMenu, true)
    window.addEventListener('resize', placeMenu)
    return () => {
      document.removeEventListener('mousedown', handle)
      window.removeEventListener('scroll', placeMenu, true)
      window.removeEventListener('resize', placeMenu)
    }
  }, [open])

  const close = () => setOpen(false)
  const canModerate =
    String(row?.approval_status || 'draft').toLowerCase() === 'pending' || hasPendingSellerChanges(row)

  return (
    <div className={styles.actionMenuWrap} ref={wrapRef}>
      <button
        ref={triggerRef}
        type="button"
        className={styles.actionMenuTrigger}
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={`Actions for ${row?.listing_name || 'listing'}`}
      >
        <BsThreeDots className={styles.actionMenuTriggerIcon} aria-hidden size={16} />
      </button>
      {open && (
        <div
          className={styles.actionMenu}
          role="menu"
          style={{ top: menuPos.top, right: menuPos.right }}
        >
          <button
            type="button"
            role="menuitem"
            className={styles.actionMenuItem}
            onClick={() => close()}
          >
            Close
          </button>

          {canModerate ? (
            <>
              <button
                type="button"
                role="menuitem"
                className={`${styles.actionMenuItem} ${styles.actionMenuItemPrimary}`}
                disabled={isUpdating}
                onClick={() => {
                  onApprove()
                  close()
                }}
              >
                {isUpdating ? 'Approving…' : 'Approve'}
              </button>
              <button
                type="button"
                role="menuitem"
                className={`${styles.actionMenuItem} ${styles.actionMenuItemWarn}`}
                disabled={isUpdating}
                onClick={() => {
                  onReject()
                  close()
                }}
              >
                {isUpdating ? 'Updating…' : 'Reject'}
              </button>
            </>
          ) : null}
        </div>
      )}
    </div>
  )
}

function RejectReasonDialog({
  rejectingRow,
  rejectReason,
  setRejectReason,
  rejectError,
  moderationBusyId,
  onClose,
  onConfirmReject,
}) {
  if (!rejectingRow) return null

  const staged =
    String(rejectingRow.approval_status || '').toLowerCase() === 'approved' &&
    hasPendingSellerChanges(rejectingRow)

  return (
    <div
      className={styles.rejectOverlay}
      role="dialog"
      aria-modal="true"
      aria-label={staged ? 'Reject staged listing changes' : 'Reject listing'}
      onClick={(e) => {
        if (e.target === e.currentTarget && !moderationBusyId) onClose()
      }}
    >
      <div className={styles.rejectCard} onClick={(e) => e.stopPropagation()}>
        <div className={styles.rejectHeader}>
          <p className={styles.rejectKicker}>
            {staged ? 'Reject staged changes' : 'Reject listing'}
          </p>
          <p className={styles.rejectTitle}>{rejectingRow.listing_name || 'Untitled'}</p>
          <p className={styles.rejectSub}>
            Seller: {rejectingRow.seller_business_name || rejectingRow.seller_email || '—'}
          </p>
        </div>
        <label className={styles.rejectLabel}>
          Reason (visible to seller)
          <textarea
            className={styles.rejectTextarea}
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder={
              staged
                ? 'Explain why these updates cannot go live yet…'
                : 'Explain what needs to be changed before approval…'
            }
            rows={4}
            disabled={Boolean(moderationBusyId)}
          />
        </label>
        {rejectError ? <p className={styles.rejectError}>{rejectError}</p> : null}
        <div className={styles.rejectActions}>
          <button
            type="button"
            className={styles.rejectCancel}
            onClick={onClose}
            disabled={Boolean(moderationBusyId)}
          >
            Cancel
          </button>
          <button
            type="button"
            className={styles.rejectConfirm}
            onClick={onConfirmReject}
            disabled={Boolean(moderationBusyId)}
          >
            {moderationBusyId ? 'Rejecting…' : 'Reject'}
          </button>
        </div>
      </div>
    </div>
  )
}

function ApprovalsTableSection({
  title,
  kicker,
  count,
  isLoading,
  rows,
  emptyTitle,
  emptyText,
  moderationBusyId,
  onApprove,
  onReject,
}) {
  return (
    <section className={styles.reviewPanel}>
      <div className={styles.reviewHeader}>
        <div>
          <p className={styles.reviewKicker}>{kicker}</p>
          <p className={styles.reviewTitle}>
            {title} <span className={styles.reviewCount}>{count}</span>
          </p>
        </div>
      </div>

      <div className={styles.reviewTableWrap}>
        {isLoading ? (
          <div className={styles.loadingState}>
            <div className={styles.spinner} />
            <p>Loading…</p>
          </div>
        ) : rows.length === 0 ? (
          <div className={styles.reviewEmpty}>
            <p className={styles.reviewEmptyTitle}>{emptyTitle}</p>
            <p className={styles.reviewEmptyText}>{emptyText}</p>
          </div>
        ) : (
          <table className={styles.reviewTable}>
            <colgroup>
              <col className={styles.colListing} />
              <col className={styles.colSeller} />
              <col className={styles.colKind} />
              <col className={styles.colPrice} />
              <col className={styles.colSubmitted} />
              <col className={styles.colActions} />
            </colgroup>
            <thead>
              <tr>
                <th>Listing</th>
                <th>Seller</th>
                <th>Kind</th>
                <th>Price</th>
                <th>Submitted</th>
                <th className={styles.actionsTh}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const sellerLine =
                  row.seller_business_name?.trim()
                    ? row.seller_email?.trim()
                      ? `${row.seller_business_name.trim()} · ${row.seller_email.trim()}`
                      : row.seller_business_name.trim()
                    : row.seller_email?.trim() || '—'
                const busy = moderationBusyId === row.id
                return (
                  <tr key={row.id} className={styles.reviewRow}>
                    <td>
                      <div className={styles.reviewListingCell}>
                        <p className={styles.reviewListingName}>{row.listing_name || 'Untitled'}</p>
                        <div className={styles.reviewBadges}>
                          <StatusBadge status={row.status} />
                          <ApprovalBadge approvalStatus={row.approval_status} />
                          {hasPendingSellerChanges(row) ? (
                            <span
                              className={styles.cardTag}
                              style={{ background: '#fffbeb', color: '#92400e', fontSize: 11 }}
                            >
                              Staged update
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </td>
                    <td>
                      <p className={styles.reviewSellerText}>{sellerLine}</p>
                    </td>
                    <td>
                      <span className={styles.reviewKind}>{kindLabelFromRow(row)}</span>
                    </td>
                    <td>
                      <span className={styles.reviewPrice}>{formatPhpAmount(row.base_price)}</span>
                    </td>
                    <td>
                      <span className={styles.reviewSubmitted}>
                        {formatDateTime(row.submitted_at)}
                      </span>
                    </td>
                    <td className={styles.actionsCell}>
                      <ListingApprovalActionsMenu
                        row={row}
                        isUpdating={busy}
                        onApprove={() => (busy ? null : onApprove(row))}
                        onReject={() => (busy ? null : onReject(row))}
                      />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </section>
  )
}

export default function AdminListingsApprovalsPage() {
  const [pendingRows, setPendingRows] = useState([])
  const [approvedApproved, setApprovedApproved] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [moderationBusyId, setModerationBusyId] = useState(null)
  const [rejectingRow, setRejectingRow] = useState(null)
  const [rejectReason, setRejectReason] = useState('')
  const [rejectError, setRejectError] = useState(null)

  const stagedRows = useMemo(
    () => approvedApproved.filter((row) => hasPendingSellerChanges(row)),
    [approvedApproved],
  )

  useEffect(() => {
    let mounted = true
    async function load() {
      setError(null)
      setIsLoading(true)

      const [pendingRes, approvedRes] = await Promise.all([
        listSellerListingsForAdmin({
          approvalStatusIn: ['pending'],
          onlyActive: false,
        }),
        listSellerListingsForAdmin({
          statusIn: ['active', 'archived'],
          approvalStatusIn: ['approved'],
        }),
      ])

      if (!mounted) return

      if (pendingRes.error || approvedRes.error) {
        setError(pendingRes.error || approvedRes.error)
        setPendingRows(Array.isArray(pendingRes.data) ? pendingRes.data : [])
        setApprovedApproved(Array.isArray(approvedRes.data) ? approvedRes.data : [])
      } else {
        setPendingRows(Array.isArray(pendingRes.data) ? pendingRes.data : [])
        setApprovedApproved(Array.isArray(approvedRes.data) ? approvedRes.data : [])
      }

      setIsLoading(false)
    }
    load()
    return () => {
      mounted = false
    }
  }, [])

  const handleApprove = async (row) => {
    if (!row?.id) return
    setRejectError(null)
    setModerationBusyId(row.id)
    try {
      const { data, error: approveErr } = await approveListing(row.id)
      if (approveErr || !data) {
        setError(approveErr || 'Failed to approve listing.')
        return
      }
      const wasPendingNewListing = String(row.approval_status || '').toLowerCase() === 'pending'
      setPendingRows((prev) => prev.filter((r) => r.id !== row.id))
      const nextApproved =
        String(data?.approval_status || '').toLowerCase() === 'approved' &&
        ['active', 'archived'].includes(String(data?.status || '').toLowerCase())
      if (nextApproved) {
        if (wasPendingNewListing) {
          setApprovedApproved((prev) => [data, ...prev.filter((r) => r.id !== data.id)].filter(Boolean))
        } else {
          setApprovedApproved((prev) => prev.map((r) => (r.id === data.id ? data : r)))
        }
      }
    } finally {
      setModerationBusyId(null)
    }
  }

  const handleStartReject = (row) => {
    setRejectingRow(row)
    setRejectReason('')
    setRejectError(null)
  }

  const handleConfirmReject = async () => {
    if (!rejectingRow?.id) return
    const reason = String(rejectReason || '').trim()
    if (!reason) {
      setRejectError('Please enter a rejection reason.')
      return
    }
    setModerationBusyId(rejectingRow.id)
    try {
      const { data, error: rejErr } = await rejectListing(rejectingRow.id, reason)
      if (rejErr || !data) {
        setRejectError(rejErr || 'Failed to reject listing.')
        return
      }
      const rejectStaged =
        String(rejectingRow.approval_status || '').toLowerCase() === 'approved' &&
        hasPendingSellerChanges(rejectingRow)
      if (rejectStaged) {
        setApprovedApproved((prev) => prev.map((r) => (r.id === rejectingRow.id ? data : r)))
      } else {
        setPendingRows((prev) => prev.map((r) => (r.id === rejectingRow.id ? data : r)))
      }
      setRejectingRow(null)
      setRejectReason('')
    } finally {
      setModerationBusyId(null)
    }
  }

  return (
    <div className={`${styles.pageRoot} ${styles.approvalsPageStack}`}>
      {error && !isLoading && (
        <p className={styles.loadError} style={{ marginBottom: 16 }}>
          Could not load listings. Ensure migration 038 is applied and admins can read{' '}
          <code>seller_listings</code>.
          {typeof error === 'string' && error.trim() ? (
            <> <span className={styles.errorDetail}>({error})</span></>
          ) : null}
        </p>
      )}

      {isLoading ? (
        <div className={styles.loadingState}>
          <div className={styles.spinner} />
          <p>Loading approvals…</p>
        </div>
      ) : (
        <>
          <ApprovalsTableSection
            title="New listings"
            kicker="Pending first-time approval"
            count={pendingRows.length}
            isLoading={false}
            rows={pendingRows}
            emptyTitle="Nothing pending approval"
            emptyText="No listings are currently awaiting first-time approval."
            moderationBusyId={moderationBusyId}
            onApprove={handleApprove}
            onReject={handleStartReject}
          />

          <ApprovalsTableSection
            title="Information updates"
            kicker="Staged changes on approved listings"
            count={stagedRows.length}
            isLoading={false}
            rows={stagedRows}
            emptyTitle="No staged updates"
            emptyText="No approved listings have information updates pending approval."
            moderationBusyId={moderationBusyId}
            onApprove={handleApprove}
            onReject={handleStartReject}
          />
        </>
      )}

      <RejectReasonDialog
        rejectingRow={rejectingRow}
        rejectReason={rejectReason}
        setRejectReason={setRejectReason}
        rejectError={rejectError}
        moderationBusyId={moderationBusyId}
        onClose={() => setRejectingRow(null)}
        onConfirmReject={handleConfirmReject}
      />
    </div>
  )
}
