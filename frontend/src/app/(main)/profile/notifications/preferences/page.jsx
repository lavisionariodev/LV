'use client'

import Link from 'next/link'
import {
  BUYER_NOTIFICATION_BUCKETS,
  defaultBucketChannels,
  mergeBuyerNotificationPreferences,
  NOTIFICATION_PREFERENCE_CHANNELS,
} from '@/lib/notifications/preferences'
import {
  fetchBuyerNotificationPreferences,
  saveBuyerNotificationPreferences,
} from '@/lib/notifications/preferencesClient'
import { NotificationPrefSwitch } from '@/lib/notifications/NotificationPrefSwitch'
import { useNotificationPreferences } from '@/lib/notifications/useNotificationPreferences'
import profileStyles from '@/app/(main)/profile/profile.module.css'
import switchStyles from '@/app/seller/settings/settings.module.css'
import notifStyles from '@/app/(main)/profile/notifications/notifications.module.css'

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

export default function BuyerNotificationPreferencesPage() {
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
    <div className={profileStyles.profileCard}>
      <div className={profileStyles.profileAccentBar} />
      <header className={profileStyles.profileHeader}>
        <div className={notifStyles.headerWrap}>
          <div className={notifStyles.headerTop}>
            <div className={notifStyles.headerText}>
              <p className={profileStyles.profileEyebrow}>Notifications</p>
              <p className={profileStyles.profileSignedIn}>Choose how booking and account alerts reach you.</p>
            </div>
            <Link href="/profile/notifications" className={notifStyles.inboxActionBtn}>
              Back to inbox
            </Link>
          </div>
        </div>
      </header>
      <div className={notifStyles.prefPanel}>
        <p className={notifStyles.prefIntro}>
          Choose which buyer alerts can reach you in-app or by email. Open your{' '}
          <Link href="/profile/notifications" className={notifStyles.prefInlineLink}>
            notification inbox
          </Link>{' '}
          to review recent activity.
        </p>
        {loading ? <p className={notifStyles.prefStatus}>Loading notification preferences…</p> : null}
        {saveError ? <p className={notifStyles.prefError}>{saveError}</p> : null}
        <div className={notifStyles.prefList}>
          {CATEGORIES.map((category) => (
            <div key={category.key} className={notifStyles.prefRow}>
              <div className={notifStyles.prefMeta}>
                <p className={notifStyles.prefTitle} id={`buyer-notif-pref-${category.key}`}>
                  {category.title}
                </p>
                <p className={notifStyles.prefDesc}>{category.description}</p>
              </div>
              <div className={notifStyles.prefControls}>
                {NOTIFICATION_PREFERENCE_CHANNELS.map((channel) => (
                  <div key={channel.id} className={notifStyles.prefChannel}>
                    <div className={notifStyles.prefChannelLabel}>
                      <span className={notifStyles.prefChannelName}>{channel.label}</span>
                      {channel.hint ? <span className={notifStyles.prefChannelHint}>{channel.hint}</span> : null}
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
    </div>
  )
}
