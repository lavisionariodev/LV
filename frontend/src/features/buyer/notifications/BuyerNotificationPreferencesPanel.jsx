'use client'

import Link from 'next/link'
import {
  BUYER_NOTIFICATION_BUCKETS,
  defaultBucketChannels,
  mergeBuyerNotificationPreferences,
} from '@/lib/notifications/preferenceSchema'
import {
  fetchBuyerNotificationPreferences,
  saveBuyerNotificationPreferences,
} from '@/lib/notifications/preferencesClient'
import { NOTIFICATION_PREFERENCE_CHANNELS } from '@/lib/notifications/notificationPreferenceChannels'
import { NotificationPrefSwitch } from '@/lib/notifications/NotificationPrefSwitch'
import { useNotificationPreferences } from '@/lib/notifications/useNotificationPreferences'
import switchStyles from '@/app/seller/settings/settings.module.css'
import styles from '@/app/(main)/profile/notifications/notifications.module.css'

const CATEGORIES = [
  {
    key: 'service',
    title: 'Service updates',
    description: 'Booking confirmations, progress, and completion notices.',
  },
  {
    key: 'payment',
    title: 'Payments',
    description: 'Receipts, failed payments, and refund updates.',
  },
  {
    key: 'reminder',
    title: 'Reminders',
    description: 'Upcoming service dates and follow-up reminders.',
  },
  {
    key: 'account',
    title: 'Account',
    description: 'Security notices and profile-related updates.',
  },
]

function defaultPrefs() {
  const out = {}
  for (const key of BUYER_NOTIFICATION_BUCKETS) {
    out[key] = defaultBucketChannels()
  }
  return out
}

export default function BuyerNotificationPreferencesPanel() {
  const { prefs, loading, saveError, toggleChannel } = useNotificationPreferences({
    fetchPreferences: fetchBuyerNotificationPreferences,
    savePreferences: saveBuyerNotificationPreferences,
    mergePreferences: mergeBuyerNotificationPreferences,
    defaultPreferences: defaultPrefs,
    debounceMs: 450,
    loadErrorMessage: 'Failed to load notification preferences.',
    saveErrorMessage: 'Failed to save notification preferences.',
  })

  return (
    <div className={styles.prefPanel}>
      <p className={styles.prefIntro}>
        Choose which buyer alerts can reach you in-app or by email. Open your{' '}
        <Link href="/profile/notifications" className={styles.prefInlineLink}>
          notification inbox
        </Link>{' '}
        to review recent activity.
      </p>
      {loading ? <p className={styles.prefStatus}>Loading notification preferences…</p> : null}
      {saveError ? <p className={styles.prefError}>{saveError}</p> : null}
      <div className={styles.prefList}>
        {CATEGORIES.map((category) => (
          <div key={category.key} className={styles.prefRow}>
            <div className={styles.prefMeta}>
              <p className={styles.prefTitle} id={`buyer-notif-pref-${category.key}`}>
                {category.title}
              </p>
              <p className={styles.prefDesc}>{category.description}</p>
            </div>
            <div className={styles.prefControls}>
              {NOTIFICATION_PREFERENCE_CHANNELS.map((channel) => (
                <div key={channel.id} className={styles.prefChannel}>
                  <div className={styles.prefChannelLabel}>
                    <span className={styles.prefChannelName}>{channel.label}</span>
                    {channel.hint ? <span className={styles.prefChannelHint}>{channel.hint}</span> : null}
                  </div>
                  <NotificationPrefSwitch
                    checked={Boolean(prefs[category.key]?.[channel.id])}
                    onToggle={(value) => toggleChannel(category.key, channel.id, value)}
                    disabled={loading}
                    labelledBy={`buyer-notif-pref-${category.key}`}
                    styles={switchStyles}
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
