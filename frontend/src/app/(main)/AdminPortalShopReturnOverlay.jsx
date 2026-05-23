'use client'

import { useEffect, useMemo, useSyncExternalStore } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { TbArrowLeft } from 'react-icons/tb'
import {
  clearPersistedAdminShopReturn,
  persistAdminShopReturn,
  readPersistedAdminShopReturn,
  sanitizeAdminReturnPath,
} from '@/lib/shop-listings/adminShopReturn'
import styles from './layout.module.css'

function getReturnToFromSearchParams(searchParams) {
  if (searchParams.get('from') !== 'admin') return null
  return sanitizeAdminReturnPath(searchParams.get('returnTo'))
}

function subscribeAdminShopReturn() {
  return () => {}
}

export default function AdminPortalShopReturnOverlay() {
  const searchParams = useSearchParams()

  const returnToFromUrl = useMemo(
    () => getReturnToFromSearchParams(searchParams),
    [searchParams],
  )

  const storedReturnTo = useSyncExternalStore(
    subscribeAdminShopReturn,
    readPersistedAdminShopReturn,
    () => null,
  )

  const returnTo = returnToFromUrl ?? storedReturnTo

  useEffect(() => {
    if (returnToFromUrl) persistAdminShopReturn(returnToFromUrl)
  }, [returnToFromUrl])

  if (!returnTo) return null

  return (
    <div className={styles.adminShopReturnWrap} role="region" aria-label="Return to admin portal">
      <Link
        href={returnTo}
        className={styles.adminShopReturnBtn}
        onClick={() => clearPersistedAdminShopReturn()}
      >
        <TbArrowLeft className={styles.adminShopReturnBtnIcon} aria-hidden />
        Back to Admin Portal
      </Link>
    </div>
  )
}
