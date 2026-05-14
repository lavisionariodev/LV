'use client';

import { useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { supabase } from '@/lib/supabase/client';
import { changePasswordWithReauth } from '@/lib/auth/changePassword';
import { inferCanChangePassword } from '@/lib/auth/inferCanChangePassword';
import styles from '../profile.module.css';

export default function ProfilePasswordPage() {
  const { user, authLoading } = useAuth();
  const { showToast } = useToast();
  const canChangePassword = useMemo(() => {
    if (authLoading) return null;
    return inferCanChangePassword(user);
  }, [authLoading, user]);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const resetFields = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    const result = await changePasswordWithReauth(supabase, {
      currentPassword,
      newPassword,
      confirmPassword,
    });
    setSaving(false);
    if (!result.ok) {
      showToast(result.error, 'error');
      return;
    }
    if (result.warning) showToast(result.warning, 'info');
    else showToast('Password updated.', 'success');
    resetFields();
    setIsEditing(false);
  };

  return (
    <div className={styles.profileCard}>
      <div className={styles.profileAccentBar} />
      <header className={styles.profileHeader}>
        <div className={styles.profileHeaderLeft}>
          <p className={styles.profileEyebrow}>Change password</p>
          <p className={styles.profileSignedIn}>
            {canChangePassword === null
              ? 'Checking your sign-in method...'
              : canChangePassword
                ? 'Update your password to keep your account secure.'
                : 'Password change is available only for email/password accounts.'}
          </p>
        </div>
        {canChangePassword ? (
          <div>
            {isEditing ? (
              <>
                <button
                  type="button"
                  className={styles.selectImageBtn}
                  onClick={() => {
                    resetFields();
                    setIsEditing(false);
                  }}
                  disabled={saving}
                >
                  Cancel
                </button>
                <button type="submit" form="buyer-password-form" className={styles.primaryButton} disabled={saving}>
                  {saving ? 'Saving...' : 'Save password'}
                </button>
              </>
            ) : (
              <button type="button" className={styles.primaryButton} onClick={() => setIsEditing(true)}>
                Edit password
              </button>
            )}
          </div>
        ) : null}
      </header>

      {canChangePassword ? (
        <div className={styles.profileCardBody}>
          <form id="buyer-password-form" className={styles.form} onSubmit={handleSubmit}>
            <div className={styles.formRow}>
              <label className={styles.formRowLabel} htmlFor="current-password">
                Current password
              </label>
              <div className={styles.formRowField}>
                <input
                  id="current-password"
                  type="password"
                  className={styles.input}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  disabled={!isEditing || saving}
                  autoComplete="current-password"
                />
              </div>
            </div>
            <div className={styles.formRow}>
              <label className={styles.formRowLabel} htmlFor="new-password">
                New password
              </label>
              <div className={styles.formRowField}>
                <input
                  id="new-password"
                  type="password"
                  className={styles.input}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={!isEditing || saving}
                  autoComplete="new-password"
                />
              </div>
            </div>
            <div className={styles.formRow}>
              <label className={styles.formRowLabel} htmlFor="confirm-password">
                Confirm new password
              </label>
              <div className={styles.formRowField}>
                <input
                  id="confirm-password"
                  type="password"
                  className={styles.input}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={!isEditing || saving}
                  autoComplete="new-password"
                />
              </div>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}
