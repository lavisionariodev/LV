'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useProfile } from '@/contexts/ProfileContext';
import { useToast } from '@/contexts/ToastContext';
import { getUserRole, ROLE_SELLER } from '@/lib/auth/roles';
import { supabase } from '@/lib/supabase/client';
import { expandPurchaseCardsByLineItem, mapBuyerOrderCard } from '@/lib/profile/mapBuyerOrderCard';
import { listingIdFromOrderItemProductId } from '@/lib/orders/listingIdFromProductId';
import styles from '../profile.module.css';
import purchaseStyles from './purchases.module.css';

/** Purchases toolbar tabs — match buyer-facing `purchase.status`. */
const PURCHASE_FILTER_TABS = [
  'All',
  'Pending',
  'Confirmed',
  'In Progress',
  'Completed',
  'Cancelled',
  'Refunded',
];

function purchaseMatchesFilter(purchase, filterLabel) {
  if (filterLabel === 'All') return true;
  if (filterLabel === 'Refunded') return purchase.status === 'Refunded';
  if (filterLabel === 'Pending') {
    return purchase.status === 'Pending' || purchase.status === 'Active booking';
  }
  return purchase.status === filterLabel;
}
const PAGE_SIZE = 5;

function PurchaseCardSkeleton() {
  return (
    <div className={purchaseStyles.card}>
      <div className={purchaseStyles.cardHeader}>
        <div className={purchaseStyles.cardTop}>
          <div className={purchaseStyles.cardInfo}>
            <div className={`${styles.skBlock} ${styles.skPurOrderId}`} />
            <div className={`${styles.skBlock} ${styles.skPurTitle}`} />
            <div className={`${styles.skBlock} ${styles.skPurProvider}`} />
          </div>
          <div className={purchaseStyles.badgeColumn}>
            <div className={`${styles.skBlock} ${styles.skPurBadge}`} />
            <div className={`${styles.skBlock} ${styles.skPurBadgeSub}`} />
          </div>
        </div>
        <div className={`${styles.skBlock} ${styles.skPurPaymentLine}`} />
        <div className={purchaseStyles.cardMeta}>
          <div className={`${styles.skBlock} ${styles.skPurMetaChip}`} />
          <div className={`${styles.skBlock} ${styles.skPurMetaChip}`} />
          <div className={`${styles.skBlock} ${styles.skPurMetaPrice}`} />
        </div>
      </div>
    </div>
  );
}

const STATUS_CONFIG = {
  Pending: { color: '#A8894A', bg: 'rgba(168,137,74,0.10)' },
  'Active booking': { color: '#0f766e', bg: 'rgba(15,118,110,0.10)' },
  Confirmed: { color: '#204F38', bg: 'rgba(32,79,56,0.10)' },
  'In Progress': { color: '#2563EB', bg: 'rgba(37,99,235,0.09)' },
  Completed: { color: '#16a34a', bg: 'rgba(22,163,74,0.10)' },
  Cancelled: { color: '#dc2626', bg: 'rgba(220,38,38,0.09)' },
  Refunded: { color: '#57534e', bg: 'rgba(87,83,78,0.10)' },
};

function formatPurchaseDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-PH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function Pagination({ currentPage, totalPages, onPageChange }) {
  if (totalPages <= 1) return null;
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);
  return (
    <div className={purchaseStyles.pagination}>
      <button type="button" className={purchaseStyles.pageBtn} onClick={() => onPageChange(currentPage - 1)} disabled={currentPage === 1} aria-label="Previous page">
        <svg viewBox="0 0 16 16" fill="none" width="14" height="14"><path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </button>
      {pages.map((page) => (
        <button key={page} type="button" className={`${purchaseStyles.pageBtn} ${page === currentPage ? purchaseStyles.pageBtnActive : ''}`} onClick={() => onPageChange(page)}>{page}</button>
      ))}
      <button type="button" className={purchaseStyles.pageBtn} onClick={() => onPageChange(currentPage + 1)} disabled={currentPage === totalPages} aria-label="Next page">
        <svg viewBox="0 0 16 16" fill="none" width="14" height="14"><path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </button>
    </div>
  );
}

/**
 * Card-style 5-star rating picker matching the review-modal mock-up.
 * Each star sits inside its own bordered tile that fills the row.
 */
function StarCardPicker({ value, onChange, disabled = false }) {
  const rating = Number.isFinite(Number(value)) ? Number(value) : 0;
  return (
    <div className={purchaseStyles.reviewStarGrid} role="radiogroup" aria-label="Rating">
      {[1, 2, 3, 4, 5].map((s) => {
        const filled = s <= rating;
        return (
          <button
            key={s}
            type="button"
            disabled={disabled}
            onClick={() => onChange(s)}
            role="radio"
            aria-checked={rating === s}
            aria-label={`${s} star${s === 1 ? '' : 's'}`}
            className={`${purchaseStyles.reviewStarCard} ${filled ? purchaseStyles.reviewStarCardFilled : ''}`}
          >
            <span aria-hidden="true">{filled ? '\u2605' : '\u2606'}</span>
          </button>
        );
      })}
    </div>
  );
}

/** @returns {'Service' | 'Product'} */
function reviewKindNoun(kind) {
  const k = String(kind ?? '').trim().toLowerCase();
  if (k === 'product') return 'Product';
  return 'Service';
}

function InfoModal({ open, title, message, buttonLabel = 'OK', onClose }) {
  const backdropRef = useRef(null);
  const okBtnRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const prevActive = typeof document !== 'undefined' ? document.activeElement : null;
    queueMicrotask(() => okBtnRef.current?.focus?.());
    function onKeyDown(e) {
      if (e.key === 'Escape') onClose?.();
    }
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      if (prevActive && typeof prevActive.focus === 'function') prevActive.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      ref={backdropRef}
      className={purchaseStyles.modalBackdrop}
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === backdropRef.current) onClose?.();
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
  );
}

/**
 * @typedef {{
 *   open: boolean,
 *   orderLabel: string,
 *   onClose: () => void,
 *   onConfirm: () => void,
 *   confirming: boolean,
 *   showsPaidRefundDisclaimer: boolean,
 * }} CancelBookingModalProps
 */

