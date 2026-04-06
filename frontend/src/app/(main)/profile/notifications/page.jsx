'use client';

import { useProfile } from '@/contexts/ProfileContext';
import styles from '../profile.module.css';
import notifStyles from './notifications.module.css';
import { useState, useMemo, useEffect } from 'react';

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
};

const SAMPLE_NOTIFICATIONS = [
  { id: 1, type: 'service', iconKey: 'service_inprogress', variant: 'amber', unread: true, day: 'Today', time: 'Just now', title: 'Preparation in progress', body: 'Body preparation for the Reyes family has begun. Estimated completion by 3:00 PM today.', tag: 'In progress' },
  { id: 2, type: 'message', iconKey: 'message', variant: 'purple', unread: true, day: 'Today', time: '18 min ago', title: 'New message from your provider', body: 'La Visionario Staff: "The floral arrangement and casket display for the Santos family are ready for your review."', tag: 'Message' },
  { id: 3, type: 'service', iconKey: 'service_scheduled', variant: 'green', unread: true, day: 'Today', time: '1 hr ago', title: 'Burial service scheduled', body: 'The interment for the Santos family has been confirmed at Loyola Memorial Park — Chapel B, April 2 at 10:00 AM.', tag: 'Confirmed' },
  { id: 4, type: 'payment', iconKey: 'payment_success', variant: 'blue', unread: true, day: 'Today', time: '5 hrs ago', title: 'Payment received', body: '₱45,000 deposit for the full burial package (Order #LV-20481) has been confirmed. Thank you.', tag: 'Paid' },
  { id: 5, type: 'service', iconKey: 'service_completed', variant: 'green', unread: false, day: 'Yesterday', time: 'Yesterday, 4:30 PM', title: 'Service completed', body: 'All rites for the Dela Cruz family interment have been concluded. A follow-up summary has been sent to your email.', tag: 'Completed' },
  { id: 6, type: 'reminder', iconKey: 'reminder', variant: 'amber', unread: false, day: 'Yesterday', time: 'Yesterday, 9:00 AM', title: 'Reminder — Wake viewing tomorrow', body: 'The Reyes family wake viewing begins tomorrow at 3:00 PM in Chapel A. Please arrive 30 minutes early for coordination.', tag: 'Reminder' },
  { id: 7, type: 'service', iconKey: 'service_alert', variant: 'red', unread: false, day: 'Earlier', time: '2 days ago', title: 'Schedule adjusted — Dela Cruz wake', body: 'The wake has been moved from 2:00 PM to 5:00 PM due to a venue conflict. All registered guests have been notified.', tag: 'Updated' },
  { id: 8, type: 'payment', iconKey: 'payment_failed', variant: 'red', unread: false, day: 'Earlier', time: '3 days ago', title: 'Payment failed — action needed', body: 'The remaining balance of ₱15,000 for Order #LV-20481 could not be processed. Please update your payment method.', tag: 'Failed' },
  { id: 9, type: 'message', iconKey: 'message', variant: 'purple', unread: false, day: 'Earlier', time: '4 days ago', title: 'Provider update — hearse confirmed', body: 'La Visionario Staff: "The hearse and funeral cortege for the Santos service have been confirmed for April 2 at 9:00 AM."', tag: 'Message' },
  { id: 10, type: 'account', iconKey: 'account_security', variant: 'red', unread: false, day: 'Earlier', time: '5 days ago', title: 'New login detected', body: "A new sign-in was detected from Chrome on Windows in Manila, PH. If this wasn't you, secure your account immediately.", tag: 'Security' },
];

const PAGE_SIZE = 7;

export default function NotificationsPage() {
  const { user } = useProfile();
  const [notifications, setNotifications] = useState(SAMPLE_NOTIFICATIONS);
  const [activeFilter, setActiveFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);

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

  function markRead(id) {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, unread: false } : n)));
  }
  function markAllRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
  }
  function handleFilterChange(filterId) {
    setActiveFilter(filterId);
    setCurrentPage(1);
  }

  return (
    <div className={styles.profileCard}>
      <div className={styles.profileAccentBar} />

      <header className={styles.profileHeader}>
        <div className={notifStyles.headerWrap}>
          <div className={notifStyles.headerTop}>
            <div>
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
        {grouped.length === 0 ? (
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
                  <span className={`${notifStyles.unreadPip} ${notif.unread ? '' : notifStyles.unreadPipHidden}`} />
                  <div className={`${notifStyles.iconWrap} ${notifStyles[`iconWrap_${notif.variant}`]}`}>
                    {ICON_MAP[notif.iconKey]}
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