'use client';

import { useEffect, useMemo, useState } from 'react';
import layoutStyles from '../admin.module.css';
import styles from './sellers.module.css';
import { getEffectiveCommissionForSeller } from '@/data/adminSampleData';
import { listSellersForAdmin, updateSellerStatus } from '@/lib/sellers/client';
import { useToast } from '@/contexts/ToastContext';

const STATUS_OPTIONS = [
  { value: 'all', label: 'All statuses' },
  { value: 'active', label: 'Active' },
  { value: 'pending', label: 'Pending verification' },
  { value: 'suspended', label: 'Suspended' },
];

export default function AdminSellersPage() {
  const toast = useToast();
  const [sellers, setSellers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const data = await listSellersForAdmin();
        if (cancelled) return;
        setSellers(data);
      } catch (err) {
        console.error('Failed to load sellers:', err);
        if (!cancelled) {
          toast.error('Failed to load sellers. Please try again.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [toast]);

  const filtered = useMemo(() => {
    return sellers.filter((seller) => {
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

  const handleStatusChange = async (sellerId, nextStatus) => {
    setUpdatingId(sellerId);
    try {
      const { data, error } = await updateSellerStatus(sellerId, nextStatus);
      if (error) {
        toast.error(error);
        return;
      }
      setSellers((prev) =>
        prev.map((s) => (s.id === sellerId ? { ...s, status: data.status } : s))
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
    <div className={layoutStyles.dashWrap}>
      <section className={layoutStyles.panel}>
        <div className={layoutStyles.panelHead}>
          <p className={layoutStyles.panelTitle}>Sellers</p>

          <div className={styles.toolbar}>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className={layoutStyles.smallBtn}
              aria-label="Filter sellers by status"
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>

            <input
              type="search"
              placeholder="Search by name or email"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={`${layoutStyles.searchInput} ${styles.searchInputWrap}`}
            />
          </div>
        </div>

        <div className={layoutStyles.table}>
          {loading && (
            <div className={styles.empty}>
              Loading sellers…
            </div>
          )}

          {!loading && (
            <>
              <div className={layoutStyles.rowHead}>
                <span>Seller</span>
                <span>Contact</span>
                <span>Listings</span>
                <span>Commission / Actions</span>
              </div>

              {filtered.map((seller) => {
                const commissionInfo = getEffectiveCommissionForSeller(seller.id);
                const isOverride = commissionInfo.source === 'override';

                return (
                  <div className={layoutStyles.row} key={seller.id}>
                    <span>
                      <strong>{seller.business_name}</strong>
                      <br />
                      <span className={styles.meta}>
                        ID: {seller.id} · Since {seller.registered_at || '—'}
                      </span>
                    </span>

                    <span>
                      <strong>{seller.contact_name}</strong>
                      <br />
                      <span className={styles.meta}>{seller.email}</span>
                      <br />
                      <span className={styles.meta}>{seller.phone}</span>
                    </span>

                    <span>
                      <strong>{seller.listing_count ?? '—'}</strong> listings
                      <br />
                      <span className={styles.meta}>
                        Status: {seller.status}
                      </span>
                    </span>

                    <span>
                      <span className={layoutStyles.badge}>
                        {commissionInfo.percentage}%{' '}
                        {isOverride ? '(custom)' : '(default)'}
                      </span>
                      <br />
                      {isOverride && (
                        <span className={styles.meta}>
                          Override rule: {commissionInfo.ruleId}
                        </span>
                      )}
                      <div className={styles.actions}>
                        {seller.status === 'pending' && (
                          <button
                            type="button"
                            className={layoutStyles.smallBtn}
                            onClick={() => handleStatusChange(seller.id, 'active')}
                            disabled={updatingId === seller.id}
                          >
                            {updatingId === seller.id ? 'Approving…' : 'Approve'}
                          </button>
                        )}
                        {seller.status === 'active' && (
                          <button
                            type="button"
                            className={layoutStyles.smallBtn}
                            onClick={() =>
                              handleStatusChange(seller.id, 'suspended')
                            }
                            disabled={updatingId === seller.id}
                          >
                            {updatingId === seller.id ? 'Updating…' : 'Suspend'}
                          </button>
                        )}
                        {seller.status === 'suspended' && (
                          <button
                            type="button"
                            className={layoutStyles.smallBtn}
                            onClick={() => handleStatusChange(seller.id, 'active')}
                            disabled={updatingId === seller.id}
                          >
                            {updatingId === seller.id
                              ? 'Updating…'
                              : 'Re-activate'}
                          </button>
                        )}
                      </div>
                    </span>
                  </div>
                );
              })}

              {filtered.length === 0 && (
                <div className={styles.empty}>
                  No sellers match the current filters.
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </div>
  );
}