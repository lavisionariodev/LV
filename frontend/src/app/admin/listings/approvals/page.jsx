'use client'

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { BsThreeDots } from 'react-icons/bs'
import styles from '../listings.module.css'
import ListingsMobileTabs from '../ListingsMobileTabs'
import {
  approveListing,
  listSellerListingsForAdmin,
  rejectListing,
} from '@/lib/seller-listings/client'
import { formatPhpAmount } from '@/lib/cart/formatPhp'
import {
  hasPendingSellerChanges,
  mergePendingChangesIntoListingRow,
  PENDING_CHANGE_KEYS,
} from '@/lib/seller-listings/pendingChanges'
import { formatCount } from '@/utils/formatCount'

const PENDING_FIELD_LABELS = {
  listing_name: 'Title',
  category: 'Category',
  funeral_category: 'Funeral category',
  description: 'Description',
  duration: 'Duration',
  location: 'Location',
  listing_kind: 'Listing type',
  base_price: 'Price',
  package_options: 'Package options',
  stock_status: 'Stock',
  inclusions: 'Inclusions',
  who_this_is_for: 'Who this is for',
  important_notes: 'Important notes',
  image_urls: 'Images',
}

function formatStagedValuePreview(key, value) {
  if (value == null) return '—'
  if (key === 'base_price') {
    const n = Number(value)
    return Number.isFinite(n) ? formatPhpAmount(n) : String(value)
  }
  if (key === 'image_urls' && Array.isArray(value)) {
    const n = value.filter((u) => typeof u === 'string' && u.trim()).length
    return n ? `${n} photo(s)` : '—'
  }
  if (key === 'package_options') {
    if (Array.isArray(value)) return value.length ? `${value.length} option(s)` : '—'
    if (value && typeof value === 'object') return 'Updated'
    return String(value)
  }
  if (typeof value === 'string') {
    const t = value.trim()
    if (!t) return '—'
    return t.length > 56 ? `${t.slice(0, 56)}…` : t
  }
  if (typeof value === 'object') return 'Updated'
  return String(value).length > 56 ? `${String(value).slice(0, 56)}…` : String(value)
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

function formatFieldPreview(key, value) {
  if (key === 'listing_kind') {
    if (value === undefined || value === null || value === '') return '—'
    return kindLabelFromRow({ listing_kind: value })
  }
  return formatStagedValuePreview(key, value)
}

function summarizeStagedChanges(row) {
  const p = row?.pending_changes
  if (!p || typeof p !== 'object' || Array.isArray(p)) return []
  return PENDING_CHANGE_KEYS.filter((k) => Object.prototype.hasOwnProperty.call(p, k)).map((key) => ({
    label: PENDING_FIELD_LABELS[key] || key.replace(/_/g, ' '),
    before: formatFieldPreview(key, row[key]),
    after: formatFieldPreview(key, p[key]),
  }))
}

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

function KindPill({ kind }) {
  const kindMap = {
    service: styles.kindService,
    package: styles.kindPackage,
    product: styles.kindProduct,
  }
  const k = kind?.toLowerCase() || ''
  return (
    <span className={`${styles.kindPill} ${kindMap[k] || ''}`}>
      {kind || '—'}
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
                {isUpdating ? 'Approving…' : '✓ Approve'}
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
                {isUpdating ? 'Updating…' : '✕ Reject'}
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
          <div className={styles.rejectIconWrap}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
          </div>
          <div>
            <p className={styles.rejectKicker}>
              {staged ? 'Reject staged changes' : 'Reject listing'}
            </p>
            <p className={styles.rejectTitle}>{rejectingRow.listing_name || 'Untitled'}</p>
            <p className={styles.rejectSub}>
              Seller: {rejectingRow.seller_business_name || rejectingRow.seller_email || '—'}
            </p>
          </div>
        </div>
        <label className={styles.rejectLabel}>
          Reason <span className={styles.rejectLabelNote}>(visible to seller)</span>
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
            {moderationBusyId ? 'Rejecting…' : 'Confirm Rejection'}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── Mobile card row (used on small screens instead of table) ── */
function MobileListingCard({ row, moderationBusyId, onApprove, onReject }) {
  const busy = moderationBusyId === row.id
  const sellerLine =
    row.seller_business_name?.trim()
      ? row.seller_email?.trim()
        ? `${row.seller_business_name.trim()} · ${row.seller_email.trim()}`
        : row.seller_business_name.trim()
      : row.seller_email?.trim() || '—'

  const canModerate =
    String(row?.approval_status || 'draft').toLowerCase() === 'pending' ||
    hasPendingSellerChanges(row)

  return (
    <div className={styles.mobileCard}>
      <div className={styles.mobileCardTop}>
        <div className={styles.mobileCardInfo}>
          <p className={styles.mobileCardName}>{row.listing_name || 'Untitled'}</p>
          <p className={styles.mobileCardSeller}>{sellerLine}</p>
        </div>
        <div className={styles.mobileCardMeta}>
          <span className={styles.reviewPrice}>{formatPhpAmount(row.base_price)}</span>
          <KindPill kind={kindLabelFromRow(row)} />
        </div>
      </div>

      <div className={styles.mobileCardBadges}>
        <StatusBadge status={row.status} />
        <ApprovalBadge approvalStatus={row.approval_status} />
        {hasPendingSellerChanges(row) && (
          <span className={styles.stagedTag}>Staged update</span>
        )}
      </div>

      <div className={styles.mobileCardFooter}>
        <span className={styles.mobileCardDate}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          {formatDateTime(row.submitted_at)}
        </span>
        {canModerate && (
          <div className={styles.mobileCardActions}>
            <button
              type="button"
              className={styles.mobileApproveBtn}
              disabled={busy}
              onClick={() => !busy && onApprove(row)}
            >
              {busy ? '…' : 'Approve'}
            </button>
            <button
              type="button"
              className={styles.mobileRejectBtn}
              disabled={busy}
              onClick={() => !busy && onReject(row)}
            >
              Reject
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function StagedUpdatesSection({
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
  accentClass,
}) {
  return (
    <section className={`${styles.reviewPanel} ${accentClass || ''}`}>
      <div className={styles.reviewHeader}>
        <div className={styles.reviewHeaderLeft}>
          <p className={styles.reviewKicker}>{kicker}</p>
          <p className={styles.reviewTitle}>
            {title}
            <span className={`${styles.reviewCount} ${count > 0 ? styles.reviewCountActiveGreen : ''}`}>
              {count}
            </span>
          </p>
        </div>
      </div>

      <div className={styles.stagedUpdatesBody}>
        {isLoading ? (
          <div className={styles.loadingState}>
            <div className={styles.spinner} />
            <p>Loading…</p>
          </div>
        ) : rows.length === 0 ? (
          <div className={styles.reviewEmpty}>
            <div className={styles.reviewEmptyIcon}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
              </svg>
            </div>
            <p className={styles.reviewEmptyTitle}>{emptyTitle}</p>
            <p className={styles.reviewEmptyText}>{emptyText}</p>
          </div>
        ) : (
          <ul className={styles.stagedCardsList}>
            {rows.map((row) => {
              const busy = moderationBusyId === row.id
              const shop =
                row.seller_business_name?.trim() || row.seller_email?.trim() || '—'
              const merged = mergePendingChangesIntoListingRow(row)
              const listingTitle = merged.listing_name || 'Untitled'
              const lines = summarizeStagedChanges(row)
              return (
                <li key={row.id} className={styles.stagedCompactCard}>
                  <p className={styles.stagedCompactShop}>{shop}</p>
                  <p className={styles.stagedCompactListing}>
                    <span className={styles.stagedCompactMetaLabel}>Listing</span>{' '}
                    {listingTitle}
                  </p>
                  <p className={styles.stagedChangesHeading}>Changes</p>
                  <ul className={styles.stagedChangesLines}>
                    {lines.map(({ label, before, after }, idx) => (
                      <li key={`${row.id}-${label}-${idx}`} className={styles.stagedChangeBlock}>
                        <p className={styles.stagedChangeFieldName}>{label}</p>
                        <div className={styles.stagedDiffRow}>
                          <span className={styles.stagedDiffLabel}>Current</span>
                          <span className={styles.stagedDiffValueMuted}>{before}</span>
                        </div>
                        <div className={styles.stagedDiffRow}>
                          <span className={styles.stagedDiffLabel}>Submitted update</span>
                          <span className={styles.stagedDiffValueNew}>{after}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                  <div className={styles.stagedCardActions}>
                    <button
                      type="button"
                      className={styles.stagedApproveBtn}
                      disabled={busy}
                      onClick={() => !busy && onApprove(row)}
                    >
                      {busy ? '…' : 'Approve'}
                    </button>
                    <button
                      type="button"
                      className={styles.stagedRejectBtn}
                      disabled={busy}
                      onClick={() => !busy && onReject(row)}
                    >
                      Reject
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </section>
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
  accentClass,
}) {
  return (
    <section className={`${styles.reviewPanel} ${accentClass || ''}`}>
      <div className={styles.reviewHeader}>
        <div className={styles.reviewHeaderLeft}>
          <p className={styles.reviewKicker}>{kicker}</p>
          <p className={styles.reviewTitle}>
            {title}
            <span className={`${styles.reviewCount} ${count > 0 ? styles.reviewCountActiveGreen : ''}`}>
              {count}
            </span>
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
            <div className={styles.reviewEmptyIcon}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
              </svg>
            </div>
            <p className={styles.reviewEmptyTitle}>{emptyTitle}</p>
            <p className={styles.reviewEmptyText}>{emptyText}</p>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <table className={`${styles.reviewTable} ${styles.desktopOnly}`}>
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
                              <span className={styles.stagedTag}>Staged update</span>
                            ) : null}
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className={styles.sellerCell}>
                          <span className={styles.sellerAvatar}>
                            {(row.seller_business_name || row.seller_email || '?')[0].toUpperCase()}
                          </span>
                          <p className={styles.reviewSellerText}>{sellerLine}</p>
                        </div>
                      </td>
                      <td>
                        <KindPill kind={kindLabelFromRow(row)} />
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

            {/* Mobile cards */}
            <div className={`${styles.mobileCardList} ${styles.mobileOnly}`}>
              {rows.map((row) => (
                <MobileListingCard
                  key={row.id}
                  row={row}
                  moderationBusyId={moderationBusyId}
                  onApprove={onApprove}
                  onReject={onReject}
                />
              ))}
            </div>
          </>
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

  const totalPending = pendingRows.length + stagedRows.length

  return (
    <div className={`${styles.pageRoot} ${styles.approvalsPageStack} ${styles.approvalsGreenTheme}`}>
      <ListingsMobileTabs />

      {/* Summary stats strip */}
      {!isLoading && !error && (
        <div className={`${styles.approvalsSummaryStrip} ${styles.approvalsSummaryStripGreen}`}>
          <div
            className={`${styles.summaryStatItem} ${pendingRows.length > 0 ? styles.summaryStatItemActive : ''}`}
          >
            <span
              className={`${styles.summaryStatValue} ${pendingRows.length > 0 ? styles.summaryStatValueHighlight : styles.summaryStatValueZero}`}
            >
              {formatCount(pendingRows.length)}
            </span>
            <span
              className={`${styles.summaryStatLabel} ${pendingRows.length > 0 ? styles.summaryStatLabelActive : ''}`}
            >
              <span className={styles.summaryStatLabelLong}>New Listings</span>
              <span className={styles.summaryStatLabelShort}>New</span>
            </span>
          </div>
          <div className={styles.summaryStatDivider} />
          <div
            className={`${styles.summaryStatItem} ${stagedRows.length > 0 ? styles.summaryStatItemActive : ''}`}
          >
            <span
              className={`${styles.summaryStatValue} ${stagedRows.length > 0 ? styles.summaryStatValueHighlight : styles.summaryStatValueZero}`}
            >
              {formatCount(stagedRows.length)}
            </span>
            <span
              className={`${styles.summaryStatLabel} ${stagedRows.length > 0 ? styles.summaryStatLabelActive : ''}`}
            >
              <span className={styles.summaryStatLabelLong}>Staged Updates</span>
              <span className={styles.summaryStatLabelShort}>Staged</span>
            </span>
          </div>
          <div className={styles.summaryStatDivider} />
          <div
            className={`${styles.summaryStatItem} ${totalPending > 0 ? styles.summaryStatItemActive : ''}`}
          >
            <span
              className={`${styles.summaryStatValue} ${totalPending > 0 ? styles.summaryStatValueHighlight : styles.summaryStatValueZero}`}
            >
              {formatCount(totalPending)}
            </span>
            <span
              className={`${styles.summaryStatLabel} ${totalPending > 0 ? styles.summaryStatLabelActive : ''}`}
            >
              <span className={styles.summaryStatLabelLong}>Total Pending</span>
              <span className={styles.summaryStatLabelShort}>Pendings</span>
            </span>
          </div>
        </div>
      )}

      {/* Error banner */}
      {error && !isLoading && (
        <div className={styles.errorBanner}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span>
            Could not load listings. Ensure migration 038 is applied and admins can read{' '}
            <code>seller_listings</code>.
            {typeof error === 'string' && error.trim() ? (
              <> <span className={styles.errorDetail}>({error})</span></>
            ) : null}
          </span>
        </div>
      )}

      {isLoading ? (
        <div className={styles.approvalsLoadingWrap}>
          <div className={styles.spinner} />
          <p>Loading approvals…</p>
        </div>
      ) : (
        <>
          <ApprovalsTableSection
            title="New Listings"
            kicker="Pending first-time approval"
            count={formatCount(pendingRows.length)}
            isLoading={false}
            rows={pendingRows}
            emptyTitle="Nothing pending approval"
            emptyText="No listings are currently awaiting first-time approval."
            moderationBusyId={moderationBusyId}
            onApprove={handleApprove}
            onReject={handleStartReject}
            accentClass={pendingRows.length > 0 ? styles.reviewPanelAccentNew : ''}
          />

          <StagedUpdatesSection
            title="Information updates"
            kicker="Staged shop listing edits"
            count={formatCount(stagedRows.length)}
            isLoading={false}
            rows={stagedRows}
            emptyTitle="No staged updates"
            emptyText="No sellers have pending edits to approved listings."
            moderationBusyId={moderationBusyId}
            onApprove={handleApprove}
            onReject={handleStartReject}
            accentClass={stagedRows.length > 0 ? styles.reviewPanelAccentStaged : ''}
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