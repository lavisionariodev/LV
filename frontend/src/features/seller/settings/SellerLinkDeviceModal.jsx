'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { MdDevices } from 'react-icons/md'
import { RiQrScan2Line } from 'react-icons/ri'
import SellerQrConfirmPanel from '@/features/seller/auth/SellerQrConfirmPanel'
import SellerQrLoginScanner from '@/features/seller/auth/SellerQrLoginScanner'
import {
  clearSellerLinkDeviceScanTarget,
  persistSellerLinkDeviceScanTarget,
  readSellerLinkDeviceScanTarget,
} from '@/lib/auth/sellerLinkDeviceState'
import { useMediaQuery } from '@/shared/hooks'
import styles from '@/app/seller/settings/settings.module.css'
import BodyPortal from '@/components/ui/Modal/BodyPortal'
import qrStyles from '@/app/(auth)/seller/login/qr/qrFlow.module.css'

/**
 * @param {{
 *   open: boolean,
 *   onClose: () => void,
 *   initialScanTarget?: { challengeId: string, approveToken: string } | null,
 * }} props
 */
export default function SellerLinkDeviceModal({ open, onClose, initialScanTarget = null }) {
  const isMobile = useMediaQuery('(max-width: 860px)')
  const [localTarget, setLocalTarget] = useState(null)
  const [scannerActive, setScannerActive] = useState(false)
  const [mobileScannerOpen, setMobileScannerOpen] = useState(false)
  const resumedRef = useRef(false)
  const scanTarget = initialScanTarget ?? localTarget
  const showMobileGuideOnly = isMobile && !scanTarget && !mobileScannerOpen
  const showMobileScannerOnly = isMobile && !scanTarget && mobileScannerOpen

  const resetLinkDeviceFlow = useCallback(() => {
    clearSellerLinkDeviceScanTarget()
    setLocalTarget(null)
    resumedRef.current = false
  }, [])

  const handleClose = useCallback(() => {
    setScannerActive(false)
    setMobileScannerOpen(false)
    resetLinkDeviceFlow()
    queueMicrotask(onClose)
  }, [onClose, resetLinkDeviceFlow])

  useEffect(() => {
    if (!open) {
      setScannerActive(false)
      setMobileScannerOpen(false)
      resetLinkDeviceFlow()
      return
    }

    if (initialScanTarget) {
      setScannerActive(false)
      setMobileScannerOpen(false)
      resumedRef.current = true
      return
    }

    if (resumedRef.current) return
    resumedRef.current = true

    const stored = readSellerLinkDeviceScanTarget()
    if (stored) {
      setLocalTarget(stored)
      setScannerActive(false)
      setMobileScannerOpen(false)
      return
    }

    if (isMobile) {
      setScannerActive(false)
      setMobileScannerOpen(false)
      return
    }

    setScannerActive(true)
  }, [initialScanTarget, isMobile, open, resetLinkDeviceFlow])

  useEffect(() => {
    if (!open) return
    persistSellerLinkDeviceScanTarget(scanTarget)
  }, [open, scanTarget])

  useEffect(() => {
    if (!open) return undefined

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        handleClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [handleClose, open])

  const handleScanned = useCallback((payload) => {
    if (!payload?.challengeId || !payload?.approveToken) return
    setLocalTarget({
      challengeId: payload.challengeId,
      approveToken: payload.approveToken,
    })
  }, [])

  const handleBackToScanner = useCallback(() => {
    resetLinkDeviceFlow()
    if (isMobile) {
      setMobileScannerOpen(true)
    }
    setScannerActive(true)
  }, [isMobile, resetLinkDeviceFlow])

  const openMobileScanner = useCallback(() => {
    setMobileScannerOpen(true)
    setScannerActive(true)
  }, [])

  const returnToMobileGuide = useCallback(() => {
    setMobileScannerOpen(false)
    setScannerActive(false)
  }, [])

  if (!open) return null

  const gridClassName = [
    styles.linkDeviceModalGrid,
    showMobileGuideOnly ? styles.linkDeviceModalGridMobileGuideOnly : '',
    showMobileScannerOnly ? styles.linkDeviceModalGridMobileScannerOnly : '',
    isMobile && scanTarget ? styles.linkDeviceModalGridMobileConfirmOnly : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <BodyPortal>
    <div className={styles.linkDeviceModalOverlay} onClick={handleClose}>
      <div
        className={styles.linkDeviceModalCard}
        role="dialog"
        aria-modal="true"
        aria-labelledby="seller-link-device-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          className={styles.linkDeviceModalClose}
          onClick={handleClose}
          aria-label="Close link device"
        >
          ×
        </button>

        <div className={gridClassName}>
          <aside className={styles.linkDeviceModalGuide}>
            <div className={styles.linkDeviceModalIntro}>
              <h2 id="seller-link-device-modal-title" className={styles.linkDeviceModalTitle}>
                <span className={styles.linkDeviceModalTitleRow}>
                  <MdDevices className={styles.linkDeviceModalTitleIcon} aria-hidden />
                  Link device
                </span>
              </h2>
              <p className={styles.linkDeviceModalSubtitle}>
                Approve sign-in on another browser from this one. Each browser keeps its own Seller Centre session.
              </p>
            </div>

            {scanTarget ? (
              <div className={styles.linkDeviceModalGuideBlock}>
                <h3 className={styles.linkDeviceModalGuideHeading}>Finish approval</h3>
                <p className={styles.linkDeviceModalGuideText}>
                  {isMobile
                    ? 'Review the sign-in request below, then approve or deny it for your seller account.'
                    : 'Review the sign-in request on the right, then approve or deny it for your seller account.'}
                </p>
                <p className={styles.linkDeviceModalGuideNote}>
                  After the other browser finishes signing in, you can close this window or scan another device.
                </p>
              </div>
            ) : (
              <div className={styles.linkDeviceModalGuideBlock}>
                <h3 className={styles.linkDeviceModalGuideHeading}>How to scan?</h3>
                <ol className={styles.linkDeviceModalSteps}>
                  <li>Open Seller Centre login on your other browser.</li>
                  <li>Switch to Log in with QR on that screen.</li>
                  <li>
                    {isMobile
                      ? 'Tap Scan QR code below, then point your camera at the QR code shown on the other browser.'
                      : 'Point the camera on the right at the QR code shown there.'}
                  </li>
                  <li>
                    {isMobile
                      ? 'Approve the sign-in request when it appears below.'
                      : 'Approve the sign-in request when it appears on the right.'}
                  </li>
                </ol>
                <p className={styles.linkDeviceModalGuideNote}>
                  Use a fresh QR code if the other browser shows that the previous request expired or was denied.
                </p>
                {showMobileGuideOnly ? (
                  <div className={styles.linkDeviceModalGuideActions}>
                    <button
                      type="button"
                      className={`${styles.primaryBtn} ${styles.linkDeviceModalScanBtn}`}
                      onClick={openMobileScanner}
                    >
                      <RiQrScan2Line aria-hidden />
                      Scan QR code
                    </button>
                  </div>
                ) : null}
              </div>
            )}
          </aside>

          <div className={styles.linkDeviceModalPanel}>
            {showMobileScannerOnly ? (
              <button
                type="button"
                className={styles.linkDeviceModalBackToGuide}
                onClick={returnToMobileGuide}
              >
                Back to instructions
              </button>
            ) : null}
            <div className={qrStyles.stack}>
              {scanTarget ? (
                <SellerQrConfirmPanel
                  key={`${scanTarget.challengeId}:${scanTarget.approveToken}`}
                  embedded
                  fromSettings
                  challengeId={scanTarget.challengeId}
                  approveToken={scanTarget.approveToken}
                  onBack={handleBackToScanner}
                  onLinked={handleBackToScanner}
                />
              ) : (
                <SellerQrLoginScanner
                  key="seller-link-device-scanner"
                  context="settings"
                  compact
                  modalTone
                  active={scannerActive}
                  onScanned={handleScanned}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
    </BodyPortal>
  )
}
