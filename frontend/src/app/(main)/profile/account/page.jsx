'use client';

import { useState } from 'react';
import { useProfile } from '@/contexts/ProfileContext';
import styles from '../profile.module.css';

const GENDER_OPTIONS = ['Male', 'Female', 'Other'];

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];
const DAYS  = Array.from({ length: 31 }, (_, i) => i + 1);
const YEARS = Array.from({ length: 80 },  (_, i) => new Date().getFullYear() - i);

const COUNTRIES_CITIES = {
  'Philippines':    ['Manila', 'Cebu City', 'Davao City', 'Quezon City', 'Makati', 'Taguig', 'Pasig', 'Caloocan', 'Zamboanga City', 'Other'],
  'United States':  ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'Philadelphia', 'San Antonio', 'San Diego', 'Dallas', 'Other'],
  'United Kingdom': ['London', 'Birmingham', 'Manchester', 'Glasgow', 'Liverpool', 'Bristol', 'Sheffield', 'Leeds', 'Edinburgh', 'Other'],
  'Canada':         ['Toronto', 'Montreal', 'Vancouver', 'Calgary', 'Edmonton', 'Ottawa', 'Winnipeg', 'Quebec City', 'Hamilton', 'Other'],
  'Australia':      ['Sydney', 'Melbourne', 'Brisbane', 'Perth', 'Adelaide', 'Gold Coast', 'Canberra', 'Hobart', 'Darwin', 'Other'],
  'Japan':          ['Tokyo', 'Osaka', 'Kyoto', 'Yokohama', 'Nagoya', 'Sapporo', 'Fukuoka', 'Kobe', 'Hiroshima', 'Other'],
  'Singapore':      ['Singapore'],
  'Other':          ['Other'],
};
const COUNTRY_LIST = Object.keys(COUNTRIES_CITIES);

