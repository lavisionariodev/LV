'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useProfile } from '@/contexts/ProfileContext';
import { getUserRole, ROLE_SELLER } from '@/lib/auth/roles';
import { supabase } from '@/lib/supabase/client';
import { expandPurchaseCardsByLineItem, mapBuyerOrderCard } from '@/lib/profile/mapBuyerOrderCard';
import styles from '../profile.module.css';
import purchaseStyles from './purchases.module.css';
import { PurchasesTabSkeleton } from '../components/ProfileTabSkeletons';

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
  return purchase.status === filterLabel;
}
const PAGE_SIZE = 5;

const STATUS_CONFIG = {
  Pending: { color: '#A8894A', bg: 'rgba(168,137,74,0.10)' },
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

function StarPicker({ value, onChange, size = 22 }) {
  const rating = Number.isFinite(Number(value)) ? Number(value) : 0;
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
  );
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
  );
}

function LeaveReviewModal({
  open,
  orderId,
  orderLabel,
  orderItems,
  onClose,
  onSubmitted,
}) {
  const backdropRef = useRef(null);
  const keepBtnRef = useRef(null);

  const safeOrderId = String(orderId ?? '').trim();

  if (open && safeOrderId) {
    console.log('[LeaveReviewModal] orderId prop:', orderId, 'safeOrderId:', safeOrderId, 'length:', safeOrderId.length);
  }

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
    queueMicrotask(() => keepBtnRef.current?.focus?.());

    function onKeyDown(e) {
      if (e.key === 'Escape') {
        if (!submitting) onClose();
        return;
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
                const hit = draft.find((d) => String(d.orderItemId) === String(item.orderItemId));
                const rating = hit?.rating ?? 0;
                const reviewText = hit?.reviewText ?? '';

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
                );
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
              setSubmitError('');
              if (!hasAtLeastOneRating) {
                setSubmitError('Please select a rating (1–5 stars) for at least one service.');
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
            }}
            disabled={submitting || loadingExisting || reviewItems.length === 0}
          >
            {submitting ? 'Submitting…' : 'Submit'}
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
  const router = useRouter();
  /** `undefined` until `getUserRole` resolves — avoids a one-frame buyer skeleton for sellers. */
  const [isSeller, setIsSeller] = useState(undefined);
  const [activeFilter, setActiveFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [loadingPurchases, setLoadingPurchases] = useState(true);
  const [purchases, setPurchases] = useState([]);
  const [refreshNonce, setRefreshNonce] = useState(0);

  const [cancellingOrderId, setCancellingOrderId] = useState(null);
  const [cancelConfirmRawOrderId, setCancelConfirmRawOrderId] = useState(null);
  const [cancelShowsRefundDisclaimer, setCancelShowsRefundDisclaimer] = useState(false);
  const [cancelResultMessage, setCancelResultMessage] = useState('');
  const [cancelResultOpen, setCancelResultOpen] = useState(false);
  const [checkoutPayBanner, setCheckoutPayBanner] = useState('');

  const [leaveReviewOpen, setLeaveReviewOpen] = useState(false);
  const [leaveReviewOrder, setLeaveReviewOrder] = useState(null);

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
      if (!user) {
        if (!cancelled) setLoadingPurchases(false);
        return;
      }
      if (isSeller !== false) {
        return;
      }
      setLoadingPurchases(true);
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

        if (cancelled) return;

        const flattened = [];
        for (const o of orders ?? []) {
          const orderItems = itemsByOrder.get(o.id) ?? [];
          const dn = nameMap[o.seller_user_id];
          const card = mapBuyerOrderCard(o, orderItems, dn ?? undefined);
          const reviewedSet = reviewedItemIdsByOrder.get(String(o.id)) ?? new Set();
          flattened.push(...expandPurchaseCardsByLineItem(card, orderItems, reviewedSet));
        }

        if (!cancelled) {
          setPurchases(flattened);
        }
      } finally {
        if (!cancelled) setLoadingPurchases(false);
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
      if (document.visibilityState === 'visible') bumpRefresh();
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
        window.alert(typeof body?.error === 'string' ? body.error : 'Could not cancel purchase.');
        return;
      }
      if (body?.mode === 'refund_requested') {
        setCancelResultMessage(
          (typeof body?.message === 'string' ? String(body.message) : '')
            || 'Purchase cancelled and refund requested. After the provider approves, refunds usually arrive in about 5-15 business days, depending on your bank or e-wallet.',
        );
        setCancelResultOpen(true);
      }
      setCancelConfirmRawOrderId(null);
      setCancelShowsRefundDisclaimer(false);
      bumpRefresh();
    } finally {
      setCancellingOrderId(null);
    }
  }, [cancelConfirmRawOrderId, bumpRefresh]);

  const cancelConfirmLabel = useMemo(() => {
    if (!cancelConfirmRawOrderId) return '';
    const p = purchases.find((x) => x.rawOrderId === cancelConfirmRawOrderId);
    return p?.id ? String(p.id) : '';
  }, [cancelConfirmRawOrderId, purchases]);

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
    return <PurchasesTabSkeleton />;
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
        orderLabel={leaveReviewOrder?.displayOrderId ? `#${leaveReviewOrder.displayOrderId}` : ''}
        orderItems={leaveReviewOrder?.orderItems ?? []}
        onClose={() => {
          if (leaveReviewOpen) {
            setLeaveReviewOpen(false);
            setLeaveReviewOrder(null);
          }
        }}
        onSubmitted={() => {
          setLeaveReviewOpen(false);
          setLeaveReviewOrder(null);
          bumpRefresh();
        }}
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
