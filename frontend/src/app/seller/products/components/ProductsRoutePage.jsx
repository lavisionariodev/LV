'use client'

import { Suspense } from 'react'
import ProductsContent, { ProductsListingRouteFallback } from './ProductsContent'

export default function ProductsRoutePage(props) {
  return (
    <Suspense fallback={<ProductsListingRouteFallback />}>
      <ProductsContent {...props} />
    </Suspense>
  )
}