/** @param {CancelBookingModalProps} props */
function CancelBookingModal({
  open,
  orderLabel,
  onClose,
  onConfirm,
  confirming,
  showsPaidRefundDisclaimer = false,
}) {
  const backdropRef = useRef(null);
  const keepBtnRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;

    const prevActive = typeof document !== 'undefined' ? document.activeElement : null;
    queueMicrotask(() => keepBtnRef.current?.focus?.());

    const focusablesSel = 'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

    function getFocusables() {
      const root = backdropRef.current;
      if (!root) return [];
      return [...root.querySelectorAll(focusablesSel)].filter(
        /** @returns {el is HTMLElement} */
        (el) => el instanceof HTMLElement && !el.hasAttribute('disabled'),
      );
    }

    function onKeyDown(e) {
      if (e.key === 'Escape') {
        if (!confirming) onClose();
        return;
      }
      if (e.key !== 'Tab') return;
      const list = getFocusables();
      if (list.length === 0) return;
      const first = list[0];
      const last = list[list.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else if (document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      if (prevActive && typeof prevActive.focus === 'function') prevActive.focus();
    };
  }, [open, confirming, onClose]);

  if (!open) return null;

  function backdropMouseDown(e) {
    if (e.target === backdropRef.current && !confirming) onClose();
  }

  return (
    <div
      ref={backdropRef}
      className={purchaseStyles.modalBackdrop}
      role="presentation"
      onMouseDown={backdropMouseDown}
    >
      <div
        className={purchaseStyles.cancelConfirmPanel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="cancel-booking-title"
        aria-describedby="cancel-booking-desc"
      >
        <h2 id="cancel-booking-title" className={purchaseStyles.cancelConfirmTitle}>
          Cancel purchase?
        </h2>
        <div id="cancel-booking-desc" className={purchaseStyles.cancelConfirmBody}>
          {showsPaidRefundDisclaimer ? (
            <>
              {orderLabel ? (
                <p>
                  This will cancel order <strong>{orderLabel}</strong> and submit a refund request to your
                  provider for approval.
                </p>
              ) : (
                <p>
                  This will cancel your paid booking and submit a refund request to your provider for approval.
                </p>
              )}
              <p className={purchaseStyles.cancelConfirmNote}>
                <strong>Refund timeline:</strong> once approved, refunds typically arrive within
                <strong> 5 to 15 business days</strong>, depending on your bank or e-wallet.
              </p>
            </>
          ) : (
            <p>
              {orderLabel
                ? `This will cancel unpaid order ${orderLabel}.`
                : 'This will cancel this unpaid purchase.'}{' '}
              You may add the service back to your cart at any time.
            </p>
          )}
        </div>
        <div className={purchaseStyles.cancelConfirmActions}>
          <button
            ref={keepBtnRef}
            type="button"
            className={purchaseStyles.cancelConfirmCancelBtn}
            onClick={onClose}
            disabled={confirming}
          >
            Keep purchase
          </button>
          <button
            type="button"
            className={purchaseStyles.cancelConfirmDangerBtn}
            onClick={onConfirm}
            disabled={confirming}
          >
            {confirming ? 'Cancelling…' : showsPaidRefundDisclaimer ? 'Yes, Cancel it' : 'Cancel purchase'}
          </button>
        </div>
      </div>
    </div>
  );
}

const DISPUTE_REASON_OPTIONS = [
  { value: 'Service quality or scope', label: 'Service quality or scope' },
  { value: 'Billing or payment', label: 'Billing or payment' },
  { value: 'Scheduling or cancellation', label: 'Scheduling or cancellation' },
  { value: 'Provider did not deliver', label: 'Provider did not deliver' },
  { value: 'Other concern', label: 'Other concern' },
];

/**
 * @param {{
 *   open: boolean,
 *   rawOrderId: string,
 *   onClose: () => void,
 *   onSubmit: (payload: { reason: string, description: string }) => Promise<void>,
 *   submitting: boolean,
 * }} props
 */
function OpenDisputeModal({ open, rawOrderId, onClose, onSubmit, submitting }) {
  const backdropRef = useRef(null);
  const cancelBtnRef = useRef(null);
  const [reason, setReason] = useState(DISPUTE_REASON_OPTIONS[0].value);
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (!open) {
      queueMicrotask(() => {
        setReason(DISPUTE_REASON_OPTIONS[0].value);
        setDescription('');
      });
    }
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;

    const prevActive = typeof document !== 'undefined' ? document.activeElement : null;
    queueMicrotask(() => cancelBtnRef.current?.focus?.());

    function onKeyDown(e) {
      if (e.key === 'Escape' && !submitting) onClose();
    }

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      if (prevActive && typeof prevActive.focus === 'function') prevActive.focus();
    };
  }, [open, submitting, onClose]);

  if (!open || !rawOrderId) return null;

  function backdropMouseDown(e) {
    if (e.target === backdropRef.current && !submitting) onClose();
  }

  return (
    <div
      ref={backdropRef}
      className={purchaseStyles.modalBackdrop}
      role="presentation"
      onMouseDown={backdropMouseDown}
    >
      <div
        className={purchaseStyles.reviewPanel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="dispute-title"
      >
        <div className={purchaseStyles.reviewHeader}>
          <span className={purchaseStyles.reviewIconBox} aria-hidden="true">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"
                stroke="currentColor"
                strokeWidth="1.25"
              />
              <path
                d="M9.09 9a3 3 0 015.83 1c0 2-3 2-3 4"
                stroke="currentColor"
                strokeWidth="1.25"
                strokeLinecap="round"
              />
              <circle cx="12" cy="17" r="1" fill="currentColor" />
            </svg>
          </span>
          <div className={purchaseStyles.reviewHeaderText}>
            <h2 id="dispute-title" className={purchaseStyles.reviewTitle}>
              Request help
            </h2>
            <p className={purchaseStyles.reviewSubtitle}>
              Describe the problem so our support team can review it with your provider.
            </p>
          </div>
          <button
            type="button"
            className={purchaseStyles.reviewCloseBtn}
            onClick={() => {
              if (!submitting) onClose();
            }}
            disabled={submitting}
            aria-label="Close request help dialog"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path
                d="M4 4l8 8M12 4l-8 8"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        <div className={purchaseStyles.reviewBody}>
          <div className={purchaseStyles.reviewSection}>
            <label className={purchaseStyles.reviewFieldLabel} htmlFor="dispute-reason">
              Reason
            </label>
            <select
              id="dispute-reason"
              className={purchaseStyles.disputeSheetSelect}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              disabled={submitting}
            >
              {DISPUTE_REASON_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          <div className={purchaseStyles.reviewSection}>
            <label className={purchaseStyles.reviewFieldLabel} htmlFor="dispute-desc">
              Additional details
              <span className={purchaseStyles.reviewFieldLabelOptional}>(optional)</span>
            </label>
            <div className={purchaseStyles.reviewTextareaWrap}>
              <textarea
                id="dispute-desc"
                className={`${purchaseStyles.reviewTextarea} ${purchaseStyles.disputeSheetTextarea}`}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={submitting}
                placeholder="Describe the issue. Include relevant dates, amounts, and other details to help us resolve it faster."
              />
            </div>
          </div>
        </div>

        <p className={purchaseStyles.disputeInfoNote} role="note">
          This does not automatically cancel or refund the purchase.
        </p>

        <div className={purchaseStyles.reviewActions}>
          <button
            ref={cancelBtnRef}
            type="button"
            className={purchaseStyles.reviewCancelBtn}
            onClick={onClose}
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            type="button"
            className={purchaseStyles.reviewSubmitBtnDanger}
            disabled={submitting}
            onClick={async () => {
              await onSubmit({ reason, description: description.trim() });
            }}
          >
            {submitting ? 'Submitting\u2026' : 'Submit request'}
          </button>
        </div>
      </div>
    </div>
  );
}

const REVIEW_MAX_CHARS = 2000;

function LeaveReviewModal({
  open,
  orderId,
  orderItems,
  onClose,
  onSubmitted,
}) {
  const backdropRef = useRef(null);
  const cancelBtnRef = useRef(null);

  const safeOrderId = String(orderId ?? '').trim();

  const reviewItems = useMemo(
    () => (Array.isArray(orderItems) ? orderItems : []).filter((x) => x?.orderItemId && x?.label),
    [orderItems],
  );

  const [loadingExisting, setLoadingExisting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [submitError, setSubmitError] = useState('');

  /** @type {Array<{ orderItemId: string, rating: number, reviewText: string }>} */
  const [draft, setDraft] = useState([]);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;

    async function loadExisting() {
      setLoadingExisting(true);
      setLoadError('');
      setSubmitError('');
      setDraft([]);

      try {
        const res = await fetch(`/api/buyer/orders/${encodeURIComponent(safeOrderId)}/reviews`);
        const body = await res.json().catch(() => null);
        if (!res.ok) {
          throw new Error(typeof body?.error === 'string' ? body.error : 'Failed to load existing reviews.');
        }

        const existing = Array.isArray(body?.reviews) ? body.reviews : [];
        if (cancelled) return;

        setDraft(
          reviewItems.map((item) => {
            const hit = existing.find((r) => String(r.orderItemId) === String(item.orderItemId));
            return {
              orderItemId: String(item.orderItemId),
              rating: hit?.rating ? Number(hit.rating) : 0,
              reviewText: hit?.reviewText ? String(hit.reviewText) : '',
            };
          }),
        );
      } catch (e) {
        if (cancelled) return;
        setLoadError(e?.message ? String(e.message) : 'Failed to load existing reviews.');
      } finally {
        if (cancelled) return;
        setLoadingExisting(false);
      }
    }

    loadExisting();

    return () => {
      cancelled = true;
    };
  }, [open, safeOrderId, reviewItems]);

  useEffect(() => {
    if (!open) return undefined;

    const prevActive = typeof document !== 'undefined' ? document.activeElement : null;
    queueMicrotask(() => cancelBtnRef.current?.focus?.());

    function onKeyDown(e) {
      if (e.key === 'Escape') {
        if (!submitting) onClose();
      }
    }

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      if (prevActive && typeof prevActive.focus === 'function') prevActive.focus();
    };
  }, [open, submitting, onClose]);

  if (!open) return null;

  function backdropMouseDown(e) {
    if (e.target === backdropRef.current && !submitting) onClose();
  }

  const ratedDraft = draft.filter((d) => d.rating >= 1 && d.rating <= 5);
  const hasAtLeastOneRating = ratedDraft.length > 0;

  /**
   * Pick the dominant noun ("Service" or "Product") for the modal header.
   * Mixed checkouts fall back to "Item" so the header copy stays accurate.
   */
  const headerNoun = (() => {
    const nouns = new Set(reviewItems.map((it) => reviewKindNoun(it.kind)));
    if (nouns.size === 1) return [...nouns][0];
    if (nouns.size === 0) return 'Service';
    return 'Item';
  })();

  async function handleSubmit() {
    setSubmitError('');
    if (!hasAtLeastOneRating) {
      setSubmitError(`Please select a rating (1\u20135 stars) for at least one ${headerNoun.toLowerCase()}.`);
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        orderId: safeOrderId,
        reviews: ratedDraft.map((d) => ({
          orderItemId: d.orderItemId,
          rating: d.rating,
          reviewText: d.reviewText,
        })),
      };

      const res = await fetch('/api/buyer/orders/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const body = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(typeof body?.error === 'string' ? body.error : 'Failed to submit review.');
      }

      onSubmitted?.();
    } catch (e) {
      setSubmitError(e?.message ? String(e.message) : 'Failed to submit review.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      ref={backdropRef}
      className={purchaseStyles.modalBackdrop}
      role="presentation"
      onMouseDown={backdropMouseDown}
    >
      <div
        className={purchaseStyles.reviewPanel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="review-modal-title"
      >
        <div className={purchaseStyles.reviewHeader}>
          <span className={purchaseStyles.reviewIconBox} aria-hidden="true">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 3.25l2.75 5.57 6.15.9-4.45 4.34 1.05 6.12L12 17.27 6.5 20.18l1.05-6.12L3.1 9.72l6.15-.9L12 3.25z"
                fill="currentColor"
                stroke="currentColor"
                strokeWidth="0.6"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <div className={purchaseStyles.reviewHeaderText}>
            <h2 id="review-modal-title" className={purchaseStyles.reviewTitle}>
              Rate Our {headerNoun}
            </h2>
            <p className={purchaseStyles.reviewSubtitle}>
              Provide us with feedback for the {headerNoun.toLowerCase()}.
            </p>
          </div>
          <button
            type="button"
            className={purchaseStyles.reviewCloseBtn}
            onClick={() => {
              if (!submitting) onClose();
            }}
            disabled={submitting}
            aria-label="Close review dialog"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path
                d="M4 4l8 8M12 4l-8 8"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        <div className={purchaseStyles.reviewBody}>
          {loadingExisting ? (
            <p className={purchaseStyles.reviewHint} style={{ marginTop: 4 }}>
              Loading your previous ratings…
            </p>
          ) : loadError ? (
            <p className={purchaseStyles.reviewError}>{loadError}</p>
          ) : (
            <>
              {reviewItems.map((item, idx) => {
                const hit = draft.find((d) => String(d.orderItemId) === String(item.orderItemId));
                const rating = hit?.rating ?? 0;
                const reviewText = hit?.reviewText ?? '';
                const noun = reviewKindNoun(item.kind);
                const reviewCount = reviewText.length;

                return (
                  <div key={item.orderItemId}>
                    {idx > 0 ? <div className={purchaseStyles.reviewSectionDivider} /> : null}

                    <div className={purchaseStyles.reviewSection}>
                      <label className={purchaseStyles.reviewFieldLabel}>Your Rating</label>
                      <StarCardPicker
                        value={rating}
                        disabled={submitting}
                        onChange={(v) =>
                          setDraft((prev) =>
                            prev.map((x) =>
                              x.orderItemId === item.orderItemId ? { ...x, rating: v } : x,
                            ),
                          )
                        }
                      />
                    </div>

                    <div className={purchaseStyles.reviewSection}>
                      <label className={purchaseStyles.reviewFieldLabel}>{noun} Name</label>
                      <div className={purchaseStyles.reviewItemName} aria-readonly="true">
                        <span className={purchaseStyles.reviewItemNameText} title={item.label}>
                          {item.label}
                        </span>
                      </div>
                    </div>

                    <div className={purchaseStyles.reviewSection}>
                      <label
                        className={purchaseStyles.reviewFieldLabel}
                        htmlFor={`review-text-${item.orderItemId}`}
                      >
                        {noun} Review
                        <span className={purchaseStyles.reviewFieldLabelOptional}>(Optional)</span>
                      </label>
                      <div className={purchaseStyles.reviewTextareaWrap}>
                        <textarea
                          id={`review-text-${item.orderItemId}`}
                          className={purchaseStyles.reviewTextarea}
                          value={reviewText}
                          onChange={(e) =>
                            setDraft((prev) =>
                              prev.map((x) =>
                                x.orderItemId === item.orderItemId
                                  ? { ...x, reviewText: e.target.value.slice(0, REVIEW_MAX_CHARS) }
                                  : x,
                              ),
                            )
                          }
                          placeholder="Provide a detailed review..."
                          rows={4}
                          maxLength={REVIEW_MAX_CHARS}
                          disabled={submitting}
                        />
                        <span className={purchaseStyles.reviewCharCount} aria-live="polite">
                          {reviewCount}/{REVIEW_MAX_CHARS}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
              {submitError ? <p className={purchaseStyles.reviewError}>{submitError}</p> : null}
              {reviewItems.length > 1 ? (
                <p className={purchaseStyles.reviewHint}>
                  You can rate one or more items now, then update or add the rest later.
                </p>
              ) : null}
            </>
          )}
        </div>

        <div className={purchaseStyles.reviewActions}>
          <button
            ref={cancelBtnRef}
            type="button"
            className={purchaseStyles.reviewCancelBtn}
            onClick={onClose}
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            type="button"
            className={purchaseStyles.reviewSubmitBtn}
            onClick={handleSubmit}
            disabled={submitting || loadingExisting || reviewItems.length === 0}
          >
            {submitting ? 'Submitting\u2026' : 'Submit'}
          </button>
        </div>
      </div>
    </div>
  );
}

/** @param {{ purchase: object, cancellingOrderId: string | null }} props */
function PurchaseCard({ purchase, cancellingOrderId }) {
  const [expanded, setExpanded] = useState(false);
  const cfg = STATUS_CONFIG[purchase.status] ?? STATUS_CONFIG.Pending;

  const cancelling = cancellingOrderId === purchase.rawOrderId;
  const detail = purchase.detail || {};

  return (
    <div className={purchaseStyles.card}>
      <div className={purchaseStyles.cardHeader}>
        <div className={purchaseStyles.cardTop}>
          <div className={purchaseStyles.cardInfo}>
            <span className={purchaseStyles.orderId}>{purchase.id}</span>
            <h3 className={purchaseStyles.serviceName}>{purchase.service}</h3>
            <span className={purchaseStyles.providerName}>{purchase.provider}</span>
            {purchase.isMultiItemCheckout && purchase.checkoutSiblingCount > 0 ? (
              <span className={purchaseStyles.checkoutBundleHint}>
                Paid in one checkout with {purchase.checkoutSiblingCount} other listing
                {purchase.checkoutSiblingCount === 1 ? '' : 's'}
              </span>
            ) : null}
          </div>
          <div className={purchaseStyles.badgeColumn}>
            <span
              className={purchaseStyles.statusBadge}
              style={{ color: cfg.color, background: cfg.bg }}
            >
              {purchase.status}
            </span>
            {purchase.statusDetail ? (
              <span className={purchaseStyles.statusDetail}>{purchase.statusDetail}</span>
            ) : null}
          </div>
        </div>
        <div className={purchaseStyles.paymentSubline}>{purchase.paymentMethodLine}</div>

        <div className={purchaseStyles.cardMeta}>
          <span className={purchaseStyles.metaItem}>
            <span className={purchaseStyles.metaLabel}>Booked</span>
            {formatPurchaseDate(purchase.bookedDate)}
          </span>
          <span className={purchaseStyles.metaDot} />
          <span className={purchaseStyles.metaItem}>
            <span className={purchaseStyles.metaLabel}>Scheduled</span>
            {formatPurchaseDate(purchase.scheduledDate)}
          </span>
          <span className={purchaseStyles.metaDot} />
          <span className={purchaseStyles.price}>{purchase.formattedTotal}</span>
        </div>
      </div>

      {expanded && (
        <div className={purchaseStyles.cardDetails}>
          <p className={purchaseStyles.detailsHeading}>Included in this package</p>
          <ul className={purchaseStyles.itemsList}>
            {purchase.itemsDetailed.map((row, i) => (
              <li key={i} className={purchaseStyles.itemsListItem}>
                {row.line}
                {row.subtotal ? (
                  <span className={purchaseStyles.itemPrice}> {row.subtotal}</span>
                ) : null}
              </li>
            ))}
          </ul>

          {(detail.serviceLocation ||
            detail.contactName ||
            detail.contactEmail ||
            detail.contactPhone) && (
            <>
              <p className={purchaseStyles.detailsHeading}>Booking / contact</p>
              <dl className={purchaseStyles.detailGrid}>
                {detail.serviceLocation ? (
                  <>
                    <dt>Service location</dt>
                    <dd>{detail.serviceLocation}</dd>
                  </>
                ) : null}
                {detail.contactName ? (
                  <>
                    <dt>Contact name</dt>
                    <dd>{detail.contactName}</dd>
                  </>
                ) : null}
                {detail.contactEmail ? (
                  <>
                    <dt>Email</dt>
                    <dd>{detail.contactEmail}</dd>
                  </>
                ) : null}
                {detail.contactPhone ? (
                  <>
                    <dt>Phone</dt>
                    <dd>{detail.contactPhone}</dd>
                  </>
                ) : null}
              </dl>
            </>
          )}

          {(detail.deceasedName || detail.dateOfDeath || detail.wakeDurationDays != null) && (
            <>
              <p className={purchaseStyles.detailsHeading}>Service details</p>
              <dl className={purchaseStyles.detailGrid}>
                {detail.deceasedName ? (
                  <>
                    <dt>Deceased</dt>
                    <dd>{detail.deceasedName}</dd>
                  </>
                ) : null}
                {detail.dateOfDeath ? (
                  <>
                    <dt>Date of death</dt>
                    <dd>{formatPurchaseDate(detail.dateOfDeath)}</dd>
                  </>
                ) : null}
                {detail.wakeDurationDays != null && detail.wakeDurationDays !== '' ? (
                  <>
                    <dt>Wake duration</dt>
                    <dd>{String(detail.wakeDurationDays)} days</dd>
                  </>
                ) : null}
              </dl>
            </>
          )}

          {detail.notes ? (
            <>
              <p className={purchaseStyles.detailsHeading}>Notes</p>
              <p className={purchaseStyles.detailNotes}>{detail.notes}</p>
            </>
          ) : null}
        </div>
      )}

      <div className={purchaseStyles.cardActions}>
        <button
          type="button"
          className={purchaseStyles.actionLink}
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? 'Hide details' : 'View details'}
        </button>

        <button
          type="button"
          className={purchaseStyles.actionLink}
          disabled={!purchase.canDownloadReceipt}
          onClick={() =>
            purchase.onDownloadReceipt?.(purchase.rawOrderId, purchase.id)
          }
        >
          Download receipt
        </button>

        {purchase.status === 'Completed' ? (
          <button type="button" className={purchaseStyles.actionLink} onClick={() => purchase.onLeaveReview?.(purchase)}>
            {purchase.hasExistingReview ? 'Edit review' : 'Leave a review'}
          </button>
        ) : null}

        {purchase.showOpenDispute ? (
          <button
            type="button"
            className={purchaseStyles.actionLink}
            onClick={() => purchase.onOpenDispute?.(purchase)}
          >
            Request help
          </button>
        ) : null}

        {purchase.showCancelPurchase ? (
          <button
            type="button"
            className={`${purchaseStyles.actionLink} ${purchaseStyles.actionDanger}`}
            disabled={!purchase.canSubmitCancelPurchase || cancelling}
            title={purchase.cancelPurchaseHint ?? undefined}
            onClick={() =>
              purchase.onRequestCancel?.(purchase.rawOrderId, Boolean(purchase.cancelShowsRefundDisclaimer))
            }
          >
            {cancelling ? 'Cancelling…' : 'Cancel purchase'}
          </button>
        ) : null}
      </div>
    </div>
  );
}

export default function PurchasesPage() {
  const { user } = useProfile();
  const toast = useToast();
  const router = useRouter();
  /** `undefined` until `getUserRole` resolves — avoids a one-frame buyer skeleton for sellers. */
  const [isSeller, setIsSeller] = useState(undefined);
  const [activeFilter, setActiveFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [loadingPurchases, setLoadingPurchases] = useState(true);
  const [refreshingPurchases, setRefreshingPurchases] = useState(false);
  const [purchases, setPurchases] = useState([]);
  const [refreshNonce, setRefreshNonce] = useState(0);
  const hasLoadedPurchasesRef = useRef(false);
  const lastRefreshAtRef = useRef(0);
  const lastLoadedUserIdRef = useRef(null);

  const [cancellingOrderId, setCancellingOrderId] = useState(null);
  const [cancelConfirmRawOrderId, setCancelConfirmRawOrderId] = useState(null);
  const [cancelShowsRefundDisclaimer, setCancelShowsRefundDisclaimer] = useState(false);
  const [cancelResultMessage, setCancelResultMessage] = useState('');
  const [cancelResultOpen, setCancelResultOpen] = useState(false);
  const [checkoutPayBanner, setCheckoutPayBanner] = useState('');

  const [leaveReviewOpen, setLeaveReviewOpen] = useState(false);
  const [leaveReviewOrder, setLeaveReviewOrder] = useState(null);

  const [disputeModalPurchase, setDisputeModalPurchase] = useState(null);
  const [disputeSubmitting, setDisputeSubmitting] = useState(false);

  const bumpRefresh = useCallback(() => {
    setRefreshNonce((n) => n + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function check() {
      if (!user) {
        setIsSeller(false);
        return;
      }
      const role = await getUserRole(user.id);
      if (cancelled) return;
      setIsSeller(role === ROLE_SELLER);
    }
    check();
    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    if (!user || isSeller) return;
    try {
      const msg = sessionStorage.getItem('lv_checkout_pay_error');
      if (msg) {
        sessionStorage.removeItem('lv_checkout_pay_error');
        queueMicrotask(() => setCheckoutPayBanner(msg));
      }
    } catch {
      // ignore
    }
  }, [user, isSeller]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const currentUserId = user?.id ?? null;
      const userChanged = currentUserId !== lastLoadedUserIdRef.current;
      if (userChanged) {
        hasLoadedPurchasesRef.current = false;
        lastRefreshAtRef.current = 0;
        lastLoadedUserIdRef.current = currentUserId;
      }

      if (!user) {
        if (!cancelled) setLoadingPurchases(false);
        return;
      }
      if (isSeller !== false) {
        return;
      }
      const shouldBlock = !hasLoadedPurchasesRef.current;
      if (shouldBlock) {
        setLoadingPurchases(true);
      } else {
        setRefreshingPurchases(true);
      }
      try {
        const { data: orders, error: ordersErr } = await supabase
          .from('orders')
          .select(
            [
              'id',
              'order_number',
              'seller_user_id',
              'fulfillment_status',
              'payment_status',
              'status',
              'subtotal',
              'currency',
              'created_at',
              'preferred_date',
              'contact_name',
              'contact_email',
              'contact_phone',
              'notes',
              'service_location',
              'deceased_name',
              'date_of_death',
              'wake_duration_days',
              'refund_status',
              'refund_requested_at',
            ].join(','),
          )
          .eq('buyer_id', user.id)
          .order('created_at', { ascending: false });

        if (ordersErr || cancelled) {
          if (!cancelled) setPurchases([]);
          return;
        }

        const orderIds = (orders ?? []).map((o) => o.id);
        const { data: items, error: itemsErr } = orderIds.length
          ? await supabase
              .from('order_items')
              .select('id,order_id,product_id,name,quantity,price')
              .in('order_id', orderIds)
          : { data: [], error: null };

        const { data: reviewRows } = orderIds.length
          ? await supabase
              .from('order_item_reviews')
              .select('order_id,order_item_id')
              .eq('buyer_id', user.id)
              .in('order_id', orderIds)
          : { data: [], error: null };

        // Debug: if items are empty, RLS policy on order_items may be missing.
        // Fix: run the buyer_select_own_order_items RLS policy in Supabase SQL editor.
        if (process.env.NODE_ENV !== 'production') {
          console.log('[purchases] order_items fetched:', items?.length ?? 0, itemsErr ?? 'no error');
        }

        const itemsByOrder = new Map();
        for (const it of items ?? []) {
          const list = itemsByOrder.get(it.order_id) ?? [];
          list.push(it);
          itemsByOrder.set(it.order_id, list);
        }

        const reviewedItemIdsByOrder = new Map();
        for (const row of reviewRows ?? []) {
          const oid = String(row?.order_id ?? '').trim();
          const itemId = String(row?.order_item_id ?? '').trim();
          if (!oid || !itemId) continue;
          const set = reviewedItemIdsByOrder.get(oid) ?? new Set();
          set.add(itemId);
          reviewedItemIdsByOrder.set(oid, set);
        }

        /** @type {Record<string, string | null>} */
        let nameMap = {};
        const sellerIds = [...new Set((orders ?? []).map((o) => o.seller_user_id).filter(Boolean))];

        if (sellerIds.length > 0 && !cancelled) {
          try {
            const namesRes = await fetch('/api/profile/purchases/seller-names', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ sellerUserIds: sellerIds }),
            });
            if (namesRes.ok) {
              const body = await namesRes.json();
              nameMap = body?.names && typeof body.names === 'object' ? body.names : {};
            }
          } catch {
            nameMap = {};
          }
        }

        /** Resolve `listing_kind` for each purchased listing so the review modal can pick "Service Name" vs "Product Name". */
        const listingIdByItemId = new Map();
        const listingIdSet = new Set();
        for (const it of items ?? []) {
          const lid = listingIdFromOrderItemProductId(it.product_id);
          if (lid) {
            listingIdByItemId.set(String(it.id), lid);
            listingIdSet.add(lid);
          }
        }

        /** @type {Record<string, string | null>} */
        let kindByListingId = {};
        if (listingIdSet.size > 0 && !cancelled) {
          try {
            const kindsRes = await fetch('/api/profile/purchases/listing-kinds', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ listingIds: [...listingIdSet] }),
            });
            if (kindsRes.ok) {
              const kbody = await kindsRes.json();
              kindByListingId = kbody?.kinds && typeof kbody.kinds === 'object' ? kbody.kinds : {};
            }
          } catch {
            kindByListingId = {};
          }
        }

        if (cancelled) return;

        const itemsByOrderWithKind = new Map();
        for (const [orderId, list] of itemsByOrder.entries()) {
          itemsByOrderWithKind.set(
            orderId,
            list.map((it) => {
              const lid = listingIdByItemId.get(String(it.id));
              return { ...it, listing_kind: lid ? kindByListingId[lid] ?? null : null };
            }),
          );
        }

        const flattened = [];
        for (const o of orders ?? []) {
          const orderItems = itemsByOrderWithKind.get(o.id) ?? [];
          const dn = nameMap[o.seller_user_id];
          const card = mapBuyerOrderCard(o, orderItems, dn ?? undefined);
          const reviewedSet = reviewedItemIdsByOrder.get(String(o.id)) ?? new Set();
          flattened.push(...expandPurchaseCardsByLineItem(card, orderItems, reviewedSet));
        }

        if (!cancelled) {
          setPurchases(flattened);
        }
      } finally {
        if (!cancelled) {
          setLoadingPurchases(false);
          setRefreshingPurchases(false);
          hasLoadedPurchasesRef.current = true;
          lastRefreshAtRef.current = Date.now();
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [user, isSeller, refreshNonce]);

  useEffect(() => {
    if (typeof document === 'undefined' || !user || isSeller) return undefined;
    const onVis = () => {
      if (document.visibilityState !== 'visible') return;
      const now = Date.now();
      const MIN_REFRESH_INTERVAL_MS = 45_000;
      if (now - lastRefreshAtRef.current < MIN_REFRESH_INTERVAL_MS) return;
      bumpRefresh();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [user, isSeller, bumpRefresh]);

  useEffect(() => {
    queueMicrotask(() => setCurrentPage(1));
  }, [activeFilter, search]);

  const handleDownloadReceipt = useCallback(async (rawOrderId, displayOrderId) => {
    try {
      const res = await fetch(
        `/api/profile/purchases/receipt?orderId=${encodeURIComponent(rawOrderId)}&format=pdf`,
      );
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        window.alert(typeof body?.error === 'string' ? body.error : 'Could not download receipt.');
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const cd = res.headers.get('Content-Disposition');
      const m = cd && cd.match(/filename="([^"]+)"/);
      a.download = m ? m[1] : `receipt-${displayOrderId}.pdf`;
      a.rel = 'noopener';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      window.alert('Could not download receipt.');
    }
  }, []);

  const openLeaveReview = useCallback((purchase) => {
    if (process.env.NODE_ENV !== 'production') {
      console.log('[openLeaveReview]', {
        rawOrderId: purchase?.rawOrderId,
        orderItemsForReview: purchase?.orderItemsForReview,
      });
    }

    if (!purchase?.rawOrderId || !Array.isArray(purchase.orderItemsForReview)) return;

    const validItems = purchase.orderItemsForReview.filter((x) => x?.orderItemId && x?.label);
    if (validItems.length === 0) {
      console.warn(
        '[openLeaveReview] No valid orderItemsForReview — ensure the buyer_select_own_order_items '
        + 'RLS policy exists on public.order_items in Supabase.',
      );
      return;
    }

    setLeaveReviewOrder({
      rawOrderId: purchase.rawOrderId,
      displayOrderId: purchase.id,
      orderItems: purchase.orderItemsForReview,
      hasExistingReview: Boolean(purchase.hasExistingReview),
    });
    setLeaveReviewOpen(true);
  }, []);

  const confirmCancelBooking = useCallback(async () => {
    if (!cancelConfirmRawOrderId) return;
    setCancellingOrderId(cancelConfirmRawOrderId);
    try {
      const res = await fetch('/api/buyer/orders/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: cancelConfirmRawOrderId }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        toast.error(
          typeof body?.error === 'string'
            ? body.error
            : 'Unable to cancel this purchase. Please try again.',
        );
        return;
      }
      if (body?.mode === 'refund_requested') {
        setCancelResultMessage(
          (typeof body?.message === 'string' ? String(body.message) : '')
            || 'Your purchase has been cancelled and a refund request has been submitted. Once approved by the provider, refunds typically arrive within 5 to 15 business days, depending on your bank or e-wallet.',
        );
        setCancelResultOpen(true);
      } else {
        toast.success('Purchase cancelled.');
      }
      setCancelConfirmRawOrderId(null);
      setCancelShowsRefundDisclaimer(false);
      bumpRefresh();
    } finally {
      setCancellingOrderId(null);
    }
  }, [cancelConfirmRawOrderId, bumpRefresh, toast]);

  const cancelConfirmLabel = useMemo(() => {
    if (!cancelConfirmRawOrderId) return '';
    const p = purchases.find((x) => x.rawOrderId === cancelConfirmRawOrderId);
    return p?.id ? String(p.id) : '';
  }, [cancelConfirmRawOrderId, purchases]);

  const submitDispute = useCallback(
    async ({ reason, description }) => {
      const rawOrderId = disputeModalPurchase?.rawOrderId;
      if (!rawOrderId) return;
      setDisputeSubmitting(true);
      try {
        const res = await fetch('/api/buyer/disputes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderId: rawOrderId, reason, description }),
        });
        const body = await res.json().catch(() => null);
        if (!res.ok) {
          toast.error(
            typeof body?.error === 'string'
              ? body.error
              : 'Unable to submit your request. Please try again.',
          );
          return;
        }
        toast.success('Your request has been submitted. Our support team will respond shortly.');
        setDisputeModalPurchase(null);
        bumpRefresh();
      } finally {
        setDisputeSubmitting(false);
      }
    },
    [disputeModalPurchase, bumpRefresh, toast],
  );

  if (isSeller === true) {
    return (
      <div className={styles.profileCard}>
        <div className={styles.profileAccentBar} />
        <header className={styles.profileHeader}>
          <div className={styles.profileHeaderLeft}>
            <p className={styles.profileEyebrow}>Purchases</p>
            <p className={styles.profileSignedIn}>Seller accounts cannot view buyer purchase history.</p>
          </div>
        </header>
        <div className={purchaseStyles.purchasesBody} style={{ padding: '32px 28px' }}>
          <button className={styles.primaryButton} type="button" onClick={() => router.push('/')}>Back to homepage</button>
        </div>
      </div>
    );
  }

  if (isSeller === undefined || (!isSeller && loadingPurchases)) {
    return (
      <div
        className={styles.profileCard}
        aria-busy="true"
        aria-describedby="profile-purchases-skel-hint"
      >
        <p id="profile-purchases-skel-hint" role="status" className={styles.visuallyHidden}>
          Loading your purchases. Search, filters, and order cards will appear shortly.
        </p>
        <div className={styles.profileAccentBar} />
        <header className={`${styles.profileHeader} ${purchaseStyles.desktopOnlyHeader}`} aria-hidden="true">
          <div className={styles.profileHeaderLeft}>
            <div className={`${styles.skBlock} ${styles.skPurchHeaderTitle}`} />
            <div className={`${styles.skBlock} ${styles.skLayoutSub} ${styles.skPurchHeaderSub}`} />
          </div>
        </header>
        <div className={purchaseStyles.purchasesBody}>
          <div className={purchaseStyles.toolbar} aria-hidden="true">
            <div className={`${styles.skBlock} ${styles.skPurchSearch}`} />
            <div className={styles.skPurchFilters}>
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className={`${styles.skBlock} ${styles.skPurchFilterPill} ${i % 2 ? styles.skPurchFilterPillAlt : ''}`}
                />
              ))}
            </div>
          </div>
          <div className={`${styles.skBlock} ${styles.skPurchMeta}`} />
          <div className={purchaseStyles.cardList}>
            {['p1', 'p2', 'p3'].map((k) => (
              <PurchaseCardSkeleton key={k} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const filtered = purchases.filter((p) => {
    const matchStatus = purchaseMatchesFilter(p, activeFilter);
    const q = search.toLowerCase();
    const provider = String(p.provider || '').toLowerCase();
    const matchSearch =
      !q ||
      String(p.service).toLowerCase().includes(q) ||
      provider.includes(q) ||
      String(p.id).toLowerCase().includes(q);
    return matchStatus && matchSearch;
  });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <div className={styles.profileCard}>
      <div className={styles.profileAccentBar} />
      <header className={`${styles.profileHeader} ${purchaseStyles.desktopOnlyHeader}`}>
        <div className={styles.profileHeaderLeft}>
          <p className={styles.profileEyebrow}>My Purchases</p>
          <p className={styles.profileSignedIn}>Review your previous and upcoming service bookings.</p>
        </div>
      </header>
      <div className={purchaseStyles.purchasesBody}>
        <div className={purchaseStyles.toolbar}>
          <div className={purchaseStyles.searchWrapper}>
            <svg className={purchaseStyles.searchIcon} viewBox="0 0 20 20" fill="none">
              <circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="1.6" />
              <path d="M14 14l3 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
            <input type="text" className={purchaseStyles.searchInput} placeholder="Search by listing, provider, or order ID…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className={purchaseStyles.filters}>
            {PURCHASE_FILTER_TABS.map((s) => (
              <button key={s} type="button" className={`${purchaseStyles.filterBtn} ${activeFilter === s ? purchaseStyles.filterBtnActive : ''}`} onClick={() => setActiveFilter(s)}>{s}</button>
            ))}
          </div>
        </div>
        {refreshingPurchases ? (
          <div className={purchaseStyles.paginationMeta} aria-live="polite">
            Refreshing purchases…
          </div>
        ) : null}
        {checkoutPayBanner ? (
          <div className={`${purchaseStyles.payErrorBanner} ${purchaseStyles.payErrorBannerDismissRow}`} role="alert">
            <p style={{ margin: 0, flex: 1 }}>{checkoutPayBanner}</p>
            <button type="button" className={purchaseStyles.payErrorDismiss} onClick={() => setCheckoutPayBanner('')}>
              Dismiss
            </button>
          </div>
        ) : null}
        {filtered.length === 0 ? (
          <div className={purchaseStyles.emptyState}>
            <p className={purchaseStyles.emptyText}>{search || activeFilter !== 'All' ? 'No purchases match your filter.' : 'Your purchases will appear here once you place an order.'}</p>
          </div>
        ) : (
          <>
            <div className={purchaseStyles.paginationMeta}>Showing {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filtered.length)} of {filtered.length} {filtered.length === 1 ? 'listing' : 'listings'}</div>
            <div className={purchaseStyles.cardList}>
              {paginated.map((p) => (
                <PurchaseCard
                  key={p.listRowKey ?? p.rawOrderId}
                  cancellingOrderId={cancellingOrderId}
                  purchase={{
                    ...p,
                    onDownloadReceipt: handleDownloadReceipt,
                    onRequestCancel: (id, showsRefundDisclaimer = false) => {
                      setCancelConfirmRawOrderId(id);
                      setCancelShowsRefundDisclaimer(Boolean(showsRefundDisclaimer));
                    },
                    onOpenDispute: (row) => setDisputeModalPurchase(row),
                    onLeaveReview: openLeaveReview,
                  }}
                />
              ))}
            </div>
            <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
          </>
        )}
      </div>

      <CancelBookingModal
        open={Boolean(cancelConfirmRawOrderId)}
        orderLabel={cancelConfirmLabel}
        showsPaidRefundDisclaimer={cancelShowsRefundDisclaimer}
        onClose={() => {
          if (cancellingOrderId) return;
          setCancelConfirmRawOrderId(null);
          setCancelShowsRefundDisclaimer(false);
        }}
        onConfirm={confirmCancelBooking}
        confirming={Boolean(cancellingOrderId)}
      />

      <LeaveReviewModal
        open={leaveReviewOpen}
        orderId={leaveReviewOrder?.rawOrderId ?? ''}
        orderItems={leaveReviewOrder?.orderItems ?? []}
        onClose={() => {
          if (leaveReviewOpen) {
            setLeaveReviewOpen(false);
            setLeaveReviewOrder(null);
          }
        }}
        onSubmitted={() => {
          toast.success(
            leaveReviewOrder?.hasExistingReview
              ? 'Review updated successfully.'
              : 'Review submitted successfully.',
          );
          setLeaveReviewOpen(false);
          setLeaveReviewOrder(null);
          bumpRefresh();
        }}
      />

      <OpenDisputeModal
        open={Boolean(disputeModalPurchase)}
        rawOrderId={disputeModalPurchase?.rawOrderId ?? ''}
        onClose={() => {
          if (disputeSubmitting) return;
          setDisputeModalPurchase(null);
        }}
        onSubmit={submitDispute}
        submitting={disputeSubmitting}
      />

      <InfoModal
        open={cancelResultOpen}
        title="Refund requested"
        message={cancelResultMessage}
        buttonLabel="Got it"
        onClose={() => {
          setCancelResultOpen(false);
          setCancelResultMessage('');
        }}
      />
    </div>
  );
}
