'use client'

import { Suspense } from 'react'
import OrdersContent, { SellerOrdersLoadingFallback } from '../OrdersContent'

export default function SellerOrdersCompletedPage() {
  return (
    <Suspense fallback={<SellerOrdersLoadingFallback />}>
      <OrdersContent initialTab="completed" />
    </Suspense>
  )
}
