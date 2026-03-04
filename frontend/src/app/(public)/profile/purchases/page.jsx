'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useProfile } from '@/contexts/ProfileContext';
import { getUserRole, ROLE_SELLER } from '@/lib/auth/roles';
import styles from '../profile.module.css';

export default function PurchasesPage() {
  const { user } = useProfile();
  const router = useRouter();
  const [isSeller, setIsSeller] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function check() {
      if (!user) return;
      const role = await getUserRole(user.id);
      if (cancelled) return;
      if (role === ROLE_SELLER) {
        setIsSeller(true);
      }
    }
    check();
    return () => {
      cancelled = true;
    };
  }, [user]);

  if (isSeller) {
    return (
      <div className={styles.profileCard}>
        <header className={styles.profileHeader}>
          <h1 className={styles.profileTitle}>Purchases (Buyer only)</h1>
          <p className={styles.profileSubtitle}>
            You are currently signed in as a seller. Sellers cannot view buyer purchase history.
          </p>
        </header>
        <div className={styles.tabBody}>
          <button
            className={styles.primaryButton}
            type="button"
            onClick={() => router.push('/')}
          >
            Back to homepage
          </button>
        </div>
      </div>
    );
  }

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


