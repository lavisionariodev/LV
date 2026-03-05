'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import styles from './settings.module.css'
import { FaUser, FaUpload } from 'react-icons/fa6'
import { TbTrash } from 'react-icons/tb'
import { FiEdit } from 'react-icons/fi'
import { MdCheckCircle, MdErrorOutline } from 'react-icons/md'
import { validateNewPassword } from '@/lib/validators/authSchemas'
import {
  fetchCurrentAdminProfile,
  updateAdminProfile,
  uploadAdminAvatar,
  removeAdminAvatar,
} from '@/features/admin/settings/api'

const MAX_MB = 2
const ALLOWED = ['image/jpeg', 'image/png', 'image/webp']

export default function SettingsClient() {
  const fileRef = useRef(null)

  const [loading, setLoading] = useState(true)

  // Personal info edit toggle
  const [isEditingPersonal, setIsEditingPersonal] = useState(false)

  // Loaded profile from Supabase
  const [profile, setProfile] = useState(null)

  // Personal Information drafts
  const [draftName, setDraftName] = useState('')
  const [draftEmail, setDraftEmail] = useState('')

  // Avatar state
  const [avatarPreview, setAvatarPreview] = useState('')
  const [avatarFile, setAvatarFile] = useState(null)

  const [personalStatus, setPersonalStatus] = useState('')
  const [personalError, setPersonalError] = useState('')

  const [avatarLoading, setAvatarLoading] = useState(false)

  // Password
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passStatus, setPassStatus] = useState('')
  const [passError, setPassError] = useState('')

  // Initial load
  useEffect(() => {
    let cancelled = false

    async function loadProfile() {
      setLoading(true)
      setPersonalError('')
      setPersonalStatus('')

      try {
        const data = await fetchCurrentAdminProfile()
        if (cancelled) return

        setProfile(data)
        setDraftName(data.fullName || '')
        setDraftEmail(data.email || '')
      } catch (err) {
        if (!cancelled) {
          setPersonalError(err.message || 'Failed to load profile.')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadProfile()

    return () => {
      cancelled = true
      if (avatarPreview) URL.revokeObjectURL(avatarPreview)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const validateImage = (file) => {
    if (!file) return 'No file selected.'
    if (!ALLOWED.includes(file.type)) return 'Only PNG, JPG, or WEBP images are allowed.'
    const mb = file.size / (1024 * 1024)
    if (mb > MAX_MB) return `Image must be ${MAX_MB}MB or less.`
    return ''
  }

  const validateEmail = (value) => {
    const v = value.trim()
    if (!v) return 'Please enter a valid email.'
    if (!/^\S+@\S+\.\S+$/.test(v)) return 'Please enter a valid email format.'
    return ''
  }

  const validateName = (value) => {
    const v = value.trim()
    if (!v) return 'Please enter your name.'
    if (v.length < 2) return 'Name is too short.'
    return ''
  }

  const onPickAvatar = async (e) => {
    setPersonalError('')
    setPersonalStatus('')

    const file = e.target.files?.[0]
    if (!file) return

    const error = validateImage(file)
    if (error) {
      setPersonalError(error)
      return
    }

    if (!profile) {
      setPersonalError('Profile is not loaded yet.')
      return
    }

    if (avatarPreview) {
      URL.revokeObjectURL(avatarPreview)
    }

    const url = URL.createObjectURL(file)
    setAvatarPreview(url)
    setAvatarFile(file)

    // Immediately upload avatar so it is persisted independently of name/email
    try {
      setAvatarLoading(true)
      const { avatarPath, avatarUrl } = await uploadAdminAvatar({
        adminId: profile.id,
        file,
        oldAvatarPath: profile.avatarPath,
      })

      setProfile((prev) =>
        prev
          ? {
              ...prev,
              avatarPath,
              avatarUrl,
            }
          : prev
      )

      setPersonalStatus('Avatar updated successfully.')
      setAvatarFile(null)
    } catch (err) {
      setPersonalError(err.message || 'Failed to upload avatar.')
    } finally {
      setAvatarLoading(false)
    }
  }

  const onRemoveAvatar = async () => {
    setPersonalError('')
    setPersonalStatus('')

    if (!profile || (!profile.avatarPath && !profile.avatarUrl)) {
      return
    }

    if (avatarPreview) {
      URL.revokeObjectURL(avatarPreview)
      setAvatarPreview('')
    }
    if (fileRef.current) fileRef.current.value = ''

    try {
      setAvatarLoading(true)
      await removeAdminAvatar({
        adminId: profile.id,
        avatarPath: profile.avatarPath,
      })

      setProfile((prev) =>
        prev
          ? {
              ...prev,
              avatarPath: null,
              avatarUrl: null,
            }
          : prev
      )

      setPersonalStatus('Avatar removed.')
    } catch (err) {
      setPersonalError(err.message || 'Failed to remove avatar.')
    } finally {
      setAvatarLoading(false)
    }
  }

  const onClickEditSavePersonal = async () => {
    setPersonalError('')
    setPersonalStatus('')

    if (!isEditingPersonal) {
      if (profile) {
        setDraftName(profile.fullName || '')
        setDraftEmail(profile.email || '')
      }
      setIsEditingPersonal(true)
      return
    }

    const nameErr = validateName(draftName)
    if (nameErr) {
      setPersonalError(nameErr)
      return
    }

    const emailErr = validateEmail(draftEmail)
    if (emailErr) {
      setPersonalError(emailErr)
      return
    }

    if (!profile) {
      setPersonalError('Profile is not loaded yet.')
      return
    }

    try {
      await updateAdminProfile({
        id: profile.id,
        fullName: draftName,
        email: draftEmail,
      })

      setProfile((prev) =>
        prev
          ? {
              ...prev,
              fullName: draftName.trim(),
              email: draftEmail.trim(),
            }
          : prev
      )

      setIsEditingPersonal(false)
      setPersonalStatus('Personal information updated successfully.')
    } catch (err) {
      setPersonalError(err.message || 'Failed to update personal information.')
    }
  }

  const onCancelPersonalEdit = () => {
    setPersonalError('')
    setPersonalStatus('')

    if (profile) {
      setDraftName(profile.fullName || '')
      setDraftEmail(profile.email || '')
    }

    if (avatarPreview) {
      URL.revokeObjectURL(avatarPreview)
    }
    setAvatarPreview('')
    setAvatarFile(null)
    if (fileRef.current) fileRef.current.value = ''

    setIsEditingPersonal(false)
  }

  const handlePasswordSubmit = (e) => {
    e.preventDefault()
    setPassError('')
    setPassStatus('')

    if (!currentPassword) {
      setPassError('Please enter your current password.')
      return
    }

    const validation = validateNewPassword(newPassword, confirmPassword)
    if (!validation.valid) {
      setPassError(validation.message)
      return
    }

    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
    setPassStatus('Password updated successfully.')
  }

  const shownAvatar = avatarPreview || profile?.avatarUrl || ''

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.grid}>
          <section className={`${styles.card} ${styles.full}`}>
            <p className={styles.cardTitle}>Personal Information</p>
            <p className={styles.loadingText}>Loading profile…</p>
          </section>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <div className={styles.grid}>
        {/* PERSONAL INFORMATION */}
        <section className={`${styles.card} ${styles.full}`}>
          <div className={styles.cardHeadRow}>
            <p className={styles.cardTitle}>Personal Information</p>

            <div className={styles.headActions}>
              {isEditingPersonal && (
                <button className={styles.secondaryBtn} onClick={onCancelPersonalEdit}>
                  Cancel
                </button>
              )}

              <button
                className={styles.primaryBtn}
                onClick={onClickEditSavePersonal}
                disabled={avatarLoading}
              >
                {isEditingPersonal ? 'Save Changes' : (
                  <>
                    <FiEdit /> Edit
                  </>
                )}
              </button>
            </div>
          </div>

          <div className={styles.piAvatarRow}>
            <div className={styles.piAvatarLeft}>
              <div className={styles.avatar}>
                {shownAvatar ? (
                  <Image
                    src={shownAvatar}
                    alt="Profile avatar"
                    width={54}
                    height={54}
                    className={styles.avatarImg}
                    unoptimized
                  />
                ) : (
                  <div className={styles.avatarFallback}>
                    <FaUser />
                  </div>
                )}
              </div>

              {isEditingPersonal && (
                <div className={styles.piAvatarActionsRow}>
                  <button
                    type="button"
                    className={styles.secondaryBtn}
                    onClick={() => fileRef.current?.click()}
                    disabled={avatarLoading}
                  >
                    <FaUpload /> {avatarLoading ? 'Uploading…' : 'Change'}
                  </button>

                  <button
                    type="button"
                    className={styles.dangerBtn}
                    onClick={onRemoveAvatar}
                    disabled={avatarLoading || !shownAvatar}
                  >
                    <TbTrash /> Remove
                  </button>

                  <span className={styles.profileHintInline}>
                    PNG, JPG, or WEBP · Max {MAX_MB}MB
                  </span>
                </div>
              )}
            </div>
          </div>

          <input
            ref={fileRef}
            type="file"
            accept={ALLOWED.join(',')}
            className={styles.fileInput}
            onChange={onPickAvatar}
          />

          <div className={styles.piFieldsRow}>
            <div className={styles.piGrid}>
              <div className={styles.field}>
                <label htmlFor="pi_name" className={styles.label}>
                  Name
                </label>
                <input
                  id="pi_name"
                  value={draftName}
                  onChange={(e) => setDraftName(e.target.value)}
                  className={`${styles.input} ${!isEditingPersonal ? styles.inputReadOnly : ''}`}
                  disabled={!isEditingPersonal}
                />
              </div>

              <div className={styles.field}>
                <label htmlFor="pi_email" className={styles.label}>
                  Email
                </label>
                <input
                  id="pi_email"
                  value={draftEmail}
                  onChange={(e) => setDraftEmail(e.target.value)}
                  className={`${styles.input} ${!isEditingPersonal ? styles.inputReadOnly : ''}`}
                  disabled={!isEditingPersonal}
                />
              </div>
            </div>

            {personalError && (
              <div className={styles.msgError}>
                <MdErrorOutline />
                {personalError}
              </div>
            )}
            {personalStatus && (
              <div className={styles.msgOk}>
                <MdCheckCircle />
                {personalStatus}
              </div>
            )}
          </div>
        </section>

        {/* PASSWORD */}
        <section className={styles.card}>
          <div className={styles.cardHeadRow}>
            <p className={styles.cardTitle}>Change Password</p>
            <button form="passwordForm" className={styles.primaryBtn}>
              Save Changes
            </button>
          </div>

          <form id="passwordForm" onSubmit={handlePasswordSubmit} className={styles.form}>
            <div className={styles.passGrid}>
              <div className={styles.passField}>
                <label htmlFor="current_password" className={styles.label}>
                  Current Password
                </label>
                <input
                  id="current_password"
                  type="password"
                  placeholder="Enter current password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className={styles.input}
                />
              </div>

              <div className={styles.passField}>
                <label htmlFor="new_password" className={styles.label}>
                  New Password
                </label>
                <input
                  id="new_password"
                  type="password"
                  placeholder="Enter new password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className={styles.input}
                />
              </div>

              <div className={styles.passField}>
                <label htmlFor="confirm_password" className={styles.label}>
                  Confirm New Password
                </label>
                <input
                  id="confirm_password"
                  type="password"
                  placeholder="Re-enter new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={styles.input}
                />
              </div>
            </div>

            {/* Password requirements */}
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
                <MdErrorOutline />
                {passError}
              </div>
            )}

            {passStatus && (
              <div className={styles.msgOk}>
                <MdCheckCircle />
                {passStatus}
              </div>
            )}
          </form>
        </section>
      </div>
    </div>
  )
}

