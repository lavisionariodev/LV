'use client'

import { useMediaQuery } from '@/shared/hooks'
import {
  ADMIN_NOTIFICATION_BUCKETS,
  defaultBucketChannels,
  mergeAdminNotificationPreferences,
  NOTIFICATION_PREFERENCE_CHANNELS,
} from '@/lib/notifications/preferenceSchema'
import {
  fetchAdminNotificationPreferences,
  saveAdminNotificationPreferences,
} from '@/lib/notifications/preferencesClient'
import { NotificationPrefSwitch } from '@/lib/notifications/NotificationPrefSwitch'
import {
  useNotificationPreferences,
} from '@/lib/notifications/useNotificationPreferences'
import styles from '../settings.module.css'

const CATEGORY_KEYS = ADMIN_NOTIFICATION_BUCKETS

const CATEGORIES = [
  {
    key: 'order',
    title: 'Orders & bookings',
    description:
      'Notifications for new orders, completions, and booking-related activity.',
  },
  {
    key: 'approval',
    title: 'Sellers & approvals',
    description:
      'Seller registrations, approvals, and listing-related review activity.',
  },
  {
    key: 'alert',
    title: 'Alerts & disputes',
    description:
      'Disputes, payout reviews, and other urgent operational alerts.',
  },
  {
    key: 'announcement',
    title: 'Announcements & updates',
    description:
      'Maintenance windows, product updates, and platform messages.',
  },
]

function defaultPrefs() {
  const o = {}
  for (const key of CATEGORY_KEYS) {
    o[key] = defaultBucketChannels()
  }
  return o
}

function mergePrefs(raw) {
  return mergeAdminNotificationPreferences(raw)
}

export default function Page() {
  const isProfileDetail = useMediaQuery('(max-width: 640px)')
  const isSheet = false
  const prefsState = useNotificationPreferences({
    fetchPreferences: fetchAdminNotificationPreferences,
    savePreferences: saveAdminNotificationPreferences,
    mergePreferences: mergePrefs,
    defaultPreferences: defaultPrefs,
    debounceMs: 350,
    loadErrorMessage: 'Failed to load preferences.',
    saveErrorMessage: 'Could not save preferences.',
  })
  const { prefs, loading, saveError, setChannel } = prefsState

  

  const wrapClass = isSheet
    ? styles.settingsSheetEmbed
    : `${styles.card} ${styles.full} ${isProfileDetail ? styles.cardBorderless : ''}`

  if (loading) {
    return (
      <section className={wrapClass}>
        <div className={styles.settingsSkNotifList} role="status" aria-live="polite" aria-busy="true" aria-label="Loading notification settings">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className={styles.settingsSkNotifRow}>
              <div className={styles.settingsSkNotifMeta}>
                <span className={`${styles.settingsSkBar} ${styles.settingsSkNotifTitle}`} />
                <span className={`${styles.settingsSkBar} ${styles.settingsSkNotifDesc}`} />
                <span className={`${styles.settingsSkBar} ${styles.settingsSkNotifDesc2}`} />
              </div>
              <div className={styles.settingsSkNotifControls}>
                <span className={`${styles.settingsSkBar} ${styles.settingsSkSwitch}`} />
                <span className={`${styles.settingsSkBar} ${styles.settingsSkSwitch}`} />
                <span className={`${styles.settingsSkBar} ${styles.settingsSkSwitch}`} />
              </div>
            </div>
          ))}
        </div>
      </section>
    )
  }

  return (
    <section className={wrapClass}>
      {!isSheet && !isProfileDetail && (
        <div className={styles.tabDetailHead}>
          <div className={styles.tabDetailHeadRow}>
            <div className={styles.tabDetailHeadText}>
              <h2 className={styles.tabDetailTitle}>Notification settings</h2>
              <p className={styles.tabDetailSubtitle}>
                We may still send important account and security messages outside of
                these preferences.
              </p>
            </div>
          </div>
        </div>
      )}
      {isSheet && (
        <p className={styles.settingsSheetLead}>
          We may still send important account and security messages outside of these preferences.
        </p>
      )}

      <div
        className={`${styles.notifPrefList} ${isSheet || isProfileDetail ? styles.notifPrefListSheet : ''}`}
      >
        {CATEGORIES.map((cat, index) => (
          <div
            key={cat.key}
            className={`${styles.notifPrefRow} ${isSheet || isProfileDetail ? styles.notifPrefRowSheet : ''} ${index > 0 ? styles.notifPrefRowBorder : ''}`}
          >
            <div className={styles.notifPrefMeta}>
              <p className={styles.notifPrefTitle}>{cat.title}</p>
              <p className={styles.notifPrefDesc}>{cat.description}</p>
            </div>
            <div className={styles.notifPrefControls} role="group" aria-label={`${cat.title} channels`}>
              {NOTIFICATION_PREFERENCE_CHANNELS.map((ch) => {
                const switchId = `notif_${cat.key}_${ch.id}`
                const checked = Boolean(prefs[cat.key]?.[ch.id])
                return (
                  <div key={ch.id} className={styles.notifPrefChannel}>
                    <div className={styles.notifPrefChannelLabel}>
                      <span id={switchId} className={styles.notifPrefChannelName}>
                        {ch.label}
                      </span>
                      {ch.hint ? (
                        <span className={styles.notifPrefChannelHint}>{ch.hint}</span>
                      ) : null}
                    </div>
                    <NotificationPrefSwitch
                      labelledBy={switchId}
                      checked={ch.disabled ? false : checked}
                      disabled={ch.disabled}
                      onToggle={(v) => setChannel(cat.key, ch.id, v)}
                      styles={styles}
                    />
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {saveError ? (
        <p className={styles.notifPrefError} role="alert">
          {saveError}
        </p>
      ) : null}
    </section>
  )
}
