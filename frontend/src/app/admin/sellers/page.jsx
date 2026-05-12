'use client';

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { BsThreeDots } from 'react-icons/bs';
import { FaRegStar, FaStar } from 'react-icons/fa';
import { FiRotateCcw } from 'react-icons/fi';
import { TbX } from 'react-icons/tb';
import { LuSettings2 } from 'react-icons/lu';
import styles from './sellers.module.css';
import {
  listSellersForAdmin,
  rejectSellerApplication,
  updateSellerPartnersFeatured,
  updateSellerStatus,
} from '@/lib/sellers/client';
import { useToast } from '@/contexts/ToastContext';
import { useMediaQuery } from '@/shared/hooks';
import { Dropdown } from '@/components/ui';
import ConfirmModal from '@/components/ui/Modal/ConfirmModal';
import Image from 'next/image';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useDebouncedEffect } from '@/shared/hooks';
import { readEnum, readString, replaceUrlQuery } from '@/lib/url/queryParams';

const STATUS_FILTER_OPTIONS = [
  { value: 'all', label: 'All statuses', color: 'slate' },
  { value: 'active', label: 'Active', color: 'green' },
  { value: 'pending', label: 'Pending', color: 'amber' },
  { value: 'rejected', label: 'Rejected', color: 'rose' },
  { value: 'suspended', label: 'Suspended', color: 'red' },
];

const MIN_REJECTION_REASON_LENGTH = 12;

