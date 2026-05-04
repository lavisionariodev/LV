'use client'

import { Suspense } from 'react'
import OrdersContent, { SellerOrdersLoadingFallback } from '../OrdersContent'

export default function SellerOrdersPendingPage() {
  return (
    <Suspense fallback={<SellerOrdersLoadingFallback />}>
      <OrdersContent initialTab="pending" />
    </Suspense>
  )
}
