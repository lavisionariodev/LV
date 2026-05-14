'use client'

import { Suspense, useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import SellerQrConfirmPanel from '@/features/seller/auth/SellerQrConfirmPanel'
import SellerQrLoginScanner from '@/features/seller/auth/SellerQrLoginScanner'
import styles from '../settings.module.css'
import qrStyles from '@/app/(auth)/seller/login/qr/qrFlow.module.css'

/**
 * @param {URLSearchParams} searchParams
 * @returns {{ challengeId: string, approveToken: string } | null}
 */
function parseScanTarget(searchParams) {
  const challengeId = searchParams.get('challenge')?.trim() || ''
  const approveToken = searchParams.get('token')?.trim() || ''
  if (!challengeId || !approveToken) return null
  return { challengeId, approveToken }
}

function SellerLinkDevicePageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [scanTarget, setScanTarget] = useState(() => parseScanTarget(searchParams))

  useEffect(() => {
    if (!parseScanTarget(searchParams)) return
    router.replace('/seller/settings/link-device', { scroll: false })
  }, [router, searchParams])

  const handleScanned = useCallback((payload) => {
    if (!payload?.challengeId || !payload?.approveToken) return
    setScanTarget({
      challengeId: payload.challengeId,
      approveToken: payload.approveToken,
    })
  }, [])

  const handleBackToScanner = useCallback(() => {
    setScanTarget(null)
  }, [])

  return (
    <section className={`${styles.card} ${styles.full}`}>
      <div className={styles.tabDetailHead}>
        <div className={styles.tabDetailHeadRow}>
          <div className={styles.tabDetailHeadText}>
            <h2 className={styles.tabDetailTitle}>Link device</h2>
            <p className={styles.tabDetailSubtitle}>
              Scan the QR code on another device to sign in to Seller Centre as your account.
            </p>
          </div>
        </div>
      </div>

      <div className={qrStyles.stack}>
        {scanTarget ? (
          <SellerQrConfirmPanel
            key={`${scanTarget.challengeId}:${scanTarget.approveToken}`}
            embedded
            fromSettings
            challengeId={scanTarget.challengeId}
            approveToken={scanTarget.approveToken}
            onBack={handleBackToScanner}
          />
        ) : (
          <SellerQrLoginScanner
            key="seller-link-device-scanner"
            context="settings"
            title="Scan login QR"
            subtitle="Open Seller Centre login on your other device, switch to Log in with QR, then scan that code here."
            onScanned={handleScanned}
          />
        )}
      </div>

      <Link href="/seller/settings/profile" className={qrStyles.ghostBtn}>
        Back to profile settings
      </Link>
    </section>
  )
}

export default function SellerLinkDevicePage() {
  return (
    <Suspense
      fallback={
        <section className={`${styles.card} ${styles.full}`}>
          <p className={styles.loadingText}>Loading link device...</p>
        </section>
      }
    >
      <SellerLinkDevicePageContent />
    </Suspense>
  )
}
