'use client'

import { Suspense } from 'react'
import ProductsContent from '../components/ProductsContent'
import ProductsListingRouteFallback from '../components/ProductsListingRouteFallback'

export default function SellerProductsArchivePage() {
  return (
    <Suspense fallback={<ProductsListingRouteFallback />}>
      <ProductsContent listingScope="archived" initialKind="all" />
    </Suspense>
  )
}
