'use client'

import { Suspense, lazy } from 'react'
import styles from '../marketing.module.css'

const MarketingHub = lazy(() => import('../MarketingHub'))

function MarketingRouteSkeleton() {
  return (
    <div
      className={styles.marketingRouteSk}
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label="Loading marketing"
    >
      <header className={styles.marketingRouteSkHeader} aria-hidden>
        <span className={`${styles.marketingSkBar} ${styles.marketingRouteSkTitle}`} />
        <span className={`${styles.marketingSkBar} ${styles.marketingRouteSkSubtitle}`} />
      </header>

      <div className={styles.marketingRouteSkStats} aria-hidden>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className={styles.marketingRouteSkStat}>
            <span className={`${styles.marketingSkBar} ${styles.marketingRouteSkStatVal}`} />
            <span className={`${styles.marketingSkBar} ${styles.marketingRouteSkStatLab}`} />
            <span className={`${styles.marketingSkBar} ${styles.marketingRouteSkStatHint}`} />
          </div>
        ))}
      </div>

      <div className={styles.marketingRouteSkCard} aria-hidden>
        <div className={styles.marketingRouteSkCardHead}>
          <span className={`${styles.marketingSkBar} ${styles.marketingRouteSkCardTitle}`} />
          <span className={`${styles.marketingSkBar} ${styles.marketingRouteSkBtn}`} />
        </div>
        <span className={`${styles.marketingSkBar} ${styles.marketingRouteSkTable}`} />
      </div>

      <div className={styles.marketingRouteSkRowGap} aria-hidden>
        <span className={`${styles.marketingSkBar} ${styles.marketingRouteSkChart}`} />
        <div className={styles.marketingRouteSkCard}>
          <span className={`${styles.marketingSkBar} ${styles.marketingRouteSkCardTitle}`} style={{ width: '52%' }} />
          <span className={`${styles.marketingSkBar} ${styles.marketingRouteSkTable}`} style={{ minHeight: 140 }} />
        </div>
      </div>
    </div>
  )
}

export default function SellerMarketingCentrePage() {
  return (
    <Suspense fallback={<MarketingRouteSkeleton />}>
      <MarketingHub initialTab="centre" />
    </Suspense>
  )
}
