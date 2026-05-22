'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useProfile } from '@/contexts/ProfileContext';
import { useToast } from '@/contexts/ToastContext';
import { getUserRole, getBuyerAccountStatus, ROLE_BUYER, ROLE_SELLER } from '@/lib/auth/roles';
import { expandPurchaseCardsByLineItem, mapBuyerOrderCard } from '@/lib/profile/mapBuyerOrderCard';
import styles from '../profile.module.css';
import purchaseStyles from './purchases.module.css';
import ReviewMediaUploader from '@/components/reviews/ReviewMediaUploader';

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
    return (
      purchase.status === 'Pending' ||
      purchase.status === 'Active booking' ||
      purchase.status === 'Active order' ||
      purchase.status === 'Awaiting seller'
    );
  }
  if (filterLabel === 'In Progress') {
    return purchase.status === 'In Progress' || purchase.status === 'Out for delivery';
  }
  if (filterLabel === 'Completed') {
    return purchase.status === 'Completed' || purchase.status === 'Delivered';
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
  'Active order': { color: '#0f766e', bg: 'rgba(15,118,110,0.10)' },
  'Awaiting seller': { color: '#A8894A', bg: 'rgba(168,137,74,0.10)' },
  Confirmed: { color: '#204F38', bg: 'rgba(32,79,56,0.10)' },
  'In Progress': { color: '#2563EB', bg: 'rgba(37,99,235,0.09)' },
  'Out for delivery': { color: '#2563EB', bg: 'rgba(37,99,235,0.09)' },
  Completed: { color: '#16a34a', bg: 'rgba(22,163,74,0.10)' },
  Delivered: { color: '#16a34a', bg: 'rgba(22,163,74,0.10)' },
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

/** @param {{ isProductOrder?: boolean, displayLane?: string }} purchase */
function purchaseIsProduct(purchase) {
  return purchase?.displayLane === 'product' || Boolean(purchase?.isProductOrder);
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
 *   isProductOrder?: boolean,
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
  isProductOrder = false,
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
        aria-labelledby="cancel-purchase-title"
        aria-describedby="cancel-purchase-desc"
      >
        <h2 id="cancel-purchase-title" className={purchaseStyles.cancelConfirmTitle}>
          {isProductOrder ? 'Cancel order?' : 'Cancel purchase?'}
        </h2>
        <div id="cancel-purchase-desc" className={purchaseStyles.cancelConfirmBody}>
          {showsPaidRefundDisclaimer ? (
            <>
              {orderLabel ? (
                <p>
                  This will cancel {isProductOrder ? 'order' : 'purchase'}{' '}
                  <strong>{orderLabel}</strong> and submit a refund request to your{' '}
                  {isProductOrder ? 'seller' : 'provider'} for approval.
                </p>
              ) : (
                <p>
                  {isProductOrder
                    ? 'This will cancel your paid order and submit a refund request to the seller for approval.'
                    : 'This will cancel your paid booking and submit a refund request to your provider for approval.'}
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
              {isProductOrder
                ? 'You may add the product back to your cart at any time.'
                : 'You may add the service back to your cart at any time.'}
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

/** Skeleton placeholder matching LeaveReviewModal field layout while existing reviews load. */
function LeaveReviewModalSkeleton({ itemCount = 1 }) {
  const count = Math.max(1, Math.min(6, Number(itemCount) || 1));

  return (
    <div className={purchaseStyles.reviewSkWrap} aria-busy="true" aria-live="polite">
      <p className={styles.visuallyHidden}>Loading your previous ratings…</p>
      {Array.from({ length: count }, (_, idx) => (
        <div key={idx}>
          {idx > 0 ? <div className={purchaseStyles.reviewSectionDivider} /> : null}

          <div className={purchaseStyles.reviewSkSection}>
            <div
              className={`${purchaseStyles.reviewSkBlock} ${purchaseStyles.reviewSkLabel}`}
              aria-hidden="true"
            />
            <div className={purchaseStyles.reviewSkStarRow}>
              {Array.from({ length: 5 }, (_, starIdx) => (
                <div
                  key={starIdx}
                  className={`${purchaseStyles.reviewSkBlock} ${purchaseStyles.reviewSkStar}`}
                  aria-hidden="true"
                />
              ))}
            </div>
          </div>

          <div className={purchaseStyles.reviewSkSection}>
            <div
              className={`${purchaseStyles.reviewSkBlock} ${purchaseStyles.reviewSkLabel} ${purchaseStyles.reviewSkLabelWide}`}
              aria-hidden="true"
            />
            <div
              className={`${purchaseStyles.reviewSkBlock} ${purchaseStyles.reviewSkItemName}`}
              aria-hidden="true"
            />
          </div>

          <div className={purchaseStyles.reviewSkSection}>
            <div
              className={`${purchaseStyles.reviewSkBlock} ${purchaseStyles.reviewSkLabel} ${purchaseStyles.reviewSkLabelWide}`}
              aria-hidden="true"
            />
            <div
              className={`${purchaseStyles.reviewSkBlock} ${purchaseStyles.reviewSkTextarea}`}
              aria-hidden="true"
            />
          </div>

          <div className={purchaseStyles.reviewSkSection}>
            <div
              className={`${purchaseStyles.reviewSkBlock} ${purchaseStyles.reviewSkLabel}`}
              aria-hidden="true"
            />
            <div className={purchaseStyles.reviewSkMediaRow}>
              <div
                className={`${purchaseStyles.reviewSkBlock} ${purchaseStyles.reviewSkMediaBtn}`}
                aria-hidden="true"
              />
              <div
                className={`${purchaseStyles.reviewSkBlock} ${purchaseStyles.reviewSkMediaBtn} ${purchaseStyles.reviewSkMediaBtnWide}`}
                aria-hidden="true"
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

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

  /** @type {Array<{ orderItemId: string, rating: number, reviewText: string, imageUrls: string[], videoUrls: string[] }>} */
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
              imageUrls: Array.isArray(hit?.imageUrls) ? hit.imageUrls.map(String) : [],
              videoUrls: Array.isArray(hit?.videoUrls) ? hit.videoUrls.map(String) : [],
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
          imageUrls: Array.isArray(d.imageUrls) ? d.imageUrls : [],
          videoUrls: Array.isArray(d.videoUrls) ? d.videoUrls : [],
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
            <LeaveReviewModalSkeleton itemCount={reviewItems.length} />
          ) : loadError ? (
            <p className={purchaseStyles.reviewError}>{loadError}</p>
          ) : (
            <>
              {reviewItems.map((item, idx) => {
                const hit = draft.find((d) => String(d.orderItemId) === String(item.orderItemId));
                const rating = hit?.rating ?? 0;
                const reviewText = hit?.reviewText ?? '';
                const imageUrls = hit?.imageUrls ?? [];
                const videoUrls = hit?.videoUrls ?? [];
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

                    <div className={purchaseStyles.reviewSection}>
                      <label className={purchaseStyles.reviewFieldLabel}>
                        Photos &amp; video
                        <span className={purchaseStyles.reviewFieldLabelOptional}>(Optional)</span>
                      </label>
                      <ReviewMediaUploader
                        orderItemId={String(item.orderItemId)}
                        imageUrls={imageUrls}
                        videoUrls={videoUrls}
                        disabled={submitting}
                        onChange={({ imageUrls: nextImages, videoUrls: nextVideos }) =>
                          setDraft((prev) =>
                            prev.map((x) =>
                              x.orderItemId === item.orderItemId
                                ? {
                                    ...x,
                                    imageUrls: nextImages,
                                    videoUrls: nextVideos,
                                  }
                                : x,
                            ),
                          )
                        }
                      />
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

/** @param {{ purchase: object, cancellingOrderId: string | null, payingOrderId: string | null }} props */
function PurchaseCard({ purchase, cancellingOrderId, payingOrderId }) {
  const [expanded, setExpanded] = useState(false);
  const cfg = STATUS_CONFIG[purchase.status] ?? STATUS_CONFIG.Pending;

  const cancelling = cancellingOrderId === purchase.rawOrderId;
  const paying = payingOrderId === purchase.rawOrderId;
  const detail = purchase.detail || {};
  const isProduct = purchaseIsProduct(purchase);
  const hasScheduleDate =
    Boolean(purchase.scheduledDate) &&
    (!isProduct ||
      (purchase.bookedDate &&
        new Date(purchase.scheduledDate).toDateString() !==
          new Date(purchase.bookedDate).toDateString()));

  return (
    <div className={purchaseStyles.card}>
      <div className={purchaseStyles.cardHeader}>
        <div className={purchaseStyles.cardTop}>
          <div className={purchaseStyles.cardInfo}>
            <span className={purchaseStyles.orderId}>{purchase.id}</span>
            <h3 className={purchaseStyles.serviceName}>
              {purchase.service}
              {isProduct ? (
                <span className={purchaseStyles.productKindBadge}>Product</span>
              ) : null}
            </h3>
            <span className={purchaseStyles.providerName}>
              {purchase.providerRoleLabel || (isProduct ? 'Seller' : 'Provider')}: {purchase.provider}
            </span>
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
            <span className={purchaseStyles.metaLabel}>{isProduct ? 'Ordered' : 'Booked'}</span>
            {formatPurchaseDate(purchase.bookedDate)}
          </span>
          {hasScheduleDate ? (
            <>
              <span className={purchaseStyles.metaDot} />
              <span className={purchaseStyles.metaItem}>
                <span className={purchaseStyles.metaLabel}>Scheduled</span>
                {formatPurchaseDate(purchase.scheduledDate)}
              </span>
            </>
          ) : null}
          <span className={purchaseStyles.metaDot} />
          <span className={purchaseStyles.price}>{purchase.formattedTotal}</span>
        </div>
      </div>

      {expanded && (
        <div className={purchaseStyles.cardDetails}>
          <p className={purchaseStyles.detailsHeading}>
            {isProduct ? 'Included in this order' : 'Included in this package'}
          </p>
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
              <p className={purchaseStyles.detailsHeading}>
                {isProduct ? 'Delivery & contact' : 'Booking / contact'}
              </p>
              <dl className={purchaseStyles.detailGrid}>
                {detail.serviceLocation ? (
                  <>
                    <dt>{isProduct ? 'Delivery address' : 'Service location'}</dt>
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

          {!isProduct &&
          (detail.deceasedName || detail.dateOfDeath || detail.wakeDurationDays != null) && (
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

        {purchase.canRetryPayment ? (
          <button
            type="button"
            className={`${purchaseStyles.actionLink} ${purchaseStyles.actionPayNow}`}
            disabled={paying}
            onClick={() => purchase.onPayNow?.(purchase.rawOrderId)}
          >
            {paying ? 'Opening payment…' : 'Pay now'}
          </button>
        ) : null}

        {purchase.canLeaveReview ? (
          <button type="button" className={purchaseStyles.actionLink} onClick={() => purchase.onLeaveReview?.(purchase)}>
            {purchase.hasExistingReview ? 'Edit review' : 'Leave a review'}
          </button>
        ) : null}

        {purchase.disputeStatus ? (
          <span className={purchaseStyles.actionLink} role="status" style={{ cursor: 'default', opacity: 0.85 }}>
            Help request: {String(purchase.disputeStatus).replace(/_/g, ' ')}
          </span>
        ) : purchase.showOpenDispute ? (
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
  const [isBuyerAccount, setIsBuyerAccount] = useState(undefined);
  const [buyerSuspended, setBuyerSuspended] = useState(undefined);
  const [activeFilter, setActiveFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [loadingPurchases, setLoadingPurchases] = useState(true);
  const [refreshingPurchases, setRefreshingPurchases] = useState(false);
  const [purchases, setPurchases] = useState([]);
  const [purchasesLoadError, setPurchasesLoadError] = useState('');
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
  const [payingOrderId, setPayingOrderId] = useState(null);

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
        setIsBuyerAccount(false);
        setBuyerSuspended(false);
        return;
      }
      const [role, account] = await Promise.all([
        getUserRole(user.id),
        getBuyerAccountStatus(user.id),
      ]);
      if (cancelled) return;
      setIsSeller(role === ROLE_SELLER);
      setIsBuyerAccount(role === ROLE_BUYER);
      setBuyerSuspended(account.role !== ROLE_SELLER && account.status === 'suspended');
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
      if (isBuyerAccount !== true) {
        if (!cancelled) setLoadingPurchases(false);
        return;
      }
      if (buyerSuspended !== false) {
        if (!cancelled) setLoadingPurchases(false);
        return;
      }
      const shouldBlock = !hasLoadedPurchasesRef.current;
      if (shouldBlock) {
        setLoadingPurchases(true);
      } else {
        setRefreshingPurchases(true);
      }
      try {
        const ordersRes = await fetch('/api/buyer/orders', { cache: 'no-store' });
        const ordersBody = await ordersRes.json().catch(() => null);
        if (!ordersRes.ok || cancelled) {
          if (!cancelled) {
            const message =
              typeof ordersBody?.error === 'string'
                ? ordersBody.error
                : ordersRes.status === 401
                  ? 'Sign in as a buyer to view your purchases.'
                  : ordersRes.status === 403
                    ? 'Only buyer accounts can view purchase history.'
                    : 'Could not load your purchases. Please try again.';
            setPurchases([]);
            setPurchasesLoadError(message);
            toast.error(message);
          }
          return;
        }

        if (!cancelled) {
          setPurchasesLoadError('');
        }

        const orders = ordersBody?.orders ?? [];
        const items = ordersBody?.items ?? [];
        const reviewedItemIdsByOrder = new Map(
          Object.entries(ordersBody?.reviewedItemIdsByOrder ?? {}).map(([orderId, itemIds]) => [
            orderId,
            new Set(Array.isArray(itemIds) ? itemIds : []),
          ]),
        );

        const itemsByOrder = new Map();
        for (const it of items) {
          const list = itemsByOrder.get(it.order_id) ?? [];
          list.push(it);
          itemsByOrder.set(it.order_id, list);
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

        if (cancelled) return;

        let disputeByOrderId = new Map();
        try {
          const disputeRes = await fetch('/api/buyer/disputes', { cache: 'no-store' });
          const disputeBody = await disputeRes.json().catch(() => null);
          if (disputeRes.ok && Array.isArray(disputeBody?.disputes)) {
            for (const row of disputeBody.disputes) {
              const oid = String(row?.orderId ?? '');
              if (oid && !disputeByOrderId.has(oid)) {
                disputeByOrderId.set(oid, row.status);
              }
            }
          }
        } catch {
          disputeByOrderId = new Map();
        }

        const itemsByOrderWithKind = itemsByOrder;

        const flattened = [];
        for (const o of orders ?? []) {
          const orderItems = itemsByOrderWithKind.get(o.id) ?? [];
          const dn = nameMap[o.seller_user_id];
          const card = mapBuyerOrderCard(
            o,
            orderItems,
            dn ?? undefined,
            disputeByOrderId.get(o.id),
          );
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
  }, [user, isSeller, isBuyerAccount, refreshNonce, buyerSuspended, toast]);

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

  const handlePayNow = useCallback(
    async (rawOrderId) => {
      if (!rawOrderId) return;
      setPayingOrderId(rawOrderId);
      try {
        const res = await fetch('/api/checkout/pay', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderIds: [rawOrderId] }),
        });
        const body = await res.json().catch(() => null);
        if (res.ok && body?.redirect_url) {
          window.location.href = body.redirect_url;
          return;
        }
        toast.error(
          typeof body?.error === 'string'
            ? body.error
            : 'Could not open secure payment. Please try again.',
        );
      } catch {
        toast.error('Network error. Please try again.');
      } finally {
        setPayingOrderId(null);
      }
    },
    [toast],
  );

  const openLeaveReview = useCallback((purchase) => {
    if (!purchase?.canLeaveReview) return;

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

  const cancelConfirmIsProduct = useMemo(() => {
    if (!cancelConfirmRawOrderId) return false;
    const p = purchases.find((x) => x.rawOrderId === cancelConfirmRawOrderId);
    return p ? purchaseIsProduct(p) : false;
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

  if (isBuyerAccount === false) {
    return (
      <div className={styles.profileCard}>
        <div className={styles.profileAccentBar} />
        <header className={styles.profileHeader}>
          <div className={styles.profileHeaderLeft}>
            <p className={styles.profileEyebrow}>Purchases</p>
            <p className={styles.profileSignedIn}>
              Purchase history is available on buyer accounts only.
            </p>
          </div>
        </header>
        <div className={purchaseStyles.purchasesBody} style={{ padding: '32px 28px' }}>
          <button className={styles.primaryButton} type="button" onClick={() => router.push('/')}>
            Back to homepage
          </button>
        </div>
      </div>
    );
  }

  if (buyerSuspended === true) {
    return (
      <div className={styles.profileCard}>
        <div className={styles.profileAccentBar} />
        <header className={styles.profileHeader}>
          <div className={styles.profileHeaderLeft}>
            <p className={styles.profileEyebrow}>Purchases</p>
            <p className={styles.profileSignedIn}>
              Your buyer account has been suspended. Purchase history and actions are unavailable until your
              account is reactivated.
            </p>
          </div>
        </header>
        <div className={purchaseStyles.purchasesBody} style={{ padding: '32px 28px' }}>
          <button className={styles.primaryButton} type="button" onClick={() => router.push('/')}>
            Back to homepage
          </button>
        </div>
      </div>
    );
  }

  if (
    isSeller === undefined ||
    isBuyerAccount === undefined ||
    buyerSuspended === undefined ||
    (!isSeller && isBuyerAccount && loadingPurchases)
  ) {
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
          <p className={styles.profileSignedIn}>
            Track product deliveries and service bookings. Cancel product orders anytime before the seller
            confirms them.
          </p>
        </div>
      </header>
      <div className={purchaseStyles.purchasesBody}>
        <div className={purchaseStyles.toolbar}>
          <div className={purchaseStyles.searchWrapper}>
            <svg className={purchaseStyles.searchIcon} viewBox="0 0 20 20" fill="none">
              <circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="1.6" />
              <path d="M14 14l3 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
            <input type="text" className={purchaseStyles.searchInput} placeholder="Search by product, service, seller, or order ID…" value={search} onChange={(e) => setSearch(e.target.value)} />
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
        {purchasesLoadError ? (
          <div className={`${purchaseStyles.payErrorBanner} ${purchaseStyles.payErrorBannerDismissRow}`} role="alert">
            <p style={{ margin: 0, flex: 1 }}>{purchasesLoadError}</p>
            <button type="button" className={purchaseStyles.payErrorDismiss} onClick={() => bumpRefresh()}>
              Retry
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
                  payingOrderId={payingOrderId}
                  purchase={{
                    ...p,
                    onDownloadReceipt: handleDownloadReceipt,
                    onPayNow: handlePayNow,
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
        isProductOrder={cancelConfirmIsProduct}
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

