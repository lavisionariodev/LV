'use client'

import { Suspense } from 'react'
import ProductsContent from '../components/ProductsContent'
import ProductsListingRouteFallback from '../components/ProductsListingRouteFallback'

export default function SellerProductsPackagesPage() {
  return (
    <Suspense fallback={<ProductsListingRouteFallback />}>
      <ProductsContent initialKind="package" />
    </Suspense>
  )
}
