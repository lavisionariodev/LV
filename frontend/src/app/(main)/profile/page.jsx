'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useProfile } from '@/contexts/ProfileContext';
import BottomSheet from './components/BottomSheet';
import styles from './profile.module.css';
import pageStyles from './profile.page.module.css';

// ── Lazy page contents for sheets ────────────────────────────────────────────
import dynamic from 'next/dynamic';
const AccountPageContent       = dynamic(() => import('./account/page'));
const PurchasesPageContent     = dynamic(() => import('./purchases/page'));
const NotificationsPageContent = dynamic(() => import('./notifications/page'));

const SHEET_CONFIG = {
  account:       { title: 'Edit Profile',   hasSave: true  },
  purchases:     { title: 'My Purchases',   hasSave: false },
  notifications: { title: 'Notifications',  hasSave: false },
};

const NAV_ITEMS = [
  {
    key: 'account',
    label: 'Profile',
    group: 'ACCOUNT',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"
        fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
  },
  {
    key: 'purchases',
    label: 'My Purchases',
    group: 'ACCOUNT',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"
        fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
        <line x1="3" y1="6" x2="21" y2="6" />
        <path d="M16 10a4 4 0 0 1-8 0" />
      </svg>
    ),
  },
  {
    key: 'notifications',
    label: 'Notifications',
    group: 'ACCOUNT',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"
        fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
      </svg>
    ),
  },
];

function ChevronRight() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

export default function ProfilePage() {
  const router = useRouter();
  const { profile, initials, user } = useProfile();
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia('(max-width: 768px)').matches : false
  );
  const [openSheet, setOpenSheet] = useState(null);
  const saveTriggerRef = useRef(null);
  const [sheetSaving, setSheetSaving] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)');
    const handler = (e) => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // Desktop: redirect to /profile/account as before
  useEffect(() => {
    if (!isMobile) {
      router.replace('/profile/account');
    }
  }, [isMobile, router]);

  const handleSheetClose = () => {
    setOpenSheet(null);
    setSheetSaving(false);
    saveTriggerRef.current = null;
  };

  const handleSheetSave = () => {
    if (saveTriggerRef.current) saveTriggerRef.current();
  };

  const cfg = openSheet ? SHEET_CONFIG[openSheet] : null;

  // Don't flash content on desktop while redirect is in flight
  if (!isMobile) return null;

  return (
    <>
      <div className={pageStyles.page}>

        {/* ── Identity card ── */}
        <div className={pageStyles.identityCard} onClick={() => setOpenSheet('account')}>
          <div className={pageStyles.avatarWrap}>
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="avatar" className={pageStyles.avatarImg} />
            ) : (
              <div className={pageStyles.avatarPlaceholder}>{initials || '?'}</div>
            )}
          </div>
          <div className={pageStyles.identityMeta}>
            <span className={pageStyles.identityName}>
              {profile?.username || profile?.full_name || 'Your Name'}
            </span>
            <span className={pageStyles.identityEmail}>{user?.email || ''}</span>
          </div>
          <span className={pageStyles.identityChevron}><ChevronRight /></span>
        </div>

        {/* ── Nav groups ── */}
        <div className={pageStyles.section}>
          <p className={pageStyles.sectionLabel}>ACCOUNT</p>
          <div className={pageStyles.group}>
            {NAV_ITEMS.map((item, idx) => (
              <button
                key={item.key}
                type="button"
                className={pageStyles.navItem}
                style={idx < NAV_ITEMS.length - 1 ? { borderBottom: '1px solid rgba(168,137,74,0.10)' } : {}}
                onClick={() => setOpenSheet(item.key)}
              >
                <span className={pageStyles.navIcon}>{item.icon}</span>
                <span className={pageStyles.navLabel}>{item.label}</span>
                <span className={pageStyles.navChevron}><ChevronRight /></span>
              </button>
            ))}
          </div>
        </div>

        {/* ── Support group ── */}
        <div className={pageStyles.section}>
          <p className={pageStyles.sectionLabel}>SUPPORT</p>
          <div className={pageStyles.group}>
            <button
              type="button"
              className={pageStyles.navItem}
              style={{ borderBottom: '1px solid rgba(168,137,74,0.10)' }}
              onClick={() => router.push('/help')}
            >
              <span className={pageStyles.navIcon}>
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"
                  fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
              </span>
              <span className={pageStyles.navLabel}>Help Center</span>
              <span className={pageStyles.navChevron}><ChevronRight /></span>
            </button>

            <button
              type="button"
              className={`${pageStyles.navItem} ${pageStyles.navItemDanger}`}
              onClick={() => router.push('/buyer/logout')}
            >
              <span className={pageStyles.navIcon}>
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"
                  fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
              </span>
              <span className={pageStyles.navLabel}>Log Out</span>
              <span className={pageStyles.navChevron}><ChevronRight /></span>
            </button>
          </div>
        </div>

      </div>

      {/* ── Bottom sheets ── */}
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
          {openSheet === 'purchases'     && <PurchasesPageContent />}
          {openSheet === 'notifications' && <NotificationsPageContent />}
        </BottomSheet>
      )}
    </>
  );
}

// ── Thin wrapper that renders the account form inside the sheet ───────────────
import { useRef } from 'react';
import sheetStyles from './profile.mobile.module.css';
import { useProfile as useProfileCtx } from '@/contexts/ProfileContext';

