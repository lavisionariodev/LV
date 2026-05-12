'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import styles from '../listings.module.css'
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
import { formatCount } from '@/shared/utils/formatCount'
import ConfirmModal from '@/components/ui/Modal/ConfirmModal'

/** `seller_avatar_url` comes from listSellerListingsForAdmin (batch `profiles.avatar_url`). */
function SellerAvatarMark({ src, initialsSource, listingStyles: styleMod }) {
  const [failed, setFailed] = useState(false)
  const label = String(initialsSource ?? '?').trim() || '?'
  const url = typeof src === 'string' ? src.trim() : ''
  const showImg = url.length > 0 && !failed
  return (
    <span
      className={`${styleMod.sellerAvatar}${showImg ? ` ${styleMod.sellerAvatarHasImage}` : ''}`}
      title={label}
    >
      {showImg ? (
        <Image
          src={url}
          alt=""
          width={18}
          height={18}
          unoptimized
          className={styleMod.sellerAvatarImg}
          onError={() => setFailed(true)}
        />
      ) : (
        label.charAt(0).toUpperCase()
      )}
    </span>
  )
}

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

function RowActions({ row, isUpdating, onApprove, onReject, onViewDetails }) {
  const canModerate =
    String(row?.approval_status || 'draft').toLowerCase() === 'pending' || hasPendingSellerChanges(row)

  return (
    <div className={styles.rowActions}>
      <button type="button" className={styles.rowActionView} onClick={onViewDetails}>
        View
      </button>
      {canModerate && (
        <>
          <span className={styles.rowActionDivider} />
          <button
            type="button"
            className={styles.rowActionApprove}
            disabled={isUpdating}
            onClick={onApprove}
          >
            {isUpdating ? '…' : 'Approve'}
          </button>
          <span className={styles.rowActionDivider} />
          <button
            type="button"
            className={styles.rowActionReject}
            disabled={isUpdating}
            onClick={onReject}
          >
            Reject
          </button>
        </>
      )}
    </div>
  )
}

