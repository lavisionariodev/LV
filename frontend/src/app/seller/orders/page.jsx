'use client'

import { useSearchParams } from 'next/navigation'
import OrdersContent from './OrdersContent'

export default function SellerOrdersPage() {
  const searchParams = useSearchParams()
  const initialTab = searchParams?.get('tab') ?? undefined
  const initialOrderId = searchParams?.get('orderId') ?? undefined
  const initialAction = searchParams?.get('action') ?? undefined
  return (
    <OrdersContent initialTab={initialTab} initialOrderId={initialOrderId} initialAction={initialAction} />
  )
}
