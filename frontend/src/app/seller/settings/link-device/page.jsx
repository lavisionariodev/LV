'use client'

import { Suspense, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { buildSellerLinkDeviceProfileHref } from '@/lib/auth/sellerLinkDeviceState'

function SellerLinkDeviceRedirect() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const challengeId = searchParams.get('challenge')?.trim() || ''
    const approveToken = searchParams.get('token')?.trim() || ''
    router.replace(
      buildSellerLinkDeviceProfileHref({
        challengeId: challengeId || undefined,
        approveToken: approveToken || undefined,
      }),
    )
  }, [router, searchParams])

  return null
}

export default function SellerLinkDevicePage() {
  return (
    <Suspense fallback={null}>
      <SellerLinkDeviceRedirect />
    </Suspense>
  )
}
