'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { BrowserQRCodeReader } from '@zxing/browser'
import { appendSellerQrConfirmParams, parseSellerQrConfirmPath } from '@/lib/auth/qrLoginClient'
import { useAuthToast } from '@/contexts/ToastContext'
import styles from '@/app/(auth)/seller/login/qr/qrFlow.module.css'

/**
 * @param {{
 *   title?: string,
 *   subtitle?: string,
 *   invalidQrMessage?: string,
 *   context?: 'login' | 'settings',
 * }} props
 */
export default function SellerQrLoginScanner({
  title = 'Scan login QR',
  subtitle = 'Point your camera at the QR code on the Seller Centre login screen.',
  invalidQrMessage = 'Scan the seller login QR code shown on your computer.',
  context = 'login',
}) {
  const router = useRouter()
  const toast = useAuthToast()
  const videoRef = useRef(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (typeof window === 'undefined') return undefined
    if (!window.isSecureContext) {
      setError('Camera access requires HTTPS or localhost.')
      return undefined
    }

    const reader = new BrowserQRCodeReader()
    let active = true
    let controls = null
    const confirmParams = context === 'settings' ? { from: 'settings' } : {}

    reader
      .decodeFromVideoDevice(undefined, videoRef.current, (result, decodeError) => {
        if (!active || decodeError || !result) return

        const confirmPath = parseSellerQrConfirmPath(result.getText())
        if (!confirmPath) {
          toast.error(invalidQrMessage)
          return
        }

        controls?.stop()
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
    <div className={styles.card}>
      <h1 className={styles.title}>{title}</h1>
      <p className={styles.subtitle}>{subtitle}</p>

      {error ? <p className={styles.error}>{error}</p> : null}

      <div className={styles.scannerWrap}>
        <video ref={videoRef} className={styles.video} muted playsInline />
      </div>
    </div>
  )
}
