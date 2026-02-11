'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import styles from './settings.module.css'
import { FaUser, FaUpload } from 'react-icons/fa6'
import { TbTrash } from 'react-icons/tb'
import { FiEdit } from 'react-icons/fi'
import { MdCheckCircle, MdErrorOutline } from 'react-icons/md'

const MAX_MB = 2
const ALLOWED = ['image/jpeg', 'image/png', 'image/webp']

export default function SettingsPage() {
  const fileRef = useRef(null)

  // Personal info edit toggle
  const [isEditingPersonal, setIsEditingPersonal] = useState(false)

  // Personal Information
  const [savedName, setSavedName] = useState('Admin')
  const [savedEmail, setSavedEmail] = useState('admin@email.com')

  const [draftName, setDraftName] = useState(savedName)
  const [draftEmail, setDraftEmail] = useState(savedEmail)

  // Profile image (preview only)
  const [avatarPreview, setAvatarPreview] = useState('')
  const [savedAvatarPreview, setSavedAvatarPreview] = useState('')

  const [personalStatus, setPersonalStatus] = useState('')
  const [personalError, setPersonalError] = useState('')

  // Password
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passStatus, setPassStatus] = useState('')
  const [passError, setPassError] = useState('')

  // Cleanup object URL
  useEffect(() => {
    return () => {
      if (avatarPreview) URL.revokeObjectURL(avatarPreview)
    }
  }, [avatarPreview])

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

  const onPickAvatar = (e) => {
    setPersonalError('')
    setPersonalStatus('')

    const file = e.target.files?.[0]
    if (!file) return

    const error = validateImage(file)
    if (error) {
      setPersonalError(error)
      return
    }

    if (avatarPreview) URL.revokeObjectURL(avatarPreview)

    const url = URL.createObjectURL(file)
    setAvatarPreview(url)
  }

  const onRemoveAvatar = () => {
    setPersonalError('')
    setPersonalStatus('')

    if (avatarPreview) URL.revokeObjectURL(avatarPreview)

    setAvatarPreview('')
    if (fileRef.current) fileRef.current.value = ''
  }

  const onClickEditSavePersonal = () => {
    setPersonalError('')
    setPersonalStatus('')

    if (!isEditingPersonal) {
      setDraftName(savedName)
      setDraftEmail(savedEmail)
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

    setSavedName(draftName.trim())
    setSavedEmail(draftEmail.trim())

    if (avatarPreview) {
      setSavedAvatarPreview(avatarPreview)
      if (fileRef.current) fileRef.current.value = ''
    }

    setIsEditingPersonal(false)
    setPersonalStatus('Personal information updated successfully.')
  }

  const onCancelPersonalEdit = () => {
    setPersonalError('')
    setPersonalStatus('')

    setDraftName(savedName)
    setDraftEmail(savedEmail)

    if (avatarPreview && avatarPreview !== savedAvatarPreview) {
      URL.revokeObjectURL(avatarPreview)
    }
    setAvatarPreview(savedAvatarPreview)
    if (fileRef.current) fileRef.current.value = ''

    setIsEditingPersonal(false)
  }

  const handlePasswordSubmit = (e) => {
    e.preventDefault()
    setPassError('')
    setPassStatus('')

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPassError('Please complete all fields.')
      return
    }

    if (newPassword !== confirmPassword) {
      setPassError('Passwords do not match.')
      return
    }

    if (newPassword.length < 8) {
      setPassError('Password must be at least 8 characters.')
      return
    }

    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
    setPassStatus('Password updated successfully.')
  }

  const shownAvatar = avatarPreview || savedAvatarPreview

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

              <button className={styles.primaryBtn} onClick={onClickEditSavePersonal}>
                {isEditingPersonal ? 'Save Changes' : <><FiEdit /> Edit</>}
              </button>
            </div>
          </div>

          <div className={styles.piAvatarRow}>
            <div className={styles.piAvatarLeft}>
              <div className={styles.avatar}>
                {shownAvatar ? (
                  <Image
                    src={shownAvatar}
                    alt="Profile preview"
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
                  >
                    <FaUpload /> Change
                  </button>

                  <button
                    type="button"
                    className={styles.dangerBtn}
                    onClick={onRemoveAvatar}
                    disabled={!shownAvatar}
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
                <label htmlFor="pi_name" className={styles.label}>Name</label>
                <input
                  id="pi_name"
                  value={draftName}
                  onChange={(e) => setDraftName(e.target.value)}
                  className={`${styles.input} ${!isEditingPersonal ? styles.inputReadOnly : ''}`}
                  disabled={!isEditingPersonal}
                />
              </div>

              <div className={styles.field}>
                <label htmlFor="pi_email" className={styles.label}>Email</label>
                <input
                  id="pi_email"
                  value={draftEmail}
                  onChange={(e) => setDraftEmail(e.target.value)}
                  className={`${styles.input} ${!isEditingPersonal ? styles.inputReadOnly : ''}`}
                  disabled={!isEditingPersonal}
                />
              </div>
            </div>

            {personalError && <div className={styles.msgError}><MdErrorOutline />{personalError}</div>}
            {personalStatus && <div className={styles.msgOk}><MdCheckCircle />{personalStatus}</div>}
          </div>
        </section>

        {/* PASSWORD */}
        <section className={styles.card}>
          <div className={styles.cardHeadRow}>
            <p className={styles.cardTitle}>Change Password</p>
            <button form="passwordForm" className={styles.primaryBtn}>Save Changes</button>
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