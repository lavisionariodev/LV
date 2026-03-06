'use client'

import styles from '../orders.module.css'

export default function SellerOrdersPendingPage() {
  return (
    <div className={styles.pageWrap}>
      <p className={styles.pageSubtitle}>
        Orders awaiting confirmation or payment.
      </p>
    </div>
  )
}
