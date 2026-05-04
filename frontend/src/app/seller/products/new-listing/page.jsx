import { Suspense } from 'react'
import NewListingClient from '../SellerListingForm'
import styles from '../products.module.css'

export const metadata = {
  title: 'Add New Listing',
}

function NewListingLoadingState() {
  return (
    <div
      className={styles.loadingRoot}
      role="status"
      aria-busy="true"
      aria-live="polite"
    >
      <p className={styles.srOnly}>Preparing the listing form</p>
      <div className={styles.loadingStack} aria-hidden="true">
        <aside className={styles.loadingAside}>
          <div className={`${styles.skeletonCard} ${styles.skeletonCardStepper}`}>
            <div className={styles.skeletonStepperTrack}>
              <span className={styles.skeletonStepDot} />
              <span className={styles.skeletonStepLine} />
              <span className={styles.skeletonStepDot} />
              <span className={styles.skeletonStepLine} />
              <span className={styles.skeletonStepDot} />
            </div>
          </div>
          <div className={styles.skeletonCard}>
            <div className={`${styles.skeletonLine} ${styles.skeletonShort}`} />
            <div className={`${styles.skeletonLine} ${styles.skeletonNarrow}`} />
            <div className={`${styles.skeletonLine} ${styles.skeletonNarrow}`} />
          </div>
        </aside>
        <div className={styles.loadingMain}>
          <div className={`${styles.skeletonCard} ${styles.skeletonCardSection}`}>
            <div className={`${styles.skeletonLine} ${styles.skeletonTitle}`} />
            <div className={`${styles.skeletonLine} ${styles.skeletonMedium}`} />
            <div className={styles.skeletonBlock} />
            <div className={styles.skeletonBlock} />
            <div className={`${styles.skeletonLine} ${styles.skeletonShort}`} />
            <div className={styles.skeletonFooter}>
              <div className={styles.skeletonBtnGhost} />
              <div className={styles.skeletonBtnGhostWide} />
              <div className={styles.skeletonBtnPrimary} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function SellerProductsNewPage() {
  return (
    <Suspense
      fallback={
        <div className={styles.newListingPage}>
          <NewListingLoadingState />
        </div>
      }
    >
      <NewListingClient />
    </Suspense>
  )
}
