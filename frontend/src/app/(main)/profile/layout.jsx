'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useRouter, useSelectedLayoutSegment } from 'next/navigation';
import styles from './profile.module.css';
import mobileStyles from './profile.mobile.module.css';
import { ProfileProvider } from '@/contexts/ProfileContext';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/contexts/ProfileContext';

// ── Lazy-import the page contents so the sheet only loads what it needs ───────
import dynamic from 'next/dynamic';

const AccountPageContent  = dynamic(() => import('./account/page'));
const PurchasesPageContent = dynamic(() => import('./purchases/page'));
const NotificationsPageContent = dynamic(() => import('./notifications/page'));

// ── Bottom sheet (renders null on desktop) ────────────────────────────────────
import BottomSheet from './components/BottomSheet';

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
    setIsMobile(mq.matches);
    const handler = (e) => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
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
  purchases: {
    title: 'My Purchases',
    hasSave: false,
  },
  notifications: {
    title: 'Notifications',
    hasSave: false,
  },
};

/* ─────────────────────────────────────────
   Sidebar
───────────────────────────────────────── */
function ProfileSidebar({ activeTab, onMobileNavClick }) {
  const { profile, uploading, fileInputRef, initials } = useProfile();
  const isMobile = useIsMobile();

  /* Build a nav-item click handler that either opens a sheet (mobile)
     or lets the default <Link> navigation proceed (desktop).          */
  const makeClickHandler = (tab) => (e) => {
    if (isMobile) {
      e.preventDefault();
      onMobileNavClick(tab);
    }
    // on desktop: do nothing special — Link handles navigation
  };

  return (
    <aside className={styles.profileSidebar}>

      {/* ── Identity row ── */}
      <div className={styles.sidebarIdentity}>
        <button
          type="button"
          className={styles.sidebarAvatarBtn}
          onClick={() => {
            if (isMobile) {
              onMobileNavClick('account');
            } else {
              fileInputRef.current?.click();
            }
          }}
          disabled={uploading}
          aria-label={isMobile ? 'Edit profile' : 'Change profile photo'}
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
          <Link
            href="/profile/account"
            className={styles.sidebarEditLink}
            onClick={makeClickHandler('account')}
          >
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
            onClick={makeClickHandler('account')}
          >
            Profile
          </Link>
        </div>

        {/* My Purchase */}
        <Link
          href="/profile/purchases"
          className={`${styles.sidebarItem} ${activeTab === 'purchases' ? styles.sidebarItemActive : ''}`}
          aria-current={activeTab === 'purchases' ? 'page' : undefined}
          onClick={makeClickHandler('purchases')}
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
          onClick={makeClickHandler('notifications')}
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
  const isMobile = useIsMobile();

  // Which sheet is open, or null
  const [openSheet, setOpenSheet] = useState(null);
  // Forwarded saving state from child form (account sheet only)
  const [sheetSaving, setSheetSaving] = useState(false);
  // Ref callback so AccountPage can hand us its save trigger
  const saveTriggerRef = useRef(null);

  const handleMobileNavClick = useCallback((tab) => {
    setOpenSheet(tab);
  }, []);

  const handleSheetClose = useCallback(() => {
    setOpenSheet(null);
    setSheetSaving(false);
    saveTriggerRef.current = null;
  }, []);

  // Called by the top-bar Save button (account sheet)
  const handleSheetSave = useCallback(() => {
    if (saveTriggerRef.current) {
      saveTriggerRef.current();
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

  // Close sheet if screen grows to desktop while sheet is open
  useEffect(() => {
    if (!isMobile && openSheet) {
      setOpenSheet(null);
    }
  }, [isMobile, openSheet]);

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

  const cfg = openSheet ? SHEET_CONFIG[openSheet] : null;

  return (
    <ProfileProvider>
      <main className={styles.profilePage}>
        <div className={styles.profileLayout}>
          <ProfileSidebar activeTab={activeTab} onMobileNavClick={handleMobileNavClick} />

          {/* Desktop: render children normally */}
          <div className={styles.profileMain}>{children}</div>
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
              onSaveTriggerReady={(fn) => { saveTriggerRef.current = fn; }}
              onSavingChange={setSheetSaving}
              onSaveComplete={handleSheetClose}
            />
          )}
          {openSheet === 'purchases' && <PurchasesSheetContent />}
          {openSheet === 'notifications' && <NotificationsSheetContent />}
        </BottomSheet>
      )}
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
  // We render AccountPageContent but strip the outer profileCard chrome
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
function AccountSheetForm({ onSaveTriggerReady, onSavingChange, onSaveComplete }) {  const {
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

  const [gender, setGender] = useState('');
  const [dob, setDob] = useState({ day: '', month: '', year: '' });
  const [address, setAddress] = useState({
    street:   profile?.address_street   || '',
    city:     profile?.address_city     || '',
    province: profile?.address_province || '',
    zip:      profile?.address_zip      || '',
  });

  // Wire up the save trigger so the sheet's top bar can call it
  useEffect(() => {
    onSaveTriggerReady(() => {
      handleSave();
      if (onSaveComplete) onSaveComplete();
    });
  }, [handleSave]);           // eslint-disable-line react-hooks/exhaustive-deps

  // Mirror saving state upward
  useEffect(() => {
    onSavingChange(saving);
  }, [saving]);               // eslint-disable-line react-hooks/exhaustive-deps

  const handleAddressChange = (e) =>
    setAddress((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const GENDER_OPTIONS = ['Male', 'Female', 'Other'];
  const MONTHS = ['January','February','March','April','May','June',
                  'July','August','September','October','November','December'];
  const DAYS   = Array.from({ length: 31 }, (_, i) => i + 1);
  const YEARS  = Array.from({ length: 80 },  (_, i) => new Date().getFullYear() - i);

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
            className={sheetStyles.fieldInput}
            placeholder="e.g. jdelacruz"
          />
          <p className={sheetStyles.fieldHint}>Username can only be changed once.</p>
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
                  name="sh_gender"
                  value={g}
                  checked={gender === g}
                  onChange={() => setGender(g)}
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
              { key: 'month', opts: MONTHS, ph: 'Month' },
              { key: 'year',  opts: YEARS,  ph: 'Year'  },
            ].map(({ key, opts, ph }) => (
              <div key={key} className={sheetStyles.selectWrap}>
                <select
                  className={sheetStyles.selectInput}
                  value={dob[key]}
                  onChange={(e) => setDob((p) => ({ ...p, [key]: e.target.value }))}
                >
                  <option value="">{ph}</option>
                  {opts.map((o) => <option key={o} value={o}>{o}</option>)}
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
            name="street"
            value={address.street}
            onChange={handleAddressChange}
            className={sheetStyles.fieldInput}
            placeholder="Street address"
          />
          <input
            type="text"
            name="city"
            value={address.city}
            onChange={handleAddressChange}
            className={`${sheetStyles.fieldInput} ${sheetStyles.fieldInputSpaced}`}
            placeholder="City"
          />
          <input
            type="text"
            name="province"
            value={address.province}
            onChange={handleAddressChange}
            className={`${sheetStyles.fieldInput} ${sheetStyles.fieldInputSpaced}`}
            placeholder="Province / State"
          />
          <input
            type="text"
            name="zip"
            value={address.zip}
            onChange={handleAddressChange}
            className={`${sheetStyles.fieldInput} ${sheetStyles.fieldInputSpaced}`}
            placeholder="ZIP code"
          />
        </div>

      </div>
    </div>
  );
}

function PurchasesSheetContent() {
  return (
    <div className={sheetStyles.sheetPageWrap}>
      <PurchasesPageContent />
    </div>
  );
}

function NotificationsSheetContent() {
  return (
    <div className={sheetStyles.sheetPageWrap}>
      <NotificationsPageContent />
    </div>
  );
}