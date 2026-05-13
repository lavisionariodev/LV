'use client'

import Link from 'next/link'
import styles from '../settings.module.css'
import {
  defaultBucketChannels,
  mergeSellerNotificationPreferences,
  SELLER_NOTIFICATION_BUCKETS,
} from '@/lib/notifications/preferenceSchema'
import {
  fetchSellerNotificationPreferences,
  saveSellerNotificationPreferences,
} from '@/lib/notifications/preferencesClient'
import { NOTIFICATION_PREFERENCE_CHANNELS } from '@/lib/notifications/notificationPreferenceChannels'
import { NotificationPrefSwitch } from '@/lib/notifications/NotificationPrefSwitch'
import { useNotificationPreferences } from '@/lib/notifications/useNotificationPreferences'

const CATEGORIES = [
  {
    key: 'order',
    title: 'Orders & bookings',
    description: 'Confirmations, service progress, and booking updates.',
  },
  {
    key: 'payment',
    title: 'Payments & refunds',
    description: 'Paid bookings, refunds, and payout-related notices.',
  },
  {
    key: 'listing',
    title: 'Listings & approvals',
    description: 'Listing submissions, approvals, and review outcomes.',
  },
  {
    key: 'alert',
    title: 'Alerts & disputes',
    description: 'Urgent booking issues, disputes, and operational alerts.',
  },
  {
    key: 'system',
    title: 'System & account',
    description: 'Platform updates, account notices, and support replies.',
  },
]

function defaultPrefs() {
  const out = {}
  for (const key of SELLER_NOTIFICATION_BUCKETS) {
    out[key] = defaultBucketChannels()
  }
  return out
}

export default function SellerNotificationPreferencesPanel() {
  const { prefs, loading, saveError, toggleChannel } = useNotificationPreferences({
    fetchPreferences: fetchSellerNotificationPreferences,
    savePreferences: saveSellerNotificationPreferences,
    mergePreferences: mergeSellerNotificationPreferences,
    defaultPreferences: defaultPrefs,
    debounceMs: 450,
    loadErrorMessage: 'Failed to load notification preferences.',
    saveErrorMessage: 'Failed to save notification preferences.',
  })

  return (
    <div className={styles.notifPrefPanel}>
      <p className={styles.tabDetailSubtitle}>
        Choose which seller alerts can reach you in-app or by email. Open your{' '}
        <Link href="/seller/notifications" className={styles.inlineLink}>
          notification inbox
        </Link>{' '}
        to review recent activity.
      </p>
      {loading ? <p className={styles.loadingText}>Loading notification preferences…</p> : null}
      {saveError ? <p className={styles.notifPrefError}>{saveError}</p> : null}
      <div className={styles.notifPrefList}>
        {CATEGORIES.map((category, index) => (
          <div
            key={category.key}
            className={`${styles.notifPrefRow} ${index > 0 ? styles.notifPrefRowBorder : ''}`}
          >
            <div className={styles.notifPrefMeta}>
              <p className={styles.notifPrefTitle} id={`seller-notif-pref-${category.key}`}>
                {category.title}
              </p>
              <p className={styles.notifPrefDesc}>{category.description}</p>
            </div>
            <div className={styles.notifPrefControls}>
              {NOTIFICATION_PREFERENCE_CHANNELS.map((channel) => (
                <div key={channel.id} className={styles.notifPrefChannel}>
                  <div className={styles.notifPrefChannelLabel}>
                    <span className={styles.notifPrefChannelName}>{channel.label}</span>
                    {channel.hint ? <span className={styles.notifPrefChannelHint}>{channel.hint}</span> : null}
                  </div>
                  <NotificationPrefSwitch
                    checked={Boolean(prefs[category.key]?.[channel.id])}
                    onToggle={(value) => toggleChannel(category.key, channel.id, value)}
                    disabled={loading}
                    labelledBy={`seller-notif-pref-${category.key}`}
                    styles={styles}
                  />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
