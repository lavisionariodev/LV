'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useProfile } from '@/contexts/ProfileContext';
import { getUserRole, ROLE_SELLER } from '@/lib/auth/roles';
import styles from '../profile.module.css';
import purchaseStyles from './purchases.module.css';

// ── Status config ─────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  Pending:     { color: '#A8894A', bg: 'rgba(168,137,74,0.10)' },
  Confirmed:   { color: '#204F38', bg: 'rgba(32,79,56,0.10)'  },
  'In Progress': { color: '#2563EB', bg: 'rgba(37,99,235,0.09)' },
  Completed:   { color: '#16a34a', bg: 'rgba(22,163,74,0.10)' },
  Cancelled:   { color: '#dc2626', bg: 'rgba(220,38,38,0.09)' },
};

const ALL_STATUSES = ['All', ...Object.keys(STATUS_CONFIG)];

// ── Mock data (replace with real fetch) ──────────────────────────────────────
const MOCK_PURCHASES = [
  {
    id: 'ORD-00123',
    service: 'Full Burial Package',
    provider: 'Serenity Memorial Services',
    bookedDate: '2025-03-10',
    scheduledDate: '2025-03-18',
    status: 'Completed',
    price: 85000,
    paymentMethod: 'GCash',
    items: ['Casket selection', 'Embalming', 'Chapel service (2 days)', 'Hearse transport'],
  },
  {
    id: 'ORD-00141',
    service: 'Cremation Package',
    provider: 'Eternal Light Crematorium',
    bookedDate: '2025-05-02',
    scheduledDate: '2025-05-09',
    status: 'Confirmed',
    price: 32000,
    paymentMethod: 'Bank Transfer',
    items: ['Direct cremation', 'Urn (standard)', 'Death certificate assistance'],
  },
  {
    id: 'ORD-00158',
    service: 'Memorial Flowers Arrangement',
    provider: 'Grace Blooms',
    bookedDate: '2025-05-15',
    scheduledDate: '2025-05-20',
    status: 'Pending',
    price: 4500,
    paymentMethod: 'Credit Card',
    items: ['Wreath (large)', 'Standing spray x2', 'Casket spray'],
  },
  {
    id: 'ORD-00172',
    service: 'Grief Counseling Session',
    provider: 'Healing Hearts PH',
    bookedDate: '2025-06-01',
    scheduledDate: '2025-06-07',
    status: 'In Progress',
    price: 2500,
    paymentMethod: 'Maya',
    items: ['1-hour individual session', 'Follow-up email support'],
  },
  {
    id: 'ORD-00180',
    service: 'Obituary & Prayer Card Printing',
    provider: 'Remembrance Print Co.',
    bookedDate: '2025-06-10',
    scheduledDate: '2025-06-13',
    status: 'Cancelled',
    price: 1800,
    paymentMethod: 'GCash',
    items: ['Obituary layout (1 page)', 'Prayer cards x50'],
  },
];

