import styles from './NewListingLoadingState.module.css'

/**
 * Skeleton for the new listing page while the client loads listing data.
 * Matches stacked layout: progress + tips (max 760px), then form column (max 760px).
 */
export default function NewListingLoadingState() {
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
