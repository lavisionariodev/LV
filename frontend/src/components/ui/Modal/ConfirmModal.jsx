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
}) {
  if (!open) return null

  const handleOverlayClick = () => {
    onCancel?.()
  }

  const stop = (e) => e.stopPropagation()

  return (
    <div
      className={styles.overlay}
      role="dialog"
      aria-modal="true"
      onClick={handleOverlayClick}
    >
      <div className={styles.modal} onClick={stop}>
        <div className={styles.iconWrap} aria-hidden="true">
          <div className={styles.iconCircle}>!</div>
        </div>

        <p className={styles.title}>{title}</p>
        {message && <p className={styles.subtitle}>{message}</p>}

        <div className={styles.actions}>
          <button
            type="button"
            className={styles.cancelBtn}
            onClick={onCancel}
          >
            {cancelLabel}
          </button>

          <button
            type="button"
            className={styles.confirmBtn}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

