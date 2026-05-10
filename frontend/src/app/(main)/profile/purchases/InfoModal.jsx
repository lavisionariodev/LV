'use client'

import { useEffect, useRef } from 'react'
import purchaseStyles from './purchases.module.css'

export function InfoModal({ open, title, message, buttonLabel = 'OK', onClose }) {
  const backdropRef = useRef(null)
  const okBtnRef = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    const prevActive = typeof document !== 'undefined' ? document.activeElement : null
    queueMicrotask(() => okBtnRef.current?.focus?.())
    function onKeyDown(e) {
      if (e.key === 'Escape') onClose?.()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      if (prevActive && typeof prevActive.focus === 'function') prevActive.focus()
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      ref={backdropRef}
      className={purchaseStyles.modalBackdrop}
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === backdropRef.current) onClose?.()
      }}
    >
      <div
        className={purchaseStyles.modalPanel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="info-modal-title"
        aria-describedby="info-modal-desc"
      >
        <h2 id="info-modal-title" className={purchaseStyles.modalTitle}>
          {title}
        </h2>
        <p id="info-modal-desc" className={purchaseStyles.modalBody}>
          {message}
        </p>
        <div className={purchaseStyles.modalActions}>
          <button
            ref={okBtnRef}
            type="button"
            className={purchaseStyles.modalGhostBtn}
            onClick={onClose}
          >
            {buttonLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

