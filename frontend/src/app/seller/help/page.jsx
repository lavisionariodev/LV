'use client'

import styles from './help.module.css'

export default function SellerHelpPage() {
  return (
    <div className={styles.pageWrap}>
      <header className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Help Center</h1>
        <p className={styles.pageSubtitle}>
          Seller help content and FAQs can be added here.
        </p>
      </header>
    </div>
  )
}
