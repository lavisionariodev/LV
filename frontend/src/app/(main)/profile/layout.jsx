'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSelectedLayoutSegment } from 'next/navigation';
import styles from './profile.module.css';
import { ProfileProvider } from '@/contexts/ProfileContext';
import { useAuth } from '@/contexts/AuthContext';

export default function ProfileLayout({ children }) {
  const router = useRouter();
  const segment = useSelectedLayoutSegment();
  const activeTab = segment || 'account';
  const { user, authLoading, isBuyer } = useAuth();

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace('/buyer/login?redirect=/profile/account');
      return;
    }
    if (!isBuyer) {
      router.replace('/buyer/login?redirect=/profile/account');
    }
  }, [authLoading, user, isBuyer, router]);

  if (authLoading && !user) {
    return (
      <main className={styles.profilePage}>
        <div className={styles.profileLayout}>
          <aside className={styles.profileSidebar}>
            <div className={styles.sidebarHeading}>My Account</div>
            <nav className={styles.sidebarNav}>
              <button type="button" className={styles.sidebarItem}>
                Profile
              </button>
              <button type="button" className={styles.sidebarItem}>
                Purchases
              </button>
              <button type="button" className={styles.sidebarItem}>
                Notifications
              </button>
            </nav>
          </aside>
          <div className={styles.profileMain}>
            <div className={styles.profileCard}>
              <p>Loading profile...</p>
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <ProfileProvider>
      <main className={styles.profilePage}>
        <div className={styles.profileLayout}>
          <aside className={styles.profileSidebar}>
            <div className={styles.sidebarHeading}>My Account</div>
            <nav className={styles.sidebarNav}>
              <Link
                href="/profile/account"
                className={`${styles.sidebarItem} ${
                  activeTab === 'account' ? styles.sidebarItemActive : ''
                }`}
                aria-current={activeTab === 'account' ? 'page' : undefined}
              >
                Profile
              </Link>
              <Link
                href="/profile/purchases"
                className={`${styles.sidebarItem} ${
                  activeTab === 'purchases' ? styles.sidebarItemActive : ''
                }`}
                aria-current={activeTab === 'purchases' ? 'page' : undefined}
              >
                Purchases
              </Link>
              <Link
                href="/profile/notifications"
                className={`${styles.sidebarItem} ${
                  activeTab === 'notifications' ? styles.sidebarItemActive : ''
                }`}
                aria-current={
                  activeTab === 'notifications' ? 'page' : undefined
                }
              >
                Notifications
              </Link>
            </nav>
          </aside>

          <div className={styles.profileMain}>{children}</div>
        </div>
      </main>
    </ProfileProvider>
  );
}