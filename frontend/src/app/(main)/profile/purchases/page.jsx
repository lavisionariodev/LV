'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useProfile } from '@/contexts/ProfileContext';
import { getUserRole, ROLE_SELLER } from '@/lib/auth/roles';
import { supabase } from '@/lib/supabase/client';
import { expandPurchaseCardsByLineItem, mapBuyerOrderCard } from '@/lib/profile/mapBuyerOrderCard';
import styles from '../profile.module.css';
import purchaseStyles from './purchases.module.css';
import { PurchaseCard } from './PurchaseCard';
import { CancelBookingModal } from './CancelBookingModal';
import { InfoModal } from './InfoModal';
import { LeaveReviewModal } from './LeaveReviewModal';

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

function Pagination({ currentPage, totalPages, onPageChange }) {
  if (totalPages <= 1) return null;
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);
  return (
    <div className={purchaseStyles.pagination}>
      <button type="button" className={purchaseStyles.pageBtn} onClick={() => onPageChange(currentPage - 1)} disabled={currentPage === 1} aria-label="Previous page">
        <svg viewBox="0 0 16 16" fill="none" width="14" height="14"><path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </button>
      {pages.map(page => (
        <button key={page} type="button" className={`${purchaseStyles.pageBtn} ${page === currentPage ? purchaseStyles.pageBtnActive : ''}`} onClick={() => onPageChange(page)}>{page}</button>
      ))}
      <button type="button" className={purchaseStyles.pageBtn} onClick={() => onPageChange(currentPage + 1)} disabled={currentPage === totalPages} aria-label="Next page">
        <svg viewBox="0 0 16 16" fill="none" width="14" height="14"><path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </button>
    </div>
  );
}

export default function PurchasesPage() {
  const { user } = useProfile();
  const router = useRouter();
  const [isSeller, setIsSeller] = useState(false);
  const [activeFilter, setActiveFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [loadingPurchases, setLoadingPurchases] = useState(false);
  const [purchases, setPurchases] = useState([]);
  const [refreshNonce, setRefreshNonce] = useState(0);

  const [cancellingOrderId, setCancellingOrderId] = useState(null);
  const [cancelConfirmRawOrderId, setCancelConfirmRawOrderId] = useState(null);
  const [cancelShowsRefundDisclaimer, setCancelShowsRefundDisclaimer] = useState(false);
  const [cancelResultMessage, setCancelResultMessage] = useState('');
  const [cancelResultOpen, setCancelResultOpen] = useState(false);
  const [checkoutPayBanner, setCheckoutPayBanner] = useState('');

  const [leaveReviewOpen, setLeaveReviewOpen] = useState(false)
  const [leaveReviewOrder, setLeaveReviewOrder] = useState(null)

  const bumpRefresh = useCallback(() => {
    setRefreshNonce((n) => n + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function check() {
      if (!user) return;
      const role = await getUserRole(user.id);
      if (cancelled) return;
      if (role === ROLE_SELLER) setIsSeller(true);
    }
    check();
    return () => { cancelled = true; };
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
      if (!user) return;
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

    if (!isSeller) load();
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
    // Debug: log what we received so missing fields are easy to spot.
    if (process.env.NODE_ENV !== 'production') {
      console.log('[openLeaveReview]', {
        rawOrderId: purchase?.rawOrderId,
        orderItemsForReview: purchase?.orderItemsForReview,
      });
    }

    if (!purchase?.rawOrderId || !Array.isArray(purchase.orderItemsForReview)) return

    // Guard: if items are present but all have null orderItemId, RLS is still blocking order_items.
    const validItems = purchase.orderItemsForReview.filter((x) => x?.orderItemId && x?.label)
    if (validItems.length === 0) {
      console.warn(
        '[openLeaveReview] No valid orderItemsForReview — ensure the buyer_select_own_order_items ' +
        'RLS policy exists on public.order_items in Supabase.',
      )
      return
    }

    setLeaveReviewOrder({
      rawOrderId: purchase.rawOrderId,
      displayOrderId: purchase.id,
      orderItems: purchase.orderItemsForReview,
    })
    setLeaveReviewOpen(true)
  }, [])

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
          (typeof body?.message === 'string' ? String(body.message) : '') ||
            'Purchase cancelled and refund requested. After the provider approves, refunds usually arrive in about 5-15 business days, depending on your bank or e-wallet.',
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

  if (isSeller) {
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
        {loadingPurchases ? (
          <div className={purchaseStyles.emptyState}>
            <p className={purchaseStyles.emptyText}>Loading your purchases…</p>
          </div>
        ) : filtered.length === 0 ? (
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
            setLeaveReviewOpen(false)
            setLeaveReviewOrder(null)
          }
        }}
        onSubmitted={() => {
          setLeaveReviewOpen(false)
          setLeaveReviewOrder(null)
          bumpRefresh()
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