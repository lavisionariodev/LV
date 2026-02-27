'use client';

import { useProfile } from '@/contexts/ProfileContext';
import styles from '../profile.module.css';

export default function PurchasesPage() {
  const { user } = useProfile();

  return (
    <div className={styles.profileCard}>
      <header className={styles.profileHeader}>
        <h1 className={styles.profileTitle}>Purchases</h1>
        <p className={styles.profileSubtitle}>
          Review your previous and upcoming purchases.
        </p>
        <p className={styles.profileSignedIn}>
          Signed in as <strong>{user.email}</strong>
        </p>
      </header>

      <div className={styles.tabBody}>
        <p className={styles.mutedText}>
          Your purchases will appear here once you place an order.
        </p>
      </div>
    </div>
  );
}

