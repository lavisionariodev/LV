'use client';

import { useEffect, useMemo, useState } from 'react';
import { FiRotateCcw } from 'react-icons/fi';
import styles from './sellers.module.css';
import { getEffectiveCommissionForSeller } from '@/data/adminSampleData';
import { listSellersForAdmin, updateSellerStatus } from '@/lib/sellers/client';
import { useToast } from '@/contexts/ToastContext';
import { Dropdown } from '@/components/ui';

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

function getInitials(name = '') {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0].toUpperCase())
    .join('');
}

const AVATAR_COLORS = [
  { bg: '#e0e7ff', text: '#3730a3' },
  { bg: '#dcfce7', text: '#166534' },
  { bg: '#fce7f3', text: '#9d174d' },
  { bg: '#fef9c3', text: '#854d0e' },
  { bg: '#fee2e2', text: '#991b1b' },
  { bg: '#f3e8ff', text: '#6b21a8' },
  { bg: '#ffedd5', text: '#9a3412' },
  { bg: '#e2e8f0', text: '#334155' },
];

function avatarColor(name = '') {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + hash * 31;
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function SellerAvatar({ name }) {
  if (!name) return (
    <div className={`${styles.avatar} ${styles.avatarDefault}`}>
      <svg viewBox="0 0 24 24" fill="none" className={styles.avatarIcon}>
        <rect x="3" y="6" width="18" height="13" rx="2" stroke="currentColor" strokeWidth="1.5" />
        <path d="M8 6V5a4 4 0 018 0v1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    </div>
  );
  const initials = getInitials(name);
  const { bg, text } = avatarColor(name);
  return (
    <div className={styles.avatar} style={{ background: bg, color: text }}>
      {initials}
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

export default function AdminSellersPage() {
  const toast = useToast();
  const [sellers, setSellers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedRows, setSelectedRows] = useState(() => new Set());

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
              </div>

              <Dropdown
                value={statusFilter}
                onChange={setStatusFilter}
                ariaLabel="Seller status"
                options={STATUS_FILTER_OPTIONS}
                placeholder="All statuses"
              />
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
                <col className={styles.colBusiness} />
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
                  <th>Seller</th>
                  <th>Contact</th>
                  <th>Business Details</th>
                  <th>Listings</th>
                  <th>Commission</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((seller) => {
                  const sellerId = seller.user_id || seller.id
                  const commissionInfo = getEffectiveCommissionForSeller(sellerId);
                  const isOverride = commissionInfo.source === 'override';
                  const isUpdating = updatingId === sellerId;

                  return (
                    <tr key={sellerId} className={styles.primaryRow}>
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
                          <SellerAvatar name={seller.business_name} />
                          <div className={styles.sellerText}>
                            <p className={styles.sellerName}>{seller.business_name}</p>
                            <p className={styles.sellerId} title={`ID: ${seller.id}`}>
                              ID: {seller.id}
                              {seller.registered_at && (
                                <> · Since {seller.registered_at}</>
                              )}
                            </p>
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
                        <div className={styles.businessDetails}>
                          {seller.business_info && (
                            <p className={styles.businessInfo}>
                              <strong>Info:</strong> {seller.business_info.length > 100
                                ? `${seller.business_info.substring(0, 100)}...`
                                : seller.business_info}
                            </p>
                          )}
                          {seller.address && (
                            <p className={styles.businessAddress}>
                              <strong>Address:</strong> {seller.address.length > 80
                                ? `${seller.address.substring(0, 80)}...`
                                : seller.address}
                            </p>
                          )}
                          {!seller.business_info && !seller.address && (
                            <p className={styles.meta}>No details provided</p>
                          )}
                        </div>
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

                      <td>
                        <div className={styles.actions}>
                          {seller.status === 'pending' && (
                            <button
                              type="button"
                              className={`${styles.actionBtn} ${styles.actionApprove}`}
                              onClick={() => handleStatusChange(seller.user_id || seller.id, 'active')}
                              disabled={isUpdating}
                            >
                              {isUpdating ? (
                                <><span className={styles.btnSpinner} /> Approving…</>
                              ) : (
                                <>
                                  <svg viewBox="0 0 16 16" fill="none" width="13" height="13">
                                    <path d="M3 8l3.5 3.5L13 4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                                  </svg>
                                  Approve
                                </>
                              )}
                            </button>
                          )}
                          {seller.status === 'active' && (
                            <button
                              type="button"
                              className={`${styles.actionBtn} ${styles.actionSuspend}`}
                              onClick={() => handleStatusChange(seller.user_id || seller.id, 'suspended')}
                              disabled={isUpdating}
                            >
                              {isUpdating ? (
                                <><span className={styles.btnSpinner} /> Updating…</>
                              ) : (
                                <>
                                  <svg viewBox="0 0 16 16" fill="none" width="13" height="13">
                                    <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5" />
                                    <path d="M6 6v4M10 6v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                                  </svg>
                                  Suspend
                                </>
                              )}
                            </button>
                          )}
                          {seller.status === 'suspended' && (
                            <button
                              type="button"
                              className={`${styles.actionBtn} ${styles.actionReactivate}`}
                              onClick={() => handleStatusChange(seller.user_id || seller.id, 'active')}
                              disabled={isUpdating}
                            >
                              {isUpdating ? (
                                <><span className={styles.btnSpinner} /> Updating…</>
                              ) : (
                                <>
                                  <svg viewBox="0 0 16 16" fill="none" width="13" height="13">
                                    <path d="M3 8a5 5 0 109.9-1M13 4v3h-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                  </svg>
                                  Re-activate
                                </>
                              )}
                            </button>
                          )}
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

        {!loading && (
          <div className={styles.tableFooter}>
            Showing <strong>{filtered.length}</strong> of <strong>{sellers.length}</strong> sellers
          </div>
        )}
      </section>
    </div>
  );
}
