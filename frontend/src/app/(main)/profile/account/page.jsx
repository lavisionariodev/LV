'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useProfile } from '@/contexts/ProfileContext';
import {
  PROFILE_DOB_MONTHS,
  dobPartsFromIso,
  isoFromDobParts,
} from '@/shared/utils/profileDob';
import styles from '../profile.module.css';

const GENDER_OPTIONS = ['Male', 'Female', 'Other'];
const DAYS = Array.from({ length: 31 }, (_, i) => i + 1);
const YEARS = Array.from({ length: 80 }, (_, i) => new Date().getFullYear() - i);

export default function AccountPage() {
  const router = useRouter();
  const {
    user,
    profile,
    loading,
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

  useEffect(() => {
    setDob(dobPartsFromIso(profile.date_of_birth));
  }, [profile.date_of_birth]);

  // On mobile: never render this page directly.
  // The sheet in layout.jsx handles profile editing.
  // Redirect back to /profile so the menu shows.
  useEffect(() => {
    if (window.matchMedia('(max-width: 768px)').matches) {
      router.replace('/profile');
    }
  }, [router]);

  const handleFormSave = (e) => {
    e.preventDefault();
    const iso = isoFromDobParts(dob.day, dob.month, dob.year);
    void handleSave({ date_of_birth: iso });
  };

  if (loading) {
    return (
      <div
        className={styles.profileCard}
        aria-busy="true"
        aria-describedby="profile-account-skel-hint"
      >
        <p id="profile-account-skel-hint" role="status" className={styles.visuallyHidden}>
          Loading account settings. Your profile fields and photo panel will appear shortly.
        </p>
        <div className={styles.profileAccentBar} />
        <header className={styles.profileHeader} aria-hidden="true">
          <div className={styles.profileHeaderLeft}>
            <div className={`${styles.skBlock} ${styles.skAccountHeaderEyebrow}`} />
            <div className={`${styles.skBlock} ${styles.skLayoutSub}`} />
          </div>
        </header>
        <div className={styles.profileCardBody}>
          <div className={styles.profileFormSection} aria-hidden="true">
            <div className={styles.form}>
              {['r1', 'r2', 'r3', 'r4', 'r5', 'r6'].map((k, i) => (
                <div key={k} className={styles.formRow}>
                  <div className={`${styles.skBlock} ${styles.skFormLabel}`} />
                  <div className={styles.formRowField}>
                    <div className={`${styles.skBlock} ${styles.skInput}`} />
                    {i === 0 ? <div className={`${styles.skBlock} ${styles.skHint}`} /> : null}
                    {i === 5 ? (
                      <div className={styles.skAddressStack}>
                        <div className={`${styles.skBlock} ${styles.skInput}`} />
                        <div className={`${styles.skBlock} ${styles.skInput}`} />
                        <div className={`${styles.skBlock} ${styles.skInput} ${styles.skInputShort}`} />
                      </div>
                    ) : null}
                  </div>
                </div>
              ))}
              <div className={styles.formRow}>
                <span className={styles.formRowLabel} />
                <div className={styles.formRowField}>
                  <div className={`${styles.skBlock} ${styles.skSaveBtnStub}`} />
                </div>
              </div>
            </div>
          </div>
          <div className={styles.avatarPanel} aria-hidden="true">
            <div className={styles.avatarDivider} />
            <div className={styles.avatarPanelInner}>
              <div className={`${styles.skBlock} ${styles.skAvatarCircle}`} />
              <div className={`${styles.skBlock} ${styles.skAvatarBtn}`} />
              <div className={`${styles.skBlock} ${styles.skAvatarHint}`} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.profileCard}>
      <div className={styles.profileAccentBar} />
      <header className={styles.profileHeader}>
        <div className={styles.profileHeaderLeft}>
          <p className={styles.profileEyebrow}>My Profile</p>
          <p className={styles.profileSignedIn}>Manage and protect your account</p>
        </div>
      </header>
      <div className={styles.profileCardBody}>
        <div className={styles.profileFormSection}>
          <form className={styles.form} onSubmit={handleFormSave}>

            <div className={styles.formRow}>
              <label htmlFor="username" className={styles.formRowLabel}>Username</label>
              <div className={styles.formRowField}>
                <input
                  id="username"
                  type="text"
                  name="username"
                  value={profile.username || ''}
                  onChange={handleChange}
                  disabled={profile.username_locked}
                  className={styles.input}
                  placeholder="e.g. jdelacruz"
                />
                <p className={styles.fieldHint}>
                  {profile.username_locked
                    ? 'Username is set and cannot be changed.'
                    : 'Username can only be changed once.'}
                </p>
              </div>
            </div>

            <div className={styles.formRow}>
              <label htmlFor="full_name" className={styles.formRowLabel}>Name</label>
              <div className={styles.formRowField}>
                <input
                  id="full_name"
                  type="text"
                  name="full_name"
                  value={profile.full_name || ''}
                  onChange={handleChange}
                  className={styles.input}
                  placeholder="Enter your full name"
                />
              </div>
            </div>

            <div className={styles.formRow}>
              <span className={styles.formRowLabel}>Email</span>
              <div className={styles.formRowField}>
                {user?.email
                  ? <span className={styles.profileInfoValue}>{user.email}</span>
                  : <span className={styles.profileInfoValue}>—</span>}
              </div>
            </div>

            <div className={styles.formRow}>
              <label htmlFor="phone" className={styles.formRowLabel}>Phone Number</label>
              <div className={styles.formRowField}>
                <input
                  id="phone"
                  type="tel"
                  name="phone"
                  value={profile.phone || ''}
                  onChange={handleChange}
                  className={styles.input}
                  placeholder="+63 9XX XXX XXXX"
                />
              </div>
            </div>

            <div className={styles.formRow}>
              <span className={styles.formRowLabel}>Gender</span>
              <div className={`${styles.formRowField} ${styles.genderRow}`}>
                {GENDER_OPTIONS.map((g) => (
                  <label key={g} className={styles.radioLabel}>
                    <input
                      type="radio"
                      name="gender"
                      value={g}
                      checked={profile.gender === g}
                      onChange={handleChange}
                      className={styles.radioInput}
                    />
                    <span className={styles.radioCustom} />
                    {g}
                  </label>
                ))}
              </div>
            </div>

            <div className={styles.formRow}>
              <span className={styles.formRowLabel}>Date of birth</span>
              <div className={`${styles.formRowField} ${styles.dobRow}`}>
                {[
                  { key: 'day', opts: DAYS, ph: 'Day' },
                  { key: 'month', opts: PROFILE_DOB_MONTHS, ph: 'Month' },
                  { key: 'year', opts: YEARS, ph: 'Year' },
                ].map(({ key, opts, ph }) => (
                  <div key={key} className={styles.selectWrapper}>
                    <select
                      className={styles.selectInput}
                      value={dob[key]}
                      onChange={(e) => setDob((p) => ({ ...p, [key]: e.target.value }))}
                    >
                      <option value="">{ph}</option>
                      {opts.map((o) => (
                        <option key={o} value={o}>{o}</option>
                      ))}
                    </select>
                    <span className={styles.selectChevron}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24"
                        fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className={styles.formRow}>
              <label htmlFor="address_street" className={styles.formRowLabel}>Address</label>
              <div className={styles.formRowField}>
                <input
                  id="address_street"
                  type="text"
                  name="address_street"
                  value={profile.address_street || ''}
                  onChange={handleChange}
                  className={styles.input}
                  placeholder="Street address"
                />
                <div className={styles.addressGrid}>
                  <input
                    type="text"
                    name="address_city"
                    value={profile.address_city || ''}
                    onChange={handleChange}
                    className={styles.input}
                    placeholder="City"
                  />
                  <input
                    type="text"
                    name="address_province"
                    value={profile.address_province || ''}
                    onChange={handleChange}
                    className={styles.input}
                    placeholder="Province / State"
                  />
                  <input
                    type="text"
                    name="address_zip"
                    value={profile.address_zip || ''}
                    onChange={handleChange}
                    className={styles.input}
                    placeholder="ZIP code"
                    style={{ maxWidth: '120px' }}
                  />
                </div>
              </div>
            </div>

            <div className={styles.formRow}>
              <span className={styles.formRowLabel} />
              <div className={styles.formRowField}>
                <button type="submit" className={styles.primaryButton} disabled={saving}>
                  {saving ? 'Saving…' : 'Save'}
                </button>
              </div>
            </div>

          </form>
        </div>

        <div className={styles.avatarPanel}>
          <div className={styles.avatarDivider} />
          <div className={styles.avatarPanelInner}>
            <button
              type="button"
              className={styles.avatarButton}
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              aria-label="Change profile photo"
            >
              {profile.avatar_url
                ? (
                  <img
                    src={profile.avatar_url}
                    alt={profile.full_name || 'Profile avatar'}
                    className={styles.avatarImage}
                  />
                )
                : (
                  <div className={styles.avatarPlaceholder}><span>{initials || '?'}</span></div>
                )}
              <div className={styles.avatarBadge}>
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24"
                  fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                  <circle cx="12" cy="13" r="4" />
                </svg>
              </div>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className={styles.fileInput}
              onChange={handleAvatarFileChange}
            />
            <button
              type="button"
              className={styles.selectImageBtn}
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              Select Image
            </button>
            {profile.avatar_url && (
              <button
                type="button"
                className={styles.removeAvatarBtn}
                onClick={handleRemoveAvatar}
                disabled={uploading}
              >
                Remove photo
              </button>
            )}
            <div className={styles.avatarHints}>
              <p className={styles.avatarHint}>File size: maximum 1 MB</p>
              <p className={styles.avatarHint}>File extension: .JPEG, .PNG</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
