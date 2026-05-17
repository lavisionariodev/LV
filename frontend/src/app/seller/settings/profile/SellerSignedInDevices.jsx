'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  fetchSellerPortalSessions,
  registerSellerPortalSession,
  signOutOtherSellerPortalSessions,
} from '@/lib/auth/sellerPortalSessionsClient'
import { useAuthToast } from '@/contexts/ToastContext'
import styles from '@/app/seller/settings/settings.module.css'

const ROWS_PER_PAGE = 10

function buildVisiblePages(currentPage, totalPages) {
  if (totalPages <= 0) return []
  return Array.from({ length: totalPages }, (_, i) => i + 1)
    .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
    .reduce((acc, p, idx, arr) => {
      if (idx > 0 && p - arr[idx - 1] > 1) acc.push('...')
      acc.push(p)
      return acc
    }, [])
}

function SessionsPagination({ currentPage, totalPages, totalItems, onPageChange }) {
  if (totalPages <= 1 || totalItems === 0) return null
  const start = (currentPage - 1) * ROWS_PER_PAGE + 1
  const end = Math.min(currentPage * ROWS_PER_PAGE, totalItems)
  return (
    <div className={styles.settingsPagination}>
      <div className={styles.settingsPaginationControls} role="navigation" aria-label="Signed-in browsers pagination">
        <button type="button" className={`${styles.settingsPageBtn} ${currentPage === 1 ? styles.settingsPageBtnDisabled : ''}`} onClick={() => onPageChange(Math.max(1, currentPage - 1))} disabled={currentPage === 1}>‹ Previous</button>
        {buildVisiblePages(currentPage, totalPages).map((p, idx) =>
          p === '...' ? <span key={`e-${idx}`} className={styles.settingsPageEllipsis}>…</span> : (
            <button key={p} type="button" className={`${styles.settingsPageBtn} ${currentPage === p ? styles.settingsPageBtnActive : ''}`} onClick={() => onPageChange(p)} aria-current={currentPage === p ? 'page' : undefined}>{p}</button>
          ),
        )}
        <button type="button" className={`${styles.settingsPageBtn} ${currentPage === totalPages ? styles.settingsPageBtnDisabled : ''}`} onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))} disabled={currentPage === totalPages}>Next ›</button>
      </div>
      <p className={styles.settingsPaginationInfo}>Showing <strong>{start}–{end}</strong> of <strong>{totalItems}</strong> browsers</p>
    </div>
  )
}

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
  const [currentPage, setCurrentPage] = useState(1)

  const totalPages = Math.ceil(sessions.length / ROWS_PER_PAGE) || 1
  const paginatedSessions = useMemo(() => {
    const start = (currentPage - 1) * ROWS_PER_PAGE
    return sessions.slice(start, start + ROWS_PER_PAGE)
  }, [sessions, currentPage])

  useEffect(() => {
    setCurrentPage(1)
  }, [sessions.length])

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages)
  }, [currentPage, totalPages])

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
          No other devices are listed yet. Each device or network appears here after you open Seller Centre on it.
        </p>
      ) : (
        <>
          {paginatedSessions.map((session) => (
            <div key={session.id} className={styles.sessionRow}>
              <div className={styles.sessionRowMeta}>
                <p className={styles.sessionDevice}>{session.deviceLabel}</p>
                <p className={styles.sessionSeen}>Last active {formatLastSeen(session.lastSeenAt)}</p>
              </div>
              {session.isCurrent ? <span className={styles.sessionBadge}>This device</span> : null}
            </div>
          ))}
          <SessionsPagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={sessions.length}
            onPageChange={setCurrentPage}
          />
        </>
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
            Devices that have opened Seller Centre on your account. Repeat logins on the same device stay one entry.
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
          Devices and networks that have opened Seller Centre on your account. Repeat logins on the same device stay one entry.
        </p>
      </div>
      <div className={`${styles.settingsRowControl} ${styles.profileControl}`}>
        {list}
        {actions}
      </div>
    </div>
  )
}
