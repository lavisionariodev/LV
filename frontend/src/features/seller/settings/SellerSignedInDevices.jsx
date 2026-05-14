'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  fetchSellerPortalSessions,
  registerSellerPortalSession,
  signOutOtherSellerPortalSessions,
} from '@/lib/auth/sellerPortalSessionsClient'
import { useAuthToast } from '@/contexts/ToastContext'
import styles from '@/app/seller/settings/settings.module.css'

/**
 * @param {string | null | undefined} value
 * @returns {string}
 */
function formatLastSeen(value) {
  if (!value) return 'Unknown'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Unknown'

  const diffMs = date.getTime() - Date.now()
  const diffMinutes = Math.round(diffMs / 60000)
  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' })

  if (Math.abs(diffMinutes) < 60) {
    return rtf.format(diffMinutes, 'minute')
  }

  const diffHours = Math.round(diffMinutes / 60)
  if (Math.abs(diffHours) < 48) {
    return rtf.format(diffHours, 'hour')
  }

  const diffDays = Math.round(diffHours / 24)
  if (Math.abs(diffDays) < 14) {
    return rtf.format(diffDays, 'day')
  }

  return date.toLocaleString()
}

/**
 * @param {{
 *   variant?: 'settings' | 'compact',
 * }} props
 */
export default function SellerSignedInDevices({ variant = 'settings' }) {
  const toast = useAuthToast()
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const refreshSessions = useCallback(async ({ showLoading = false } = {}) => {
    if (showLoading) {
      setLoading(true)
    }
    setError('')

    await registerSellerPortalSession()
    const result = await fetchSellerPortalSessions()
    if (result.error) {
      setError(result.error)
      setSessions([])
    } else {
      setSessions(result.sessions)
    }

    if (showLoading) {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    ;(async () => {
      setLoading(true)
      setError('')

      await registerSellerPortalSession()
      const result = await fetchSellerPortalSessions()
      if (cancelled) return

      if (result.error) {
        setError(result.error)
        setSessions([])
      } else {
        setSessions(result.sessions)
      }

      setLoading(false)
    })()

    return () => {
      cancelled = true
    }
  }, [])

  const handleSignOutOthers = async () => {
    if (busy) return
    setBusy(true)

    const result = await signOutOtherSellerPortalSessions()
    setBusy(false)

    if (result.error) {
      toast.error(result.error)
      return
    }

    if (result.warning) {
      toast.error(result.warning)
    } else {
      toast.success('Other browsers were signed out.')
    }

    await refreshSessions()
  }

  const otherSessions = sessions.filter((session) => !session.isCurrent)
  const list = (
    <div className={styles.sessionList}>
      {loading ? (
        <p className={styles.settingsRowDesc}>Loading signed-in browsers...</p>
      ) : error ? (
        <p className={styles.sessionError}>{error}</p>
      ) : sessions.length === 0 ? (
        <p className={styles.settingsRowDesc}>
          No other browsers are listed yet. Each browser appears here after you open Seller Centre on it.
        </p>
      ) : (
        sessions.map((session) => (
          <div key={session.id} className={styles.sessionRow}>
            <div className={styles.sessionRowMeta}>
              <p className={styles.sessionDevice}>{session.deviceLabel}</p>
              <p className={styles.sessionSeen}>Last active {formatLastSeen(session.lastSeenAt)}</p>
            </div>
            {session.isCurrent ? <span className={styles.sessionBadge}>This browser</span> : null}
          </div>
        ))
      )}
    </div>
  )

  const actions =
    otherSessions.length > 0 ? (
      <button
        type="button"
        className={styles.identityActionLink}
        onClick={handleSignOutOthers}
        disabled={busy || loading}
      >
        {busy ? 'Signing out other browsers…' : 'Sign out other browsers'}
      </button>
    ) : null

  if (variant === 'compact') {
    return (
      <section className={styles.sessionCompact}>
        <div className={styles.sessionCompactHead}>
          <h3 className={styles.sessionCompactTitle}>Signed-in browsers</h3>
          <p className={styles.settingsRowDesc}>
            Each browser keeps its own Seller Centre session. Changing your password also signs out other browsers.
          </p>
        </div>
        {list}
        {actions}
      </section>
    )
  }

  return (
    <div className={styles.settingsRow}>
      <div className={styles.settingsRowMeta}>
        <div className={styles.settingsRowTitleRow}>
          <p className={styles.settingsRowTitle}>Signed-in browsers</p>
        </div>
        <p className={styles.settingsRowDesc}>
          Browsers that have opened Seller Centre on your account. Approving sign-in on another device adds another session here.
        </p>
      </div>
      <div className={`${styles.settingsRowControl} ${styles.profileControl}`}>
        {list}
        {actions}
      </div>
    </div>
  )
}
