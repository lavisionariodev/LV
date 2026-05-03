'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import OrdersContent, { SellerOrdersLoadingFallback } from './OrdersContent'

function SellerOrdersPageInner() {
  const searchParams = useSearchParams()
  const initialOrderId = searchParams?.get('orderId') ?? undefined
  const initialAction = searchParams?.get('action') ?? undefined
  return (
    <OrdersContent
      initialOrderId={initialOrderId}
      initialAction={initialAction}
    />
  )
}

export default function SellerOrdersPage() {
  return (
    <Suspense fallback={<SellerOrdersLoadingFallback />}>
      <SellerOrdersPageInner />
    </Suspense>
  )
}