function AccountSheetContent({ onSaveTriggerReady, onSavingChange, onSaveComplete }) {
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
  } = useProfileCtx();

  const [gender, setGender] = useState('');
  const [dob, setDob] = useState({ day: '', month: '', year: '' });
  const [address, setAddress] = useState({
    street:   profile?.address_street   || '',
    city:     profile?.address_city     || '',
    province: profile?.address_province || '',
    zip:      profile?.address_zip      || '',
  });

  useEffect(() => {
    onSaveTriggerReady(() => { handleSave(); if (onSaveComplete) onSaveComplete(); });
  }, [handleSave]); // eslint-disable-line

  useEffect(() => { onSavingChange(saving); }, [saving]); // eslint-disable-line

  const handleAddressChange = (e) =>
    setAddress((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const GENDER_OPTIONS = ['Male', 'Female', 'Other'];
  const MONTHS = ['January','February','March','April','May','June',
                  'July','August','September','October','November','December'];
  const DAYS   = Array.from({ length: 31 }, (_, i) => i + 1);
  const YEARS  = Array.from({ length: 80 }, (_, i) => new Date().getFullYear() - i);

  return (
    <div className={sheetStyles.accountForm}>
      <div className={sheetStyles.avatarSection}>
        <button type="button" className={sheetStyles.avatarBtn}
          onClick={() => fileInputRef.current?.click()} disabled={uploading}>
          {profile?.avatar_url
            ? <img src={profile.avatar_url} alt="avatar" className={sheetStyles.avatarImg} />
            : <div className={sheetStyles.avatarPlaceholder}>{initials || '?'}</div>}
          <div className={sheetStyles.avatarEditBadge}>
            <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24"
              fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          </div>
        </button>
        <input ref={fileInputRef} type="file" accept="image/*"
          style={{ display: 'none' }} onChange={handleAvatarFileChange} />
        {profile?.avatar_url && (
          <button type="button" className={sheetStyles.removeBtn}
            onClick={handleRemoveAvatar} disabled={uploading}>Remove</button>
        )}
        <p className={sheetStyles.avatarHint}>PNG, JPG, or WEBP · Max 1 MB</p>
      </div>

      <div className={sheetStyles.fields}>
        {[
          { id: 'sh_username', name: 'username', label: 'Username', placeholder: 'e.g. jdelacruz', hint: 'Username can only be changed once.' },
          { id: 'sh_full_name', name: 'full_name', label: 'Name', placeholder: 'Enter your full name' },
          { id: 'sh_phone', name: 'phone', label: 'Phone Number', placeholder: '+63 9XX XXX XXXX' },
        ].map(({ id, name, label, placeholder, hint }) => (
          <div key={name} className={sheetStyles.fieldGroup}>
            <label className={sheetStyles.fieldLabel} htmlFor={id}>{label}</label>
            <input id={id} type="text" name={name}
              value={profile?.[name] || ''} onChange={handleChange}
              className={sheetStyles.fieldInput} placeholder={placeholder} />
            {hint && <p className={sheetStyles.fieldHint}>{hint}</p>}
          </div>
        ))}

        <div className={sheetStyles.fieldGroup}>
          <span className={sheetStyles.fieldLabel}>Email</span>
          <div className={sheetStyles.fieldInput}
            style={{ background: 'rgba(247,244,239,0.7)', color: 'var(--muted)', cursor: 'default' }}>
            {user?.email || '—'}
          </div>
        </div>

        <div className={sheetStyles.fieldGroup}>
          <span className={sheetStyles.fieldLabel}>Gender</span>
          <div className={sheetStyles.genderRow}>
            {GENDER_OPTIONS.map((g) => (
              <label key={g} className={sheetStyles.radioLabel}>
                <input type="radio" name="sh_gender" value={g}
                  checked={gender === g} onChange={() => setGender(g)}
                  className={sheetStyles.radioInput} />
                <span className={sheetStyles.radioCustom} />
                {g}
              </label>
            ))}
          </div>
        </div>

        <div className={sheetStyles.fieldGroup}>
          <span className={sheetStyles.fieldLabel}>Date of Birth</span>
          <div className={sheetStyles.dobRow}>
            {[['day', DAYS, 'Day'], ['month', MONTHS, 'Month'], ['year', YEARS, 'Year']].map(([key, opts, ph]) => (
              <div key={key} className={sheetStyles.selectWrap}>
                <select className={sheetStyles.selectInput} value={dob[key]}
                  onChange={(e) => setDob((p) => ({ ...p, [key]: e.target.value }))}>
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
          <label className={sheetStyles.fieldLabel}>Address</label>
          {[
            { name: 'street',   placeholder: 'Street address' },
            { name: 'city',     placeholder: 'City' },
            { name: 'province', placeholder: 'Province / State' },
            { name: 'zip',      placeholder: 'ZIP code' },
          ].map(({ name, placeholder }, i) => (
            <input key={name} type="text" name={name}
              value={address[name]} onChange={handleAddressChange}
              className={`${sheetStyles.fieldInput} ${i > 0 ? sheetStyles.fieldInputSpaced : ''}`}
              placeholder={placeholder} />
          ))}
        </div>
      </div>
    </div>
  );
}