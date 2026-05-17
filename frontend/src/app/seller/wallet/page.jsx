'use client'

import { Suspense } from 'react'
import WalletContent, { SellerWalletLoadingFallback } from './WalletContent'

export default function SellerWalletPage() {
  return (
    <Suspense fallback={<SellerWalletLoadingFallback />}>
      <WalletContent />
    </Suspense>
  )
}
