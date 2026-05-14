'use client'

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { RiQrScan2Line } from 'react-icons/ri'
import { BrowserQRCodeReader } from '@zxing/browser'
import {
  appendSellerQrConfirmParams,
  parseSellerQrConfirmCredentials,
  parseSellerQrConfirmPath,
} from '@/lib/auth/qrLoginClient'
import { useAuthToast } from '@/contexts/ToastContext'
import styles from '@/app/(auth)/seller/login/qr/qrFlow.module.css'

function stopCameraTracks(videoEl) {
  if (!videoEl) return
  const stream = videoEl.srcObject
  if (stream instanceof MediaStream) {
    stream.getTracks().forEach((track) => {
      track.stop()
    })
  }
  videoEl.srcObject = null
}

/**
 * @param {{
 *   title?: string,
 *   subtitle?: string,
 *   invalidQrMessage?: string,
 *   context?: 'login' | 'settings',
 *   compact?: boolean,
 *   modalTone?: boolean,
 *   active?: boolean,
 *   onScanned?: (payload: { challengeId: string, approveToken: string }) => void,
 * }} props
 */
export default function SellerQrLoginScanner({
  title = 'Scan login QR',
  subtitle = 'Point your camera at the QR code on the Seller Centre login screen.',
  invalidQrMessage = 'Scan the seller login QR code shown on your computer.',
  context = 'login',
  compact = false,
  modalTone = false,
  active = true,
  onScanned,
}) {
  const router = useRouter()
  const toast = useAuthToast()
  const videoRef = useRef(null)
  const onScannedRef = useRef(onScanned)
  const activeRef = useRef(active)
  const controlsRef = useRef(null)
  const readerRef = useRef(null)
  const [error, setError] = useState('')
  const handledRef = useRef(false)

  const releaseCamera = useCallback(() => {
    controlsRef.current?.stop()
    controlsRef.current = null
    stopCameraTracks(videoRef.current)
    if (typeof readerRef.current?.reset === 'function') {
      readerRef.current.reset()
    }
    readerRef.current = null
  }, [])

  useLayoutEffect(() => {
    onScannedRef.current = onScanned
  }, [onScanned])

  useLayoutEffect(() => {
    activeRef.current = active
    if (!active) {
      releaseCamera()
    }
  }, [active, releaseCamera])

  useEffect(() => {
    if (!active || typeof window === 'undefined') {
      return () => {
        releaseCamera()
      }
    }

    if (!window.isSecureContext) {
      setError('Camera access requires HTTPS or localhost.')
      return () => {
        releaseCamera()
      }
    }

    handledRef.current = false
    setError('')
    const reader = new BrowserQRCodeReader()
    readerRef.current = reader
    const videoEl = videoRef.current
    let cancelled = false
    const confirmParams = context === 'settings' ? { from: 'settings' } : {}

    reader
      .decodeFromVideoDevice(undefined, videoEl, (result, decodeError) => {
        if (cancelled || !activeRef.current || decodeError || !result || handledRef.current) return

        const rawText = result.getText()
        const credentials = parseSellerQrConfirmCredentials(rawText)
        if (!credentials) {
          toast.error(invalidQrMessage)
          return
        }

        handledRef.current = true
        controlsRef.current?.stop()
        controlsRef.current = null
        stopCameraTracks(videoEl)

        if (onScannedRef.current) {
          onScannedRef.current({
            challengeId: credentials.challengeId,
            approveToken: credentials.approveToken,
          })
          return
        }

        const confirmPath = parseSellerQrConfirmPath(result.getText())
        if (!confirmPath) {
          toast.error(invalidQrMessage)
          handledRef.current = false
          return
        }

        router.replace(appendSellerQrConfirmParams(confirmPath, confirmParams))
      })
      .then((scannerControls) => {
        if (cancelled || !activeRef.current) {
          scannerControls?.stop()
          stopCameraTracks(videoEl)
          return
        }

        controlsRef.current = scannerControls
      })
      .catch((err) => {
        if (cancelled || !activeRef.current) return
        const message =
          err instanceof Error && err.name === 'NotAllowedError'
            ? 'Camera permission was denied. Allow camera access to scan the login QR code.'
            : 'Unable to access the camera on this device.'
        setError(message)
      })

    return () => {
      cancelled = true
      releaseCamera()
    }
  }, [active, context, invalidQrMessage, releaseCamera, router, toast])

  return (
    <div
      className={`${compact ? styles.scannerCompact : `${styles.card} ${styles.scannerCard}`} ${modalTone ? styles.scannerModal : ''}`}
    >
      {!compact ? (
        <div className={styles.cardHeader}>
          <p className={styles.eyebrow}>QR scanner</p>
          <h2 className={styles.scannerTitle}>
            <span className={styles.scannerTitleRow}>
              <RiQrScan2Line className={styles.scannerTitleIcon} aria-hidden />
              {title}
            </span>
          </h2>
          {subtitle ? <p className={styles.subtitle}>{subtitle}</p> : null}
        </div>
      ) : (
        <p className={styles.scannerCompactHeader}>
          <RiQrScan2Line className={styles.scannerTitleIcon} aria-hidden />
          <span>{title}</span>
        </p>
      )}

      {error ? <p className={styles.error}>{error}</p> : null}

      <div className={`${styles.scannerWrap} ${compact ? styles.scannerWrapCompact : ''}`}>
        <video ref={videoRef} className={styles.video} muted playsInline />
        <div className={styles.scannerFrame} aria-hidden="true" />
      </div>
    </div>
  )
}
