'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { BrowserQRCodeReader } from '@zxing/browser'
import {
  appendSellerQrConfirmParams,
  parseSellerQrConfirmCredentials,
  parseSellerQrConfirmPath,
} from '@/lib/auth/qrLoginClient'
import { useAuthToast } from '@/contexts/ToastContext'
import styles from '@/app/(auth)/seller/login/qr/qrFlow.module.css'

/**
 * @param {{
 *   title?: string,
 *   subtitle?: string,
 *   invalidQrMessage?: string,
 *   context?: 'login' | 'settings',
 *   onScanned?: (payload: { challengeId: string, approveToken: string }) => void,
 * }} props
 */
export default function SellerQrLoginScanner({
  title = 'Scan login QR',
  subtitle = 'Point your camera at the QR code on the Seller Centre login screen.',
  invalidQrMessage = 'Scan the seller login QR code shown on your computer.',
  context = 'login',
  onScanned,
}) {
  const router = useRouter()
  const toast = useAuthToast()
  const videoRef = useRef(null)
  const onScannedRef = useRef(onScanned)
  const [error, setError] = useState('')
  const handledRef = useRef(false)

  useLayoutEffect(() => {
    onScannedRef.current = onScanned
  }, [onScanned])

  useEffect(() => {
    if (typeof window === 'undefined') return undefined
    if (!window.isSecureContext) {
      setError('Camera access requires HTTPS or localhost.')
      return undefined
    }

    handledRef.current = false
    const reader = new BrowserQRCodeReader()
    let active = true
    let controls = null
    const confirmParams = context === 'settings' ? { from: 'settings' } : {}

    reader
      .decodeFromVideoDevice(undefined, videoRef.current, (result, decodeError) => {
        if (!active || decodeError || !result || handledRef.current) return

        const credentials = parseSellerQrConfirmCredentials(result.getText())
        if (!credentials) {
          toast.error(invalidQrMessage)
          return
        }

        handledRef.current = true
        controls?.stop()

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
        controls = scannerControls
      })
      .catch((err) => {
        if (!active) return
        const message =
          err instanceof Error && err.name === 'NotAllowedError'
            ? 'Camera permission was denied. Allow camera access to scan the login QR code.'
            : 'Unable to access the camera on this device.'
        setError(message)
      })

    return () => {
      active = false
      controls?.stop()
      reader.reset()
    }
  }, [context, invalidQrMessage, router, toast])

  return (
    <div className={`${styles.card} ${styles.scannerCard}`}>
      <div className={styles.cardHeader}>
        <p className={styles.eyebrow}>QR scanner</p>
        <h2 className={styles.scannerTitle}>{title}</h2>
        <p className={styles.subtitle}>{subtitle}</p>
      </div>

      {error ? <p className={styles.error}>{error}</p> : null}

      <div className={styles.scannerWrap}>
        <video ref={videoRef} className={styles.video} muted playsInline />
        <div className={styles.scannerFrame} aria-hidden="true" />
      </div>
    </div>
  )
}
