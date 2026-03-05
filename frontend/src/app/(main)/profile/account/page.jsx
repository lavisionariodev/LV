'use client';

import { useProfile } from '@/contexts/ProfileContext';
import styles from '../profile.module.css';

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

  return (
    <div className={styles.profileCard}>
      <header className={styles.profileHeader}>
        <h1 className={styles.profileTitle}>Basic Information</h1>
        <p className={styles.profileSubtitle}>
          Manage your personal information and profile photo.
        </p>
        <p className={styles.profileSignedIn}>
          Signed in as <strong>{user.email}</strong>
        </p>
      </header>

      <div className={styles.profileContent}>
        <section className={styles.avatarSection}>
          <div className={styles.avatarWrapper}>
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
          </div>

          <div className={styles.avatarActions}>
            <button
              type="button"
              className={styles.primaryButton}
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? 'Uploading...' : 'Upload photo'}
            </button>
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={handleRemoveAvatar}
              disabled={uploading || !profile.avatar_url}
            >
              Remove photo
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className={styles.fileInput}
              onChange={handleAvatarFileChange}
            />
            <p className={styles.avatarHint}>JPG, PNG, or WEBP. Max 5MB.</p>
          </div>
        </section>

        <section className={styles.detailsSection}>
          <form
            className={styles.form}
            onSubmit={(event) => {
              event.preventDefault();
              handleSave();
            }}
          >
            <div className={styles.formField}>
              <label htmlFor="full_name" className={styles.label}>
                Name
              </label>
              <input
                id="full_name"
                type="text"
                name="full_name"
                value={profile.full_name}
                onChange={handleChange}
                className={styles.input}
                placeholder="Enter your full name"
              />
            </div>

            <div className={styles.formActions}>
              <button
                type="submit"
                className={styles.primaryButton}
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Update'}
              </button>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}

