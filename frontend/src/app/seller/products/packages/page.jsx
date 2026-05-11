'use client'

import { Suspense } from 'react'
import ProductsContent from '../ProductsContent'
import styles from '../products.module.css'

function ProductsRouteFallback() {
  return (
    <div
      className={styles.pageWrap}
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label="Loading listings"
    >
      <section className={styles.statsStrip} aria-hidden>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className={styles.statCard}>
            <span className={styles.skeletonLine} style={{ width: '58%', height: 9 }} />
            <span className={styles.skeletonLine} style={{ width: '42%', height: 18, marginTop: 6 }} />
            <span className={styles.skeletonLine} style={{ width: '72%', height: 8, marginTop: 6 }} />
          </div>
        ))}
      </section>
      <div className={styles.catalogSkGrid}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className={styles.catalogSkCard}>
            <div className={styles.skeletonBlock} style={{ height: 148, borderRadius: 0 }} />
            <div className={styles.catalogSkLines}>
              <div className={`${styles.skeletonLine} ${styles.skeletonTitle}`} />
              <div className={`${styles.skeletonLine} ${styles.skeletonMedium}`} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function SellerProductsPackagesPage() {
  return (
    <Suspense fallback={<ProductsRouteFallback />}>
      <ProductsContent initialKind="package" />
    </Suspense>
  )
}
