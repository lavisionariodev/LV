'use client'

import { Suspense } from 'react'
import ProductsContent from '../components/ProductsContent'
import ProductsListingRouteFallback from '../components/ProductsListingRouteFallback'

export default function SellerProductsCatalogPage() {
  return (
    <Suspense fallback={<ProductsListingRouteFallback />}>
      <ProductsContent initialKind="all" />
    </Suspense>
  )
}
