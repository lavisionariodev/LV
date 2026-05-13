'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import styles from '../settings.module.css'
import {
  defaultBucketChannels,
  mergeSellerNotificationPreferences,
  SELLER_NOTIFICATION_BUCKETS,
} from '@/lib/notifications/preferenceSchema'

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

const CHANNELS = [
  { id: 'push', label: 'In-app', hint: 'Notification inbox' },
  { id: 'email', label: 'Email', hint: null },
]

function defaultPrefs() {
  const out = {}
  for (const key of SELLER_NOTIFICATION_BUCKETS) {
    out[key] = defaultBucketChannels()
  }
  return out
}

function mergePrefs(raw) {
  return mergeSellerNotificationPreferences(raw)
}

function PrefSwitch({ checked, onToggle, disabled, labelledBy }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-labelledby={labelledBy}
      disabled={disabled}
      className={`${styles.notifPrefSwitch} ${checked ? styles.notifPrefSwitchOn : ''} ${disabled ? styles.notifPrefSwitchDisabled : ''}`}
      onClick={() => !disabled && onToggle(!checked)}
    >
      <span className={styles.notifPrefSwitchThumb} aria-hidden />
    </button>
  )
}

export default function SellerNotificationPreferencesPanel() {
  const [prefs, setPrefs] = useState(() => defaultPrefs())
  const prefsRef = useRef(prefs)
  const [loading, setLoading] = useState(true)
  const [saveError, setSaveError] = useState('')
  const saveTimerRef = useRef(null)

  useEffect(() => {
    prefsRef.current = prefs
  }, [prefs])

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setSaveError('')
      try {
        const res = await fetch('/api/seller/notification-preferences', { cache: 'no-store' })
        const body = await res.json().catch(() => null)
        if (!res.ok) throw new Error(body?.error || 'Failed to load notification preferences.')
        if (!cancelled) setPrefs(mergePrefs(body?.preferences))
      } catch (err) {
        if (!cancelled) setSaveError(err?.message || 'Failed to load notification preferences.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  const scheduleSave = useCallback((next) => {
    setPrefs(next)
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(async () => {
      setSaveError('')
      try {
        const res = await fetch('/api/seller/notification-preferences', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ preferences: next }),
        })
        const body = await res.json().catch(() => null)
        if (!res.ok) throw new Error(body?.error || 'Failed to save notification preferences.')
        setPrefs(mergePrefs(body?.preferences))
      } catch (err) {
        setSaveError(err?.message || 'Failed to save notification preferences.')
      }
    }, 450)
  }, [])

  useEffect(() => () => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
  }, [])

  const onToggle = (bucket, channel, value) => {
    const next = {
      ...prefsRef.current,
      [bucket]: {
        ...prefsRef.current[bucket],
        [channel]: value,
      },
    }
    scheduleSave(next)
  }

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
              {CHANNELS.map((channel) => (
                <div key={channel.id} className={styles.notifPrefChannel}>
                  <div className={styles.notifPrefChannelLabel}>
                    <span className={styles.notifPrefChannelName}>{channel.label}</span>
                    {channel.hint ? <span className={styles.notifPrefChannelHint}>{channel.hint}</span> : null}
                  </div>
                  <PrefSwitch
                    checked={Boolean(prefs[category.key]?.[channel.id])}
                    onToggle={(value) => onToggle(category.key, channel.id, value)}
                    disabled={loading}
                    labelledBy={`seller-notif-pref-${category.key}`}
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
