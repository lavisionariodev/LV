'use client'

import { Suspense } from 'react'
import ProductsContent from '../ProductsContent'
import styles from '../products.module.css'

function ProductsRouteFallback() {
  return (
    <div className={styles.pageWrap} role="status" aria-live="polite">
      <p className={styles.emptyTitle} style={{ margin: 0 }}>
        Loading listings…
      </p>
    </div>
  )
}

export default function SellerProductsCatalogPage() {
  return (
    <Suspense fallback={<ProductsRouteFallback />}>
      <ProductsContent initialKind="all" />
    </Suspense>
  )
}