export default function AccountPage() {
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

  const [gender, setGender] = useState(profile.gender || '');
  const [dob, setDob]       = useState({ day: '', month: '', year: '' });
  const [address, setAddress] = useState({
    street:   profile.address_street   || '',
    city:     profile.address_city     || '',
    province: profile.address_province || '',
    zip:      profile.address_zip      || '',
  });
  const handleAddressChange = (e) =>
    setAddress((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleFormSave = (e) => {
    e.preventDefault();
    handleSave();
  };

  return (
    <div className={styles.profileCard}>
      <div className={styles.profileAccentBar} />

      {/* ── Header ── */}
      <header className={styles.profileHeader}>
        <div className={styles.profileHeaderLeft}>
          <p className={styles.profileEyebrow}>My Profile</p>
          <p className={styles.profileSignedIn}>Manage and protect your account</p>
        </div>
      </header>

      {/* ── Card body ── */}
      <div className={styles.profileCardBody}>

        {/* Left: form */}
        <div className={styles.profileFormSection}>
          <form className={styles.form} onSubmit={handleFormSave}>

            {/* Username */}
            <div className={styles.formRow}>
              <label htmlFor="username" className={styles.formRowLabel}>Username</label>
              <div className={styles.formRowField}>
                <input
                  id="username"
                  type="text"
                  name="username"
                  value={profile.username || ''}
                  onChange={handleChange}
                  className={styles.input}
                  placeholder="e.g. jdelacruz"
                />
                <p className={styles.fieldHint}>Username can only be changed once.</p>
              </div>
            </div>

            {/* Full Name */}
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

            {/* Email */}
            <div className={styles.formRow}>
              <span className={styles.formRowLabel}>Email</span>
              <div className={styles.formRowField}>
                {user.email ? (
                  <span className={styles.profileInfoValue}>{user.email}</span>
                ) : (
                  <button type="button" className={styles.addLink}>Add</button>
                )}
              </div>
            </div>

            {/* Phone */}
            <div className={styles.formRow}>
              <label htmlFor="phone" className={styles.formRowLabel}>Phone Number</label>
              <div className={styles.formRowField}>
                {profile.phone ? (
                  <input
                    id="phone"
                    type="tel"
                    name="phone"
                    value={profile.phone || ''}
                    onChange={handleChange}
                    className={styles.input}
                    placeholder="+63 9XX XXX XXXX"
                  />
                ) : (
                  <button type="button" className={styles.addLink}>Add</button>
                )}
              </div>
            </div>

            {/* Gender */}
            <div className={styles.formRow}>
              <span className={styles.formRowLabel}>Gender</span>
              <div className={`${styles.formRowField} ${styles.genderRow}`}>
                {GENDER_OPTIONS.map((g) => (
                  <label key={g} className={styles.radioLabel}>
                    <input
                      type="radio"
                      name="gender"
                      value={g}
                      checked={gender === g}
                      onChange={() => setGender(g)}
                      className={styles.radioInput}
                    />
                    <span className={styles.radioCustom} />
                    {g}
                  </label>
                ))}
              </div>
            </div>

            {/* Date of Birth */}
            <div className={styles.formRow}>
              <span className={styles.formRowLabel}>Date of birth</span>
              <div className={`${styles.formRowField} ${styles.dobRow}`}>
                <div className={styles.selectWrapper}>
                  <select
                    className={styles.selectInput}
                    value={dob.day}
                    onChange={(e) => setDob((p) => ({ ...p, day: e.target.value }))}
                  >
                    <option value="">Day</option>
                    {DAYS.map((d) => <option key={d} value={d}>{d}</option>)}
                  </select>
                  <span className={styles.selectChevron}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24"
                      fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </span>
                </div>
                <div className={styles.selectWrapper}>
                  <select
                    className={styles.selectInput}
                    value={dob.month}
                    onChange={(e) => setDob((p) => ({ ...p, month: e.target.value }))}
                  >
                    <option value="">Month</option>
                    {MONTHS.map((m) => <option key={m} value={m}>{m}</option>)}
                  </select>
                  <span className={styles.selectChevron}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24"
                      fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </span>
                </div>
                <div className={styles.selectWrapper}>
                  <select
                    className={styles.selectInput}
                    value={dob.year}
                    onChange={(e) => setDob((p) => ({ ...p, year: e.target.value }))}
                  >
                    <option value="">Year</option>
                    {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
                  </select>
                  <span className={styles.selectChevron}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24"
                      fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </span>
                </div>
              </div>
            </div>

            {/* Address */}
            <div className={styles.formRow}>
              <label htmlFor="address_street" className={styles.formRowLabel}>Address</label>
              <div className={styles.formRowField}>
                <input
                  id="address_street"
                  type="text"
                  name="street"
                  value={address.street}
                  onChange={handleAddressChange}
                  className={styles.input}
                  placeholder="Street address"
                />
                <div className={styles.addressGrid}>
                  <input
                    type="text"
                    name="city"
                    value={address.city}
                    onChange={handleAddressChange}
                    className={styles.input}
                    placeholder="City"
                  />
                  <input
                    type="text"
                    name="province"
                    value={address.province}
                    onChange={handleAddressChange}
                    className={styles.input}
                    placeholder="Province / State"
                  />
                  <input
                    type="text"
                    name="zip"
                    value={address.zip}
                    onChange={handleAddressChange}
                    className={styles.input}
                    placeholder="ZIP code"
                    style={{ maxWidth: '120px' }}
                  />
                </div>
              </div>
            </div>

            {/* Save */}
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

        {/* Right: avatar panel */}
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
              {profile.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={profile.full_name || 'Profile avatar'}
                  className={styles.avatarImage}
                />
              ) : (
                <div className={styles.avatarPlaceholder}>
                  <span>{initials || '?'}</span>
                </div>
              )}
              <div className={styles.avatarBadge}>
                {uploading ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24"
                    fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24"
                    fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                    <circle cx="12" cy="13" r="4" />
                  </svg>
                )}
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