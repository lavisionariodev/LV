'use client'

import styles from './ConfirmModal.module.css'

export default function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
  /** When true, buttons are disabled and overlay click does not dismiss (e.g. async submit). */
  disableActions = false,
  /** `danger` — red (destructive / caution). `primary` — blue (affirmative proceed). */
  variant = 'danger',
}) {
  if (!open) return null

  const handleOverlayClick = () => {
    if (disableActions) return
    onCancel?.()
  }

  const stop = (e) => e.stopPropagation()

  const isPrimary = variant === 'primary'
  const iconCircleClass = `${styles.iconCircle} ${isPrimary ? styles.iconCirclePrimary : styles.iconCircleDanger}`
  const confirmBtnClass = `${styles.confirmBtn} ${isPrimary ? styles.confirmBtnPrimary : styles.confirmBtnDanger}`

  return (
    <div
      className={styles.overlay}
      role="dialog"
      aria-modal="true"
      onClick={handleOverlayClick}
    >
      <div className={styles.modal} onClick={stop}>
        <div className={styles.iconWrap} aria-hidden="true">
          <div className={iconCircleClass}>!</div>
        </div>

        <p className={styles.title}>{title}</p>
        {message && <p className={styles.subtitle}>{message}</p>}

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