function ViewDetailsModal({ row, onClose }) {
  if (!row) return null

  const isStaged = hasPendingSellerChanges(row)
  const lines = isStaged ? summarizeStagedChanges(row) : []
  const sellerLine =
    row.seller_business_name?.trim()
      ? row.seller_email?.trim()
        ? `${row.seller_business_name.trim()} · ${row.seller_email.trim()}`
        : row.seller_business_name.trim()
      : row.seller_email?.trim() || '—'

  return (
    <div
      className={styles.detailsOverlay}
      role="dialog"
      aria-modal="true"
      aria-label="Listing details"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className={styles.detailsCard} onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className={styles.detailsHeader}>
          <div className={styles.detailsHeaderLeft}>
            <span className={styles.detailsKicker}>
              {isStaged ? 'Staged update' : 'Pending approval'}
            </span>
            <p className={styles.detailsTitle}>{row.listing_name || 'Untitled'}</p>
            <p className={styles.detailsSeller}>{sellerLine}</p>
          </div>
          <button
            type="button"
            className={styles.detailsClose}
            onClick={onClose}
            aria-label="Close"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Meta row */}
        <div className={styles.detailsMeta}>
          <div className={styles.detailsMetaItem}>
            <span className={styles.detailsMetaLabel}>Kind</span>
            <KindPill kind={kindLabelFromRow(row)} />
          </div>
          <div className={styles.detailsMetaItem}>
            <span className={styles.detailsMetaLabel}>Price</span>
            <span className={styles.detailsMetaValue}>{formatPhpAmount(row.base_price)}</span>
          </div>
          <div className={styles.detailsMetaItem}>
            <span className={styles.detailsMetaLabel}>Status</span>
            <StatusBadge status={row.status} />
          </div>
          <div className={styles.detailsMetaItem}>
            <span className={styles.detailsMetaLabel}>Approval</span>
            <ApprovalBadge approvalStatus={row.approval_status} />
          </div>
          {row.submitted_at && (
            <div className={styles.detailsMetaItem}>
              <span className={styles.detailsMetaLabel}>Submitted</span>
              <span className={styles.detailsMetaValue}>{formatDateTime(row.submitted_at)}</span>
            </div>
          )}
        </div>

        {/* Changes table (staged) or listing fields (pending) */}
        {isStaged ? (
          <>
            <p className={styles.detailsSectionLabel}>Submitted Changes</p>
            <table className={styles.detailsDiffTable}>
              <thead>
                <tr>
                  <th>Field</th>
                  <th>Current</th>
                  <th>Submitted Update</th>
                </tr>
              </thead>
              <tbody>
                {lines.map(({ label, before, after }, idx) => (
                  <tr key={idx} className={styles.detailsDiffRow}>
                    <td className={styles.detailsDiffField}>{label}</td>
                    <td className={styles.detailsDiffBefore}>{before}</td>
                    <td className={styles.detailsDiffAfter}>{after}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        ) : (
          <>
            <p className={styles.detailsSectionLabel}>Listing Information</p>
            <table className={styles.detailsDiffTable}>
              <tbody>
                {[
                  { label: 'Title', value: row.listing_name || '—' },
                  { label: 'Kind', value: kindLabelFromRow(row) },
                  { label: 'Price', value: formatPhpAmount(row.base_price) },
                  { label: 'Category', value: row.category || '—' },
                  { label: 'Location', value: row.location || '—' },
                  { label: 'Description', value: row.description || '—' },
                ].map(({ label, value }) => (
                  <tr key={label} className={styles.detailsDiffRow}>
                    <td className={styles.detailsDiffField}>{label}</td>
                    <td className={styles.detailsDiffAfter} colSpan={2}>{value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </div>
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
          <div className={styles.mobileCardSellerRow}>
            <SellerAvatarMark
              src={row.seller_avatar_url}
              initialsSource={row.seller_business_name || row.seller_email}
              listingStyles={styles}
            />
            <p className={styles.mobileCardSeller}>{sellerLine}</p>
          </div>
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
  onViewDetails,
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

      <div className={styles.tableWrap}>
        {isLoading ? (
          <table className={styles.table} role="status" aria-live="polite" aria-busy="true" aria-label="Loading staged updates">
            <colgroup>
              <col className={styles.colSeller} />
              <col className={styles.colListing} />
              <col className={styles.colChangedFields} />
              <col className={styles.colActions} />
            </colgroup>
            <thead>
              <tr>
                <th>Seller</th>
                <th>Listing</th>
                <th>Changed Fields</th>
                <th className={styles.actionsTh}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 5 }).map((_, i) => (
                <tr key={`staged-sk-${i}`} className={styles.primaryRow}>
                  <td><span className={`${styles.listingsSkBar} ${styles.listingsSkTdBar}`} style={{ maxWidth: 140 }} aria-hidden /></td>
                  <td><span className={`${styles.listingsSkBar} ${styles.listingsSkTdBar}`} style={{ maxWidth: 200 }} aria-hidden /></td>
                  <td><span className={`${styles.listingsSkBar} ${styles.listingsSkTdBar}`} style={{ maxWidth: 280, height: 36 }} aria-hidden /></td>
                  <td className={styles.actionsCell}><span className={`${styles.listingsSkBar} ${styles.listingsSkTag}`} style={{ width: 88, height: 28 }} aria-hidden /></td>
                </tr>
              ))}
            </tbody>
          </table>
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
          <table className={styles.table}>
            <colgroup>
              <col className={styles.colSeller} />
              <col className={styles.colListing} />
              <col className={styles.colChangedFields} />
              <col className={styles.colActions} />
            </colgroup>
            <thead>
              <tr>
                <th>Seller</th>
                <th>Listing</th>
                <th>Changed Fields</th>
                <th className={styles.actionsTh}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const busy = moderationBusyId === row.id
                const shop =
                  row.seller_business_name?.trim() || row.seller_email?.trim() || '—'
                const merged = mergePendingChangesIntoListingRow(row)
                const listingTitle = merged.listing_name || 'Untitled'
                const lines = summarizeStagedChanges(row)
                return (
                  <tr key={row.id} className={styles.primaryRow}>
                    <td>
                      <div className={styles.sellerCell}>
                        <SellerAvatarMark
                          src={row.seller_avatar_url}
                          initialsSource={row.seller_business_name || row.seller_email}
                          listingStyles={styles}
                        />
                        <p className={styles.reviewSellerText}>{shop}</p>
                      </div>
                    </td>
                    <td>
                      <div className={styles.reviewListingCell}>
                        <p className={styles.reviewListingName}>{listingTitle}</p>
                        <span className={styles.stagedTag}>Staged update</span>
                      </div>
                    </td>
                    <td>
                      <div className={styles.stagedFieldPills}>
                        {lines.map(({ label, after }, idx) => (
                          <span key={`${row.id}-${label}-${idx}`} className={styles.stagedFieldPill}>
                            <span className={styles.stagedFieldName}>{label}</span>
                            <span className={styles.stagedFieldArrow}>→</span>
                            <span className={styles.stagedFieldNew}>{after}</span>
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className={styles.actionsCell}>
                      <RowActions
                        row={row}
                        isUpdating={busy}
                        onApprove={() => onApprove(row)}
                        onReject={() => onReject(row)}
                        onViewDetails={() => onViewDetails(row)}
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
  onViewDetails,
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

      <div className={styles.tableWrap}>
        {isLoading ? (
          <div role="status" aria-live="polite" aria-busy="true" aria-label="Loading listings">
            <table className={`${styles.table} ${styles.desktopOnly}`} aria-hidden>
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
                {Array.from({ length: 5 }).map((_, i) => (
                  <tr key={`pend-sk-${i}`} className={styles.primaryRow}>
                    <td><span className={`${styles.listingsSkBar} ${styles.listingsSkTdBar}`} style={{ maxWidth: 220, height: 32 }} aria-hidden /></td>
                    <td><span className={`${styles.listingsSkBar} ${styles.listingsSkTdBar}`} style={{ maxWidth: 160 }} aria-hidden /></td>
                    <td><span className={`${styles.listingsSkBar} ${styles.listingsSkTag}`} aria-hidden /></td>
                    <td><span className={`${styles.listingsSkBar} ${styles.listingsSkTdBar}`} style={{ maxWidth: 72 }} aria-hidden /></td>
                    <td><span className={`${styles.listingsSkBar} ${styles.listingsSkTdBar}`} style={{ maxWidth: 100 }} aria-hidden /></td>
                    <td className={styles.actionsCell}><span className={`${styles.listingsSkBar} ${styles.listingsSkTag}`} style={{ width: 100, height: 28 }} aria-hidden /></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className={`${styles.mobileCardList} ${styles.mobileOnly}`}>
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={`pend-m-sk-${i}`} className={styles.listingsSkMobileCard}>
                  <span className={`${styles.listingsSkBar} ${styles.listingsSkTitle}`} />
                  <span className={`${styles.listingsSkBar} ${styles.listingsSkSub}`} />
                  <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                    <span className={`${styles.listingsSkBar} ${styles.listingsSkTag}`} />
                    <span className={`${styles.listingsSkBar} ${styles.listingsSkTag}`} style={{ width: 80 }} />
                  </div>
                </div>
              ))}
            </div>
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
            {/* Desktop table — same shell as admin sellers / payouts */}
            <table className={`${styles.table} ${styles.desktopOnly}`}>
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
                    <tr key={row.id} className={styles.primaryRow}>
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
                          <SellerAvatarMark
                            src={row.seller_avatar_url}
                            initialsSource={row.seller_business_name || row.seller_email}
                            listingStyles={styles}
                          />
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
                        <RowActions
                          row={row}
                          isUpdating={busy}
                          onApprove={() => onApprove(row)}
                          onReject={() => onReject(row)}
                          onViewDetails={() => onViewDetails(row)}
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
  const pathname = usePathname()
  const listingsPathClean = pathname?.split(/[?#]/)[0] || ''
  const isListingsApprovalsRoute = listingsPathClean.startsWith('/admin/listings/approvals')

  const [pendingRows, setPendingRows] = useState([])
  const [approvedApproved, setApprovedApproved] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [moderationBusyId, setModerationBusyId] = useState(null)
  const [rejectingRow, setRejectingRow] = useState(null)
  const [rejectReason, setRejectReason] = useState('')
  const [rejectError, setRejectError] = useState(null)
  const [viewingRow, setViewingRow] = useState(null)
  const [approveConfirmRow, setApproveConfirmRow] = useState(null)

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

  const openApproveConfirm = (row) => {
    if (!row?.id) return
    setRejectError(null)
    setApproveConfirmRow(row)
  }

  const performApproveListing = async (row) => {
    if (!row?.id) return
    setRejectError(null)
    setModerationBusyId(row.id)
    try {
      const { data, error: approveErr } = await approveListing(row.id)
      if (approveErr || !data) {
        setError(approveErr || 'Failed to approve listing.')
        return
      }
      setError(null)
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
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('admin:attention-refresh'))
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
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('admin:attention-refresh'))
      }
    } finally {
      setModerationBusyId(null)
    }
  }

  const totalPending = pendingRows.length + stagedRows.length

  return (
    <div className={`${styles.pageRoot} ${styles.approvalsPageStack} ${styles.approvalsGreenTheme}`}>
      <nav className={styles.listingsMobileSwitch} aria-label="Listings navigation">
        <Link
          href="/admin/listings/browse"
          className={`${styles.listingsMobileSwitchLink} ${!isListingsApprovalsRoute ? styles.listingsMobileSwitchLinkActive : ''}`}
          aria-current={!isListingsApprovalsRoute ? 'page' : undefined}
        >
          Browse
        </Link>
        <Link
          href="/admin/listings/approvals"
          className={`${styles.listingsMobileSwitchLink} ${isListingsApprovalsRoute ? styles.listingsMobileSwitchLinkActive : ''}`}
          aria-current={isListingsApprovalsRoute ? 'page' : undefined}
        >
          Approvals
        </Link>
      </nav>

      {/* Summary stats strip — skeleton matches disputes stat bar while loading */}
      {!error && (
        <div
          className={`${styles.approvalsSummaryStrip} ${styles.approvalsSummaryStripGreen}`}
          aria-busy={isLoading}
          aria-live="polite"
        >
          <div
            className={`${styles.summaryStatItem} ${!isLoading && pendingRows.length > 0 ? styles.summaryStatItemActive : ''}`}
          >
            <span
              className={`${styles.summaryStatValue} ${!isLoading && pendingRows.length > 0 ? styles.summaryStatValueHighlight : styles.summaryStatValueZero}`}
            >
              {isLoading ? <span className={styles.approvalsSummaryStatSk} aria-hidden /> : formatCount(pendingRows.length)}
            </span>
            <span
              className={`${styles.summaryStatLabel} ${!isLoading && pendingRows.length > 0 ? styles.summaryStatLabelActive : ''}`}
            >
              <span className={styles.summaryStatLabelLong}>New Listings</span>
              <span className={styles.summaryStatLabelShort}>New</span>
            </span>
          </div>
          <div className={styles.summaryStatDivider} />
          <div
            className={`${styles.summaryStatItem} ${!isLoading && stagedRows.length > 0 ? styles.summaryStatItemActive : ''}`}
          >
            <span
              className={`${styles.summaryStatValue} ${!isLoading && stagedRows.length > 0 ? styles.summaryStatValueHighlight : styles.summaryStatValueZero}`}
            >
              {isLoading ? <span className={styles.approvalsSummaryStatSk} aria-hidden /> : formatCount(stagedRows.length)}
            </span>
            <span
              className={`${styles.summaryStatLabel} ${!isLoading && stagedRows.length > 0 ? styles.summaryStatLabelActive : ''}`}
            >
              <span className={styles.summaryStatLabelLong}>Staged Updates</span>
              <span className={styles.summaryStatLabelShort}>Staged</span>
            </span>
          </div>
          <div className={styles.summaryStatDivider} />
          <div
            className={`${styles.summaryStatItem} ${!isLoading && totalPending > 0 ? styles.summaryStatItemActive : ''}`}
          >
            <span
              className={`${styles.summaryStatValue} ${!isLoading && totalPending > 0 ? styles.summaryStatValueHighlight : styles.summaryStatValueZero}`}
            >
              {isLoading ? <span className={styles.approvalsSummaryStatSk} aria-hidden /> : formatCount(totalPending)}
            </span>
            <span
              className={`${styles.summaryStatLabel} ${!isLoading && totalPending > 0 ? styles.summaryStatLabelActive : ''}`}
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
        <div className={styles.listingsSkApprovalsStack} role="status" aria-live="polite" aria-busy="true" aria-label="Loading approvals">
          <section className={`${styles.reviewPanel} ${styles.reviewPanelAccentNew}`}>
            <div className={styles.listingsSkReviewHead}>
              <span className={`${styles.listingsSkBar} ${styles.listingsSkKicker}`} />
              <span className={`${styles.listingsSkBar} ${styles.listingsSkH2}`} />
            </div>
            <div className={styles.tableWrap}>
              <table className={`${styles.table} ${styles.desktopOnly}`} aria-hidden>
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
                  {Array.from({ length: 4 }).map((_, i) => (
                    <tr key={`ap-sk-a-${i}`} className={styles.primaryRow}>
                      <td><span className={`${styles.listingsSkBar} ${styles.listingsSkTdBar}`} style={{ maxWidth: 200, height: 28 }} /></td>
                      <td><span className={`${styles.listingsSkBar} ${styles.listingsSkTdBar}`} style={{ maxWidth: 140 }} /></td>
                      <td><span className={`${styles.listingsSkBar} ${styles.listingsSkTag}`} /></td>
                      <td><span className={`${styles.listingsSkBar} ${styles.listingsSkTdBar}`} style={{ maxWidth: 64 }} /></td>
                      <td><span className={`${styles.listingsSkBar} ${styles.listingsSkTdBar}`} style={{ maxWidth: 88 }} /></td>
                      <td className={styles.actionsCell}><span className={`${styles.listingsSkBar} ${styles.listingsSkTag}`} style={{ width: 92, height: 26 }} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className={`${styles.mobileCardList} ${styles.mobileOnly}`}>
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={`ap-sk-am-${i}`} className={styles.listingsSkMobileCard}>
                    <span className={`${styles.listingsSkBar} ${styles.listingsSkTitle}`} />
                    <span className={`${styles.listingsSkBar} ${styles.listingsSkSub}`} />
                    <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                      <span className={`${styles.listingsSkBar} ${styles.listingsSkTag}`} />
                      <span className={`${styles.listingsSkBar} ${styles.listingsSkTag}`} style={{ width: 80 }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
          <section className={`${styles.reviewPanel} ${styles.reviewPanelAccentStaged}`}>
            <div className={styles.listingsSkReviewHead}>
              <span className={`${styles.listingsSkBar} ${styles.listingsSkKicker}`} />
              <span className={`${styles.listingsSkBar} ${styles.listingsSkH2}`} style={{ width: 240 }} />
            </div>
            <div className={styles.tableWrap}>
              <table className={`${styles.table} ${styles.desktopOnly}`} aria-hidden>
                <colgroup>
                  <col className={styles.colSeller} />
                  <col className={styles.colListing} />
                  <col className={styles.colChangedFields} />
                  <col className={styles.colActions} />
                </colgroup>
                <thead>
                  <tr>
                    <th>Seller</th>
                    <th>Listing</th>
                    <th>Changed Fields</th>
                    <th className={styles.actionsTh}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: 3 }).map((_, i) => (
                    <tr key={`ap-sk-b-${i}`} className={styles.primaryRow}>
                      <td><span className={`${styles.listingsSkBar} ${styles.listingsSkTdBar}`} style={{ maxWidth: 120 }} /></td>
                      <td><span className={`${styles.listingsSkBar} ${styles.listingsSkTdBar}`} style={{ maxWidth: 180 }} /></td>
                      <td><span className={`${styles.listingsSkBar} ${styles.listingsSkTdBar}`} style={{ maxWidth: 260, height: 32 }} /></td>
                      <td className={styles.actionsCell}><span className={`${styles.listingsSkBar} ${styles.listingsSkTag}`} style={{ width: 80, height: 26 }} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className={`${styles.mobileCardList} ${styles.mobileOnly}`}>
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={`ap-sk-bm-${i}`} className={styles.listingsSkMobileCard}>
                    <span className={`${styles.listingsSkBar} ${styles.listingsSkTitle}`} />
                    <span className={`${styles.listingsSkBar} ${styles.listingsSkSub}`} />
                    <div style={{ display: 'flex', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
                      <span className={`${styles.listingsSkBar} ${styles.listingsSkTag}`} />
                      <span className={`${styles.listingsSkBar} ${styles.listingsSkTag}`} style={{ width: 88 }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
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
            onApprove={openApproveConfirm}
            onReject={handleStartReject}
            onViewDetails={setViewingRow}
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
            onApprove={openApproveConfirm}
            onReject={handleStartReject}
            onViewDetails={setViewingRow}
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

      <ViewDetailsModal
        row={viewingRow}
        onClose={() => setViewingRow(null)}
      />

      <ConfirmModal
        open={approveConfirmRow != null}
        variant="primary"
        title="Approve listing?"
        message={
          approveConfirmRow
            ? hasPendingSellerChanges(approveConfirmRow)
              ? `Publish staged changes for "${approveConfirmRow.listing_name || 'Untitled'}"? Updated fields will go live on the shop for families to see.`
              : `Approve "${approveConfirmRow.listing_name || 'Untitled'}" for the public shop? Sellers can receive bookings once it is active.`
            : ''
        }
        subtitleAlign="left"
        confirmLabel="Approve"
        confirmLoadingLabel="Approving..."
        cancelLabel="Cancel"
        loading={Boolean(approveConfirmRow && moderationBusyId === approveConfirmRow.id)}
        onCancel={() => {
          if (moderationBusyId) return
          setApproveConfirmRow(null)
        }}
        onConfirm={async () => {
          if (!approveConfirmRow) return
          try {
            await performApproveListing(approveConfirmRow)
          } finally {
            setApproveConfirmRow(null)
          }
        }}
      />
    </div>
  )
}