function formatPrice(amount) {
  return '₱' + amount.toLocaleString('en-PH');
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-PH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

// ── Purchase card ─────────────────────────────────────────────────────────────
function PurchaseCard({ purchase }) {
  const [expanded, setExpanded] = useState(false);
  const cfg = STATUS_CONFIG[purchase.status] ?? STATUS_CONFIG['Pending'];

  return (
    <div className={purchaseStyles.card}>
      {/* Card header */}
      <div className={purchaseStyles.cardHeader}>
        <div className={purchaseStyles.cardTop}>
          <div className={purchaseStyles.cardInfo}>
            <span className={purchaseStyles.orderId}>{purchase.id}</span>
            <h3 className={purchaseStyles.serviceName}>{purchase.service}</h3>
            <span className={purchaseStyles.providerName}>{purchase.provider}</span>
          </div>
          <span
            className={purchaseStyles.statusBadge}
            style={{ color: cfg.color, background: cfg.bg }}
          >
            {purchase.status}
          </span>
        </div>

        <div className={purchaseStyles.cardMeta}>
          <span className={purchaseStyles.metaItem}>
            <span className={purchaseStyles.metaLabel}>Booked</span>
            {formatDate(purchase.bookedDate)}
          </span>
          <span className={purchaseStyles.metaDot} />
          <span className={purchaseStyles.metaItem}>
            <span className={purchaseStyles.metaLabel}>Scheduled</span>
            {formatDate(purchase.scheduledDate)}
          </span>
          <span className={purchaseStyles.metaDot} />
          <span className={purchaseStyles.metaItem}>
            <span className={purchaseStyles.metaLabel}>Paid via</span>
            {purchase.paymentMethod}
          </span>
          <span className={purchaseStyles.metaDot} />
          <span className={purchaseStyles.price}>{formatPrice(purchase.price)}</span>
        </div>
      </div>

      {/* Expandable details */}
      {expanded && (
        <div className={purchaseStyles.cardDetails}>
          <p className={purchaseStyles.detailsHeading}>Included in this package:</p>
          <ul className={purchaseStyles.itemsList}>
            {purchase.items.map((item, i) => (
              <li key={i} className={purchaseStyles.itemsListItem}>
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Card actions */}
      <div className={purchaseStyles.cardActions}>
        <button
          type="button"
          className={purchaseStyles.actionLink}
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? 'Hide details' : 'View details'}
        </button>

        <button type="button" className={purchaseStyles.actionLink}>
          Download receipt
        </button>

        {purchase.status === 'Completed' && (
          <button type="button" className={purchaseStyles.actionLink}>
            Leave a review
          </button>
        )}

        {(purchase.status === 'Pending' || purchase.status === 'Confirmed') && (
          <button type="button" className={`${purchaseStyles.actionLink} ${purchaseStyles.actionDanger}`}>
            Cancel booking
          </button>
        )}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function PurchasesPage() {
  const { user } = useProfile();
  const router = useRouter();
  const [isSeller, setIsSeller] = useState(false);
  const [activeFilter, setActiveFilter] = useState('All');
  const [search, setSearch] = useState('');

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

  if (isSeller) {
    return (
      <div className={styles.profileCard}>
        <header className={styles.profileHeader}>
          <h1 className={styles.profileTitle}>Purchases</h1>
          <p className={styles.profileSubtitle}>
            You are signed in as a seller. Sellers cannot view buyer purchase history.
          </p>
        </header>
        <div className={styles.tabBody}>
          <button
            className={styles.primaryButton}
            type="button"
            onClick={() => router.push('/')}
          >
            Back to homepage
          </button>
        </div>
      </div>
    );
  }

  const filtered = MOCK_PURCHASES.filter((p) => {
    const matchStatus = activeFilter === 'All' || p.status === activeFilter;
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      p.service.toLowerCase().includes(q) ||
      p.provider.toLowerCase().includes(q) ||
      p.id.toLowerCase().includes(q);
    return matchStatus && matchSearch;
  });

  return (
    <div className={styles.profileCard}>
      <header className={styles.profileHeader}>
        <h1 className={styles.profileTitle}>Purchases</h1>
        <p className={styles.profileSubtitle}>
          Review your previous and upcoming service bookings.
        </p>
        <p className={styles.profileSignedIn}>
          Signed in as <strong>{user.email}</strong>
        </p>
      </header>

      <div className={purchaseStyles.purchasesBody}>
        {/* Toolbar */}
        <div className={purchaseStyles.toolbar}>
          {/* Search */}
          <div className={purchaseStyles.searchWrapper}>
            <svg className={purchaseStyles.searchIcon} viewBox="0 0 20 20" fill="none">
              <circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="1.6" />
              <path d="M14 14l3 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
            <input
              type="text"
              className={purchaseStyles.searchInput}
              placeholder="Search by service, provider, or order ID…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Status filters */}
          <div className={purchaseStyles.filters}>
            {ALL_STATUSES.map((s) => (
              <button
                key={s}
                type="button"
                className={`${purchaseStyles.filterBtn} ${
                  activeFilter === s ? purchaseStyles.filterBtnActive : ''
                }`}
                onClick={() => setActiveFilter(s)}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* List */}
        {filtered.length === 0 ? (
          <div className={purchaseStyles.emptyState}>
            <p className={purchaseStyles.emptyText}>
              {search || activeFilter !== 'All'
                ? 'No purchases match your filter.'
                : 'Your purchases will appear here once you place an order.'}
            </p>
          </div>
        ) : (
          <div className={purchaseStyles.cardList}>
            {filtered.map((p) => (
              <PurchaseCard key={p.id} purchase={p} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}