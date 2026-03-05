'use client';

import { useProfile } from '@/contexts/ProfileContext';
import styles from '../profile.module.css';

export default function NotificationsPage() {
  const { user } = useProfile();

  return (
    <div className={styles.profileCard}>
      <header className={styles.profileHeader}>
        <h1 className={styles.profileTitle}>Notifications</h1>
        <p className={styles.profileSubtitle}>
          Manage how we notify you about your activity.
        </p>
        <p className={styles.profileSignedIn}>
          Signed in as <strong>{user.email}</strong>
        </p>
      </header>

      <div className={styles.tabBody}>
        <p className={styles.mutedText}>
          Notification settings will be available here in a future update.
        </p>
      </div>
    </div>
  );
}

