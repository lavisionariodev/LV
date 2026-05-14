'use client'

import { useState } from 'react'
import { MdCheckCircle, MdErrorOutline } from 'react-icons/md'
import { supabase } from '@/lib/supabase/client'
import { changePasswordWithReauth } from '@/lib/auth/changePassword'
import { useAuthToast } from '@/contexts/ToastContext'
import { useMediaQuery } from '@/shared/hooks'
import styles from '../settings.module.css'

export default function Page() {
  const isProfileDetail = useMediaQuery('(max-width: 640px)')
  const idPrefix = 'admin'
  const toast = useAuthToast()
  
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passStatus, setPassStatus] = useState('')
  const [passError, setPassError] = useState('')
  const [isEditingPassword, setIsEditingPassword] = useState(isProfileDetail)
  const [passwordSaving, setPasswordSaving] = useState(false)
  const formId = `${idPrefix}PasswordForm`
  const id = (name) => `${idPrefix}_${name}`

  const handlePasswordSubmit = async (e) => {
    e.preventDefault()
    if (!isEditingPassword || passwordSaving) return false
    setPassError('')
    setPassStatus('')
    setPasswordSaving(true)
    try {
      const result = await changePasswordWithReauth(supabase, {
        currentPassword,
        newPassword,
        confirmPassword,
      })
      if (!result.ok) {
        setPassError(result.error)
        toast.error(result.error)
        return false
      }
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      const okMsg = result.warning
        ? `Password updated. ${result.warning}`
        : 'Password updated successfully. Other sessions were signed out.'
      setPassStatus(okMsg)
      toast.success(okMsg)
      if (!isProfileDetail) setIsEditingPassword(false)
      return true
    } catch (err) {
      const message = err.message || 'Failed to update password.'
      setPassError(message)
      toast.error(message)
      return false
    } finally {
      setPasswordSaving(false)
    }
  }

  const onStartPasswordEdit = () => {
    setPassError('')
    setPassStatus('')
    setIsEditingPassword(true)
  }

  const onCancelPasswordEdit = () => {
    if (passwordSaving) return
    setPassError('')
    setPassStatus('')
    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
    setIsEditingPassword(false)
  }

  return (
    <section className={`${styles.card} ${styles.full} ${isProfileDetail ? styles.cardBorderless : ''}`}>
      <div className={styles.tabDetailHead}>
        <div className={styles.tabDetailHeadRow}>
          <div className={styles.tabDetailHeadText}>
            <h2 className={styles.tabDetailTitle}>Change Password</h2>
            <p className={styles.tabDetailSubtitle}>
              Update your password to keep your account secure.
            </p>
          </div>
          {!isProfileDetail ? (
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
                    {passwordSaving ? 'Saving…' : 'Save Changes'}
                  </button>
                </>
              ) : (
                <button type="button" className={styles.primaryBtn} onClick={onStartPasswordEdit}>
                  Change password
                </button>
              )}
            </div>
          ) : null}
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
              className={styles.input}
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
              className={styles.input}
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
              className={styles.input}
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
        {passError && (
          <div className={styles.msgError}>
            <MdErrorOutline /> {passError}
          </div>
        )}
        {passStatus && (
          <div className={styles.msgOk}>
            <MdCheckCircle /> {passStatus}
          </div>
        )}
        {isProfileDetail && (
          <div className={styles.headActions} style={{ marginTop: 16 }}>
            <button
              type="submit"
              className={styles.primaryBtn}
              disabled={passwordSaving}
              aria-busy={passwordSaving}
            >
              {passwordSaving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        )}
      </form>
    </section>
  )
}
