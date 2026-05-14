'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client'
import { approveSellerQrChallenge, denySellerQrChallenge } from '@/lib/auth/qrLoginClient'
import { useAuthToast } from '@/contexts/ToastContext'
import styles from '@/app/(auth)/seller/login/qr/qrFlow.module.css'

/**
 * @param {{
 *   challengeId: string,
 *   approveToken: string,
 *   fromSettings?: boolean,
 *   embedded?: boolean,
 *   onBack?: () => void,
 * }} props
 */
export default function SellerQrConfirmPanel({
  challengeId,
  approveToken,
  fromSettings = false,
  embedded = false,
  onBack,
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
  const signInRedirect = fromSettings ? linkDeviceHref : confirmPath

  const [loadingSession, setLoadingSession] = useState(true)
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [completed, setCompleted] = useState(null)

  useEffect(() => {
    let mounted = true

    setLoadingSession(true)
    setEmail('')
    setSubmitting(false)
    setCompleted(null)

    supabase.auth.getUser().then(({ data }) => {
      if (!mounted) return
      setEmail(data.user?.email || '')
      setLoadingSession(false)
    })

    return () => {
      mounted = false
    }
  }, [challengeId, approveToken])

  const loginHref = `${loginHrefBase}?redirect=${encodeURIComponent(signInRedirect)}`
  const cardClassName = embedded ? `${styles.card} ${styles.embeddedCard}` : styles.card

  const handleApprove = async () => {
    if (submitting) return
    setSubmitting(true)
    const { error } = await approveSellerQrChallenge({ challengeId, approveToken })
    setSubmitting(false)

    if (error) {
      toast.error(error)
      return
    }

    setCompleted('approved')
  }

  const handleDeny = async () => {
    if (submitting) return
    setSubmitting(true)
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
        <h1 className={styles.title}>Approve desktop login</h1>
        <p className={styles.subtitle}>
          Confirm the sign-in request from your other device before it can open Seller Centre.
        </p>
      </div>

      {completed === 'approved' ? (
        <div className={styles.statusBlock}>
          <p className={styles.status}>
            Login approved. You can return to your computer to continue in Seller Centre.
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
      ) : !email ? (
        <div className={styles.statusBlock}>
          <p className={styles.status}>
            Sign in with your seller account on this device before approving the desktop login.
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
