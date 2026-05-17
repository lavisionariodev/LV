'use client'

import { formatCount, readEnum, readString, replaceUrlQuery } from '@/shared/utils'
import { useState, useMemo, useEffect, useRef, useCallback, useId } from 'react'
import { createPortal } from 'react-dom'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { TbCircleX, TbPlus, TbTrash, TbChevronDown, TbSearch, TbDots } from 'react-icons/tb'
import { FiArchive } from 'react-icons/fi'
import { MdArrowBackIos } from 'react-icons/md'
import styles from '../products.module.css'
import {
  awaitingAdminCount,
  canCancelListingReview,
  countByTab,
  DEFAULT_LISTING_TAB,
  filterByTab,
  isProductShopActive,
  LISTING_TAB_IDS,
  LISTING_TABS,
  productStateLabel,
  readListingTab,
  submittedUpdateStatusLabel,
} from './listingLifecycle'
import {
  buildSellerListingPayload,
  ALLOWED_IMAGE_MIME,
  FALLBACK_IMAGE,
  findFirstMissingRequiredField,
  LISTING_IMAGE_ACCEPT,
  MAX_LISTING_IMAGES,
  listingRowToFormValues,
  normalizePackageOptionsFromDb,
  resolvePersistedImageUrls,
  shouldUnoptimizeListingImage,
  SellerListingFileInput,
  SellerListingFormFields,
} from './SellerListingForm'
import {
  submitListingForReview,
  updateSellerListing,
  deleteSellerListing,
  cancelListingReviewRequest,
} from '@/lib/seller-listings/client'
import { getSellerByUserId } from '@/lib/sellers/client'
import { supabase } from '@/lib/supabase/client'
import { formatPhpAmount, roundPhpAmount } from '@/lib/cart/formatPhp'
import {
  hasPendingSellerChanges,
  mergePendingChangesIntoListingRow,
  getPendingChangeFieldLabels,
  sellerShowsInUpdatesPending,
} from '@/lib/seller-listings/pendingChanges'
import { useDebouncedEffect } from '@/shared/hooks'
const ARCHIVE_PATH = '/seller/products/archive'
const CATALOG_PATH = '/seller/products/catalog'
const LIST_ITEMS_PER_PAGE = 12
const TABLE_ROWS_PER_PAGE = 10

function buildVisiblePages(currentPage, totalPages) {
  if (totalPages <= 0) return []
  return Array.from({ length: totalPages }, (_, i) => i + 1)
    .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
    .reduce((acc, p, idx, arr) => {
      if (idx > 0 && p - arr[idx - 1] > 1) acc.push('...')
      acc.push(p)
      return acc
    }, [])
}

