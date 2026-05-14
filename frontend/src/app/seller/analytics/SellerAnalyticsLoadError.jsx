'use client'

import styles from './analytics.module.css'

export default function SellerAnalyticsLoadError({ onRetry }) {
  return (
    <div className={styles.pageWrap} role="alert">
      <p className={styles.pageError}>Couldn&apos;t load analytics.</p>
      <button type="button" className={styles.pageRetryBtn} onClick={() => onRetry?.()}>
        Try again
      </button>
    </div>
  )
}
