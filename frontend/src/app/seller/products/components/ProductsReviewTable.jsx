'use client'

import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { TbDots } from 'react-icons/tb'
import styles from '../products.module.css'
import { canCancelListingReview } from './listingLifecycle'

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

function formatSubmittedChanges(product) {
  const fields = Array.isArray(product?.pendingChangeFields) ? product.pendingChangeFields : []
  if (fields.length === 0) return '—'
  return fields.join(', ')
}

export default function ProductsReviewTable({
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
              {isUpdatesPending ? 'Submitted changes' : 'Status'}
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
                  isUpdatesPending ? product.pendingChangesSubmittedAt : product.submittedAt,
                )}
              </td>
              <td
                data-label={isUpdatesPending ? 'Submitted changes' : 'Status'}
                className={isUpdatesPending ? styles.productsTableSubmittedChangesCol : undefined}
              >
                {isUpdatesPending ? (
                  <p className={styles.productsTableSubmittedChanges}>
                    {formatSubmittedChanges(product)}
                  </p>
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
