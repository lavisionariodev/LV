'use client';

import { useProfile } from '@/contexts/ProfileContext';
import styles from '../profile.module.css';
import notifStyles from './notifications.module.css';
import { useState, useMemo, useEffect, useCallback } from 'react';

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'service', label: 'Service updates' },
  { id: 'payment', label: 'Payments' },
  { id: 'message', label: 'Messages' },
  { id: 'reminder', label: 'Reminders' },
  { id: 'account', label: 'Account' },
];

const ICON_MAP = {
  service_scheduled: (
    <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="1" y="2" width="14" height="12" rx="2" stroke="currentColor" strokeWidth="1.3" />
      <path d="M1 6h14" stroke="currentColor" strokeWidth="1.3" />
      <path d="M5 1v2M11 1v2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <circle cx="5.5" cy="9.5" r="1" fill="currentColor" />
      <circle cx="8" cy="9.5" r="1" fill="currentColor" />
      <circle cx="10.5" cy="9.5" r="1" fill="currentColor" />
    </svg>
  ),
  service_inprogress: (
    <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.3" />
      <path d="M8 4.5v3.8l2.5 1.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  service_completed: (
    <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.3" />
      <path d="M5 8.5l2 2 4-4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  service_alert: (
    <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M8 1.5L14.5 13H1.5L8 1.5z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
      <path d="M8 6v3.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <circle cx="8" cy="11.5" r="0.8" fill="currentColor" />
    </svg>
  ),
  payment_success: (
    <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="1.5" y="4" width="13" height="9" rx="2" stroke="currentColor" strokeWidth="1.3" />
      <path d="M1.5 7h13" stroke="currentColor" strokeWidth="1.3" />
      <circle cx="5" cy="10" r="1" fill="currentColor" />
    </svg>
  ),
  payment_failed: (
    <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="1.5" y="4" width="13" height="9" rx="2" stroke="currentColor" strokeWidth="1.3" />
      <path d="M1.5 7h13" stroke="currentColor" strokeWidth="1.3" />
      <path d="M9.5 9.5l1.5 1.5M11 9.5l-1.5 1.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  ),
  payment_refund: (
    <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M13 5H6a3 3 0 000 6h7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <path d="M11 3l2 2-2 2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  message: (
    <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M2 3.5h12v8a1 1 0 01-1 1H3a1 1 0 01-1-1V3.5z" stroke="currentColor" strokeWidth="1.3" />
      <path d="M2 3.5l6 5 6-5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  reminder: (
    <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M8 1.5A5.5 5.5 0 118 12.5 5.5 5.5 0 018 1.5z" stroke="currentColor" strokeWidth="1.3" />
      <path d="M8 4v4.2l2.5 1.3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 13.5c1.1.7 2.5 1 4 1s2.9-.3 4-1" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  ),
  account_security: (
    <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="8" cy="5.5" r="2.5" stroke="currentColor" strokeWidth="1.3" />
      <path d="M2.5 13.5c0-3 2.5-5 5.5-5s5.5 2 5.5 5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  ),
  account_profile: (
    <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M10.5 2.5l3 3-7 7H3.5V9l7-6.5z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
    </svg>
  ),
  alerts: (
    <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M8 1.5L14.5 13H1.5L8 1.5z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
      <path d="M8 6v3.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <circle cx="8" cy="11.5" r="0.8" fill="currentColor" />
    </svg>
  ),
};

function sameCalendarDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function dayLabelForDate(d) {
  const now = new Date();
  if (sameCalendarDay(d, now)) return 'Today';
  const y = new Date(now);
  y.setDate(y.getDate() - 1);
  if (sameCalendarDay(d, y)) return 'Yesterday';
  return d.toLocaleDateString('en-PH', { dateStyle: 'medium' });
}

function mapApiRowToBuyerNotification(row) {
  const created = new Date(row.createdAt);
  const t = String(row.type || '');
  let iconKey = 'account_profile';
  if (t === 'payment_refund') iconKey = 'payment_refund';
  else if (t.startsWith('payment')) iconKey = t.includes('fail') ? 'payment_failed' : 'payment_success';
  else if (t === 'service_alert') iconKey = 'service_alert';
  else if (t === 'service_completed') iconKey = 'service_completed';
  else if (t === 'service_confirmed') iconKey = 'service_scheduled';
  else if (t.startsWith('service')) iconKey = 'service_inprogress';
  else if (t === 'reminder') iconKey = 'reminder';
  else if (t === 'message') iconKey = 'message';
  else if (t === 'alerts') iconKey = 'alerts';
  else if (t === 'listing_approval' || t === 'listing_rejected') iconKey = 'account_profile';

  let variant = 'amber';
  if (t.startsWith('payment') || t === 'payment_refund') variant = t.includes('fail') ? 'red' : 'blue';
  else if (t === 'service_alert' || t.includes('alert')) variant = 'red';
  else if (t === 'service' || t.startsWith('service')) variant = 'green';
  else if (t === 'message') variant = 'purple';
  else if (t === 'reminder') variant = 'amber';
  else if (t === 'account' || t === 'alerts') variant = 'red';
  else if (t === 'listing_rejected') variant = 'red';
  else if (t === 'listing_approval') variant = 'green';

  let filterType = 'account';
  if (t.startsWith('payment') || t === 'payment_refund') filterType = 'payment';
  else if (t === 'service_alert' || t.startsWith('service')) filterType = 'service';
  else if (t === 'message') filterType = 'message';
  else if (t === 'reminder') filterType = 'reminder';
  else if (t === 'listing_approval' || t === 'listing_rejected') filterType = 'account';

  const tag =
    t === 'payment_refund'
      ? 'Refund'
      : t.startsWith('payment')
        ? 'Payment'
        : t === 'service_alert'
          ? 'Alert'
          : t.startsWith('service')
            ? 'Service'
            : t === 'message'
              ? 'Message'
              : t === 'reminder'
                ? 'Reminder'
                : t === 'listing_approval'
                  ? 'Listing'
                  : t === 'listing_rejected'
                    ? 'Listing'
                    : 'Account';

  return {
    id: row.id,
    type: filterType,
    iconKey,
    variant,
    unread: !row.readAt,
    day: dayLabelForDate(created),
    time: created.toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit' }),
    title: row.title || 'Notification',
    body: row.body || '',
    tag,
  };
}

const PAGE_SIZE = 7;

export default function NotificationsPage() {
  const { loading, user } = useProfile();
  const [apiRows, setApiRows] = useState([]);
  const [feedLoading, setFeedLoading] = useState(true);

  const [activeFilter, setActiveFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);

  const loadFeed = useCallback(async () => {
    if (!user) {
      setApiRows([]);
      setFeedLoading(false);
      return;
    }
    setFeedLoading(true);
    const res = await fetch('/api/notifications?limit=100', { cache: 'no-store' });
    const body = await res.json().catch(() => null);
    if (!res.ok) {
      setApiRows([]);
      setFeedLoading(false);
      return;
    }
    setApiRows(Array.isArray(body?.notifications) ? body.notifications : []);
    setFeedLoading(false);
  }, [user]);

  useEffect(() => {
    if (loading) return;
    queueMicrotask(() => {
      loadFeed();
    });
  }, [loading, loadFeed]);

  const notifications = useMemo(() => apiRows.map(mapApiRowToBuyerNotification), [apiRows]);

  const unreadCount = notifications.filter((n) => n.unread).length;

  const filtered = useMemo(() => {
    if (activeFilter === 'all') return notifications;
    return notifications.filter((n) => n.type === activeFilter);
  }, [notifications, activeFilter]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

  const paginated = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, currentPage]);

  const grouped = useMemo(() => {
    const map = [];
    const seen = {};
    paginated.forEach((n) => {
      if (!seen[n.day]) {
        seen[n.day] = true;
        map.push({ day: n.day, items: [] });
      }
      map[map.length - 1].items.push(n);
    });
    return map;
  }, [paginated]);

  async function markRead(id) {
    await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: String(id) }),
    });
    setApiRows((prev) =>
      prev.map((r) => (String(r.id) === String(id) ? { ...r, readAt: new Date().toISOString() } : r)),
    );
  }

  async function markAllRead() {
    await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ markAllRead: true }),
    });
    const nowIso = new Date().toISOString();
    setApiRows((prev) => prev.map((r) => ({ ...r, readAt: r.readAt || nowIso })));
  }

  function handleFilterChange(filterId) {
    setActiveFilter(filterId);
    setCurrentPage(1);
  }

  if (loading) {
    return (
      <div
        className={styles.profileCard}
        aria-busy="true"
        aria-describedby="profile-notifications-skel-hint"
      >
        <p id="profile-notifications-skel-hint" role="status" className={styles.visuallyHidden}>
          Loading notifications. Filters and your activity feed will appear shortly.
        </p>
        <div className={styles.profileAccentBar} />
        <header className={styles.profileHeader} aria-hidden="true">
          <div className={notifStyles.headerWrap}>
            <div className={notifStyles.headerTop}>
              <div className={notifStyles.headerText}>
                <div className={`${styles.skBlock} ${styles.skNotifHeaderTitle}`} />
                <div className={`${styles.skBlock} ${styles.skLayoutSub} ${styles.skNotifHeaderSub}`} />
              </div>
              <div className={notifStyles.headerActions}>
                <div className={`${styles.skBlock} ${styles.skHeaderBadge}`} />
              </div>
            </div>
            <div className={notifStyles.filterRow}>
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className={`${styles.skBlock} ${styles.skFilterBtn} ${i % 2 ? styles.skFilterBtnWide : styles.skFilterBtnNarrow}`}
                />
              ))}
            </div>
          </div>
        </header>
        <div className={notifStyles.feed} aria-hidden="true">
          <div className={`${styles.skBlock} ${styles.skNotifDay}`} />
          {['n1', 'n2', 'n3', 'n4'].map((k) => (
            <div key={k} className={styles.skNotifRow}>
              <div className={`${styles.skBlock} ${styles.skNotifIcon}`} />
              <div className={styles.skNotifBody}>
                <div className={`${styles.skBlock} ${styles.skNotifTitle}`} />
                <div className={`${styles.skBlock} ${styles.skNotifText}`} />
                <div className={`${styles.skBlock} ${styles.skNotifText} ${styles.skNotifText2}`} />
                <div className={`${styles.skBlock} ${styles.skNotifTime}`} />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.profileCard}>
      <div className={styles.profileAccentBar} />

      <header className={styles.profileHeader}>
        <div className={notifStyles.headerWrap}>
          <div className={notifStyles.headerTop}>
            <div className={notifStyles.headerText}>
              <p className={styles.profileEyebrow}>Notifications</p>
              <p className={styles.profileSignedIn}>Real-time updates on your services and activity.</p>
            </div>
            <div className={notifStyles.headerActions}>
              {unreadCount > 0 && <span className={notifStyles.unreadBadge}>{unreadCount} unread</span>}
              {unreadCount > 0 && <button type="button" className={notifStyles.markAllBtn} onClick={markAllRead}>Mark all as read</button>}
            </div>
          </div>
          <div className={notifStyles.filterRow}>
            {FILTERS.map((f) => (
              <button key={f.id} type="button"
                className={`${notifStyles.filterBtn} ${activeFilter === f.id ? notifStyles.filterBtnActive : ''}`}
                onClick={() => handleFilterChange(f.id)}>
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className={notifStyles.feed}>
        {feedLoading && notifications.length === 0 ? (
          <div className={notifStyles.emptyState}>Loading notifications…</div>
        ) : grouped.length === 0 ? (
          <div className={notifStyles.emptyState}>No notifications in this category.</div>
        ) : (
          grouped.map((group) => (
            <div key={group.day}>
              <div className={notifStyles.dayLabel}>{group.day}</div>
              {group.items.map((notif) => (
                <div key={notif.id}
                  className={`${notifStyles.notifItem} ${notif.unread ? notifStyles.notifItemUnread : ''}`}
                  onClick={() => markRead(notif.id)} role="button" tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && markRead(notif.id)}>
                  {notif.unread && <span className={notifStyles.unreadTopRight} aria-hidden="true" />}
                  <div className={`${notifStyles.iconWrap} ${notifStyles[`iconWrap_${notif.variant}`]}`}>
                    {ICON_MAP[notif.iconKey] || ICON_MAP.account_profile}
                  </div>
                  <div className={notifStyles.notifContent}>
                    <div className={notifStyles.notifTitle}>
                      {notif.title}
                      <span className={`${notifStyles.tag} ${notifStyles[`tag_${notif.variant}`]}`}>{notif.tag}</span>
                    </div>
                    <p className={notifStyles.notifBody}>{notif.body}</p>
                    <span className={notifStyles.notifTime}>{notif.time}</span>
                  </div>
                </div>
              ))}
            </div>
          ))
        )}
      </div>

      {totalPages > 1 && (
        <div className={notifStyles.pagination}>
          <button type="button" className={notifStyles.pageBtn} onClick={() => setCurrentPage(p => p - 1)} disabled={currentPage === 1} aria-label="Previous page">
            <svg viewBox="0 0 16 16" fill="none" width="14" height="14"><path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
          <div className={notifStyles.pageNumbers}>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button key={page} type="button"
                className={`${notifStyles.pageNumBtn} ${currentPage === page ? notifStyles.pageNumBtnActive : ''}`}
                onClick={() => setCurrentPage(page)} aria-label={`Page ${page}`} aria-current={currentPage === page ? 'page' : undefined}>
                {page}
              </button>
            ))}
          </div>
          <button type="button" className={notifStyles.pageBtn} onClick={() => setCurrentPage(p => p + 1)} disabled={currentPage === totalPages} aria-label="Next page">
            <svg viewBox="0 0 16 16" fill="none" width="14" height="14"><path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
        </div>
      )}
    </div>
  );
}