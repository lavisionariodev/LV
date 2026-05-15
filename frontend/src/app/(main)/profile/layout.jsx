'use client';

import { useEffect, useLayoutEffect, useState, useCallback, useRef, useMemo } from 'react';
import Link from 'next/link';
import { useRouter, useSelectedLayoutSegment, useSearchParams } from 'next/navigation';
import styles from './profile.module.css';
import mobileStyles from './profile.mobile.module.css';
import { ProfileProvider } from '@/contexts/ProfileContext';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/contexts/ProfileContext';

// ── Bottom sheet (renders null on desktop) ────────────────────────────────────
import BottomSheet from './components/BottomSheet';
import { signOut as signOutSession } from '@/lib/auth/session';
import { changePasswordWithReauth } from '@/lib/auth/changePassword';
import { inferCanChangePassword } from '@/lib/auth/inferCanChangePassword';
import { supabase } from '@/lib/supabase/client';
import { useToast } from '@/contexts/ToastContext';
import LogoutModal from '@/components/ui/Modal/Logout';
import {
  PROFILE_DOB_MONTHS,
  dobPartsFromIso,
  isoFromDobParts,
} from '@/shared/utils/profileDob';

/* ─────────────────────────────────────────
   Hook — detect mobile viewport
───────────────────────────────────────── */
function useIsMobile(breakpoint = 768) {
  // Initialise synchronously so the very first click already has the correct value.
  // typeof window guard keeps Next.js SSR happy.
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined'
      ? window.matchMedia(`(max-width: ${breakpoint}px)`).matches
      : false
  );
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpoint}px)`);
    const handler = (e) => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    queueMicrotask(() => setIsMobile(mq.matches));
    return () => mq.removeEventListener('change', handler);
  }, [breakpoint]);
  return isMobile;
}

/* ─────────────────────────────────────────
   SHEET CONFIGS
   title  — displayed in the top bar
   hasSave — whether to show a Save button
   content — which page component to render inside the sheet
───────────────────────────────────────── */
const SHEET_CONFIG = {
  account: {
    title: 'Edit Profile',
    hasSave: true,
  },
  password: {
    title: 'Change Password',
    hasSave: true,
  },
};

/* ─────────────────────────────────────────
   Chevron icon (reused in mobile rows)
───────────────────────────────────────── */
function Chevron() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

/* ─────────────────────────────────────────
   Sidebar
───────────────────────────────────────── */
function ProfileSidebar({ activeTab, onMobileNavClick, onLogout, userEmail }) {
  const { profile, uploading, fileInputRef, initials } = useProfile();
  const isMobile = useIsMobile();

  /* ── MOBILE layout ── */
  if (isMobile) {
    return (
      <aside className={mobileStyles.mobileMenu}>

        {/* ── Identity card ── */}
        <div className={mobileStyles.identityCard}>
          <button
            type="button"
            className={mobileStyles.avatarCircle}
            onClick={() => onMobileNavClick('account')}
            aria-label="Edit profile"
          >
            {profile.avatar_url ? (
              // Dynamic Supabase avatar URL — keep <img> to avoid next/image remotePatterns churn
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profile.avatar_url} alt="avatar" className={mobileStyles.avatarImg} />
            ) : (
              <span className={mobileStyles.avatarInitials}>{initials || '?'}</span>
            )}
          </button>
          <div className={mobileStyles.identityMeta}>
            <div className={mobileStyles.identityNameRow}>
              <span className={mobileStyles.identityName}>
                {profile.username || profile.full_name || 'Your Name'}
              </span>
              <button
                type="button"
                className={mobileStyles.editIconBtn}
                onClick={() => onMobileNavClick('account')}
                aria-label="Edit profile"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24"
                  fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
              </button>
            </div>
            {userEmail && (
              <span className={mobileStyles.identityEmail}>{userEmail}</span>
            )}
          </div>
        </div>

        {/* ── ACCOUNT section ── */}
        <div className={mobileStyles.menuSection}>
          <p className={mobileStyles.sectionLabel}>Account</p>
          <div className={mobileStyles.menuCard}>

            <button
              type="button"
              className={mobileStyles.menuRow}
              onClick={() => onMobileNavClick('account')}
            >
              <span className={mobileStyles.menuRowLeft}>
                <span className={mobileStyles.menuIcon}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"
                    fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                </span>
                <span className={mobileStyles.menuLabel}>Manage Profile</span>
              </span>
              <span className={mobileStyles.menuChevron}><Chevron /></span>
            </button>

            <div className={mobileStyles.menuDivider} />

            <button
              type="button"
              className={mobileStyles.menuRow}
              onClick={() => onMobileNavClick('password')}
            >
              <span className={mobileStyles.menuRowLeft}>
                <span className={mobileStyles.menuIcon}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"
                    fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                </span>
                <span className={mobileStyles.menuLabel}>Password</span>
              </span>
              <span className={mobileStyles.menuChevron}><Chevron /></span>
            </button>

            <div className={mobileStyles.menuDivider} />

            <Link href="/profile/notifications" className={mobileStyles.menuRow}>
              <span className={mobileStyles.menuRowLeft}>
                <span className={mobileStyles.menuIcon}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"
                    fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                  </svg>
                </span>
                <span className={mobileStyles.menuLabel}>Notifications</span>
              </span>
              <span className={mobileStyles.menuChevron}><Chevron /></span>
            </Link>

          </div>
        </div>

        {/* ── ORDERS section ── */}
        <div className={mobileStyles.menuSection}>
          <p className={mobileStyles.sectionLabel}>Orders</p>
          <div className={mobileStyles.menuCard}>

            <Link href="/profile/purchases" className={mobileStyles.menuRow}>
              <span className={mobileStyles.menuRowLeft}>
                <span className={mobileStyles.menuIcon}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"
                    fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                    <line x1="3" y1="6" x2="21" y2="6" />
                    <path d="M16 10a4 4 0 0 1-8 0" />
                  </svg>
                </span>
                <span className={mobileStyles.menuLabel}>My Purchases</span>
              </span>
              <span className={mobileStyles.menuChevron}><Chevron /></span>
            </Link>

          </div>
        </div>

        {/* ── SUPPORT section ── */}
        <div className={mobileStyles.menuSection}>
          <p className={mobileStyles.sectionLabel}>Support</p>
          <div className={mobileStyles.menuCard}>

            <button
              type="button"
              className={`${mobileStyles.menuRow} ${mobileStyles.menuRowDanger}`}
              onClick={onLogout}
            >
              <span className={mobileStyles.menuRowLeft}>
                <span className={`${mobileStyles.menuIcon} ${mobileStyles.menuIconDanger}`}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"
                    fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                    <polyline points="16 17 21 12 16 7" />
                    <line x1="21" y1="12" x2="9" y2="12" />
                  </svg>
                </span>
                <span className={mobileStyles.menuLabel}>Log Out</span>
              </span>
            </button>

          </div>
        </div>

      </aside>
    );
  }

  /* ── DESKTOP layout (unchanged) ── */
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
            // eslint-disable-next-line @next/next/no-img-element -- dynamic user avatar URL
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

        <Link
          href="/profile/account"
          className={`${styles.sidebarItem} ${activeTab === 'account' ? styles.sidebarItemActive : ''}`}
          aria-current={activeTab === 'account' ? 'page' : undefined}
        >
          <span className={styles.sidebarIcon}>
            <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24"
              fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </span>
          My Account
        </Link>

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

        <Link
          href="/profile/password"
          className={`${styles.sidebarItem} ${activeTab === 'password' ? styles.sidebarItemActive : ''}`}
          aria-current={activeTab === 'password' ? 'page' : undefined}
        >
          <span className={styles.sidebarIcon}>
            <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24"
              fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </span>
          Password
        </Link>

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
  const searchParams = useSearchParams();
  const activeTab = segment || 'account';
  const { user, authLoading, isBuyer } = useAuth();
  const isMobile = useIsMobile();

  // Which sheet is open, or null.
  const [openSheet, setOpenSheet] = useState(() => {
    if (typeof window === 'undefined') return null;
    const sheet = new URLSearchParams(window.location.search).get('sheet');
    const validSheets = ['account', 'password'];
    if (sheet && validSheets.includes(sheet) &&
        window.matchMedia('(max-width: 768px)').matches) {
      return sheet;
    }
    return null;
  });
  // Forwarded saving state from child form (account sheet only)
  const [sheetSaving, setSheetSaving] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);
  // Ref callback so AccountPage can hand us its save trigger
  const saveTriggerRef = useRef(null);
  const setSaveTrigger = useCallback((fn) => {
    saveTriggerRef.current = fn;
  }, []);

  const handleMobileNavClick = useCallback((tab) => {
    setOpenSheet(tab);
  }, []);

  const handleSheetClose = useCallback(() => {
    setOpenSheet(null);
    setSheetSaving(false);
    saveTriggerRef.current = null;
    // Remove ?sheet= from URL cleanly without adding to history
    if (typeof window !== 'undefined' && window.location.search.includes('sheet=')) {
      const url = new URL(window.location.href);
      url.searchParams.delete('sheet');
      window.history.replaceState({}, '', url.toString());
    }
  }, []);

  const openLogoutModal = useCallback(() => {
    setLogoutOpen(true);
  }, []);

  const handleConfirmLogout = useCallback(async () => {
    try {
      await signOutSession();
      setLogoutOpen(false);
      router.push('/');
    } catch {
      setLogoutOpen(false);
      router.push('/');
    }
  }, [router]);

  const handleCancelLogout = useCallback(() => {
    setLogoutOpen(false);
  }, []);

  // Called by the top-bar Save button (account sheet)
  const handleSheetSave = useCallback(async () => {
    const run = saveTriggerRef.current;
    if (run) {
      await run();
    }
  }, []);

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

  // Open sheet when mobile lands on /profile?sheet=account|password (e.g. redirect from /profile/password)
  useEffect(() => {
    if (!isMobile) return;
    const sheet = searchParams.get('sheet');
    if (sheet === 'account' || sheet === 'password') {
      setOpenSheet(sheet);
    }
  }, [isMobile, searchParams]);

  // Close sheet if screen grows to desktop while sheet is open
  useEffect(() => {
    if (!isMobile && openSheet) {
      queueMicrotask(() => setOpenSheet(null));
    }
  }, [isMobile, openSheet]);

  if (authLoading && !user) {
    return (
      <main className={styles.profilePage} aria-busy="true" aria-describedby="profile-auth-skel-hint">
        <p id="profile-auth-skel-hint" role="status" className={styles.visuallyHidden}>
          Loading your profile. Navigation and tab content will appear shortly.
        </p>
        <div className={styles.profileLayout}>
          <aside className={styles.profileSidebar} aria-hidden="true">
            <div className={styles.skLayoutIdentity}>
              <div className={`${styles.skBlock} ${styles.skLayoutAvatar}`} />
              <div className={styles.skLayoutMeta}>
                <div className={`${styles.skBlock} ${styles.skLayoutName}`} />
                <div className={`${styles.skBlock} ${styles.skLayoutEdit}`} />
              </div>
            </div>
            {['nav1', 'nav2', 'nav3'].map((k) => (
              <div key={k} className={`${styles.skBlock} ${styles.skLayoutNavItem}`} />
            ))}
          </aside>
          <div className={styles.profileMain}>
            <div className={styles.profileCard}>
              <div className={styles.profileAccentBar} />
              <div className={styles.skLayoutMainInner}>
                <div className={`${styles.skBlock} ${styles.skLayoutEyebrow}`} />
                <div className={`${styles.skBlock} ${styles.skLayoutSub}`} />
                <div className={`${styles.skBlock} ${styles.skLayoutLine}`} />
                <div className={`${styles.skBlock} ${styles.skLayoutLine} ${styles.skLayoutLineShort}`} />
              </div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (!user) return null;

  const cfg = openSheet ? SHEET_CONFIG[openSheet] : null;

  return (
    <ProfileProvider>
      <main className={styles.profilePage}>
        <div className={styles.profileLayout}>
          {(!isMobile || !segment) && <ProfileSidebar activeTab={activeTab} onMobileNavClick={handleMobileNavClick} onLogout={openLogoutModal} userEmail={user?.email} />}

          {/* Desktop: always show sidebar + content normally.
               Mobile root /profile: hide content (menu is the UI).
               Mobile sub-pages: hide sidebar, show content full width. */}
          {(!isMobile || !!segment) && (
            <div className={`${styles.profileMain} ${isMobile && !!segment ? styles.profileMainFull : ''}`}>
              {children}
            </div>
          )}
        </div>
      </main>

      {/* ── Mobile bottom sheets ── */}
      {cfg && (
        <BottomSheet
          isOpen={!!openSheet}
          onClose={handleSheetClose}
          title={cfg.title}
          onSave={cfg.hasSave ? handleSheetSave : undefined}
          saving={sheetSaving}
        >
          {openSheet === 'account' && (
            <AccountSheetContent
              onSaveTriggerReady={setSaveTrigger}
              onSavingChange={setSheetSaving}
              onSaveComplete={handleSheetClose}
            />
          )}
          {openSheet === 'password' && (
            <PasswordSheetContent
              onSaveTriggerReady={setSaveTrigger}
              onSavingChange={setSheetSaving}
              onSaveComplete={handleSheetClose}
            />
          )}
        </BottomSheet>
      )}

      <LogoutModal
        open={logoutOpen}
        onConfirm={handleConfirmLogout}
        onCancel={handleCancelLogout}
      />
    </ProfileProvider>
  );
}

/* ─────────────────────────────────────────
   Sheet content wrappers
   These thin wrappers give the bottom sheet
   the right padding / scroll behaviour while
   reusing each page's existing component.
───────────────────────────────────────── */
import sheetStyles from './profile.mobile.module.css';

function AccountSheetContent({ onSaveTriggerReady, onSavingChange, onSaveComplete }) {
  // We render AccountSheetForm and strip the outer profileCard chrome
  // (accent bar, header) — the sheet provides those instead.
  // We pass callbacks down via a context-like prop so the Save button
  // in the top bar can trigger the form's handleSave.
  return (
    <div className={sheetStyles.sheetAccountWrap}>
      <AccountSheetForm
        onSaveTriggerReady={onSaveTriggerReady}
        onSavingChange={onSavingChange}
        onSaveComplete={onSaveComplete}
      />
    </div>
  );
}

/**
 * Inline account form for the sheet.
 * Mirrors the fields from /profile/account/page.jsx but:
 *  - No outer profileCard wrapper (sheet provides chrome)
 *  - No Save button (sheet top-bar Save drives it)
 *  - Reports saving state upward via onSavingChange
 */
function AccountSheetForm({ onSaveTriggerReady, onSavingChange, onSaveComplete }) {
  const {
    user,
    profile,
    saving,
    uploading,
    handleChange,
    handleSave,
    handleAvatarFileChange,
    handleRemoveAvatar,
    fileInputRef,
    initials,
  } = useProfile();

  const [dob, setDob] = useState({ day: '', month: '', year: '' });
  const dobRef = useRef(dob);
  const handleSaveRef = useRef(handleSave);

  useLayoutEffect(() => {
    dobRef.current = dob;
    handleSaveRef.current = handleSave;
  }, [dob, handleSave]);

  useEffect(() => {
    queueMicrotask(() => {
      setDob(dobPartsFromIso(profile?.date_of_birth));
    });
  }, [profile?.date_of_birth]);

  // Wire up the save trigger so the sheet's top bar can call it (async save + close on success)
  useEffect(() => {
    onSaveTriggerReady(() => async () => {
      const d = dobRef.current;
      const iso = isoFromDobParts(d.day, d.month, d.year);
      const ok = await handleSaveRef.current({ date_of_birth: iso });
      if (ok && onSaveComplete) onSaveComplete();
    });
  }, [onSaveTriggerReady, onSaveComplete]);

  // Mirror saving state upward
  useEffect(() => {
    onSavingChange(saving);
  }, [saving, onSavingChange]);

  const GENDER_OPTIONS = ['Male', 'Female', 'Other'];
  const DAYS = Array.from({ length: 31 }, (_, i) => i + 1);
  const YEARS = Array.from({ length: 80 }, (_, i) => new Date().getFullYear() - i);

  return (
    <div className={sheetStyles.accountForm}>

      {/* ── Avatar section ── */}
      <div className={sheetStyles.avatarSection}>
        <button
          type="button"
          className={sheetStyles.avatarBtn}
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          aria-label="Change profile photo"
        >
          {profile?.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element -- dynamic user avatar URL
            <img src={profile.avatar_url} alt="avatar" className={sheetStyles.avatarImg} />
          ) : (
            <div className={sheetStyles.avatarPlaceholder}>{initials || '?'}</div>
          )}
          <div className={sheetStyles.avatarEditBadge}>
            <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24"
              fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          </div>
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={handleAvatarFileChange}
        />

        {profile?.avatar_url && (
          <button
            type="button"
            className={sheetStyles.removeBtn}
            onClick={handleRemoveAvatar}
            disabled={uploading}
          >
            Remove
          </button>
        )}
        <p className={sheetStyles.avatarHint}>PNG, JPG, or WEBP · Max 1 MB</p>
      </div>

      {/* ── Fields ── */}
      <div className={sheetStyles.fields}>

        <div className={sheetStyles.fieldGroup}>
          <label className={sheetStyles.fieldLabel} htmlFor="sh_username">Username</label>
          <input
            id="sh_username"
            type="text"
            name="username"
            value={profile?.username || ''}
            onChange={handleChange}
            disabled={profile?.username_locked}
            className={sheetStyles.fieldInput}
            placeholder="e.g. jdelacruz"
          />
          <p className={sheetStyles.fieldHint}>
            {profile?.username_locked
              ? 'Username is set and cannot be changed.'
              : 'Username can only be changed once.'}
          </p>
        </div>

        <div className={sheetStyles.fieldGroup}>
          <label className={sheetStyles.fieldLabel} htmlFor="sh_full_name">Name</label>
          <input
            id="sh_full_name"
            type="text"
            name="full_name"
            value={profile?.full_name || ''}
            onChange={handleChange}
            className={sheetStyles.fieldInput}
            placeholder="Enter your full name"
          />
        </div>

        <div className={sheetStyles.fieldGroup}>
          <span className={sheetStyles.fieldLabel}>Email</span>
          <div className={sheetStyles.fieldInput} style={{ background: 'rgba(247,244,239,0.7)', color: 'var(--muted)', cursor: 'default' }}>
            {user?.email || '—'}
          </div>
        </div>

        <div className={sheetStyles.fieldGroup}>
          <label className={sheetStyles.fieldLabel} htmlFor="sh_phone">Phone Number</label>
          <input
            id="sh_phone"
            type="tel"
            name="phone"
            value={profile?.phone || ''}
            onChange={handleChange}
            className={sheetStyles.fieldInput}
            placeholder="+63 9XX XXX XXXX"
          />
        </div>

        <div className={sheetStyles.fieldGroup}>
          <span className={sheetStyles.fieldLabel}>Gender</span>
          <div className={sheetStyles.genderRow}>
            {GENDER_OPTIONS.map((g) => (
              <label key={g} className={sheetStyles.radioLabel}>
                <input
                  type="radio"
                  name="gender"
                  value={g}
                  checked={profile?.gender === g}
                  onChange={handleChange}
                  className={sheetStyles.radioInput}
                />
                <span className={sheetStyles.radioCustom} />
                {g}
              </label>
            ))}
          </div>
        </div>

        <div className={sheetStyles.fieldGroup}>
          <span className={sheetStyles.fieldLabel}>Date of Birth</span>
          <div className={sheetStyles.dobRow}>
            {[
              { key: 'day',   opts: DAYS,   ph: 'Day'   },
              { key: 'month', opts: PROFILE_DOB_MONTHS, ph: 'Month' },
              { key: 'year',  opts: YEARS,  ph: 'Year'  },
            ].map(({ key, opts, ph }) => (
              <div key={key} className={sheetStyles.selectWrap}>
                <select
                  className={sheetStyles.selectInput}
                  value={dob[key]}
                  onChange={(e) => setDob((p) => ({ ...p, [key]: e.target.value }))}
                >
                  <option value="">{ph}</option>
                  {opts.map((o) => (
                    <option key={o} value={o}>{o}</option>
                  ))}
                </select>
                <span className={sheetStyles.chevron}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24"
                    fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className={sheetStyles.fieldGroup}>
          <label className={sheetStyles.fieldLabel} htmlFor="sh_street">Address</label>
          <input
            id="sh_street"
            type="text"
            name="address_street"
            value={profile?.address_street || ''}
            onChange={handleChange}
            className={sheetStyles.fieldInput}
            placeholder="Street address"
          />
          <input
            type="text"
            name="address_city"
            value={profile?.address_city || ''}
            onChange={handleChange}
            className={`${sheetStyles.fieldInput} ${sheetStyles.fieldInputSpaced}`}
            placeholder="City"
          />
          <input
            type="text"
            name="address_province"
            value={profile?.address_province || ''}
            onChange={handleChange}
            className={`${sheetStyles.fieldInput} ${sheetStyles.fieldInputSpaced}`}
            placeholder="Province / State"
          />
          <input
            type="text"
            name="address_zip"
            value={profile?.address_zip || ''}
            onChange={handleChange}
            className={`${sheetStyles.fieldInput} ${sheetStyles.fieldInputSpaced}`}
            placeholder="ZIP code"
          />
        </div>

      </div>
    </div>
  );
}

function PasswordSheetContent({ onSaveTriggerReady, onSavingChange, onSaveComplete }) {
  return (
    <div className={sheetStyles.sheetPasswordWrap}>
      <PasswordSheetForm
        onSaveTriggerReady={onSaveTriggerReady}
        onSavingChange={onSavingChange}
        onSaveComplete={onSaveComplete}
      />
    </div>
  );
}

function PasswordSheetForm({ onSaveTriggerReady, onSavingChange, onSaveComplete }) {
  const { user, authLoading } = useAuth();
  const { showToast } = useToast();
  const canChangePassword = useMemo(() => {
    if (authLoading) return null;
    return inferCanChangePassword(user);
  }, [authLoading, user]);

  const [saving, setSaving] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const fieldsRef = useRef({ currentPassword: '', newPassword: '', confirmPassword: '' });

  useLayoutEffect(() => {
    fieldsRef.current = { currentPassword, newPassword, confirmPassword };
  }, [currentPassword, newPassword, confirmPassword]);

  useEffect(() => {
    onSaveTriggerReady(() => async () => {
      if (!canChangePassword) return;
      const { currentPassword: cur, newPassword: next, confirmPassword: confirm } = fieldsRef.current;
      setSaving(true);
      const result = await changePasswordWithReauth(supabase, {
        currentPassword: cur,
        newPassword: next,
        confirmPassword: confirm,
      });
      setSaving(false);
      if (!result.ok) {
        showToast(result.error, 'error');
        return;
      }
      if (result.warning) showToast(result.warning, 'info');
      else showToast('Password updated.', 'success');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      if (onSaveComplete) onSaveComplete();
    });
  }, [onSaveTriggerReady, onSaveComplete, canChangePassword, showToast]);

  useEffect(() => {
    onSavingChange(saving);
  }, [saving, onSavingChange]);

  if (canChangePassword === null) {
    return (
      <p className={sheetStyles.sheetPasswordStatus} role="status">
        Checking your sign-in method…
      </p>
    );
  }

  if (!canChangePassword) {
    return (
      <p className={sheetStyles.sheetPasswordStatus}>
        Password change is available only for email/password accounts.
      </p>
    );
  }

  return (
    <div className={sheetStyles.accountForm}>
      <p className={sheetStyles.sheetPasswordIntro}>
        Update your password to keep your account secure.
      </p>
      <div className={sheetStyles.fields}>
        <div className={sheetStyles.fieldGroup}>
          <label className={sheetStyles.fieldLabel} htmlFor="sh_current_password">
            Current password
          </label>
          <input
            id="sh_current_password"
            type="password"
            className={sheetStyles.fieldInput}
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            disabled={saving}
            autoComplete="current-password"
          />
        </div>
        <div className={sheetStyles.fieldGroup}>
          <label className={sheetStyles.fieldLabel} htmlFor="sh_new_password">
            New password
          </label>
          <input
            id="sh_new_password"
            type="password"
            className={sheetStyles.fieldInput}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            disabled={saving}
            autoComplete="new-password"
          />
        </div>
        <div className={sheetStyles.fieldGroup}>
          <label className={sheetStyles.fieldLabel} htmlFor="sh_confirm_password">
            Confirm new password
          </label>
          <input
            id="sh_confirm_password"
            type="password"
            className={sheetStyles.fieldInput}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            disabled={saving}
            autoComplete="new-password"
          />
        </div>
      </div>
    </div>
  );
}