function SellerPagination({ currentPage, totalPages, totalItems, onPageChange, itemLabel, ariaLabel, perPage }) {
  if (totalPages <= 1 || totalItems === 0) return null
  const start = (currentPage - 1) * perPage + 1
  const end = Math.min(currentPage * perPage, totalItems)

  return (
    <div className={styles.pagination}>
      <div className={styles.paginationControls} role="navigation" aria-label={ariaLabel}>
        <button
          type="button"
          className={`${styles.pageBtn} ${currentPage === 1 ? styles.pageBtnDisabled : ''}`}
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
        >
          ‹ Previous
        </button>
        {buildVisiblePages(currentPage, totalPages).map((p, idx) =>
          p === '...' ? (
            <span key={`ellipsis-${idx}`} className={styles.pageEllipsis}>
              …
            </span>
          ) : (
            <button
              key={p}
              type="button"
              className={`${styles.pageBtn} ${currentPage === p ? styles.pageBtnActive : ''}`}
              onClick={() => onPageChange(p)}
              aria-current={currentPage === p ? 'page' : undefined}
            >
              {p}
            </button>
          ),
        )}
        <button
          type="button"
          className={`${styles.pageBtn} ${currentPage === totalPages ? styles.pageBtnDisabled : ''}`}
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
        >
          Next ›
        </button>
      </div>
      <p className={styles.paginationInfo}>
        Showing <strong>{start}–{end}</strong> of <strong>{totalItems}</strong> {itemLabel}
      </p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// List chrome (toolbar, lifecycle tabs, grids, review table, route fallback)
// ---------------------------------------------------------------------------

function ProductsListToolbar({
  searchQuery = '',
  onSearchChange,
  searchPlaceholder = 'Search by name, category, area, description, duration…',
  searchSubmitHref = null,
  rightSlot = null,
  showTypeFilter = false,
  typeFilter = 'all',
  typeOptions = [],
  onTypeFilterChange,
}) {
  const pathname = usePathname()
  const router = useRouter()
  const onArchivePage = pathname === ARCHIVE_PATH
  const [typeDropdownOpen, setTypeDropdownOpen] = useState(false)
  const typeDropdownRef = useRef(null)
  const selectedTypeLabel =
    typeOptions.find((option) => option.id === typeFilter)?.label ?? 'All types'

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (typeDropdownRef.current && !typeDropdownRef.current.contains(event.target)) {
        setTypeDropdownOpen(false)
      }
    }
    if (typeDropdownOpen) {
      document.addEventListener('click', handleClickOutside)
      return () => document.removeEventListener('click', handleClickOutside)
    }
  }, [typeDropdownOpen])

  const handleSubmit = (event) => {
    event.preventDefault()
    if (!searchSubmitHref) return
    const query = String(searchQuery || '').trim()
    const url = query
      ? `${searchSubmitHref}?q=${encodeURIComponent(query)}`
      : searchSubmitHref
    router.push(url)
  }

  return (
    <section className={styles.filtersRow} aria-label="Search products">
      {showTypeFilter && typeOptions.length > 0 ? (
        <div
          className={`${styles.filterDropdownWrap} ${typeDropdownOpen ? styles.filterDropdownOpen : ''}`}
          ref={typeDropdownRef}
        >
          <button
            type="button"
            className={styles.filterDropdownTrigger}
            onClick={() => setTypeDropdownOpen((open) => !open)}
            aria-haspopup="listbox"
            aria-expanded={typeDropdownOpen}
            aria-label="Filter by listing type"
          >
            <span className={styles.filterDropdownLabel}>{selectedTypeLabel}</span>
            <TbChevronDown className={styles.filterDropdownChevron} size={18} aria-hidden />
          </button>
          {typeDropdownOpen ? (
            <div
              className={styles.filterDropdownPanel}
              role="listbox"
              aria-label="Listing type options"
            >
              {typeOptions.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  role="option"
                  aria-selected={typeFilter === option.id}
                  className={`${styles.filterDropdownOption} ${
                    typeFilter === option.id ? styles.filterDropdownOptionSelected : ''
                  }`}
                  onClick={() => {
                    onTypeFilterChange?.(option.id)
                    setTypeDropdownOpen(false)
                  }}
                >
                  {option.label}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
      <form className={styles.searchWrap} role="search" onSubmit={handleSubmit}>
        <TbSearch className={styles.searchIcon} size={18} aria-hidden />
        <input
          type="search"
          name="q"
          className={styles.searchBox}
          placeholder={searchPlaceholder}
          value={searchQuery}
          onChange={(event) => onSearchChange?.(event.target.value)}
          aria-label="Search listings by text"
          autoComplete="off"
          spellCheck={false}
        />
      </form>
      {onArchivePage ? (
        <Link href={CATALOG_PATH} className={styles.archiveGoBackLink}>
          <MdArrowBackIos className={styles.archiveGoBackIcon} aria-hidden />
          Go back
        </Link>
      ) : (
        <Link href={ARCHIVE_PATH} className={styles.archivedLink}>
          <FiArchive size={16} aria-hidden />
          Archived
        </Link>
      )}
      {rightSlot}
    </section>
  )
}
function ProductsLifecycleTabs({ activeTab, counts, onTabChange }) {
  return (
    <div className={styles.lifecycleTabs} role="tablist" aria-label="Listing lifecycle">
      {LISTING_TABS.map((tab) => {
        const selected = activeTab === tab.id
        const count = counts?.[tab.id] ?? 0
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            id={`products-tab-${tab.id}`}
            aria-selected={selected}
            aria-controls={`products-panel-${tab.id}`}
            tabIndex={selected ? 0 : -1}
            className={`${styles.lifecycleTab} ${selected ? styles.lifecycleTabActive : ''}`}
            onClick={() => onTabChange(tab.id)}
          >
            {tab.label} ({count})
          </button>
        )
      })}
    </div>
  )
}
function ProductsActiveGrid({
  products,
  onOpenEdit,
  onOpenView,
  onRequestRemove,
}) {
  return (
    <div className={styles.productsGrid}>
      {products.map((product) => (
        <article key={product.id} className={styles.productCard}>
          <div className={styles.productHeader}>
            <div className={styles.productBadges}>
              <span className={styles.productKindBadge}>
                {product.kind === 'service' ? 'Service' : 'Package'}
              </span>
              <span className={styles.productCategoryBadge}>{product.category}</span>
            </div>
            <span
              className={`${styles.statusPill} ${
                isProductShopActive(product) ? styles.statusPillActive : styles.statusPillInactive
              }`}
            >
              {productStateLabel(product)}
            </span>
          </div>

          <div className={styles.productImageWrap}>
            <Image
              src={product.image}
              alt={product.name}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 960px) 50vw, 320px"
              className={styles.productImage}
              unoptimized={shouldUnoptimizeListingImage(product.image)}
            />
          </div>

          <h2 className={styles.productTitle}>{product.name}</h2>

          <div className={styles.productMeta}>
            <p className={styles.productPrice}>
              <span className={styles.productPriceLabel}>Starting at</span>{' '}
              <span className={styles.productPriceValue}>{formatPhpAmount(product.startingPrice)}</span>
            </p>
            <p className={styles.productLocation}>{product.city}</p>
            <p className={styles.productAvailability}>{product.availability}</p>
          </div>

          <div className={styles.productActions}>
            <button
              type="button"
              className={styles.productActionPrimary}
              onClick={() => onOpenEdit(product)}
            >
              Edit
            </button>
            <button
              type="button"
              className={styles.productActionGhost}
              onClick={() => onOpenView(product)}
            >
              View
            </button>
            <button
              type="button"
              className={styles.productActionDanger}
              onClick={() => onRequestRemove(product)}
              aria-haspopup="dialog"
            >
              Remove
            </button>
          </div>
        </article>
      ))}
    </div>
  )
}
function formatSubmittedAt(value) {
  if (!value) return '—'
  try {
    return new Date(value).toLocaleDateString('en-PH', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    })
  } catch {
    return '—'
  }
}

function formatKindLabel(kind) {
  return kind === 'package' ? 'Package' : 'Service'
}

function approvalStatusLabel(product) {
  const approval = String(product?.approvalStatus || 'draft').toLowerCase()
  if (approval === 'pending') return 'Pending review'
  if (approval === 'rejected') return 'Rejected'
  return approval
}

function ProductsReviewTableRowMenu({
  product,
  open,
  onToggle,
  onClose,
  onOpenView,
  onOpenEdit,
  onCancelRequest,
  showCancelRequest,
}) {
  const triggerRef = useRef(null)
  const dropdownRef = useRef(null)
  const menuId = useId()
  const [menuPosition, setMenuPosition] = useState(null)

  const updateMenuPosition = useCallback(() => {
    const trigger = triggerRef.current
    if (!trigger) return

    const rect = trigger.getBoundingClientRect()
    setMenuPosition({
      top: rect.bottom + 6,
      right: Math.max(8, window.innerWidth - rect.right),
      minWidth: Math.max(148, rect.width),
    })
  }, [])

  useEffect(() => {
    if (!open) return

    updateMenuPosition()

    const handleScrollOrResize = () => updateMenuPosition()
    window.addEventListener('resize', handleScrollOrResize)
    window.addEventListener('scroll', handleScrollOrResize, true)

    return () => {
      window.removeEventListener('resize', handleScrollOrResize)
      window.removeEventListener('scroll', handleScrollOrResize, true)
    }
  }, [open, updateMenuPosition])

  useEffect(() => {
    if (!open) return

    const handlePointerDown = (event) => {
      if (triggerRef.current?.contains(event.target)) return
      if (dropdownRef.current?.contains(event.target)) return
      onClose()
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose()
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open, onClose])

  const menu =
    open && menuPosition && typeof document !== 'undefined'
      ? createPortal(
          <div
            ref={dropdownRef}
            className={styles.productsTableMenuDropdown}
            id={menuId}
            role="menu"
            style={{
              top: `${menuPosition.top}px`,
              right: `${menuPosition.right}px`,
              minWidth: `${menuPosition.minWidth}px`,
            }}
          >
            <button
              type="button"
              role="menuitem"
              className={styles.productsTableMenuItem}
              onClick={() => {
                onOpenView(product)
                onClose()
              }}
            >
              View
            </button>
            <button
              type="button"
              role="menuitem"
              className={styles.productsTableMenuItem}
              onClick={() => {
                onOpenEdit(product)
                onClose()
              }}
            >
              Edit
            </button>
            {showCancelRequest ? (
              <button
                type="button"
                role="menuitem"
                className={`${styles.productsTableMenuItem} ${styles.productsTableMenuItemDanger}`}
                onClick={() => {
                  onCancelRequest(product)
                  onClose()
                }}
              >
                Cancel request
              </button>
            ) : null}
          </div>,
          document.body,
        )
      : null

  return (
    <div className={styles.productsTableActions}>
      <button
        ref={triggerRef}
        type="button"
        className={styles.productsTableMenuBtn}
        aria-label={`Actions for ${product.name}`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => {
          if (open) {
            onClose()
            return
          }
          updateMenuPosition()
          onToggle()
        }}
      >
        <TbDots size={18} aria-hidden />
      </button>
      {menu}
    </div>
  )
}

function updatesPendingSubmittedAt(product) {
  return (
    product?.pendingChangesSubmittedAt ||
    (product?.stagedRejectionReason ? product?.reviewedAt : null) ||
    null
  )
}

function SubmittedUpdateViewModal({ product, onClose, onDismissRequest }) {
  if (!product) return null
  if (typeof document === 'undefined') return null

  const status = submittedUpdateStatusLabel(product)
  const isRejected = Boolean(product.stagedRejectionReason?.trim())
  const fields = Array.isArray(product.pendingChangeFields) ? product.pendingChangeFields : []
  const submittedAt = updatesPendingSubmittedAt(product)
  const canDismiss = Boolean(onDismissRequest)

  return createPortal(
      <div
        className={styles.productModalOverlay}
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose()
        }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="submission-view-title"
      >
        <div
          className={`${styles.productModal} ${styles.submissionViewModal}`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className={styles.productModalHeader}>
            <div>
              <p className={styles.productModalKicker}>Submitted update</p>
              <h2 id="submission-view-title" className={styles.productModalTitle}>
                {product.name}
              </h2>
              <p className={styles.productModalSubtitle}>
                {product.category} · {formatKindLabel(product.kind)}
              </p>
            </div>
            <button
              type="button"
              className={styles.productModalClose}
              onClick={onClose}
              aria-label="Close"
            >
              ×
            </button>
          </div>

          <div className={styles.productModalBody}>
            <div className={styles.submissionViewStatusRow}>
              <span className={styles.submissionViewStatusLabel}>Status</span>
              <span
                className={`${styles.productsTableStatus} ${
                  isRejected ? styles.productsTableStatusRejected : styles.productsTableStatusPending
                }`}
              >
                {status}
              </span>
            </div>

            <dl className={styles.productModalAttrs}>
              <div className={styles.productModalAttrRow}>
                <dt>Submitted</dt>
                <dd>{formatSubmittedAt(submittedAt)}</dd>
              </div>
              {isRejected && product.reviewedAt ? (
                <div className={styles.productModalAttrRow}>
                  <dt>Reviewed</dt>
                  <dd>{formatSubmittedAt(product.reviewedAt)}</dd>
                </div>
              ) : null}
              {!isRejected && fields.length > 0 ? (
                <div className={styles.productModalAttrRow}>
                  <dt>Fields updated</dt>
                  <dd>
                    <ul className={styles.submissionViewFieldList}>
                      {fields.map((field) => (
                        <li key={field}>{field}</li>
                      ))}
                    </ul>
                  </dd>
                </div>
              ) : null}
            </dl>

            {isRejected ? (
              <div className={styles.submissionViewFeedback} role="status">
                <p className={styles.submissionViewFeedbackLabel}>Administrator feedback</p>
                <p className={styles.submissionViewFeedbackText}>{product.stagedRejectionReason}</p>
              </div>
            ) : (
              <p className={styles.submissionViewNote}>
                Your live listing on the shop still shows the last approved details until this update is
                approved.
              </p>
            )}
          </div>

          <div className={styles.submissionViewFooter}>
            <button type="button" className={styles.submissionViewCloseBtn} onClick={onClose}>
              Close
            </button>
            {canDismiss ? (
              <button type="button" className={styles.submissionViewDismissBtn} onClick={onDismissRequest}>
                Dismiss
              </button>
            ) : null}
          </div>
        </div>
      </div>
    ,
    document.body
  )
}

function ProductsReviewTable({
  variant,
  products,
  onOpenView,
  onOpenEdit,
  onCancelRequest,
}) {
  const isUpdatesPending = variant === 'updates_pending'
  const [openMenuId, setOpenMenuId] = useState(null)

  return (
    <div className={styles.productsTableWrap}>
      <table
        className={`${styles.productsTable} ${
          isUpdatesPending ? styles.productsTableUpdatesPending : ''
        }`}
      >
        <thead>
          <tr>
            <th scope="col">Listing</th>
            <th scope="col">Kind</th>
            <th scope="col" className={styles.productsTableSubmittedCol}>
              Submitted
            </th>
            <th
              scope="col"
              className={isUpdatesPending ? styles.productsTableSubmittedChangesCol : undefined}
            >
              Status
            </th>
            <th scope="col" className={styles.productsTableActionsCol}>
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {products.map((product) => (
            <tr key={product.id}>
              <td data-label="Listing">
                <div className={styles.productsTableName}>{product.name}</div>
                <p className={styles.productsTableMeta}>{product.category}</p>
              </td>
              <td data-label="Kind">
                <span className={styles.productsTableKind}>{formatKindLabel(product.kind)}</span>
              </td>
              <td data-label="Submitted" className={styles.productsTableSubmittedCol}>
                {formatSubmittedAt(
                  isUpdatesPending ? updatesPendingSubmittedAt(product) : product.submittedAt,
                )}
              </td>
              <td
                data-label="Status"
                className={isUpdatesPending ? styles.productsTableSubmittedChangesCol : undefined}
              >
                {isUpdatesPending ? (
                  <span
                    className={`${styles.productsTableStatus} ${
                      product.stagedRejectionReason
                        ? styles.productsTableStatusRejected
                        : styles.productsTableStatusPending
                    }`}
                  >
                    {submittedUpdateStatusLabel(product)}
                  </span>
                ) : (
                  <span
                    className={`${styles.productsTableStatus} ${
                      product.approvalStatus === 'rejected' ? styles.productsTableStatusRejected : ''
                    }`}
                  >
                    {approvalStatusLabel(product)}
                  </span>
                )}
              </td>
              <td data-label="Actions" className={styles.productsTableActionsCol}>
                <ProductsReviewTableRowMenu
                  product={product}
                  open={openMenuId === product.id}
                  onToggle={() =>
                    setOpenMenuId((current) => (current === product.id ? null : product.id))
                  }
                  onClose={() => setOpenMenuId(null)}
                  onOpenView={onOpenView}
                  onOpenEdit={onOpenEdit}
                  onCancelRequest={onCancelRequest}
                  showCancelRequest={canCancelListingReview(product)}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function ProductsReviewTableSkeleton({ rows = 5 }) {
  return (
    <div className={styles.productsTableWrap}>
      <table className={styles.productsTable}>
        <thead>
          <tr>
            <th scope="col">Listing</th>
            <th scope="col">Kind</th>
            <th scope="col">Submitted</th>
            <th scope="col">Status</th>
            <th scope="col" className={styles.productsTableActionsCol}>
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, index) => (
            <tr key={`products-table-sk-${index}`} className={styles.productsTableSkRow}>
              <td colSpan={5}>
                <span className={styles.productsTableSkLine} style={{ width: '100%' }} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
export function ProductsListingRouteFallback({ tableSkeleton = false }) {
  return (
    <div
      className={styles.pageWrap}
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label="Loading listings"
    >
      <section className={styles.statsStrip} aria-hidden>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className={styles.statCard}>
            <span className={styles.skeletonLine} style={{ width: '58%', height: 9 }} />
            <span className={styles.skeletonLine} style={{ width: '42%', height: 18, marginTop: 6 }} />
            <span className={styles.skeletonLine} style={{ width: '72%', height: 8, marginTop: 6 }} />
          </div>
        ))}
      </section>
      <div className={styles.lifecycleTabs} aria-hidden>
        {[0, 1, 2].map((i) => (
          <span key={i} className={styles.lifecycleTab}>
            <span className={styles.skeletonLine} style={{ width: 96, height: 10 }} />
          </span>
        ))}
      </div>
      {tableSkeleton ? (
        <ProductsReviewTableSkeleton rows={6} />
      ) : (
        <div className={styles.catalogSkGrid}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className={styles.catalogSkCard}>
              <div className={styles.skeletonBlock} style={{ height: 148, borderRadius: 0 }} />
              <div className={styles.catalogSkLines}>
                <div className={`${styles.skeletonLine} ${styles.skeletonTitle}`} />
                <div className={`${styles.skeletonLine} ${styles.skeletonMedium}`} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Listing form utilities (products list + edit modal)
// ---------------------------------------------------------------------------

function revokeLocalPreviewUrls(entries) {
  ;(Array.isArray(entries) ? entries : []).forEach((entry) => {
    if (entry?.url?.startsWith('blob:')) {
      URL.revokeObjectURL(entry.url)
    }
  })
}

/** Buyer-facing kind label — matches shop listing mapping. */
function formatListingKindLabel(kind) {
  if (kind == null || typeof kind !== 'string') return ''
  const k = kind.trim().toLowerCase()
  if (k === 'service') return 'Service'
  if (k === 'package') return 'Package'
  const t = kind.trim()
  return t ? t.charAt(0).toUpperCase() + t.slice(1) : ''
}

const VIEW_MODAL_EMPTY = '—'

function coerceDisplayString(v) {
  if (v == null) return ''
  return String(v).trim()
}

/**
 * Client-side listing search: case-insensitive; every whitespace-separated token must appear
 * somewhere in the combined fields (AND). Avoids crashes on missing fields.
 */
function buildListingSearchHaystack(p) {
  if (!p) return ''
  const inc = Array.isArray(p.inclusions) ? p.inclusions.join(' ') : ''
  const pkg = Array.isArray(p.packageOptions) ? p.packageOptions.join(' ') : ''
  const parts = [
    p.name,
    p.category,
    p.city,
    p.coverage,
    p.duration,
    p.detailCategory,
    p.funeralCategory,
    p.description,
    p.longDescription,
    p.availability,
    p.listingKindLabel,
    p.kind,
    p.status,
    p.approvalStatus,
    p.stockStatus,
    inc,
    pkg,
    p.whoThisIsFor,
    p.importantNotes,
  ]
  return parts.map((x) => String(x ?? '').toLowerCase()).join(' ')
}

function listingMatchesSearchQuery(p, rawQuery) {
  const trimmed = String(rawQuery ?? '').trim()
  if (!trimmed) return true
  const hay = buildListingSearchHaystack(p)
  const tokens = trimmed.toLowerCase().split(/\s+/).filter(Boolean)
  if (tokens.length === 0) return true
  return tokens.every((t) => hay.includes(t))
}

function viewModalDurationText(p) {
  const s = coerceDisplayString(p?.duration)
  return s || VIEW_MODAL_EMPTY
}

function viewModalCoverageText(p) {
  const cityOk = coerceDisplayString(p?.city)
  const cityFallback = cityOk && cityOk !== 'N/A' ? cityOk : ''
  const s = coerceDisplayString(p?.coverage) || cityFallback
  return s || VIEW_MODAL_EMPTY
}

function viewModalCategoryLine(p) {
  const cat = coerceDisplayString(p?.category)
  const det = coerceDisplayString(p?.detailCategory)
  if (cat) return cat
  return det || VIEW_MODAL_EMPTY
}

function normalizeListingRowToProduct(row) {
  const effective = mergePendingChangesIntoListingRow(row)
  const imageUrls = Array.isArray(effective?.image_urls) ? effective.image_urls : []

  const listingName = effective.listing_name || 'Untitled listing'
  const category = effective.category || 'Service'
  const description = effective.description || ''
  const areaRaw = coerceDisplayString(effective?.location) || ''
  const location = areaRaw || 'N/A'
  const basePrice = effective.base_price != null ? roundPhpAmount(effective.base_price) : 0
  const status = effective.status || 'draft'
  const kind =
    String(effective.listing_kind == null || effective.listing_kind === '' ? 'service' : effective.listing_kind)
      .trim()
      .toLowerCase() || 'service'
  const stock = effective.stock_status
  const availability =
    stock === 'Out of Stock' ? 'Out of Stock' : stock === 'In Stock' ? 'Available' : 'Available'
  const primaryImage = imageUrls[0] || FALLBACK_IMAGE

  const duration = coerceDisplayString(effective.duration)
  const funeralCategoryRaw = coerceDisplayString(effective.funeral_category)

  const rawInc = effective.inclusions
  let inclusions = []
  if (typeof rawInc === 'string' && rawInc.trim()) {
    inclusions = rawInc
      .split(/\n/)
      .map((x) => x.trim())
      .filter(Boolean)
  }

  return {
    id: row.id,
    name: listingName,
    kind,
    listingKindLabel: formatListingKindLabel(kind),
    category,
    coverage: areaRaw,
    duration,
    detailCategory: funeralCategoryRaw,
    startingPrice: basePrice,
    city: location,
    status,
    approvalStatus: row?.approval_status ?? row?.approvalStatus ?? 'draft',
    rejectionReason: row?.rejection_reason ?? row?.rejectionReason ?? null,
    submittedAt: row?.submitted_at ?? row?.submittedAt ?? null,
    reviewedAt: row?.reviewed_at ?? row?.reviewedAt ?? null,
    availability,
    description,
    longDescription: description,
    image: primaryImage,
    gallery: imageUrls.length ? imageUrls : [FALLBACK_IMAGE],
    inclusions,
    whoThisIsFor: coerceDisplayString(effective.who_this_is_for),
    importantNotes: coerceDisplayString(effective.important_notes),
    funeralCategory: funeralCategoryRaw,
    packageOptions: normalizePackageOptionsFromDb(effective.package_options),
    stockStatus: effective.stock_status ?? null,
    hasPendingUpdate: hasPendingSellerChanges(row),
    showsInUpdatesPending: sellerShowsInUpdatesPending(row),
    stagedRejectionReason: row?.staged_rejection_reason ?? row?.stagedRejectionReason ?? null,
    pendingChangesSubmittedAt:
      row?.pending_changes_submitted_at ?? row?.pendingChangesSubmittedAt ?? null,
    pendingChangeFields: getPendingChangeFieldLabels(row?.pending_changes),
  }
}

// ---------------------------------------------------------------------------
// Products list + view/edit modals
// ---------------------------------------------------------------------------

const TYPE_FILTERS = [
  { id: 'all', label: 'All types' },
  { id: 'service', label: 'Services' },
  { id: 'package', label: 'Packages' },
]

export default function ProductsContent({ initialKind = 'all', listingScope = 'active' }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const allowedKinds = TYPE_FILTERS.map((t) => t.id)
  const defaultKind = allowedKinds.includes(initialKind) ? initialKind : 'all'
  const [searchQuery, setSearchQuery] = useState(() => readString(searchParams, 'q', ''))
  const [typeFilter, setTypeFilter] = useState(() => readEnum(searchParams, 'kind', allowedKinds, defaultKind))
  const [activeTab, setActiveTab] = useState(() => readListingTab(searchParams, LISTING_TAB_IDS))
  const [listPage, setListPage] = useState(1)
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [modalMode, setModalMode] = useState(null) // 'view' | 'edit'
  const [submissionViewProduct, setSubmissionViewProduct] = useState(null)
  const [editGallery, setEditGallery] = useState([])
  const [pendingImageFiles, setPendingImageFiles] = useState([])
  const [products, setProducts] = useState([])
  const [productPendingRemoval, setProductPendingRemoval] = useState(null)
  const [removeInProgress, setRemoveInProgress] = useState(false)
  const [removeError, setRemoveError] = useState(null)
  const [productPendingCancel, setProductPendingCancel] = useState(null)
  const [cancelInProgress, setCancelInProgress] = useState(false)
  const [cancelError, setCancelError] = useState(null)
  const [archiveBusyId, setArchiveBusyId] = useState(null)
  const fileInputRef = useRef(null)
  const [formValues, setFormValues] = useState({})
  const [formError, setFormError] = useState('')
  const [saveInProgress, setSaveInProgress] = useState(false)
  const [loadingData, setLoadingData] = useState(true)
  /** `sellers.status` — shop only shows listings when this is `active`. */
  const [sellerAccountStatus, setSellerAccountStatus] = useState(null)

  useEffect(() => {
    if (initialKind && TYPE_FILTERS.some((t) => t.id === initialKind)) {
      queueMicrotask(() => setTypeFilter(initialKind))
    }
  }, [initialKind])

  // Sync state <- URL (back/forward, shared links)
  useEffect(() => {
    const nextQ = readString(searchParams, 'q', '')
    const nextKind = readEnum(searchParams, 'kind', allowedKinds, defaultKind)
    const nextTab = readListingTab(searchParams, LISTING_TAB_IDS)
    queueMicrotask(() => {
      if (nextQ !== searchQuery) setSearchQuery(nextQ)
      if (nextKind !== typeFilter) setTypeFilter(nextKind)
      if (nextTab !== activeTab) setActiveTab(nextTab)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  // Sync URL <- state (debounce typing)
  useDebouncedEffect(() => {
    replaceUrlQuery(router, pathname, searchParams, {
      q: searchQuery,
      kind: { value: typeFilter, omitIf: defaultKind },
      tab: { value: activeTab, omitIf: DEFAULT_LISTING_TAB },
    })
  }, [searchQuery, typeFilter, activeTab, router, pathname, searchParams], 300)

  useEffect(() => {
    let mounted = true
    let channel = null

    const load = async () => {
      setLoadingData(true)

      const [listingsRes, authRes] = await Promise.all([
        fetch('/api/seller/listings', { cache: 'no-store' }),
        supabase.auth.getUser(),
      ])
      const listingsBody = await listingsRes.json().catch(() => null)
      const listingRows = listingsRes.ok ? listingsBody?.listings : null
      const listingError = listingsRes.ok ? null : listingsBody?.error || 'Failed to load listings.'

      if (!mounted) return

      const uid = authRes.data?.user?.id
      if (uid) {
        const sellerRow = await getSellerByUserId(uid)
        if (mounted) setSellerAccountStatus(sellerRow?.status ?? null)
      } else if (mounted) {
        setSellerAccountStatus(null)
      }

      if (listingError) {
        setProducts([])
      } else {
        const mapped = (listingRows || []).map(normalizeListingRowToProduct)
        setProducts(mapped)
      }

      setLoadingData(false)
    }

    const setup = async () => {
      await load()
      const { data: authRes } = await supabase.auth.getUser()
      const uid = authRes?.user?.id
      if (!uid || !mounted) return

      channel = supabase
        .channel(`seller-products:${uid}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'seller_listings', filter: `seller_user_id=eq.${uid}` },
          () => {
            load()
          },
        )
        .subscribe()
    }

    setup()

    const onVisible = () => {
      if (document.visibilityState === 'visible') load()
    }
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      mounted = false
      document.removeEventListener('visibilitychange', onVisible)
      if (channel) supabase.removeChannel(channel)
    }
  }, [])

  const isArchiveView = listingScope === 'archived'
  const showLifecycleTabs = !isArchiveView

  const scopedProducts = useMemo(() => {
    if (isArchiveView) {
      return products.filter((p) => String(p?.status || '').toLowerCase() === 'archived')
    }
    return products.filter((p) => String(p?.status || '').toLowerCase() !== 'archived')
  }, [products, isArchiveView])

  const tabCounts = useMemo(() => countByTab(scopedProducts), [scopedProducts])

  const tabProducts = useMemo(() => {
    if (isArchiveView) return scopedProducts
    return filterByTab(scopedProducts, activeTab)
  }, [scopedProducts, activeTab, isArchiveView])

  const filteredProducts = useMemo(() => {
    let list = [...tabProducts]

    if (typeFilter !== 'all') {
      list = list.filter((p) => p.kind === typeFilter)
    }

    if (searchQuery.trim()) {
      list = list.filter((p) => listingMatchesSearchQuery(p, searchQuery))
    }

    return list
  }, [tabProducts, typeFilter, searchQuery])

  const listUsesGrid = isArchiveView || activeTab === 'active'
  const listPerPage = listUsesGrid ? LIST_ITEMS_PER_PAGE : TABLE_ROWS_PER_PAGE
  const listTotalPages = Math.ceil(filteredProducts.length / listPerPage) || 1
  const paginatedProducts = useMemo(() => {
    const start = (listPage - 1) * listPerPage
    return filteredProducts.slice(start, start + listPerPage)
  }, [filteredProducts, listPage, listPerPage])

  useEffect(() => {
    setListPage(1)
  }, [activeTab, typeFilter, searchQuery, isArchiveView])

  useEffect(() => {
    if (listPage > listTotalPages) setListPage(listTotalPages)
  }, [listPage, listTotalPages])

  const total = scopedProducts.length
  const activeCount = scopedProducts.filter((p) => isProductShopActive(p)).length
  const pendingCount = awaitingAdminCount(scopedProducts)
  const draftCount = scopedProducts.filter((p) => productStateLabel(p) === 'Draft').length
  const archivedServicesCount = scopedProducts.filter((p) => p.kind === 'service').length
  const archivedPackagesCount = scopedProducts.filter((p) => p.kind === 'package').length

  const handleOpenView = (product) => {
    setSelectedProduct(product)
    setModalMode('view')
  }

  const handleOpenSubmissionView = (product) => {
    setSubmissionViewProduct(product)
  }

  const handleCloseSubmissionView = () => {
    setSubmissionViewProduct(null)
  }

  const handleOpenEdit = (product) => {
    setSelectedProduct(product)
    setModalMode('edit')
    setEditGallery((product.gallery ?? [product.image].filter(Boolean)).map((url) => ({ url, file: null })))
    setPendingImageFiles([])
    setFormError('')
    setFormValues(listingRowToFormValues(product))
  }

  const handleCloseModal = () => {
    revokeLocalPreviewUrls(editGallery)
    setSelectedProduct(null)
    setModalMode(null)
    setEditGallery([])
    setPendingImageFiles([])
    setFormValues({})
    setFormError('')
  }

  useEffect(
    () => () => {
      revokeLocalPreviewUrls(editGallery)
    },
    [editGallery],
  )

  const handleUploadClick = () => {
    if (editGallery.length >= MAX_LISTING_IMAGES) {
      setFormError(`Maximum ${MAX_LISTING_IMAGES} images. Remove one to add more.`)
      return
    }
    setFormError('')
    if (fileInputRef.current) {
      fileInputRef.current.click()
    }
  }

  const handleFilesSelected = (event) => {
    const files = Array.from(event.target.files || [])
    event.target.value = ''
    if (!files.length) return

    const room = Math.max(0, MAX_LISTING_IMAGES - editGallery.length)
    const validFiles = files.filter((file) => ALLOWED_IMAGE_MIME.has(file.type))
    const invalidCount = files.length - validFiles.length
    const toAdd = validFiles.slice(0, room)
    const droppedForLimit = validFiles.length - toAdd.length

    if (room <= 0) {
      setFormError(`Maximum ${MAX_LISTING_IMAGES} images. Remove one to add more.`)
      return
    }

    if (!toAdd.length) {
      setFormError(
        invalidCount > 0
          ? 'No images added — only JPEG, PNG, WebP, or GIF are allowed.'
          : `Maximum ${MAX_LISTING_IMAGES} images. Remove one to add more.`,
      )
      return
    }

    const notes = []
    if (invalidCount > 0) {
      notes.push(
        invalidCount === 1
          ? '1 file was skipped — only JPEG, PNG, WebP, or GIF are allowed.'
          : `${invalidCount} files were skipped — only JPEG, PNG, WebP, or GIF are allowed.`,
      )
    }
    if (droppedForLimit > 0) {
      notes.push(
        `Only ${toAdd.length} more image${toAdd.length !== 1 ? 's' : ''} fit (${MAX_LISTING_IMAGES} maximum per listing).`,
      )
    }

    const entries = toAdd.map((file) => ({ url: URL.createObjectURL(file), file }))
    setPendingImageFiles((prev) => [...prev, ...toAdd])
    setEditGallery((prev) => [...prev, ...entries])
    setFormError(notes.join(' '))
  }

  const handleRemoveImage = (index) => {
    setEditGallery((prev) => {
      const target = prev[index]
      if (target?.url?.startsWith('blob:')) {
        URL.revokeObjectURL(target.url)
        setPendingImageFiles((files) => files.filter((file) => file !== target.file))
      }
      return prev.filter((_, i) => i !== index)
    })
  }

  const handleRequestRemove = (product) => {
    setRemoveError(null)
    handleCloseModal()
    setProductPendingRemoval(product)
  }

  const handleCancelRemove = () => {
    if (removeInProgress) return
    setRemoveError(null)
    setProductPendingRemoval(null)
  }

  const handleConfirmRemove = async () => {
    if (!productPendingRemoval || removeInProgress) return

    setRemoveError(null)
    setRemoveInProgress(true)
    try {
      const id = productPendingRemoval.id
      const { error } = await deleteSellerListing(id)
      if (error) {
        setRemoveError(error)
        return
      }

      setProducts((prev) => prev.filter((p) => p.id !== id))

      if (selectedProduct?.id === id) {
        setSelectedProduct(null)
        setModalMode(null)
      }

      setProductPendingRemoval(null)
    } finally {
      setRemoveInProgress(false)
    }
  }

  const handleRequestCancelReview = (product) => {
    setCancelError(null)
    handleCloseModal()
    handleCloseSubmissionView()
    setProductPendingCancel(product)
  }

  const handleCancelCancelReview = () => {
    if (cancelInProgress) return
    setCancelError(null)
    setProductPendingCancel(null)
  }

  const handleConfirmCancelReview = async () => {
    if (!productPendingCancel || cancelInProgress) return

    setCancelError(null)
    setCancelInProgress(true)
    try {
      const id = productPendingCancel.id
      const { data, error } = await cancelListingReviewRequest(id)
      if (error || !data) {
        setCancelError(error || 'Failed to cancel review request.')
        return
      }

      setProducts((prev) =>
        prev.map((p) => (p.id === id ? normalizeListingRowToProduct(data) : p)),
      )

      if (selectedProduct?.id === id) {
        setSelectedProduct(normalizeListingRowToProduct(data))
      }

      setProductPendingCancel(null)
      if (submissionViewProduct?.id === id) {
        handleCloseSubmissionView()
      }
    } finally {
      setCancelInProgress(false)
    }
  }

  const getFieldValue = (fieldId) => formValues?.[fieldId]

  const setFieldValue = (fieldId, value) => {
    setFormValues((prev) => ({ ...prev, [fieldId]: value }))
    setFormError('')
  }

  const handleSaveProduct = async () => {
    if (!selectedProduct || saveInProgress) return

    const missingRequired = findFirstMissingRequiredField(formValues, editGallery)
    if (missingRequired) {
      setFormError(`${missingRequired.label} is required.`)
      return
    }

    setSaveInProgress(true)
    try {
      const { error: uploadErr, persistedImageUrls } = await resolvePersistedImageUrls(
        editGallery,
        pendingImageFiles,
      )
      if (uploadErr) {
        setFormError(uploadErr)
        return
      }

      const payload = buildSellerListingPayload({
        formValues,
        selectedProduct,
        persistedImageUrls,
      })

      const { data, error } = await updateSellerListing(selectedProduct.id, payload)
      if (error || !data) {
        setFormError(error || 'Failed to save listing.')
        return
      }
      setProducts((prev) =>
        prev.map((p) => (p.id === selectedProduct.id ? normalizeListingRowToProduct(data) : p)),
      )

      handleCloseModal()
    } finally {
      setSaveInProgress(false)
    }
  }

  const handleSubmitForReview = async (product) => {
    if (!product?.id) return
    const { data, error } = await submitListingForReview(product.id)
    if (error || !data) {
      setFormError(error || 'Failed to submit listing for review.')
      return
    }
    setProducts((prev) =>
      prev.map((p) => (p.id === product.id ? normalizeListingRowToProduct(data) : p)),
    )
    if (selectedProduct?.id === product.id) {
      setSelectedProduct(normalizeListingRowToProduct(data))
    }
    setModalMode('view')
  }

  const handleToggleArchive = async (product, nextStatus) => {
    if (!product?.id) return
    if (archiveBusyId) return
    setFormError('')
    setArchiveBusyId(product.id)
    try {
      const { data, error } = await updateSellerListing(product.id, { status: nextStatus })
      if (error || !data) {
        setFormError(error || 'Failed to update listing status.')
        return
      }
      const mapped = normalizeListingRowToProduct(data)
      setProducts((prev) => prev.map((p) => (p.id === product.id ? mapped : p)))
      setSelectedProduct((prev) => (prev?.id === product.id ? mapped : prev))
    } finally {
      setArchiveBusyId(null)
    }
  }

  return (
    <div className={styles.pageWrap}>
      {sellerAccountStatus && sellerAccountStatus !== 'active' ? (
        <div
          className={styles.shopVisibilityBanner}
          role="status"
          aria-live="polite"
        >
          {sellerAccountStatus === 'pending' ? (
            <>
              <strong>Shop visibility:</strong> your seller account is still{' '}
              <strong>pending approval</strong>. Listings will not appear on the public shop until an
              administrator sets your account to Active.
            </>
          ) : (
            <>
              <strong>Shop visibility:</strong> your seller account is <strong>{sellerAccountStatus}</strong>.
              Listings are hidden from the public shop until your account is Active.
            </>
          )}
        </div>
      ) : null}
      <ProductsListToolbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        showTypeFilter={defaultKind === 'all'}
        typeFilter={typeFilter}
        typeOptions={TYPE_FILTERS}
        onTypeFilterChange={setTypeFilter}
        rightSlot={
          <Link href="/seller/products/new-listing" className={styles.addListingMobile}>
            <TbPlus size={18} aria-hidden />
            Add New Listing
          </Link>
        }
      />

      <section className={styles.statsStrip} aria-label={isArchiveView ? 'Archived listing overview' : 'Listing overview'}>
        {isArchiveView ? (
          <>
            <div className={styles.statCard}>
              <p className={styles.statLabel}>Archived listings</p>
              <p className={styles.statValue}>{formatCount(total)}</p>
              <p className={styles.statHint}>Hidden from your active catalog</p>
            </div>
            <div className={styles.statCard}>
              <p className={styles.statLabel}>Services</p>
              <p className={styles.statValue}>{formatCount(archivedServicesCount)}</p>
              <p className={styles.statHint}>Archived service listings</p>
            </div>
            <div className={styles.statCard}>
              <p className={styles.statLabel}>Packages</p>
              <p className={styles.statValue}>{formatCount(archivedPackagesCount)}</p>
              <p className={styles.statHint}>Archived package listings</p>
            </div>
          </>
        ) : (
          <>
            <div className={styles.statCard}>
              <p className={styles.statLabel}>Total listings</p>
              <p className={styles.statValue}>{formatCount(total)}</p>
              <p className={styles.statHint}>Services &amp; packages</p>
            </div>
            <div className={styles.statCard}>
              <p className={styles.statLabel}>Active</p>
              <p className={styles.statValue}>{formatCount(activeCount)}</p>
              <p className={styles.statHint}>Visible to buyers</p>
            </div>
            <div className={styles.statCard}>
              <p className={styles.statLabel}>Draft</p>
              <p className={styles.statValue}>{formatCount(draftCount)}</p>
              <p className={styles.statHint}>Not submitted</p>
            </div>
            <div className={styles.statCard}>
              <p className={styles.statLabel}>Awaiting admin</p>
              <p className={styles.statValue}>{formatCount(pendingCount)}</p>
              <p className={styles.statHint}>Under review or submitted updates</p>
            </div>
          </>
        )}
      </section>

      {showLifecycleTabs ? (
        <ProductsLifecycleTabs
          activeTab={activeTab}
          counts={tabCounts}
          onTabChange={setActiveTab}
        />
      ) : null}

      <section
        className={styles.productsSection}
        aria-label={
          isArchiveView
            ? 'Archived listings'
            : activeTab === 'under_review'
              ? 'Listings under review'
              : activeTab === 'updates_pending'
                ? 'Submitted updates'
                : 'Active listings'
        }
        id={showLifecycleTabs ? `products-panel-${activeTab}` : undefined}
        role={showLifecycleTabs ? 'tabpanel' : undefined}
        aria-labelledby={showLifecycleTabs ? `products-tab-${activeTab}` : undefined}
      >
        {loadingData ? (
          isArchiveView || activeTab === 'active' ? (
            <div
              className={styles.catalogSkGrid}
              role="status"
              aria-live="polite"
              aria-busy="true"
              aria-label="Loading listings"
            >
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={`listing-sk-${i}`} className={styles.catalogSkCard} aria-hidden>
                  <div className={styles.skeletonBlock} style={{ height: 148, borderRadius: 0 }} />
                  <div className={styles.catalogSkLines}>
                    <div className={`${styles.skeletonLine} ${styles.skeletonTitle}`} />
                    <div className={`${styles.skeletonLine} ${styles.skeletonMedium}`} />
                    <div className={`${styles.skeletonLine} ${styles.skeletonShort}`} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <ProductsReviewTableSkeleton rows={6} />
          )
        ) : filteredProducts.length === 0 ? (
          <div className={styles.emptyState}>
            <p className={styles.emptyTitle}>
              {isArchiveView
                ? 'No archived listings match your filters'
                : activeTab === 'under_review'
                  ? 'No listings under review match your filters'
                  : activeTab === 'updates_pending'
                    ? 'No submitted updates match your filters'
                    : 'No listings match your filters'}
            </p>
            <p className={styles.emptyText}>
              {isArchiveView ? (
                'Adjust the search or type filter to find archived services and packages.'
              ) : activeTab === 'under_review' ? (
                'Submitted and rejected listings awaiting administrator review appear here.'
              ) : activeTab === 'updates_pending' ? (
                'Submitted listing edits awaiting approval or recently rejected appear here. Open an item to view details and administrator feedback.'
              ) : (
                <>
                  Adjust the search or type filter to see more of your services and packages, or{' '}
                  <Link href="/seller/products/new-listing" className={styles.emptyStateLink}>
                    Add New Listing
                  </Link>
                  .
                </>
              )}
            </p>
          </div>
        ) : isArchiveView ? (
          <>
            <ProductsActiveGrid
              products={paginatedProducts}
              onOpenEdit={handleOpenEdit}
              onOpenView={handleOpenView}
              onRequestRemove={handleRequestRemove}
            />
            <SellerPagination
              currentPage={listPage}
              totalPages={listTotalPages}
              totalItems={filteredProducts.length}
              onPageChange={setListPage}
              itemLabel="listings"
              ariaLabel="Archived listings pagination"
              perPage={listPerPage}
            />
          </>
        ) : activeTab === 'active' ? (
          <>
            <ProductsActiveGrid
              products={paginatedProducts}
              onOpenEdit={handleOpenEdit}
              onOpenView={handleOpenView}
              onRequestRemove={handleRequestRemove}
            />
            <SellerPagination
              currentPage={listPage}
              totalPages={listTotalPages}
              totalItems={filteredProducts.length}
              onPageChange={setListPage}
              itemLabel="listings"
              ariaLabel="Active listings pagination"
              perPage={listPerPage}
            />
          </>
        ) : (
          <>
            <ProductsReviewTable
              variant={activeTab}
              products={paginatedProducts}
              onOpenView={
                activeTab === 'updates_pending' ? handleOpenSubmissionView : handleOpenView
              }
              onOpenEdit={handleOpenEdit}
              onCancelRequest={handleRequestCancelReview}
            />
            <SellerPagination
              currentPage={listPage}
              totalPages={listTotalPages}
              totalItems={filteredProducts.length}
              onPageChange={setListPage}
              itemLabel="listings"
              ariaLabel="Listing review table pagination"
              perPage={listPerPage}
            />
          </>
        )}
      </section>

      {selectedProduct && modalMode && typeof document !== 'undefined' && createPortal(
        <div
          className={styles.productModalOverlay}
          onClick={(e) => {
            if (e.target === e.currentTarget) handleCloseModal()
          }}
          role="dialog"
          aria-modal="true"
        >
          <div className={styles.productModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.productModalHeader}>
              <div>
                <p className={styles.productModalKicker}>
                  {modalMode === 'view' ? 'Listing details' : 'Edit listing'}
                </p>
                <h2 className={styles.productModalTitle}>{selectedProduct.name}</h2>
                <p className={styles.productModalSubtitle}>
                  {selectedProduct.category} · {selectedProduct.city}
                </p>
              </div>
              <button
                type="button"
                className={styles.productModalClose}
                onClick={handleCloseModal}
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <div className={styles.productModalBody}>
              {modalMode === 'view' && selectedProduct?.hasPendingUpdate ? (
                <div className={styles.shopVisibilityBanner} role="status" style={{ marginBottom: 16 }}>
                  <strong>Review pending:</strong> Your latest edits are waiting for an administrator. The
                  public shop still shows your last approved details until those changes are approved.
                </div>
              ) : null}
              {modalMode === 'view' ? (
                <div className={styles.productPreviewRow}>
                  <div className={styles.productPreviewImageCol}>
                    <div className={styles.productModalImageWrap}>
                      <Image
                        src={selectedProduct.image}
                        alt={selectedProduct.name}
                        fill
                        sizes="(max-width: 800px) 100vw, 460px"
                        className={styles.productModalImage}
                        unoptimized={shouldUnoptimizeListingImage(selectedProduct.image)}
                      />
                    </div>
                  </div>

                  <div className={styles.productPreviewBody}>
                    <div
                      className={`${styles.productPreviewHeaderRow} ${styles.productPreviewHeaderRowEnd}`}
                    >
                      <span
                        className={`${styles.productPreviewStockBadge} ${
                          isProductShopActive(selectedProduct)
                            ? styles.productPreviewStockActive
                            : styles.productPreviewStockInactive
                        }`}
                      >
                        {productStateLabel(selectedProduct)}
                      </span>
                      {selectedProduct.approvalStatus ? (
                        <span
                          className={styles.productPreviewStockBadge}
                          style={{
                            marginLeft: 8,
                            background:
                              selectedProduct.approvalStatus === 'approved'
                                ? '#ecfdf5'
                                : selectedProduct.approvalStatus === 'pending'
                                  ? '#fffbeb'
                                  : selectedProduct.approvalStatus === 'rejected'
                                    ? '#fef2f2'
                                    : '#f1f5f9',
                            borderColor:
                              selectedProduct.approvalStatus === 'approved'
                                ? '#a7f3d0'
                                : selectedProduct.approvalStatus === 'pending'
                                  ? '#fde68a'
                                  : selectedProduct.approvalStatus === 'rejected'
                                    ? '#fecaca'
                                    : '#cbd5e1',
                            color:
                              selectedProduct.approvalStatus === 'approved'
                                ? '#065f46'
                                : selectedProduct.approvalStatus === 'pending'
                                  ? '#92400e'
                                  : selectedProduct.approvalStatus === 'rejected'
                                    ? '#991b1b'
                                    : '#334155',
                          }}
                          title={
                            selectedProduct.approvalStatus === 'rejected'
                              ? selectedProduct.rejectionReason || 'Rejected'
                              : undefined
                          }
                        >
                          {selectedProduct.approvalStatus === 'pending'
                            ? 'Pending review'
                            : selectedProduct.approvalStatus === 'approved'
                              ? 'Approved'
                              : selectedProduct.approvalStatus === 'rejected'
                                ? 'Rejected'
                                : 'Draft'}
                        </span>
                      ) : null}
                    </div>

                    <div className={styles.productPreviewPriceRow}>
                      <span className={styles.productPreviewPrice}>
                        {formatPhpAmount(selectedProduct.startingPrice)}
                      </span>
                    </div>

                    {(selectedProduct.longDescription || selectedProduct.description)?.trim() ? (
                      <p className={styles.productPreviewShortDesc}>
                        {selectedProduct.longDescription || selectedProduct.description}
                      </p>
                    ) : null}

                    <hr className={styles.productPreviewDivider} />

                    <div className={styles.productPreviewMetaGrid}>
                      <div className={styles.productPreviewMetaItem}>
                        <span className={styles.productPreviewMetaLabel}>Type</span>
                        <span className={styles.productPreviewMetaValue}>
                          {selectedProduct.listingKindLabel || VIEW_MODAL_EMPTY}
                        </span>
                      </div>
                      <div className={styles.productPreviewMetaItem}>
                        <span className={styles.productPreviewMetaLabel}>Category</span>
                        <span className={styles.productPreviewMetaValue}>
                          {viewModalCategoryLine(selectedProduct)}
                        </span>
                      </div>
                      <div className={styles.productPreviewMetaItem}>
                        <span className={styles.productPreviewMetaLabel}>Duration</span>
                        <span className={styles.productPreviewMetaValue}>
                          {viewModalDurationText(selectedProduct)}
                        </span>
                      </div>
                      <div className={styles.productPreviewMetaItem}>
                        <span className={styles.productPreviewMetaLabel}>Coverage</span>
                        <span className={styles.productPreviewMetaValue}>
                          {viewModalCoverageText(selectedProduct)}
                        </span>
                      </div>
                    </div>

                    {selectedProduct.inclusions?.length ? (
                      <div className={styles.productPreviewInclusions}>
                        <h3 className={styles.productModalSectionTitle}>Key inclusions</h3>
                        <ul className={styles.productModalList}>
                          {selectedProduct.inclusions.map((inc, idx) => (
                            <li key={idx}>{inc}</li>
                          ))}
                        </ul>
                      </div>
                    ) : null}

                    {coerceDisplayString(selectedProduct.whoThisIsFor) ? (
                      <div className={styles.productPreviewInclusions}>
                        <h3 className={styles.productModalSectionTitle}>Who this is for</h3>
                        <p className={styles.productModalText} style={{ whiteSpace: 'pre-wrap' }}>
                          {selectedProduct.whoThisIsFor}
                        </p>
                      </div>
                    ) : null}

                    {coerceDisplayString(selectedProduct.importantNotes) ? (
                      <div className={styles.productPreviewInclusions}>
                        <h3 className={styles.productModalSectionTitle}>Important notes</h3>
                        <p className={styles.productModalText} style={{ whiteSpace: 'pre-wrap' }}>
                          {selectedProduct.importantNotes}
                        </p>
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : (
                <>
                  <SellerListingFormFields
                    formError={formError}
                    getFieldValue={getFieldValue}
                    setFieldValue={setFieldValue}
                    editGallery={editGallery}
                    onUploadClick={handleUploadClick}
                    onRemoveImage={handleRemoveImage}
                    imageUploadSubtitle={`(${editGallery.length}/${MAX_LISTING_IMAGES})`}
                  />
                  <SellerListingFileInput
                    fileInputRef={fileInputRef}
                    onFilesSelected={handleFilesSelected}
                    accept={LISTING_IMAGE_ACCEPT}
                  />
                </>
              )}
            </div>

            <div className={styles.productModalFooter}>
              <button
                type="button"
                className={styles.productModalSecondary}
                onClick={handleCloseModal}
              >
                Close
              </button>
              {modalMode === 'view' &&
                selectedProduct &&
                selectedProduct.approvalStatus === 'approved' && (
                  selectedProduct.status === 'archived' ? (
                    <button
                      type="button"
                      className={styles.productModalSecondary}
                      onClick={() => handleToggleArchive(selectedProduct, 'active')}
                      disabled={archiveBusyId === selectedProduct.id}
                    >
                      {archiveBusyId === selectedProduct.id ? 'Updating…' : 'Unarchive'}
                    </button>
                  ) : (
                    <button
                      type="button"
                      className={styles.productModalSecondary}
                      onClick={() => handleToggleArchive(selectedProduct, 'archived')}
                      disabled={archiveBusyId === selectedProduct.id}
                    >
                      {archiveBusyId === selectedProduct.id ? 'Updating…' : 'Archive'}
                    </button>
                  )
                )}
              {modalMode === 'view' &&
                selectedProduct &&
                (selectedProduct.approvalStatus === 'draft' ||
                  selectedProduct.approvalStatus === 'rejected') && (
                  <button
                    type="button"
                    className={styles.productModalPrimary}
                    onClick={() => handleSubmitForReview(selectedProduct)}
                  >
                    Submit for review
                  </button>
                )}
              {modalMode === 'edit' && (
                <button
                  type="button"
                  className={styles.productModalPrimary}
                  onClick={handleSaveProduct}
                  disabled={saveInProgress}
                >
                  {saveInProgress ? 'Saving…' : 'Save changes'}
                </button>
              )}
            </div>
          </div>
        </div>
        ,
        document.body
      )}

      {productPendingRemoval && typeof document !== 'undefined' && createPortal(
        <div
          className={styles.removeConfirmOverlay}
          onClick={(e) => {
            if (removeInProgress) return
            if (e.target === e.currentTarget) handleCancelRemove()
          }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="remove-listing-confirm-title"
          aria-describedby="remove-listing-confirm-desc"
        >
          <div className={styles.removeConfirmCard} onClick={(e) => e.stopPropagation()}>
            <div className={styles.removeConfirmCardBody}>
              <div className={styles.removeConfirmHeader}>
                <div className={styles.removeConfirmIconBadge} aria-hidden>
                  <TbTrash size={16} strokeWidth={1.65} />
                </div>
                <h2 id="remove-listing-confirm-title" className={styles.removeConfirmTitle}>
                  Remove listing?
                </h2>
              </div>
              <p id="remove-listing-confirm-desc" className={styles.removeConfirmText}>
                This listing will be removed from your products. You can add it again later if needed.
              </p>
              {removeError ? (
                <p className={styles.removeConfirmError} role="alert">
                  {removeError}
                </p>
              ) : null}
            </div>
            <div className={styles.removeConfirmFooter}>
              <div className={styles.removeConfirmActions}>
                <button
                  type="button"
                  className={styles.removeConfirmCancel}
                  onClick={handleCancelRemove}
                  disabled={removeInProgress}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className={styles.removeConfirmDelete}
                  onClick={handleConfirmRemove}
                  disabled={removeInProgress}
                >
                  {removeInProgress ? 'Removing…' : 'Yes, remove'}
                </button>
              </div>
            </div>
          </div>
        </div>
        ,
        document.body
      )}
      <SubmittedUpdateViewModal
        product={submissionViewProduct}
        onClose={handleCloseSubmissionView}
        onDismissRequest={
          submissionViewProduct?.stagedRejectionReason
            ? () => handleRequestCancelReview(submissionViewProduct)
            : undefined
        }
      />

      {productPendingCancel && typeof document !== 'undefined'
        ? createPortal(
        <div
          className={styles.removeConfirmOverlay}
          onClick={(e) => {
            if (cancelInProgress) return
            if (e.target === e.currentTarget) handleCancelCancelReview()
          }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="cancel-review-confirm-title"
          aria-describedby="cancel-review-confirm-desc"
        >
          <div className={styles.removeConfirmCard} onClick={(e) => e.stopPropagation()}>
            <div className={styles.removeConfirmCardBody}>
              <div className={styles.removeConfirmHeader}>
                <div className={styles.removeConfirmIconBadge} aria-hidden>
                  <TbCircleX size={16} strokeWidth={1.65} />
                </div>
                <h2 id="cancel-review-confirm-title" className={styles.removeConfirmTitle}>
                  {productPendingCancel.hasPendingUpdate
                    ? 'Cancel update request?'
                    : productPendingCancel.stagedRejectionReason
                      ? 'Dismiss rejected update?'
                      : 'Cancel submission?'}
                </h2>
              </div>
              <p id="cancel-review-confirm-desc" className={styles.removeConfirmText}>
                {productPendingCancel.hasPendingUpdate
                  ? 'Your proposed changes will be withdrawn. The live listing stays on the shop and will no longer appear in the admin review queue.'
                  : productPendingCancel.stagedRejectionReason
                    ? 'This clears the rejection notice from Submitted updates. Your live listing on the shop is unchanged.'
                    : 'This listing will return to draft and will no longer appear in the admin review queue.'}
              </p>
              {cancelError ? (
                <p className={styles.removeConfirmError} role="alert">
                  {cancelError}
                </p>
              ) : null}
            </div>
            <div className={styles.removeConfirmFooter}>
              <div className={styles.removeConfirmActions}>
                <button
                  type="button"
                  className={styles.removeConfirmCancel}
                  onClick={handleCancelCancelReview}
                  disabled={cancelInProgress}
                >
                  Keep request
                </button>
                <button
                  type="button"
                  className={styles.removeConfirmDelete}
                  onClick={handleConfirmCancelReview}
                  disabled={cancelInProgress}
                >
                  {cancelInProgress ? 'Cancelling…' : 'Yes, cancel request'}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
        )
      : null}
    </div>
  )
}
