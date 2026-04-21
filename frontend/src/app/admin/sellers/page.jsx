'use client';

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { BsThreeDots } from 'react-icons/bs';
import { FiRotateCcw } from 'react-icons/fi';
import { TbX } from 'react-icons/tb';
import { LuSettings2 } from 'react-icons/lu';
import styles from './sellers.module.css';
import { getEffectiveCommissionForSeller } from '@/data/adminSampleData';
import { listSellersForAdmin, updateSellerStatus } from '@/lib/sellers/client';
import { useToast } from '@/contexts/ToastContext';
import { useMediaQuery } from '@/hooks';
import { Dropdown } from '@/components/ui';
import { useSearchParams } from 'next/navigation';

const STATUS_FILTER_OPTIONS = [
  { value: 'all', label: 'All statuses', color: 'slate' },
  { value: 'active', label: 'Active', color: 'green' },
  { value: 'pending', label: 'Pending', color: 'amber' },
  { value: 'suspended', label: 'Suspended', color: 'red' },
];

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
      <img
        src={src.trim()}
        alt=""
        className={styles.avatar}
        onError={() => setImgError(true)}
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

function SellerActionsMenu({ seller, sellerId, isUpdating, onViewDetails, onStatusChange }) {
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
          )}
          {seller.status === 'active' && (
            <button
              type="button"
              role="menuitem"
              className={`${styles.actionMenuItem} ${styles.actionMenuItemWarn}`}
              disabled={isUpdating}
              onClick={() => {
                onStatusChange(sellerId, 'suspended');
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

  const hasContact = seller.contact_name || seller.email || seller.phone;
  const hasBusiness = seller.address || seller.business_info;
  const hasAccount = seller.registered_at || seller.listing_count != null;

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
              {seller.status && <StatusBadge status={seller.status} />}
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

          {hasBusiness && (
            <div className={styles.detailGroup}>
              <p className={styles.detailGroupTitle}>Business Information</p>
              {seller.address && <DetailRow label="Address" value={seller.address} />}
              {seller.business_info && <DetailRow label="About" value={seller.business_info} />}
            </div>
          )}

          {hasAccount && (
            <div className={styles.detailGroup}>
              <p className={styles.detailGroupTitle}>Account</p>
              {seller.registered_at && <DetailRow label="Registered" value={formatDate(seller.registered_at)} />}
              {seller.listing_count != null && <DetailRow label="Listings" value={seller.listing_count} />}
            </div>
          )}

          {!hasContact && !hasBusiness && !hasAccount && (
            <p className={styles.detailEmpty}>No details on file for this seller.</p>
          )}

        </div>
      </div>
    </div>
  );
}

export default function AdminSellersPage() {
  const searchParams = useSearchParams();
  const toast = useToast();
  const isMobile = useMediaQuery('(max-width: 640px)');
  const highlightId = searchParams.get('highlight') || '';
  const [sellers, setSellers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState(() => searchParams.get('q') || '');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selectedRows, setSelectedRows] = useState(() => new Set());
  const [detailSeller, setDetailSeller] = useState(null);

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
          return currentId === sellerId ? { ...s, status: data.status } : s
        })
      );
      toast.success(`Seller status updated to ${nextStatus}.`);
      setDetailSeller((cur) => {
        if (!cur) return cur;
        const curId = cur.user_id || cur.id;
        return curId === sellerId ? { ...cur, status: data.status } : cur;
      });
    } catch (err) {
      console.error('Failed to update seller status:', err);
      toast.error('Failed to update seller status. Please try again.');
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className={styles.pageRoot}>
      <section className={styles.tablePanel}>

        <div className={styles.toolbar}>
          <div className={styles.toolbarRow}>
            <div className={styles.toolbarControls}>
              {isMobile ? (
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
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        className={`${styles.filterOption} ${active ? styles.filterOptionActive : ''}`}
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

        <div className={styles.tableWrap}>
          {loading ? (
            <div className={styles.loadingState}>
              <div className={styles.spinner} />
              <p>Loading sellers…</p>
            </div>
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
                  const commissionInfo = getEffectiveCommissionForSeller(sellerId);
                  const isOverride = commissionInfo.source === 'override';
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
                        <CommissionBadge percentage={commissionInfo.percentage} isOverride={isOverride} />
                        {isOverride && (
                          <p className={`${styles.meta} ${styles.ruleId}`}>
                            Rule: {commissionInfo.ruleId}
                          </p>
                        )}
                      </td>

                      <td>
                        <StatusBadge status={seller.status} />
                      </td>

                      <td className={styles.actionsCell}>
                        <SellerActionsMenu
                          seller={seller}
                          sellerId={sellerId}
                          isUpdating={isUpdating}
                          onViewDetails={() => setDetailSeller(seller)}
                          onStatusChange={handleStatusChange}
                        />
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
    </div>
  );
}