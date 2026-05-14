'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client'
import { onAuthStateChange } from '@/lib/auth/session'
import { approveSellerQrChallenge, denySellerQrChallenge, pollSellerQrApprovalForApprover } from '@/lib/auth/qrLoginClient'
import { useAuthToast } from '@/contexts/ToastContext'
import styles from '@/app/(auth)/seller/login/qr/qrFlow.module.css'

/**
 * @param {{
 *   challengeId: string,
 *   approveToken: string,
 *   fromSettings?: boolean,
 *   embedded?: boolean,
 *   onBack?: () => void,
 *   onLinked?: () => void,
 * }} props
 */
export default function SellerQrConfirmPanel({
  challengeId,
  approveToken,
  fromSettings = false,
  embedded = false,
  onBack,
  onLinked,
}) {
  const toast = useAuthToast()
  const settingsHref = '/seller/settings/profile'
  const linkDeviceHref = '/seller/settings/link-device'
  const loginHrefBase = '/seller/login'
  const confirmPath =
    challengeId && approveToken
      ? `/seller/login/qr/confirm?challenge=${encodeURIComponent(challengeId)}&token=${encodeURIComponent(approveToken)}${fromSettings ? '&from=settings' : ''}`
      : '/seller/login/qr/confirm'
  const backHref = fromSettings ? settingsHref : loginHrefBase
  const backLabel = fromSettings ? 'Back to profile settings' : 'Back to seller login'
  const linkDeviceReturnPath =
    challengeId && approveToken
      ? `${linkDeviceHref}?challenge=${encodeURIComponent(challengeId)}&token=${encodeURIComponent(approveToken)}`
      : linkDeviceHref
  const signInRedirect = fromSettings ? linkDeviceReturnPath : confirmPath

  const [loadingSession, setLoadingSession] = useState(true)
  const [email, setEmail] = useState('')
  const [sessionReady, setSessionReady] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [completed, setCompleted] = useState(null)
  const waitActiveRef = useRef(false)

  useEffect(() => {
    setCompleted(null)
  }, [challengeId, approveToken])

  useEffect(() => {
    waitActiveRef.current = true
    return () => {
      waitActiveRef.current = false
    }
  }, [challengeId, approveToken])

  useEffect(() => {
    let mounted = true

    setLoadingSession(true)
    setEmail('')
    setSessionReady(false)

    const syncUser = (user, ready) => {
      if (!mounted) return
      setEmail(user?.email || '')
      setSessionReady(ready)
      setLoadingSession(false)
    }

    const bootstrap = async () => {
      let resolvedUser = null

      const { data: userData, error: userError } = await supabase.auth.getUser()
      if (!userError && userData.user) {
        resolvedUser = userData.user
      } else {
        const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession()
        if (!refreshError && refreshData.session?.user) {
          resolvedUser = refreshData.session.user
        }
      }

      const nextEmail = resolvedUser?.email || ''
      const ready = Boolean(nextEmail)

      syncUser(resolvedUser, ready)
    }

    bootstrap()

    const unsubscribe = onAuthStateChange((_event, session) => {
      if (!mounted || !session?.user) return
      syncUser(session.user, Boolean(session.user.email))
    })

    return () => {
      mounted = false
      unsubscribe()
    }
  }, [challengeId, approveToken, embedded, fromSettings])

  const loginHref = `${loginHrefBase}?redirect=${encodeURIComponent(signInRedirect)}`
  const cardClassName = embedded ? `${styles.card} ${styles.embeddedCard}` : styles.card
  const title =
    completed === 'linked'
      ? 'Other device signed in'
      : completed === 'approved'
        ? 'Approval sent'
        : 'Approve desktop login'
  const subtitle =
    completed === 'linked'
      ? 'The other device finished signing in to Seller Centre with your seller account.'
      : completed === 'approved'
        ? 'Waiting for the other device to finish signing in.'
        : 'Confirm the sign-in request from your other device before it can open Seller Centre.'

  const waitForDesktopLogin = async () => {
    const deadline = Date.now() + 30000

    while (Date.now() < deadline && waitActiveRef.current) {
      const { data, error } = await pollSellerQrApprovalForApprover({ challengeId, approveToken })
      if (!waitActiveRef.current) return
      if (error) break

      if (data?.status === 'consumed') {
        setCompleted('linked')
        onLinked?.()
        return
      }

      if (data?.status === 'expired' || data?.status === 'denied') {
        break
      }

      await new Promise((resolve) => {
        window.setTimeout(resolve, 2000)
      })
    }
  }

  const handleApprove = async () => {
    if (submitting) return
    setSubmitting(true)

    await supabase.auth.refreshSession()
    const { error } = await approveSellerQrChallenge({ challengeId, approveToken })
    setSubmitting(false)

    if (error) {
      toast.error(
        error === 'Unauthorized'
          ? 'Your seller session expired on this device. Sign in again, then return to Link device to approve.'
          : error,
      )
      return
    }

    setCompleted('approved')
    void waitForDesktopLogin()
  }

  const handleDeny = async () => {
    if (submitting) return
    setSubmitting(true)

    await supabase.auth.refreshSession()
    const { error } = await denySellerQrChallenge({ challengeId, approveToken })
    setSubmitting(false)

    if (error) {
      toast.error(error)
      return
    }

    setCompleted('denied')
  }

  return (
    <div className={cardClassName}>
      <div className={styles.cardHeader}>
        <p className={styles.eyebrow}>Seller Centre</p>
        <h1 className={styles.title}>{title}</h1>
        <p className={styles.subtitle}>{subtitle}</p>
      </div>

      {completed === 'linked' ? (
        <div className={styles.statusBlock}>
          <p className={styles.status}>
            The other device is signed in to Seller Centre. You can return to that device now.
          </p>
          {onBack ? (
            <button type="button" className={styles.primaryBtn} onClick={onBack}>
              {fromSettings ? 'Scan another device' : backLabel}
            </button>
          ) : (
            <Link href={fromSettings ? settingsHref : '/seller'} className={styles.primaryBtn}>
              {fromSettings ? 'Back to profile settings' : 'Open Seller Centre'}
            </Link>
          )}
        </div>
      ) : completed === 'approved' ? (
        <div className={styles.statusBlock}>
          <p className={styles.status}>
            Login approved. Waiting for the other device to finish signing in.
          </p>
        </div>
      ) : completed === 'denied' ? (
        <div className={styles.statusBlock}>
          <p className={styles.status}>Login request denied. The desktop QR code will need a new scan.</p>
          {onBack ? (
            <button type="button" className={styles.secondaryBtn} onClick={onBack}>
              {fromSettings ? 'Scan another device' : backLabel}
            </button>
          ) : (
            <Link href={backHref} className={styles.secondaryBtn}>
              {backLabel}
            </Link>
          )}
        </div>
      ) : loadingSession ? (
        <p className={styles.status}>Checking your session...</p>
      ) : !sessionReady ? (
        <div className={styles.statusBlock}>
          <p className={styles.status}>
            {fromSettings
              ? 'This phone needs an active seller session to approve the other device. Refresh Link device or sign in here, then return to approve.'
              : 'Sign in with your seller account on this device before approving the desktop login.'}
          </p>
          <Link href={loginHref} className={styles.primaryBtn}>
            Sign in to approve
          </Link>
        </div>
      ) : (
        <>
          <p className={styles.status}>Approve sign-in for this seller account:</p>
          <p className={styles.account}>{email}</p>
          <div className={styles.actions}>
            <button
              type="button"
              className={styles.secondaryBtn}
              onClick={handleDeny}
              disabled={submitting}
            >
              Deny
            </button>
            <button
              type="button"
              className={styles.primaryBtn}
              onClick={handleApprove}
              disabled={submitting}
            >
              {submitting ? 'Approving...' : 'Approve'}
            </button>
          </div>
        </>
      )}

      {!completed && onBack ? (
        <button type="button" className={styles.ghostBtn} onClick={onBack}>
          {backLabel}
        </button>
      ) : null}

      {!completed && !onBack ? (
        <Link href={backHref} className={styles.ghostBtn}>
          {backLabel}
        </Link>
      ) : null}
    </div>
  )
}
