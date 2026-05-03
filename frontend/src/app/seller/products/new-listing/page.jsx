import { Suspense } from 'react'
import NewListingClient from '../SellerListingForm'
import styles from '../products.module.css'
import loadingStyles from '@/components/ui/Load/NewListingLoadingState.module.css'

export const metadata = {
  title: 'Add New Listing',
}

function NewListingLoadingState() {
  return (
    <div
      className={loadingStyles.loadingRoot}
      role="status"
      aria-busy="true"
      aria-live="polite"
    >
      <p className={loadingStyles.srOnly}>Preparing the listing form</p>
      <div className={loadingStyles.loadingStack} aria-hidden="true">
        <aside className={loadingStyles.loadingAside}>
          <div className={`${loadingStyles.skeletonCard} ${loadingStyles.skeletonCardStepper}`}>
            <div className={loadingStyles.skeletonStepperTrack}>
              <span className={loadingStyles.skeletonStepDot} />
              <span className={loadingStyles.skeletonStepLine} />
              <span className={loadingStyles.skeletonStepDot} />
              <span className={loadingStyles.skeletonStepLine} />
              <span className={loadingStyles.skeletonStepDot} />
            </div>
          </div>
          <div className={loadingStyles.skeletonCard}>
            <div className={`${loadingStyles.skeletonLine} ${loadingStyles.skeletonShort}`} />
            <div className={`${loadingStyles.skeletonLine} ${loadingStyles.skeletonNarrow}`} />
            <div className={`${loadingStyles.skeletonLine} ${loadingStyles.skeletonNarrow}`} />
          </div>
        </aside>
        <div className={loadingStyles.loadingMain}>
          <div className={`${loadingStyles.skeletonCard} ${loadingStyles.skeletonCardSection}`}>
            <div className={`${loadingStyles.skeletonLine} ${loadingStyles.skeletonTitle}`} />
            <div className={`${loadingStyles.skeletonLine} ${loadingStyles.skeletonMedium}`} />
            <div className={loadingStyles.skeletonBlock} />
            <div className={loadingStyles.skeletonBlock} />
            <div className={`${loadingStyles.skeletonLine} ${loadingStyles.skeletonShort}`} />
            <div className={loadingStyles.skeletonFooter}>
              <div className={loadingStyles.skeletonBtnGhost} />
              <div className={loadingStyles.skeletonBtnGhostWide} />
              <div className={loadingStyles.skeletonBtnPrimary} />
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
