import styles from './NewListingLoadingState.module.css'

/**
 * Minimal skeleton for the new listing page (Suspense + client data loading).
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
      <div className={styles.loadingGrid} aria-hidden="true">
        <aside className={styles.loadingAside}>
          <div className={styles.skeletonCard}>
            <div className={`${styles.skeletonLine} ${styles.skeletonTitle}`} />
            <div className={styles.skeletonLine} />
            <div className={styles.skeletonLine} />
            <div className={`${styles.skeletonLine} ${styles.skeletonShort}`} />
          </div>
          <div className={styles.skeletonCard}>
            <div className={`${styles.skeletonLine} ${styles.skeletonShort}`} />
            <div className={`${styles.skeletonLine} ${styles.skeletonNarrow}`} />
            <div className={`${styles.skeletonLine} ${styles.skeletonNarrow}`} />
          </div>
        </aside>
        <div className={styles.loadingMain}>
          <div className={styles.skeletonCard}>
            <div className={`${styles.skeletonLine} ${styles.skeletonTitle}`} />
            <div className={`${styles.skeletonLine} ${styles.skeletonMedium}`} />
            <div className={styles.skeletonBlock} />
            <div className={styles.skeletonBlock} />
            <div className={`${styles.skeletonLine} ${styles.skeletonShort}`} />
            <div className={styles.skeletonFooter}>
              <div className={styles.skeletonBtnGhost} />
              <div className={styles.skeletonBtnPrimary} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
