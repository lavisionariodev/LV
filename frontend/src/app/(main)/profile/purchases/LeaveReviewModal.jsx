'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import purchaseStyles from './purchases.module.css'

function StarPicker({ value, onChange, size = 22 }) {
  const rating = Number.isFinite(Number(value)) ? Number(value) : 0
  return (
    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }} aria-label="Rating picker">
      {[1, 2, 3, 4, 5].map((s) => (
        <button
          key={s}
          type="button"
          onClick={() => onChange(s)}
          aria-label={`${s} star`}
          aria-pressed={rating === s}
          style={{
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            padding: 0,
            lineHeight: 1,
            color: s <= rating ? '#E8A020' : '#d1d5db',
            fontSize: size,
          }}
        >
          ★
        </button>
      ))}
    </div>
  )
}

export function LeaveReviewModal({
  open,
  orderId,
  orderLabel,
  orderItems,
  onClose,
  onSubmitted,
}) {
  const backdropRef = useRef(null)
  const keepBtnRef = useRef(null)

  const safeOrderId = String(orderId ?? '').trim()
  const safeItems = Array.isArray(orderItems) ? orderItems : []

  // Debug logging
  if (open && safeOrderId) {
    console.log('[LeaveReviewModal] orderId prop:', orderId, 'safeOrderId:', safeOrderId, 'length:', safeOrderId.length)
  }

  const reviewItems = useMemo(
    () => safeItems.filter((x) => x?.orderItemId && x?.label),
    [safeItems],
  )

  const [loadingExisting, setLoadingExisting] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [submitError, setSubmitError] = useState('')

  /** @type {Array<{ orderItemId: string, rating: number, reviewText: string }>} */
  const [draft, setDraft] = useState([])

  useEffect(() => {
    if (!open) return

    let cancelled = false

    async function loadExisting() {
      setLoadingExisting(true)
      setLoadError('')
      setSubmitError('')
      setDraft([])

      try {
        const res = await fetch(`/api/buyer/orders/${encodeURIComponent(safeOrderId)}/reviews`)
        const body = await res.json().catch(() => null)
        if (!res.ok) {
          throw new Error(typeof body?.error === 'string' ? body.error : 'Failed to load existing reviews.')
        }

        const existing = Array.isArray(body?.reviews) ? body.reviews : []
        if (cancelled) return

        setDraft(
          reviewItems.map((item) => {
            const hit = existing.find((r) => String(r.orderItemId) === String(item.orderItemId))
            return {
              orderItemId: String(item.orderItemId),
              rating: hit?.rating ? Number(hit.rating) : 0,
              reviewText: hit?.reviewText ? String(hit.reviewText) : '',
            }
          }),
        )
      } catch (e) {
        if (cancelled) return
        setLoadError(e?.message ? String(e.message) : 'Failed to load existing reviews.')
      } finally {
        if (cancelled) return
        setLoadingExisting(false)
      }
    }

    loadExisting()

    return () => {
      cancelled = true
    }
  }, [open, safeOrderId, reviewItems])

  useEffect(() => {
    if (!open) return undefined

    const prevActive = typeof document !== 'undefined' ? document.activeElement : null
    queueMicrotask(() => keepBtnRef.current?.focus?.())

    function onKeyDown(e) {
      if (e.key === 'Escape') {
        if (!submitting) onClose()
        return
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      if (prevActive && typeof prevActive.focus === 'function') prevActive.focus()
    }
  }, [open, submitting, onClose])

  if (!open) return null

  function backdropMouseDown(e) {
    if (e.target === backdropRef.current && !submitting) onClose()
  }

  const ratedDraft = draft.filter((d) => d.rating >= 1 && d.rating <= 5)
  const hasAtLeastOneRating = ratedDraft.length > 0

  return (
    <div
      ref={backdropRef}
      className={purchaseStyles.modalBackdrop}
      role="presentation"
      onMouseDown={backdropMouseDown}
    >
      <div className={purchaseStyles.modalPanel} role="dialog" aria-modal="true" aria-label="Leave a review">
        <div className={purchaseStyles.modalTitle} style={{ fontSize: '1.15rem' }}>
          Leave a review {orderLabel ? <span style={{ color: '#204F38' }}>{orderLabel}</span> : null}
        </div>

        <div className={purchaseStyles.modalBody}>
          {loadingExisting ? (
            <p style={{ margin: 0 }}>Loading your previous ratings…</p>
          ) : loadError ? (
            <p style={{ margin: 0, color: '#b91c1c', fontWeight: 600 }}>{loadError}</p>
          ) : (
            <>
              {reviewItems.map((item) => {
                const hit = draft.find((d) => String(d.orderItemId) === String(item.orderItemId))
                const rating = hit?.rating ?? 0
                const reviewText = hit?.reviewText ?? ''

                return (
                  <div key={item.orderItemId} style={{ marginBottom: 14 }}>
                    <div style={{ fontWeight: 700, marginBottom: 8, color: 'var(--forest, #102820)' }}>
                      {item.label}
                    </div>
                    <StarPicker value={rating} onChange={(v) => setDraft((prev) => prev.map((x) => (x.orderItemId === item.orderItemId ? { ...x, rating: v } : x)))} />
                    <textarea
                      value={reviewText}
                      onChange={(e) =>
                        setDraft((prev) =>
                          prev.map((x) => (x.orderItemId === item.orderItemId ? { ...x, reviewText: e.target.value } : x)),
                        )
                      }
                      placeholder="Share your experience (optional)."
                      rows={3}
                      style={{
                        width: '100%',
                        marginTop: 8,
                        border: '1px solid rgba(168, 137, 74, 0.35)',
                        borderRadius: 8,
                        padding: 10,
                        fontFamily: 'Lato, sans-serif',
                        fontSize: '0.86rem',
                        resize: 'vertical',
                      }}
                      maxLength={2000}
                    />
                  </div>
                )
              })}
              {submitError ? (
                <p style={{ margin: '8px 0 0', color: '#b91c1c', fontWeight: 600 }}>{submitError}</p>
              ) : null}
              <p style={{ margin: '10px 0 0', color: '#6B6B6B', fontSize: '0.82rem' }}>
                You can rate one or more services now, then update or add the rest later.
              </p>
            </>
          )}
        </div>

        <div className={purchaseStyles.modalActions}>
          <button
            ref={keepBtnRef}
            type="button"
            className={purchaseStyles.modalGhostBtn}
            onClick={onClose}
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            type="button"
            className={purchaseStyles.modalDangerBtn}
            onClick={async () => {
              setSubmitError('')
              if (!hasAtLeastOneRating) {
                setSubmitError('Please select a rating (1–5 stars) for at least one service.')
                return
              }

              setSubmitting(true)
              try {
                const payload = {
                  orderId: safeOrderId,
                  reviews: ratedDraft.map((d) => ({
                    orderItemId: d.orderItemId,
                    rating: d.rating,
                    reviewText: d.reviewText,
                  })),
                }

                const res = await fetch('/api/buyer/orders/reviews', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(payload),
                })

                const body = await res.json().catch(() => null)
                if (!res.ok) {
                  throw new Error(typeof body?.error === 'string' ? body.error : 'Failed to submit review.')
                }

                onSubmitted?.()
              } catch (e) {
                setSubmitError(e?.message ? String(e.message) : 'Failed to submit review.')
              } finally {
                setSubmitting(false)
              }
            }}
            disabled={submitting || loadingExisting || reviewItems.length === 0}
          >
            {submitting ? 'Submitting…' : 'Submit'}
          </button>
        </div>
      </div>
    </div>
  )
}

