'use client'

import { useSearchParams } from 'next/navigation'
import OrdersContent from './OrdersContent'

export default function SellerOrdersPage() {
  const searchParams = useSearchParams()
  const initialTab = searchParams?.get('tab') ?? undefined
  return <OrdersContent initialTab={initialTab} />
}
