'use client'

import { useEffect, useRef } from 'react'
import purchaseStyles from './purchases.module.css'

/**
 * @typedef {{
 *   open: boolean,
 *   orderLabel: string,
 *   onClose: () => void,
 *   onConfirm: () => void,
 *   confirming: boolean,
 *   showsPaidRefundDisclaimer: boolean,
 * }} Props
 */

/**
 * @param {Props} props
 */
export function CancelBookingModal({
  open,
  orderLabel,
  onClose,
  onConfirm,
  confirming,
  showsPaidRefundDisclaimer = false,
}) {
  const backdropRef = useRef(null)
  const keepBtnRef = useRef(null)

  useEffect(() => {
    if (!open) return undefined

    const prevActive = typeof document !== 'undefined' ? document.activeElement : null
    queueMicrotask(() => keepBtnRef.current?.focus?.())

    const focusablesSel = 'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'

    function getFocusables() {
      const root = backdropRef.current
      if (!root) return []
      return [...root.querySelectorAll(focusablesSel)].filter(
        /** @returns {el is HTMLElement} */
        (el) => el instanceof HTMLElement && !el.hasAttribute('disabled'),
      )
    }

    function onKeyDown(e) {
      if (e.key === 'Escape') {
        if (!confirming) onClose()
        return
      }
      if (e.key !== 'Tab') return
      const list = getFocusables()
      if (list.length === 0) return
      const first = list[0]
      const last = list[list.length - 1]
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault()
          last.focus()
        }
      } else if (document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      if (prevActive && typeof prevActive.focus === 'function') prevActive.focus()
    }
  }, [open, confirming, onClose])

  if (!open) return null

  function backdropMouseDown(e) {
    if (e.target === backdropRef.current && !confirming) onClose()
  }

  return (
    <div
      ref={backdropRef}
      className={purchaseStyles.modalBackdrop}
      role="presentation"
      onMouseDown={backdropMouseDown}
    >
      <div
        className={purchaseStyles.modalPanel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="cancel-booking-title"
        aria-describedby="cancel-booking-desc"
      >
        <h2 id="cancel-booking-title" className={purchaseStyles.modalTitle}>
          Cancel purchase?
        </h2>
        <div id="cancel-booking-desc" className={purchaseStyles.modalBody}>
          {showsPaidRefundDisclaimer ? (
            <>
              {orderLabel ? (
                <p style={{ margin: '0 0 12px' }}>
                  Cancel order <strong>{orderLabel}</strong> before your provider confirms. Your payment has already
                  been received; we will open a refund for you instead of cancelling instantly like an unpaid basket.
                </p>
              ) : (
                <p style={{ margin: '0 0 12px' }}>
                  You are about to cancel this paid purchase before the provider confirms it.
                </p>
              )}
              <p
                style={{
                  margin: 0,
                  padding: '10px 12px',
                  borderRadius: 8,
                  background: 'rgba(180,83,9,0.09)',
                  fontSize: '0.92em',
                  lineHeight: 1.5,
                }}
              >
                <strong>Refund timing:</strong> after the provider approves the cancellation, refunds are usually
                credited in about <strong>5–15 business days</strong>, similar to major marketplaces — exact timing
                depends on your bank, card network, or e-wallet.
              </p>
            </>
          ) : (
            <p style={{ margin: 0 }}>
              {orderLabel
                ? `This will cancel unpaid order ${orderLabel}.`
                : 'This will cancel this unpaid purchase.'}{' '}
              You can add services to cart and check out again if you change your mind.
            </p>
          )}
        </div>
        <div className={purchaseStyles.modalActions}>
          <button
            ref={keepBtnRef}
            type="button"
            className={purchaseStyles.modalGhostBtn}
            onClick={onClose}
            disabled={confirming}
          >
            Keep purchase
          </button>
          <button
            type="button"
            className={purchaseStyles.modalDangerBtn}
            onClick={onConfirm}
            disabled={confirming}
          >
            {confirming ? 'Cancelling…' : showsPaidRefundDisclaimer ? 'Cancel & request refund' : 'Cancel purchase'}
          </button>
        </div>
      </div>
    </div>
  )
}
