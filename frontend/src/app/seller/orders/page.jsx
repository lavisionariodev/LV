'use client'

import { usePathname, useSearchParams } from 'next/navigation'
import OrdersContent from './OrdersContent'

export default function SellerOrdersPage() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const tabFromRoute =
    pathname?.endsWith('/pending') ? 'pending'
    : pathname?.endsWith('/completed') ? 'completed'
    : null
  const initialTab = tabFromRoute ?? searchParams?.get('tab') ?? undefined

  return <OrdersContent initialTab={initialTab} />
}
