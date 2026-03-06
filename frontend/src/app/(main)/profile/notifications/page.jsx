'use client';

import { useProfile } from '@/contexts/ProfileContext';
import styles from '../profile.module.css';
import notifStyles from './notifications.module.css';
import { useState } from 'react';

const NOTIFICATION_GROUPS = [
  {
    id: 'bookings',
    label: 'Bookings & Orders',
    description: 'Confirmations, status changes, and updates on your service bookings.',
    items: [
      { id: 'booking_confirmed', label: 'Booking confirmed' },
      { id: 'booking_status', label: 'Booking status changes (Pending → Confirmed → Completed)' },
      { id: 'booking_cancelled', label: 'Booking cancellation notices' },
    ],
  },
  {
    id: 'payments',
    label: 'Payments & Receipts',
    description: 'Payment confirmations, failures, and refund updates.',
    items: [
      { id: 'payment_received', label: 'Payment received' },
      { id: 'payment_failed', label: 'Payment failed or declined' },
      { id: 'refund_issued', label: 'Refund issued' },
    ],
  },
  {
    id: 'providers',
    label: 'Provider Messages',
    description: 'Messages and updates sent by service providers related to your bookings.',
    items: [
      { id: 'provider_message', label: 'New message from a provider' },
      { id: 'provider_update', label: 'Provider update on a scheduled service' },
    ],
  },
  {
    id: 'reminders',
    label: 'Reminders',
    description: 'Upcoming service reminders and important scheduling alerts.',
    items: [
      { id: 'reminder_upcoming', label: 'Upcoming scheduled service reminder' },
      { id: 'reminder_followup', label: 'Post-service follow-up reminder' },
    ],
  },
  {
    id: 'account',
    label: 'Account Alerts',
    description: 'Security and account activity notifications.',
    items: [
      { id: 'account_password', label: 'Password changed' },
      { id: 'account_login', label: 'New login detected' },
      { id: 'account_profile', label: 'Profile updated' },
    ],
  },
  {
    id: 'platform',
    label: 'Platform & Announcements',
    description: 'New services, policy updates, and promotional offers from LV.',
    items: [
      { id: 'platform_new_services', label: 'New services available near you' },
      { id: 'platform_policy', label: 'Policy or terms updates' },
      { id: 'platform_promos', label: 'Promotional offers and announcements' },
    ],
  },
];

const CHANNELS = ['Email', 'In-App'];

function buildDefaultPrefs() {
  const prefs = {};
  for (const group of NOTIFICATION_GROUPS) {
    for (const item of group.items) {
      prefs[item.id] = { Email: true, 'In-App': true };
    }
  }
  return prefs;
}

export default function NotificationsPage() {
  const { user } = useProfile();
  const [prefs, setPrefs] = useState(buildDefaultPrefs);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  function toggle(itemId, channel) {
    setPrefs((prev) => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        [channel]: !prev[itemId][channel],
      },
    }));
    setSaved(false);
  }

  function isGroupAllOn(group, channel) {
    return group.items.every((item) => prefs[item.id]?.[channel]);
  }

  function toggleGroup(group, channel) {
    const allOn = isGroupAllOn(group, channel);
    setPrefs((prev) => {
      const next = { ...prev };
      for (const item of group.items) {
        next[item.id] = { ...next[item.id], [channel]: !allOn };
      }
      return next;
    });
    setSaved(false);
  }

  async function handleSave() {
    setSaving(true);
    await new Promise((r) => setTimeout(r, 800));
    setSaving(false);
    setSaved(true);
  }

  return (
    <div className={styles.profileCard}>
      <header className={styles.profileHeader}>
        <h1 className={styles.profileTitle}>Notifications</h1>
        <p className={styles.profileSubtitle}>
          Choose how and when you want to be notified about your activity on LV.
        </p>
        <p className={styles.profileSignedIn}>
          Signed in as <strong>{user.email}</strong>
        </p>
      </header>

      <div className={notifStyles.notifBody}>
        {/* Channel header */}
        <div className={notifStyles.channelHeader}>
          <span className={notifStyles.channelHeaderSpacer} />
          {CHANNELS.map((ch) => (
            <span key={ch} className={notifStyles.channelLabel}>
              {ch}
            </span>
          ))}
        </div>

        {/* Groups */}
        <div className={notifStyles.groupList}>
          {NOTIFICATION_GROUPS.map((group) => (
            <div key={group.id} className={notifStyles.group}>
              {/* Group header row */}
              <div className={notifStyles.groupHeaderRow}>
                <div className={notifStyles.groupMeta}>
                  <span className={notifStyles.groupLabel}>{group.label}</span>
                  <span className={notifStyles.groupDesc}>{group.description}</span>
                </div>
                {CHANNELS.map((ch) => (
                  <button
                    key={ch}
                    type="button"
                    className={`${notifStyles.toggleAll} ${
                      isGroupAllOn(group, ch) ? notifStyles.toggleAllOn : ''
                    }`}
                    onClick={() => toggleGroup(group, ch)}
                    title={isGroupAllOn(group, ch) ? `Disable all ${ch}` : `Enable all ${ch}`}
                  >
                    {isGroupAllOn(group, ch) ? 'All on' : 'All off'}
                  </button>
                ))}
              </div>

              {/* Individual items */}
              <div className={notifStyles.itemList}>
                {group.items.map((item) => (
                  <div key={item.id} className={notifStyles.itemRow}>
                    <span className={notifStyles.itemLabel}>{item.label}</span>
                    {CHANNELS.map((ch) => (
                      <button
                        key={ch}
                        type="button"
                        role="switch"
                        aria-checked={prefs[item.id]?.[ch]}
                        className={`${notifStyles.toggle} ${
                          prefs[item.id]?.[ch] ? notifStyles.toggleOn : ''
                        }`}
                        onClick={() => toggle(item.id, ch)}
                      >
                        <span className={notifStyles.toggleThumb} />
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Save row */}
        <div className={notifStyles.saveRow}>
          {saved && (
            <span className={notifStyles.savedBadge}>✓ Preferences saved</span>
          )}
          <button
            type="button"
            className={styles.primaryButton}
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save preferences'}
          </button>
        </div>
      </div>
    </div>
  );
}