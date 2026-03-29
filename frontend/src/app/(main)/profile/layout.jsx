'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSelectedLayoutSegment } from 'next/navigation';
import styles from './profile.module.css';
import { ProfileProvider } from '@/contexts/ProfileContext';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/contexts/ProfileContext';

/* ─────────────────────────────────────────
   Sidebar — rendered inside ProfileProvider
   so it can access profile data (avatar, name)
───────────────────────────────────────── */
function ProfileSidebar({ activeTab }) {
  const { profile, uploading, fileInputRef, initials } = useProfile();

  return (
    <aside className={styles.profileSidebar}>

      {/* ── Identity row ── */}
      <div className={styles.sidebarIdentity}>
        <button
          type="button"
          className={styles.sidebarAvatarBtn}
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          aria-label="Change profile photo"
        >
          {profile.avatar_url ? (
            <img src={profile.avatar_url} alt="avatar" className={styles.sidebarAvatarImg} />
          ) : (
            <div className={styles.sidebarAvatarPlaceholder}>{initials || '?'}</div>
          )}
        </button>
        <div className={styles.sidebarUserMeta}>
          <span className={styles.sidebarUsername}>
            {profile.username || profile.full_name || 'Your Name'}
          </span>
          <Link href="/profile/account" className={styles.sidebarEditLink}>
            <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24"
              fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
            Edit Profile
          </Link>
        </div>
      </div>

      {/* ── Nav ── */}
      <nav className={styles.sidebarNav} aria-label="Account navigation">

        {/* My Account group → Profile child */}
        <div className={styles.sidebarGroup}>
          <div className={styles.sidebarGroupHeader}>
            <span className={styles.sidebarGroupIcon}>
              <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24"
                fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </span>
            <span className={styles.sidebarGroupLabel}>My Account</span>
          </div>
          <Link
            href="/profile/account"
            className={`${styles.sidebarChildItem} ${activeTab === 'account' ? styles.sidebarItemActive : ''}`}
            aria-current={activeTab === 'account' ? 'page' : undefined}
          >
            Profile
          </Link>
        </div>

        {/* My Purchase */}
        <Link
          href="/profile/purchases"
          className={`${styles.sidebarItem} ${activeTab === 'purchases' ? styles.sidebarItemActive : ''}`}
          aria-current={activeTab === 'purchases' ? 'page' : undefined}
        >
          <span className={styles.sidebarIcon}>
            <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24"
              fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <path d="M16 10a4 4 0 0 1-8 0" />
            </svg>
          </span>
          My Purchase
        </Link>

        {/* Notifications */}
        <Link
          href="/profile/notifications"
          className={`${styles.sidebarItem} ${activeTab === 'notifications' ? styles.sidebarItemActive : ''}`}
          aria-current={activeTab === 'notifications' ? 'page' : undefined}
        >
          <span className={styles.sidebarIcon}>
            <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24"
              fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
          </span>
          Notifications
        </Link>

      </nav>
    </aside>
  );
}

/* ═══════════════════════════════════════
   LAYOUT
═══════════════════════════════════════ */
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
            <div className={styles.sidebarIdentity}>
              <div className={styles.sidebarAvatarBtn} style={{ background: 'var(--forest-light)' }} />
              <div className={styles.sidebarUserMeta}>
                <span className={styles.sidebarUsername} style={{ opacity: 0.3 }}>Loading…</span>
              </div>
            </div>
          </aside>
          <div className={styles.profileMain}>
            <div className={styles.profileCard}>
              <p className={styles.mutedText} style={{ padding: '24px' }}>Loading profile…</p>
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (!user) return null;

  return (
    <ProfileProvider>
      <main className={styles.profilePage}>
        <div className={styles.profileLayout}>
          <ProfileSidebar activeTab={activeTab} />
          <div className={styles.profileMain}>{children}</div>
        </div>
      </main>
    </ProfileProvider>
  );
}