'use client'

import { useEffect, useRef } from 'react'

import styles from './ConfirmModal.module.css'

export default function ConfirmModal({
  open,
  title,
  message,
  /** Rendered below the message (e.g. form fields). */
  extra = null,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
  /** When true, buttons are disabled and overlay click does not dismiss (e.g. async submit). */
  disableActions = false,
  /** When true, same as disabling actions; confirm shows `confirmLoadingLabel` (or `confirmLabel` + "..."). */
  loading = false,
  /** Confirm button text while `loading` (present tense + "...", e.g. "Saving..."). */
  confirmLoadingLabel,
  /** `danger` — red · `primary` — green · `warning` — amber · `neutral` — slate/gray. */
  variant = 'danger',
  /** Optional node shown inside the header circle instead of "!". */
  icon = null,
  /** `center` — default; `left` — for multi-line explanations + extra content. */
  subtitleAlign = 'center',
}) {
  const actionsDisabled = disableActions || loading
  const pinnedVariantRef = useRef(variant)

  if (open && !loading) {
    pinnedVariantRef.current = variant
  }

  const visualVariant = open && loading ? pinnedVariantRef.current : variant

  useEffect(() => {
    if (!open) return
    if (!loading) {
      pinnedVariantRef.current = variant
    }
  }, [open, variant, loading])

  useEffect(() => {
    if (!open) return
    const onKey = (e) => {
      if (e.key !== 'Escape') return
      if (actionsDisabled) return
      onCancel?.()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, actionsDisabled, onCancel])

  if (!open) return null

  const handleOverlayClick = () => {
    if (actionsDisabled) return
    onCancel?.()
  }

  const confirmButtonLabel =
    loading && confirmLoadingLabel != null && String(confirmLoadingLabel).length > 0
      ? confirmLoadingLabel
      : loading && typeof confirmLabel === 'string' && confirmLabel.length > 0
        ? `${confirmLabel}...`
        : confirmLabel

  const stop = (e) => e.stopPropagation()

  const isPrimary = visualVariant === 'primary'
  const isWarning = visualVariant === 'warning'
  const isNeutral = visualVariant === 'neutral'
  const iconCircleClass = `${styles.iconCircle} ${
    isPrimary
      ? styles.iconCirclePrimary
      : isWarning
        ? styles.iconCircleWarning
        : isNeutral
          ? styles.iconCircleNeutral
          : styles.iconCircleDanger
  }`
  const confirmBtnClass = `${styles.confirmBtn} ${
    isPrimary
      ? styles.confirmBtnPrimary
      : isWarning
        ? styles.confirmBtnWarning
        : isNeutral
          ? styles.confirmBtnNeutral
          : styles.confirmBtnDanger
  }`

  const subtitleClass =
    subtitleAlign === 'left' ? `${styles.subtitle} ${styles.subtitleLeft}` : styles.subtitle

  return (
    <div
      className={styles.overlay}
      role="dialog"
      aria-modal="true"
      onClick={handleOverlayClick}
    >
      <div className={styles.modal} onClick={stop}>
        <div className={styles.iconWrap} aria-hidden="true">
          <div className={iconCircleClass}>{icon ?? '!'}</div>
        </div>

        <div className={styles.title}>{title}</div>
        {message != null && message !== '' ? <div className={subtitleClass}>{message}</div> : null}
        {extra != null ? <div className={styles.modalExtra}>{extra}</div> : null}

        <div className={styles.actions}>
          <button
            type="button"
            className={styles.cancelBtn}
            onClick={onCancel}
            disabled={actionsDisabled}
          >
            {cancelLabel}
          </button>

          <button
            type="button"
            className={`${confirmBtnClass}${loading ? ` ${styles.confirmBtnBusy}` : ''}`}
            onClick={onConfirm}
            disabled={actionsDisabled}
            aria-busy={loading}
          >
            {confirmButtonLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