const Icon = {
  Search: () => (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
      <path d="M18 18l3.5 3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
};

function SellerAvatar({ name, src }) {
  const [imgError, setImgError] = useState(false);
  const label = name || 'Seller';
  const showImg = typeof src === 'string' && src.trim().length > 0 && !imgError;

  if (showImg) {
    return (
      <Image
        src={src.trim()}
        alt=""
        width={34}
        height={34}
        className={styles.avatar}
        onError={() => setImgError(true)}
        unoptimized
      />
    );
  }

  return (
    <div className={`${styles.avatar} ${styles.avatarDefault}`} title={label} aria-hidden>
      <svg viewBox="0 0 24 24" fill="none" className={styles.avatarIcon}>
        <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.5" />
        <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    </div>
  );
}

function StatusBadge({ status }) {
  return (
    <span className={`${styles.statusBadge} ${styles[`status_${status}`]}`}>
      <span className={styles.statusDot} />
      {status}
    </span>
  );
}

function CommissionBadge({ percentage, isOverride }) {
  return (
    <span className={`${styles.commissionBadge} ${isOverride ? styles.commissionOverride : styles.commissionDefault}`}>
      {percentage}%
      <span className={styles.commissionLabel}>{isOverride ? 'custom' : 'default'}</span>
    </span>
  );
}

function SellerActionsMenu({
  seller,
  sellerId,
  isUpdating,
  onViewDetails,
  onStatusChange,
  onRejectRequest,
  onSuspendRequest,
}) {
  const [open, setOpen] = useState(false);
  const [menuPos, setMenuPos] = useState({ top: 0, right: 0 });
  const wrapRef = useRef(null);
  const triggerRef = useRef(null);

  function placeMenu() {
    const el = triggerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setMenuPos({ top: r.bottom + 6, right: window.innerWidth - r.right });
  }

  useLayoutEffect(() => {
    if (!open) return;
    placeMenu();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function handle(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handle);
    window.addEventListener('scroll', placeMenu, true);
    window.addEventListener('resize', placeMenu);
    return () => {
      document.removeEventListener('mousedown', handle);
      window.removeEventListener('scroll', placeMenu, true);
      window.removeEventListener('resize', placeMenu);
    };
  }, [open]);

  const close = () => setOpen(false);

  return (
    <div className={styles.actionMenuWrap} ref={wrapRef}>
      <button
        ref={triggerRef}
        type="button"
        className={styles.actionMenuTrigger}
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={`Actions for ${seller.business_name || 'seller'}`}
      >
        <BsThreeDots className={styles.actionMenuTriggerIcon} aria-hidden size={16} />
      </button>
      {open && (
        <div
          className={styles.actionMenu}
          role="menu"
          style={{ top: menuPos.top, right: menuPos.right }}
        >
          <button
            type="button"
            role="menuitem"
            className={styles.actionMenuItem}
            onClick={() => {
              onViewDetails();
              close();
            }}
          >
            View details
          </button>
          {seller.status === 'pending' && (
            <>
              <button
                type="button"
                role="menuitem"
                className={`${styles.actionMenuItem} ${styles.actionMenuItemPrimary}`}
                disabled={isUpdating}
                onClick={() => {
                  onStatusChange(sellerId, 'active');
                  close();
                }}
              >
                {isUpdating ? 'Approving…' : 'Approve'}
              </button>
              <button
                type="button"
                role="menuitem"
                className={`${styles.actionMenuItem} ${styles.actionMenuItemDanger}`}
                disabled={isUpdating}
                onClick={() => {
                  onRejectRequest?.(seller);
                  close();
                }}
              >
                Reject application
              </button>
            </>
          )}
          {seller.status === 'rejected' && (
            <button
              type="button"
              role="menuitem"
              className={`${styles.actionMenuItem} ${styles.actionMenuItemPrimary}`}
              disabled={isUpdating}
              onClick={() => {
                onStatusChange(sellerId, 'active');
                close();
              }}
            >
              {isUpdating ? 'Approving…' : 'Approve seller'}
            </button>
          )}
          {seller.status === 'active' && (
            <button
              type="button"
              role="menuitem"
              className={`${styles.actionMenuItem} ${styles.actionMenuItemWarn}`}
              disabled={isUpdating}
              onClick={() => {
                onSuspendRequest?.(sellerId, seller);
                close();
              }}
            >
              {isUpdating ? 'Updating…' : 'Suspend'}
            </button>
          )}
          {seller.status === 'suspended' && (
            <button
              type="button"
              role="menuitem"
              className={`${styles.actionMenuItem} ${styles.actionMenuItemPrimary}`}
              disabled={isUpdating}
              onClick={() => {
                onStatusChange(sellerId, 'active');
                close();
              }}
            >
              {isUpdating ? 'Updating…' : 'Re-activate'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function formatDate(raw) {
  if (!raw) return null;
  try {
    return new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'long', day: 'numeric' }).format(new Date(raw));
  } catch {
    return raw;
  }
}

function DetailRow({ label, value, isLink, href }) {
  return (
    <div className={styles.detailRow}>
      <span className={styles.detailRowLabel}>{label}</span>
      {isLink
        ? <a className={`${styles.detailRowValue} ${styles.detailRowLink}`} href={href}>{value}</a>
        : <span className={styles.detailRowValue}>{value}</span>
      }
    </div>
  );
}

function SellerDetailModal({ seller, onClose }) {
  if (!seller) return null;

  const sellerUuid = seller.user_id || seller.id;
  const shopUsername = typeof seller.username === 'string' ? seller.username.trim() : '';
  const publicProfileHref =
    sellerUuid && shopUsername
      ? `/seller-profile?seller=${encodeURIComponent(sellerUuid)}`
      : sellerUuid
        ? `/seller-profile?seller=${encodeURIComponent(sellerUuid)}`
        : null;
  const specialtiesList = Array.isArray(seller.specialties)
    ? seller.specialties.map((s) => String(s).trim()).filter(Boolean)
    : [];

  const hasContact = seller.contact_name || seller.email || seller.phone;
  const hasShopProfile =
    shopUsername ||
    (seller.tagline && String(seller.tagline).trim()) ||
    (seller.business_type_label && String(seller.business_type_label).trim()) ||
    specialtiesList.length > 0;
  const hasBusiness = seller.address || seller.business_info;
  const hasAccount =
    seller.registered_at ||
    seller.business_started_at ||
    seller.approved_at ||
    seller.listing_count != null;
  const hasDecision =
    seller.status === 'rejected' ||
    (typeof seller.rejection_reason === 'string' && seller.rejection_reason.trim().length > 0);

  return (
    <div className={styles.detailModalOverlay} role="presentation" onClick={onClose}>
      <div
        className={styles.detailModal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="seller-detail-title"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={styles.detailModalHeader}>
          <div className={styles.detailModalHeaderInner}>
            <SellerAvatar name={seller.business_name} src={seller.avatarUrl} />
            <div>
              <h2 id="seller-detail-title" className={styles.detailModalTitle}>
                {seller.business_name || 'Seller details'}
              </h2>
              <div className={styles.detailModalBadges}>
                {seller.status && <StatusBadge status={seller.status} />}
                {seller.partners_featured ? (
                  <span className={styles.detailSpotlightBadge} title="Shown in partners spotlight when enabled">
                    Spotlight
                  </span>
                ) : null}
              </div>
            </div>
          </div>
          <button type="button" className={styles.detailModalClose} onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        {/* Body */}
        <div className={styles.detailModalBody}>

          {hasContact && (
            <div className={styles.detailGroup}>
              <p className={styles.detailGroupTitle}>Contact information</p>
              {seller.contact_name && <DetailRow label="Name" value={seller.contact_name} />}
              {seller.email && <DetailRow label="Email" value={seller.email} isLink href={`mailto:${seller.email}`} />}
              {seller.phone && <DetailRow label="Phone" value={seller.phone} isLink href={`tel:${seller.phone}`} />}
            </div>
          )}

          {hasShopProfile && (
            <div className={styles.detailGroup}>
              <p className={styles.detailGroupTitle}>Shop &amp; directory</p>
              {shopUsername ? (
                publicProfileHref ? (
                  <DetailRow
                    label="Shop username"
                    value={`@${shopUsername.replace(/^@/, '')}`}
                    isLink
                    href={publicProfileHref}
                  />
                ) : (
                  <DetailRow
                    label="Shop username"
                    value={`@${shopUsername.replace(/^@/, '')}`}
                  />
                )
              ) : null}
              {seller.tagline && (
                <DetailRow label="Tagline" value={String(seller.tagline).trim()} />
              )}
              {seller.business_type_label && (
                <DetailRow
                  label="Directory type"
                  value={String(seller.business_type_label).trim()}
                />
              )}
              {specialtiesList.length > 0 && (
                <DetailRow label="Specialties" value={specialtiesList.join(', ')} />
              )}
            </div>
          )}

          {hasBusiness && (
            <div className={styles.detailGroup}>
              <p className={styles.detailGroupTitle}>Business information</p>
              {seller.address && <DetailRow label="Address" value={seller.address} />}
              {seller.business_info && <DetailRow label="About" value={seller.business_info} />}
            </div>
          )}

          {hasDecision && (
            <div className={styles.detailGroup}>
              <p className={styles.detailGroupTitle}>Application decision</p>
              {seller.rejected_at && (
                <DetailRow label="Rejected on" value={formatDate(seller.rejected_at)} />
              )}
              {seller.rejection_reason && (
                <DetailRow label="Reason" value={String(seller.rejection_reason).trim()} />
              )}
            </div>
          )}

          {hasAccount && (
            <div className={styles.detailGroup}>
              <p className={styles.detailGroupTitle}>Account</p>
              {seller.registered_at && <DetailRow label="Registered" value={formatDate(seller.registered_at)} />}
              {seller.business_started_at && (
                <DetailRow label="Business started" value={formatDate(seller.business_started_at)} />
              )}
              {seller.approved_at && (
                <DetailRow label="Approved" value={formatDate(seller.approved_at)} />
              )}
              {(seller.partners_featured === true || seller.partners_featured === false) && (
                <DetailRow
                  label="Partners spotlight"
                  value={seller.partners_featured ? 'Featured' : 'Not featured'}
                />
              )}
              {seller.listing_count != null && (
                <DetailRow label="Listings" value={String(seller.listing_count)} />
              )}
            </div>
          )}

          {!hasContact && !hasShopProfile && !hasBusiness && !hasDecision && !hasAccount && (
            <p className={styles.detailEmpty}>No details on file for this seller.</p>
          )}

        </div>
      </div>
    </div>
  );
}

export default function AdminSellersPage() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams();
  const toast = useToast();
  const isMobile = useMediaQuery('(max-width: 640px)');
  const highlightId = searchParams.get('highlight') || '';
  const [sellers, setSellers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);
  const [statusFilter, setStatusFilter] = useState(() =>
    readEnum(searchParams, 'status', STATUS_FILTER_OPTIONS.map((o) => o.value), 'all')
  );
  const [search, setSearch] = useState(() => readString(searchParams, 'q', ''));
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selectedRows, setSelectedRows] = useState(() => new Set());
  const [detailSeller, setDetailSeller] = useState(null);
  const [featuredConfirm, setFeaturedConfirm] = useState(null);
  const [featuredSubmitting, setFeaturedSubmitting] = useState(false);
  const [rejectDraft, setRejectDraft] = useState(null);
  const [rejectReasonInput, setRejectReasonInput] = useState('');
  const [rejectSubmitting, setRejectSubmitting] = useState(false);
  const [platformDefaultCommissionPct, setPlatformDefaultCommissionPct] = useState(10);

  // Sync state <- URL (back/forward, shared links)
  useEffect(() => {
    const nextQ = readString(searchParams, 'q', '')
    const nextStatus = readEnum(searchParams, 'status', STATUS_FILTER_OPTIONS.map((o) => o.value), 'all')
    queueMicrotask(() => {
      if (nextQ !== search) setSearch(nextQ)
      if (nextStatus !== statusFilter) setStatusFilter(nextStatus)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  // Sync URL <- state (debounce search typing)
  useDebouncedEffect(() => {
    replaceUrlQuery(router, pathname, searchParams, {
      q: search,
      status: { value: statusFilter, omitIf: 'all' },
    })
  }, [search, statusFilter, router, pathname, searchParams], 300)

  useEffect(() => {
    if (!isMobile || !filtersOpen) return;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    function onKeyDown(e) {
      if (e.key === 'Escape') setFiltersOpen(false);
    }
    window.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [filtersOpen, isMobile]);

  // Desktop uses inline Dropdown (no modal / no outside-click handler needed).

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const data = await listSellersForAdmin();
        if (!cancelled) setSellers(data);
      } catch (err) {
        console.error('Failed to load sellers:', err);
        if (!cancelled) toast.error('Failed to load sellers. Please try again.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [toast]);

  useEffect(() => {
    let cancelled = false;
    ;(async () => {
      try {
        const res = await fetch('/api/admin/platform-billing', { credentials: 'include' });
        const body = await res.json().catch(() => null);
        if (!cancelled && res.ok && body?.defaultCommissionPercent != null) {
          const n = Number(body.defaultCommissionPercent);
          if (Number.isFinite(n)) setPlatformDefaultCommissionPct(n);
        }
      } catch {
        // keep default 10
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (loading) return;
    if (!highlightId) return;
    const rows = document.querySelectorAll('[data-seller-id]');
    const el = Array.from(rows).find((node) => node?.dataset?.sellerId === highlightId);
    if (el && typeof el.scrollIntoView === 'function') {
      el.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
  }, [highlightId, loading]);

  const filtered = useMemo(() => {
    return sellers
      .filter(Boolean)
      .filter((seller) => {
        if (!seller || !seller.status) return false;
        if (statusFilter !== 'all' && seller.status !== statusFilter) return false;
        if (!search.trim()) return true;
        const q = search.trim().toLowerCase();
        return (
          (seller.business_name || '').toLowerCase().includes(q) ||
          (seller.contact_name || '').toLowerCase().includes(q) ||
          (seller.email || '').toLowerCase().includes(q)
        );
      });
  }, [sellers, statusFilter, search]);

  const hasFilters = Boolean(search.trim()) || statusFilter !== 'all';

  const clearFilters = () => {
    setSearch('');
    setStatusFilter('all');
  };

  const statusLabel =
    STATUS_FILTER_OPTIONS.find((o) => o.value === statusFilter)?.label ?? 'All statuses';
  const activeFilterLabel = statusFilter !== 'all' ? statusLabel : null;

  const handleStatusChange = async (sellerId, nextStatus) => {
    setUpdatingId(sellerId);
    try {
      const { data, error } = await updateSellerStatus(sellerId, nextStatus);
      if (error) { toast.error(error); return; }
      if (!data || !data.user_id) {
        toast.error('Updated seller record is invalid.');
        return;
      }
      setSellers((prev) =>
        prev.map((s) => {
          const currentId = s?.user_id || s?.id
          return currentId === sellerId ? { ...s, ...data } : s
        })
      );
      toast.success(`Seller status updated to ${nextStatus}.`);
      setDetailSeller((cur) => {
        if (!cur) return cur;
        const curId = cur.user_id || cur.id;
        return curId === sellerId ? { ...cur, ...data } : cur;
      });
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('admin:attention-refresh'));
      }
    } catch (err) {
      console.error('Failed to update seller status:', err);
      toast.error('Failed to update seller status. Please try again.');
    } finally {
      setUpdatingId(null);
    }
  };

  const [bulkBusy, setBulkBusy] = useState(false);
  const [pendingBulk, setPendingBulk] = useState(null);
  const [suspendSellerConfirm, setSuspendSellerConfirm] = useState(null);

  const requestBulkStatus = (nextStatus) => {
    const ids = [...selectedRows];
    if (ids.length === 0) return;
    setPendingBulk({ nextStatus, ids });
  };

  const confirmBulkStatus = async () => {
    if (!pendingBulk) return;
    const { nextStatus, ids } = pendingBulk;
    setBulkBusy(true);
    try {
      const results = await Promise.allSettled(
        ids.map((id) => updateSellerStatus(id, nextStatus)),
      );
      const updates = new Map();
      let failed = 0;
      results.forEach((r, idx) => {
        if (r.status === 'fulfilled' && r.value?.data?.user_id) {
          updates.set(ids[idx], r.value.data);
        } else {
          failed += 1;
        }
      });
      if (updates.size > 0) {
        setSellers((prev) =>
          prev.map((s) => {
            const id = s?.user_id || s?.id;
            return updates.has(id) ? { ...s, ...updates.get(id) } : s;
          }),
        );
      }
      if (failed > 0) {
        toast.error(`${failed} seller(s) failed to update.`);
      } else {
        toast.success(`${ids.length} seller(s) updated.`);
      }
      setSelectedRows(new Set());
      setPendingBulk(null);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('admin:attention-refresh'));
      }
    } finally {
      setBulkBusy(false);
    }
  };

  const handleConfirmRejectApplication = async () => {
    if (!rejectDraft) return;
    const reason = rejectReasonInput.trim();
    if (reason.length < MIN_REJECTION_REASON_LENGTH) {
      toast.error(
        `Please enter at least ${MIN_REJECTION_REASON_LENGTH} characters so the seller receives a clear explanation.`,
      );
      return;
    }
    setRejectSubmitting(true);
    try {
      const { data, error } = await rejectSellerApplication(rejectDraft.sellerId, reason);
      if (error) {
        toast.error(error);
        return;
      }
      if (!data?.user_id) {
        toast.error('Rejected record is invalid.');
        return;
      }
      setSellers((prev) =>
        prev.map((s) => {
          const id = s?.user_id || s?.id;
          return id === rejectDraft.sellerId ? { ...s, ...data } : s;
        }),
      );
      setDetailSeller((cur) => {
        if (!cur) return cur;
        const id = cur.user_id || cur.id;
        return id === rejectDraft.sellerId ? { ...cur, ...data } : cur;
      });
      toast.success('Application rejected. The seller was emailed with your note.');
      setRejectDraft(null);
      setRejectReasonInput('');
    } catch (err) {
      console.error('Failed to reject seller application:', err);
      toast.error('Failed to reject application. Please try again.');
    } finally {
      setRejectSubmitting(false);
    }
  };

  const handleConfirmPartnersFeatured = async () => {
    if (!featuredConfirm) return;
    setFeaturedSubmitting(true);
    try {
      const { data, error } = await updateSellerPartnersFeatured(
        featuredConfirm.sellerId,
        featuredConfirm.nextFeatured,
      );
      if (error) {
        toast.error(error);
        return;
      }
      const nextVal = data?.partners_featured ?? featuredConfirm.nextFeatured;
      setSellers((prev) =>
        prev.map((s) => {
          const id = s?.user_id || s?.id;
          return id === featuredConfirm.sellerId ? { ...s, partners_featured: nextVal } : s;
        }),
      );
      setDetailSeller((cur) => {
        if (!cur) return cur;
        const id = cur.user_id || cur.id;
        return id === featuredConfirm.sellerId ? { ...cur, partners_featured: nextVal } : cur;
      });
      toast.success(
        featuredConfirm.nextFeatured
          ? 'Seller added to partners spotlight.'
          : 'Seller removed from partners spotlight.',
      );
      setFeaturedConfirm(null);
    } catch (err) {
      console.error('Failed to update partners spotlight:', err);
      toast.error('Failed to update spotlight. Please try again.');
    } finally {
      setFeaturedSubmitting(false);
    }
  };

  return (
    <div className={styles.pageRoot}>
      <section className={styles.tablePanel}>

        <div className={styles.toolbar}>
          <div className={styles.toolbarRow}>
            <div className={styles.toolbarControls}>
              {isMobile ? (
                <div className={styles.mobileSearchSection}>
                  <div className={`${styles.mobileSearchWrap}${statusFilter !== 'all' ? ` ${styles.mobileSearchWrapActive}` : ''}`}>
                    <span className={styles.mobileSearchIcon}>
                      <Icon.Search />
                    </span>
                    <input
                      className={styles.mobileSearchInput}
                      type="search"
                      placeholder="Search by name or email…"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      autoComplete="off"
                    />
                    {search.trim() ? (
                      <button
                        type="button"
                        className={styles.mobileSearchClearBtn}
                        onClick={() => setSearch('')}
                        aria-label="Clear search"
                      >
                        <TbX aria-hidden />
                      </button>
                    ) : null}
                    <div className={styles.mobileSearchDivider} />
                    <button
                      type="button"
                      className={styles.mobileFilterBtn}
                      onClick={() => setFiltersOpen(true)}
                      aria-haspopup="dialog"
                      aria-expanded={filtersOpen}
                      aria-label="Open filters"
                    >
                      <LuSettings2
                        aria-hidden
                        className={`${styles.mobileFilterIcon}${statusFilter !== 'all' ? ` ${styles.mobileFilterIconActive}` : ''}`}
                      />
                    </button>
                  </div>
                  {activeFilterLabel && (
                    <div className={styles.mobileActivePillsRow} aria-label="Active filters">
                      <div className={styles.mobileActivePill}>
                        <span className={styles.mobileActivePillLabel}>{activeFilterLabel}</span>
                        <button
                          type="button"
                          className={styles.mobileActivePillClear}
                          onClick={() => setStatusFilter('all')}
                          aria-label="Clear filter"
                        >
                          <TbX aria-hidden />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <div className={styles.toolbarSearchWrap}>
                    <Icon.Search />
                    <input
                      className={styles.toolbarSearchInput}
                      type="search"
                      placeholder="Search by name or email…"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      autoComplete="off"
                    />
                    {search.trim() ? (
                      <button
                        type="button"
                        className={styles.toolbarSearchClearBtn}
                        onClick={() => setSearch('')}
                        aria-label="Clear search"
                      >
                        <TbX aria-hidden />
                      </button>
                    ) : null}
                  </div>
                  <Dropdown
                    value={statusFilter}
                    onChange={setStatusFilter}
                    ariaLabel="Seller status"
                    options={STATUS_FILTER_OPTIONS}
                    placeholder="All statuses"
                  />
                </>
              )}
            </div>

            <button
              type="button"
              className={styles.toolbarClearAll}
              onClick={clearFilters}
              disabled={!hasFilters}
            >
              <FiRotateCcw className={styles.toolbarClearIcon} aria-hidden />
              Clear All
            </button>
          </div>
        </div>

        {isMobile && filtersOpen && (
          <div
            className={styles.filterSheetOverlay}
            role="presentation"
            onClick={() => setFiltersOpen(false)}
          >
            <div
              className={styles.filterSheet}
              role="dialog"
              aria-modal="true"
              aria-label="Filters"
              onClick={(e) => e.stopPropagation()}
            >
              <div className={styles.filterSheetHandle} aria-hidden />
              <div className={styles.filterSheetHeader}>
                <p className={styles.filterSheetTitle}>Filter</p>
                <button
                  type="button"
                  className={styles.filterSheetClose}
                  onClick={() => setFiltersOpen(false)}
                  aria-label="Close"
                >
                  ×
                </button>
              </div>

              <div className={styles.filterSheetBody}>
                <p className={styles.filterSheetLabel}>Status</p>
                <div className={styles.filterOptions}>
                  {STATUS_FILTER_OPTIONS.map((opt) => {
                    const active = opt.value === statusFilter;
                    const isDefault = opt.value === 'all'
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        className={`${styles.filterOption} ${
                          active ? (isDefault ? styles.filterOptionActiveDefault : styles.filterOptionActive) : ''
                        }`}
                        onClick={() => {
                          setStatusFilter(opt.value);
                          setFiltersOpen(false);
                        }}
                        aria-pressed={active}
                      >
                        <span>{opt.label}</span>
                        {active && <span className={styles.filterOptionCheck} aria-hidden />}
                      </button>
                    );
                  })}
                </div>

                <div className={styles.filterSheetFooter}>
                  <button
                    type="button"
                    className={styles.filterSheetClearAll}
                    onClick={() => {
                      clearFilters();
                      setFiltersOpen(false);
                    }}
                    disabled={!hasFilters}
                  >
                    <FiRotateCcw className={styles.toolbarClearIcon} aria-hidden />
                    Clear All
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {selectedRows.size > 0 ? (
          <div
            style={{
              display: 'flex',
              gap: 8,
              alignItems: 'center',
              padding: '10px 12px',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: 8,
              margin: '0 0 10px',
              flexWrap: 'wrap',
            }}
            aria-live="polite"
          >
            <span style={{ fontSize: 13, fontWeight: 500 }}>
              {selectedRows.size} selected
            </span>
            {[
              { value: 'active', label: 'Set Active' },
              { value: 'pending', label: 'Set Pending' },
              { value: 'suspended', label: 'Suspend' },
              { value: 'rejected', label: 'Mark Rejected' },
            ].map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => requestBulkStatus(opt.value)}
                disabled={bulkBusy}
                style={{
                  padding: '6px 12px',
                  background: opt.value === 'suspended' || opt.value === 'rejected' ? '#b91c1c' : '#0f172a',
                  color: '#fff',
                  border: 0,
                  borderRadius: 6,
                  fontSize: 12,
                  cursor: bulkBusy ? 'not-allowed' : 'pointer',
                  opacity: bulkBusy ? 0.7 : 1,
                }}
              >
                {bulkBusy ? 'Working…' : opt.label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setSelectedRows(new Set())}
              disabled={bulkBusy}
              style={{
                marginLeft: 'auto',
                padding: '6px 12px',
                background: 'transparent',
                border: '1px solid #cbd5e1',
                borderRadius: 6,
                fontSize: 12,
                cursor: 'pointer',
              }}
            >
              Clear selection
            </button>
          </div>
        ) : null}

        <div className={styles.tableWrap}>
          {loading ? (
            <table className={styles.table} role="status" aria-live="polite" aria-busy="true" aria-label="Loading sellers">
              <colgroup>
                <col className={styles.colCheck} />
                <col className={styles.colSeller} />
                <col className={styles.colContact} />
                <col className={styles.colListings} />
                <col className={styles.colCommission} />
                <col className={styles.colStatus} />
                <col className={styles.colActions} />
              </colgroup>
              <thead>
                <tr>
                  <th className={styles.checkboxCell} aria-hidden>
                    <span className={`${styles.sellersSkBar} ${styles.sellersSkCheckbox}`} />
                  </th>
                  <th>Shop</th>
                  <th>Contact</th>
                  <th>Listings</th>
                  <th>Commission</th>
                  <th>Status</th>
                  <th className={styles.actionsTh}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 8 }).map((_, i) => (
                  <tr key={`sellers-sk-${i}`} className={styles.primaryRow}>
                    <td className={styles.checkboxCell}>
                      <span className={`${styles.sellersSkBar} ${styles.sellersSkCheckbox}`} aria-hidden />
                    </td>
                    <td>
                      <div className={styles.sellerCell}>
                        <span className={`${styles.sellersSkBar} ${styles.sellersSkAvatar}`} aria-hidden />
                        <div className={styles.sellerText}>
                          <span className={`${styles.sellersSkBar} ${styles.sellersSkLine}`} aria-hidden />
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={`${styles.sellersSkBar} ${styles.sellersSkLine}`} aria-hidden />
                      <span className={`${styles.sellersSkBar} ${styles.sellersSkLineSm}`} style={{ display: 'block', width: 180 }} aria-hidden />
                    </td>
                    <td>
                      <span className={`${styles.sellersSkBar} ${styles.sellersSkLine}`} style={{ width: 40 }} aria-hidden />
                      <span className={`${styles.sellersSkBar} ${styles.sellersSkLineSm}`} style={{ display: 'block', width: 64 }} aria-hidden />
                    </td>
                    <td>
                      <span className={`${styles.sellersSkBar} ${styles.sellersSkPill}`} aria-hidden />
                    </td>
                    <td>
                      <span className={`${styles.sellersSkBar} ${styles.sellersSkPill}`} aria-hidden />
                    </td>
                    <td className={styles.actionsCell}>
                      <div className={styles.actionsCellInner}>
                        <span className={`${styles.sellersSkBar} ${styles.sellersSkBtn}`} aria-hidden />
                        <span className={`${styles.sellersSkBar} ${styles.sellersSkBtn}`} aria-hidden />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : filtered.length === 0 ? null : (
            <table className={styles.table}>
              <colgroup>
                <col className={styles.colCheck} />
                <col className={styles.colSeller} />
                <col className={styles.colContact} />
                <col className={styles.colListings} />
                <col className={styles.colCommission} />
                <col className={styles.colStatus} />
                <col className={styles.colActions} />
              </colgroup>
              <thead>
                <tr>
                  <th className={styles.checkboxCell}>
                    <input
                      type="checkbox"
                      className={styles.rowCheckbox}
                      checked={
                        filtered.length > 0 &&
                        filtered.every((s) => selectedRows.has(s.user_id || s.id))
                      }
                      onChange={(e) => {
                        setSelectedRows((prev) => {
                          const next = new Set(prev);
                          if (e.target.checked) {
                            filtered.forEach((s) => next.add(s.user_id || s.id));
                          } else {
                            filtered.forEach((s) => next.delete(s.user_id || s.id));
                          }
                          return next;
                        });
                      }}
                      aria-label="Select all sellers in view"
                    />
                  </th>
                  <th>Shop</th>
                  <th>Contact</th>
                  <th>Listings</th>
                  <th>Commission</th>
                  <th>Status</th>
                  <th className={styles.actionsTh}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((seller) => {
                  const sellerId = seller.user_id || seller.id
                  const isOverride = false
                  const isUpdating = updatingId === sellerId;

                  return (
                    <tr
                      key={sellerId}
                      data-seller-id={sellerId}
                      className={`${styles.primaryRow} ${highlightId && String(sellerId) === String(highlightId) ? styles.rowHighlight : ''}`}
                    >
                      <td className={styles.checkboxCell}>
                        <input
                          type="checkbox"
                          className={styles.rowCheckbox}
                          checked={selectedRows.has(sellerId)}
                          onChange={(e) => {
                            setSelectedRows((prev) => {
                              const next = new Set(prev);
                              if (e.target.checked) next.add(sellerId);
                              else next.delete(sellerId);
                              return next;
                            });
                          }}
                          aria-label={`Select ${seller.business_name || 'seller'}`}
                        />
                      </td>

                      <td>
                        <div className={styles.sellerCell}>
                          <SellerAvatar name={seller.business_name} src={seller.avatarUrl} />
                          <div className={styles.sellerText}>
                            <p className={styles.sellerName}>{seller.business_name}</p>
                          </div>
                        </div>
                      </td>

                      <td>
                        <p className={styles.contactName}>{seller.contact_name}</p>
                        <p className={styles.meta}>{seller.email}</p>
                        {seller.phone && (
                          <p className={styles.meta}>{seller.phone}</p>
                        )}
                      </td>

                      <td>
                        <p className={styles.listingCount}>
                          {seller.listing_count ?? '—'}
                        </p>
                        <p className={styles.meta}>listings</p>
                      </td>

                      <td>
                        <CommissionBadge percentage={platformDefaultCommissionPct} isOverride={isOverride} />
                      </td>

                      <td>
                        <StatusBadge status={seller.status} />
                      </td>

                      <td className={styles.actionsCell}>
                        <div className={styles.actionsCellInner}>
                          <button
                            type="button"
                            className={`${styles.featureStarBtn} ${seller.partners_featured ? styles.featureStarBtnActive : ''}`}
                            disabled={featuredSubmitting || rejectSubmitting || isUpdating}
                            aria-pressed={Boolean(seller.partners_featured)}
                            aria-label={
                              seller.partners_featured
                                ? `Remove partners spotlight for ${seller.business_name || 'seller'}`
                                : `Feature ${seller.business_name || 'seller'} on the partners page`
                            }
                            onClick={() =>
                              setFeaturedConfirm({
                                sellerId,
                                nextFeatured: !seller.partners_featured,
                                name: seller.business_name || 'this seller',
                              })
                            }
                          >
                            {seller.partners_featured ? (
                              <FaStar className={styles.featureStarIcon} aria-hidden size={18} />
                            ) : (
                              <FaRegStar className={styles.featureStarIcon} aria-hidden size={18} />
                            )}
                          </button>
                          <SellerActionsMenu
                            seller={seller}
                            sellerId={sellerId}
                            isUpdating={isUpdating || rejectSubmitting}
                            onViewDetails={() => setDetailSeller(seller)}
                            onStatusChange={handleStatusChange}
                            onSuspendRequest={(sid, s) => {
                              setSuspendSellerConfirm({
                                sellerId: sid,
                                name:
                                  typeof s?.business_name === 'string' && s.business_name.trim()
                                    ? s.business_name.trim()
                                    : 'Seller',
                              });
                            }}
                            onRejectRequest={(target) => {
                              setRejectDraft({
                                sellerId: target?.user_id || target?.id,
                                name:
                                  typeof target?.business_name === 'string' &&
                                  target.business_name.trim()
                                    ? target.business_name.trim()
                                    : 'Seller',
                              });
                              setRejectReasonInput('');
                            }}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          {!loading && filtered.length === 0 && (
            <div className={styles.emptyState}>
              <svg className={styles.emptyIcon} viewBox="0 0 48 48" fill="none">
                <circle cx="22" cy="22" r="14" stroke="#cbd5e1" strokeWidth="2" />
                <path d="M32 32l8 8" stroke="#cbd5e1" strokeWidth="2" strokeLinecap="round" />
              </svg>
              <p className={styles.emptyTitle}>No sellers found</p>
              <p className={styles.emptyText}>No sellers match your current filters.</p>
              <button
                type="button"
                className={styles.clearBtn}
                onClick={() => { clearFilters(); }}
              >
                Clear filters
              </button>
            </div>
          )}
        </div>

        {!loading && filtered.length > 0 && (
          <div className={styles.tableFooter}>
            Showing <strong>{filtered.length}</strong> of <strong>{sellers.length}</strong> sellers
          </div>
        )}
      </section>

      {detailSeller && (
        <SellerDetailModal seller={detailSeller} onClose={() => setDetailSeller(null)} />
      )}

      <ConfirmModal
        open={suspendSellerConfirm != null}
        variant="danger"
        title="Suspend seller?"
        message={
          suspendSellerConfirm
            ? `Suspend "${suspendSellerConfirm.name}"? They cannot take new bookings until reactivated.`
            : ''
        }
        confirmLabel="Suspend"
        confirmLoadingLabel="Suspending..."
        cancelLabel="Cancel"
        loading={
          suspendSellerConfirm != null &&
          updatingId === suspendSellerConfirm.sellerId
        }
        onCancel={() => {
          if (updatingId) return;
          setSuspendSellerConfirm(null);
        }}
        onConfirm={async () => {
          if (!suspendSellerConfirm) return;
          await handleStatusChange(suspendSellerConfirm.sellerId, 'suspended');
          setSuspendSellerConfirm(null);
        }}
      />

      <ConfirmModal
        open={pendingBulk != null}
        variant={
          pendingBulk?.nextStatus === 'suspended' || pendingBulk?.nextStatus === 'rejected'
            ? 'danger'
            : pendingBulk?.nextStatus === 'active'
              ? 'primary'
              : 'warning'
        }
        title="Update selected sellers?"
        message={
          pendingBulk
            ? (() => {
                const label =
                  STATUS_FILTER_OPTIONS.find((o) => o.value === pendingBulk.nextStatus)?.label ||
                  pendingBulk.nextStatus;
                return `Set ${pendingBulk.ids.length} selected seller${pendingBulk.ids.length > 1 ? 's' : ''} to ${label}?`;
              })()
            : ''
        }
        confirmLabel="Apply"
        confirmLoadingLabel="Updating..."
        cancelLabel="Cancel"
        loading={bulkBusy}
        onCancel={() => {
          if (bulkBusy) return;
          setPendingBulk(null);
        }}
        onConfirm={confirmBulkStatus}
      />

      <ConfirmModal
        open={featuredConfirm != null}
        title={
          featuredConfirm?.nextFeatured
            ? 'Feature on partners page?'
            : 'Remove from spotlight?'
        }
        message={
          featuredConfirm?.nextFeatured
            ? `"${featuredConfirm.name}" will be highlighted in the partners spotlight. Continue?`
            : `Remove "${featuredConfirm?.name ?? ''}" from the partners spotlight?`
        }
        confirmLabel={featuredConfirm?.nextFeatured ? 'Feature' : 'Remove'}
        confirmLoadingLabel={featuredConfirm?.nextFeatured ? 'Featuring...' : 'Removing...'}
        cancelLabel="Cancel"
        variant={featuredConfirm?.nextFeatured ? 'primary' : 'warning'}
        loading={featuredSubmitting}
        onCancel={() => {
          if (!featuredSubmitting) setFeaturedConfirm(null);
        }}
        onConfirm={handleConfirmPartnersFeatured}
        icon={
          featuredConfirm?.nextFeatured ? (
            <FaRegStar size={18} aria-hidden />
          ) : featuredConfirm ? (
            <FaStar size={18} aria-hidden />
          ) : null
        }
      />

      <ConfirmModal
        open={rejectDraft != null}
        title="Reject seller application?"
        message={
          rejectDraft
            ? `${rejectDraft.name} will receive an email explaining why their onboarding was not approved.`
            : ''
        }
        subtitleAlign="left"
        variant="danger"
        confirmLabel="Reject and send email"
        confirmLoadingLabel="Rejecting..."
        cancelLabel="Cancel"
        loading={rejectSubmitting}
        onCancel={() => {
          if (!rejectSubmitting) {
            setRejectDraft(null);
            setRejectReasonInput('');
          }
        }}
        onConfirm={handleConfirmRejectApplication}
        extra={
          rejectDraft ? (
            <div className={styles.rejectModalWrap}>
              <label htmlFor="admin-reject-application-reason" className={styles.rejectModalLabel}>
                Reason for rejection <span aria-hidden>(required)</span>
              </label>
              <textarea
                id="admin-reject-application-reason"
                className={styles.rejectReasonTextarea}
                value={rejectReasonInput}
                onChange={(e) => setRejectReasonInput(e.target.value)}
                placeholder="Explain clearly what issues were found or what documents or details are missing."
                disabled={rejectSubmitting}
                maxLength={8000}
                rows={6}
                autoComplete="off"
              />
              <p className={styles.rejectModalHint}>
                At least {MIN_REJECTION_REASON_LENGTH} characters ({rejectReasonInput.trim().length}/8000). This exact
                note is emailed to the seller.
              </p>
            </div>
          ) : null
        }
      />
    </div>
  );
}