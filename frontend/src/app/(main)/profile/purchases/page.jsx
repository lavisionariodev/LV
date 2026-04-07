'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useProfile } from '@/contexts/ProfileContext';
import { getUserRole, ROLE_SELLER } from '@/lib/auth/roles';
import styles from '../profile.module.css';
import purchaseStyles from './purchases.module.css';

const STATUS_CONFIG = {
  Pending:       { color: '#A8894A', bg: 'rgba(168,137,74,0.10)' },
  Confirmed:     { color: '#204F38', bg: 'rgba(32,79,56,0.10)'   },
  'In Progress': { color: '#2563EB', bg: 'rgba(37,99,235,0.09)'  },
  Completed:     { color: '#16a34a', bg: 'rgba(22,163,74,0.10)'  },
  Cancelled:     { color: '#dc2626', bg: 'rgba(220,38,38,0.09)'  },
};

const ALL_STATUSES = ['All', ...Object.keys(STATUS_CONFIG)];
const PAGE_SIZE = 5;

const MOCK_PURCHASES = [
  { id: 'ORD-00123', service: 'Full Burial Package', provider: 'Serenity Memorial Services', bookedDate: '2025-03-10', scheduledDate: '2025-03-18', status: 'Completed', price: 85000, paymentMethod: 'GCash', items: ['Casket selection', 'Embalming', 'Chapel service (2 days)', 'Hearse transport'] },
  { id: 'ORD-00141', service: 'Cremation Package', provider: 'Eternal Light Crematorium', bookedDate: '2025-05-02', scheduledDate: '2025-05-09', status: 'Confirmed', price: 32000, paymentMethod: 'Bank Transfer', items: ['Direct cremation', 'Urn (standard)', 'Death certificate assistance'] },
  { id: 'ORD-00158', service: 'Memorial Flowers Arrangement', provider: 'Grace Blooms', bookedDate: '2025-05-15', scheduledDate: '2025-05-20', status: 'Pending', price: 4500, paymentMethod: 'Credit Card', items: ['Wreath (large)', 'Standing spray x2', 'Casket spray'] },
  { id: 'ORD-00172', service: 'Grief Counseling Session', provider: 'Healing Hearts PH', bookedDate: '2025-06-01', scheduledDate: '2025-06-07', status: 'In Progress', price: 2500, paymentMethod: 'Maya', items: ['1-hour individual session', 'Follow-up email support'] },
  { id: 'ORD-00180', service: 'Obituary & Prayer Card Printing', provider: 'Remembrance Print Co.', bookedDate: '2025-06-10', scheduledDate: '2025-06-13', status: 'Cancelled', price: 1800, paymentMethod: 'GCash', items: ['Obituary layout (1 page)', 'Prayer cards x50'] },
];

function formatPrice(amount) { return '₱' + amount.toLocaleString('en-PH'); }
function formatDate(dateStr) { return new Date(dateStr).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' }); }

function PurchaseCard({ purchase }) {
  const [expanded, setExpanded] = useState(false);
  const cfg = STATUS_CONFIG[purchase.status] ?? STATUS_CONFIG['Pending'];
  return (
    <div className={purchaseStyles.card}>
      <div className={purchaseStyles.cardHeader}>
        <div className={purchaseStyles.cardTop}>
          <div className={purchaseStyles.cardInfo}>
            <span className={purchaseStyles.orderId}>{purchase.id}</span>
            <h3 className={purchaseStyles.serviceName}>{purchase.service}</h3>
            <span className={purchaseStyles.providerName}>{purchase.provider}</span>
          </div>
          <span className={purchaseStyles.statusBadge} style={{ color: cfg.color, background: cfg.bg }}>{purchase.status}</span>
        </div>
        <div className={purchaseStyles.cardMeta}>
          <span className={purchaseStyles.metaItem}><span className={purchaseStyles.metaLabel}>Booked</span>{formatDate(purchase.bookedDate)}</span>
          <span className={purchaseStyles.metaDot} />
          <span className={purchaseStyles.metaItem}><span className={purchaseStyles.metaLabel}>Scheduled</span>{formatDate(purchase.scheduledDate)}</span>
          <span className={purchaseStyles.metaDot} />
          <span className={purchaseStyles.metaItem}><span className={purchaseStyles.metaLabel}>Paid via</span>{purchase.paymentMethod}</span>
          <span className={purchaseStyles.metaDot} />
          <span className={purchaseStyles.price}>{formatPrice(purchase.price)}</span>
        </div>
      </div>
      {expanded && (
        <div className={purchaseStyles.cardDetails}>
          <p className={purchaseStyles.detailsHeading}>Included in this package:</p>
          <ul className={purchaseStyles.itemsList}>
            {purchase.items.map((item, i) => <li key={i} className={purchaseStyles.itemsListItem}>{item}</li>)}
          </ul>
        </div>
      )}
      <div className={purchaseStyles.cardActions}>
        <button type="button" className={purchaseStyles.actionLink} onClick={() => setExpanded(v => !v)}>{expanded ? 'Hide details' : 'View details'}</button>
        <button type="button" className={purchaseStyles.actionLink}>Download receipt</button>
        {purchase.status === 'Completed' && <button type="button" className={purchaseStyles.actionLink}>Leave a review</button>}
        {(purchase.status === 'Pending' || purchase.status === 'Confirmed') && (
          <button type="button" className={`${purchaseStyles.actionLink} ${purchaseStyles.actionDanger}`}>Cancel booking</button>
        )}
      </div>
    </div>
  );
}

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

  useEffect(() => { setCurrentPage(1); }, [activeFilter, search]);

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

  const filtered = MOCK_PURCHASES.filter(p => {
    const matchStatus = activeFilter === 'All' || p.status === activeFilter;
    const q = search.toLowerCase();
    const matchSearch = !q || p.service.toLowerCase().includes(q) || p.provider.toLowerCase().includes(q) || p.id.toLowerCase().includes(q);
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
            <input type="text" className={purchaseStyles.searchInput} placeholder="Search by service, provider, or order ID…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div className={purchaseStyles.filters}>
            {ALL_STATUSES.map(s => (
              <button key={s} type="button" className={`${purchaseStyles.filterBtn} ${activeFilter === s ? purchaseStyles.filterBtnActive : ''}`} onClick={() => setActiveFilter(s)}>{s}</button>
            ))}
          </div>
        </div>
        {filtered.length === 0 ? (
          <div className={purchaseStyles.emptyState}>
            <p className={purchaseStyles.emptyText}>{search || activeFilter !== 'All' ? 'No purchases match your filter.' : 'Your purchases will appear here once you place an order.'}</p>
          </div>
        ) : (
          <>
            <div className={purchaseStyles.paginationMeta}>Showing {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filtered.length)} of {filtered.length} {filtered.length === 1 ? 'order' : 'orders'}</div>
            <div className={purchaseStyles.cardList}>{paginated.map(p => <PurchaseCard key={p.id} purchase={p} />)}</div>
            <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
          </>
        )}
      </div>
    </div>
  );
}