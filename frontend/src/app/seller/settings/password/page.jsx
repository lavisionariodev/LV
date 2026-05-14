'use client'

import { FiSave } from 'react-icons/fi'
import styles from '../settings.module.css'
import { useSellerSettings } from '@/features/seller/settings/sellerSettings'

export default function Page() {
  const {
    sellerCanChangePassword,
    passwordTabId,
    passwordPanelId,
    isEditingPassword,
    passwordSaving,
    onCancelPasswordEdit,
    onStartPasswordEdit,
    formId,
    handlePasswordSubmit,
    id,
    currentPassword,
    setCurrentPassword,
    newPassword,
    setNewPassword,
    confirmPassword,
    setConfirmPassword,
  } = useSellerSettings()

  if (sellerCanChangePassword !== true) {
    return (
      <section
        id={passwordPanelId}
        role="tabpanel"
        aria-labelledby={passwordTabId}
        className={`${styles.card} ${styles.full}`}
      >
        <div className={styles.tabDetailHead}>
          <div className={styles.tabDetailHeadRow}>
            <div className={styles.tabDetailHeadText}>
              <h2 className={styles.tabDetailTitle}>Change Password</h2>
              <p className={styles.tabDetailSubtitle}>
                {sellerCanChangePassword === null
                  ? 'Checking your sign-in method...'
                  : 'Password change is available only for email/password accounts.'}
              </p>
            </div>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section
      id={passwordPanelId}
      role="tabpanel"
      aria-labelledby={passwordTabId}
      className={`${styles.card} ${styles.full}`}
    >
      <div className={styles.tabDetailHead}>
        <div className={styles.tabDetailHeadRow}>
          <div className={styles.tabDetailHeadText}>
            <h2 className={styles.tabDetailTitle}>Change Password</h2>
            <p className={styles.tabDetailSubtitle}>
              Update your password to keep your account secure.
            </p>
          </div>
          <div className={styles.headActions}>
            {isEditingPassword ? (
              <>
                <button
                  type="button"
                  className={styles.secondaryBtn}
                  onClick={onCancelPasswordEdit}
                  disabled={passwordSaving}
                >
                  Cancel
                </button>
                <button
                  form={formId}
                  type="submit"
                  className={styles.primaryBtn}
                  disabled={passwordSaving}
                  aria-busy={passwordSaving}
                >
                  <FiSave /> {passwordSaving ? 'Saving…' : 'Save Changes'}
                </button>
              </>
            ) : (
              <button type="button" className={styles.primaryBtn} onClick={onStartPasswordEdit}>
                Change Password
              </button>
            )}
          </div>
        </div>
      </div>
      <form
        id={formId}
        onSubmit={handlePasswordSubmit}
        className={styles.form}
        aria-busy={passwordSaving}
      >
        <div className={styles.passGrid}>
          <div className={styles.passField}>
            <label htmlFor={id('current_password')} className={styles.label}>
              Current Password
            </label>
            <input
              id={id('current_password')}
              type="password"
              placeholder="Enter current password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className={`${styles.input} ${!isEditingPassword ? styles.inputReadOnly : ''}`}
              disabled={!isEditingPassword || passwordSaving}
              autoComplete="current-password"
            />
          </div>
          <div className={styles.passField}>
            <label htmlFor={id('new_password')} className={styles.label}>
              New Password
            </label>
            <input
              id={id('new_password')}
              type="password"
              placeholder="Enter new password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className={`${styles.input} ${!isEditingPassword ? styles.inputReadOnly : ''}`}
              disabled={!isEditingPassword || passwordSaving}
              autoComplete="new-password"
            />
          </div>
          <div className={styles.passField}>
            <label htmlFor={id('confirm_password')} className={styles.label}>
              Confirm New Password
            </label>
            <input
              id={id('confirm_password')}
              type="password"
              placeholder="Re-enter new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={`${styles.input} ${!isEditingPassword ? styles.inputReadOnly : ''}`}
              disabled={!isEditingPassword || passwordSaving}
              autoComplete="new-password"
            />
          </div>
        </div>
        <div className={styles.passwordReqBox}>
          <p className={styles.passwordReqTitle}>Password requirements</p>
          <ul className={styles.passwordReqList}>
            <li>At least 8 characters</li>
            <li>One uppercase letter</li>
            <li>One lowercase letter</li>
            <li>One number</li>
          </ul>
        </div>
      </form>
    </section>
  )
}
