'use client'

import { useEffect } from 'react'

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
  /** `danger` — red · `primary` — green · `warning` — amber (caution). */
  variant = 'danger',
  /** Optional node shown inside the header circle instead of "!". */
  icon = null,
  /** `center` — default; `left` — for multi-line explanations + extra content. */
  subtitleAlign = 'center',
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e) => {
      if (e.key !== 'Escape') return
      if (disableActions) return
      onCancel?.()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, disableActions, onCancel])

  if (!open) return null

  const handleOverlayClick = () => {
    if (disableActions) return
    onCancel?.()
  }

  const stop = (e) => e.stopPropagation()

  const isPrimary = variant === 'primary'
  const isWarning = variant === 'warning'
  const iconCircleClass = `${styles.iconCircle} ${
    isPrimary ? styles.iconCirclePrimary : isWarning ? styles.iconCircleWarning : styles.iconCircleDanger
  }`
  const confirmBtnClass = `${styles.confirmBtn} ${
    isPrimary ? styles.confirmBtnPrimary : isWarning ? styles.confirmBtnWarning : styles.confirmBtnDanger
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
            disabled={disableActions}
          >
            {cancelLabel}
          </button>

          <button
            type="button"
            className={confirmBtnClass}
            onClick={onConfirm}
            disabled={disableActions}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

