'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { supabase } from '@/lib/supabase/client'
import styles from './settings.module.css'
import { FaUser, FaUpload } from 'react-icons/fa6'
import { TbCamera, TbTrash } from 'react-icons/tb'
import { FiEdit, FiSave } from 'react-icons/fi'
import { MdCheckCircle, MdErrorOutline } from 'react-icons/md'
import { validateNewPassword } from '@/lib/validators/authSchemas'
import { fetchCurrentSellerProfile } from '@/features/seller/settings/getSellerProfile'

const AVATARS_BUCKET = 'avatars'
const MAX_MB = 2
const ALLOWED = ['image/jpeg', 'image/png', 'image/webp']

export default function SellerSettingsClient() {
  const fileRef = useRef(null)
  const avatarPreviewRef = useRef('')

  const [loading, setLoading] = useState(true)
  const [isEditingPersonal, setIsEditingPersonal] = useState(false)
  const [profile, setProfile] = useState(null)
  const [draftName, setDraftName] = useState('')
  const [draftEmail, setDraftEmail] = useState('')
  const [avatarPreview, setAvatarPreview] = useState('')
  const [personalStatus, setPersonalStatus] = useState('')
  const [personalError, setPersonalError] = useState('')
  const [avatarLoading, setAvatarLoading] = useState(false)

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passStatus, setPassStatus] = useState('')
  const [passError, setPassError] = useState('')
  const [toast, setToast] = useState(null)
  const [avatarModalOpen, setAvatarModalOpen] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function loadProfile() {
      setLoading(true)
      setPersonalError('')
      setPersonalStatus('')
      try {
        const data = await fetchCurrentSellerProfile()
        if (cancelled) return
        setProfile(data)
        setDraftName(data.fullName || '')
        setDraftEmail(data.email || '')
      } catch (err) {
        if (!cancelled) setPersonalError(err.message || 'Failed to load profile.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    loadProfile()
    return () => {
      cancelled = true
      if (avatarPreviewRef.current) URL.revokeObjectURL(avatarPreviewRef.current)
    }
  }, [])

  useEffect(() => {
    if (!personalError) return
    setToast({ id: Date.now(), type: 'error', message: personalError })
  }, [personalError])

  useEffect(() => {
    if (!personalStatus) return
    setToast({ id: Date.now(), type: 'success', message: personalStatus })
  }, [personalStatus])

  useEffect(() => {
    if (!passError) return
    setToast({ id: Date.now(), type: 'error', message: passError })
  }, [passError])

  useEffect(() => {
    if (!passStatus) return
    setToast({ id: Date.now(), type: 'success', message: passStatus })
  }, [passStatus])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 4200)
    return () => clearTimeout(t)
  }, [toast])

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
    if (avatarPreviewRef.current) URL.revokeObjectURL(avatarPreviewRef.current)
    const url = URL.createObjectURL(file)
    avatarPreviewRef.current = url
    setAvatarPreview(url)
    try {
      setAvatarLoading(true)
      const fileExt = file.name.split('.').pop()
      const fileName = `avatar-${Date.now()}.${fileExt}`
      const filePath = `${profile.id}/${fileName}`
      if (profile.avatarPath) {
        await supabase.storage.from(AVATARS_BUCKET).remove([profile.avatarPath])
      }
      const { error: uploadError } = await supabase.storage
        .from(AVATARS_BUCKET)
        .upload(filePath, file, { upsert: true, cacheControl: '3600' })
      if (uploadError) throw uploadError
      const { data: { publicUrl } } = supabase.storage.from(AVATARS_BUCKET).getPublicUrl(filePath)
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl, updated_at: new Date().toISOString() })
        .eq('id', profile.id)
      if (updateError) throw updateError
      setProfile((prev) => (prev ? { ...prev, avatarPath: filePath, avatarUrl: publicUrl } : prev))
      setPersonalStatus('Avatar updated successfully.')
      setTimeout(() => setPersonalStatus(''), 5000)
    } catch (err) {
      setPersonalError(err.message || 'Failed to upload avatar.')
    } finally {
      setAvatarLoading(false)
    }
  }

  const onRemoveAvatar = async () => {
    setPersonalError('')
    setPersonalStatus('')
    if (!profile || (!profile.avatarPath && !profile.avatarUrl)) return
    if (avatarPreviewRef.current) {
      URL.revokeObjectURL(avatarPreviewRef.current)
      avatarPreviewRef.current = ''
      setAvatarPreview('')
    }
    if (fileRef.current) fileRef.current.value = ''
    try {
      setAvatarLoading(true)
      if (profile.avatarPath) {
        await supabase.storage.from(AVATARS_BUCKET).remove([profile.avatarPath])
      }
      const { error } = await supabase
        .from('profiles')
        .update({ avatar_url: null, updated_at: new Date().toISOString() })
        .eq('id', profile.id)
      if (error) throw error
      setProfile((prev) => (prev ? { ...prev, avatarPath: null, avatarUrl: null } : prev))
      setPersonalStatus('Avatar removed.')
      setTimeout(() => setPersonalStatus(''), 5000)
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
    const trimmedName = draftName.trim()
    const trimmedEmail = draftEmail.trim()
    try {
      const { error: authError } = await supabase.auth.updateUser({ email: trimmedEmail })
      if (authError) throw authError
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: trimmedName,
          email: trimmedEmail,
          updated_at: new Date().toISOString(),
        })
        .eq('id', profile.id)
      if (error) throw error
      setProfile((prev) => (prev ? { ...prev, fullName: trimmedName, email: trimmedEmail } : prev))
      setIsEditingPersonal(false)
      setPersonalStatus('Personal information updated successfully.')
      setTimeout(() => setPersonalStatus(''), 5000)
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
    if (avatarPreviewRef.current) {
      URL.revokeObjectURL(avatarPreviewRef.current)
      avatarPreviewRef.current = ''
    }
    setAvatarPreview('')
    if (fileRef.current) fileRef.current.value = ''
    setIsEditingPersonal(false)
    setAvatarModalOpen(false)
  }

  const handlePasswordSubmit = async (e) => {
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
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) {
        setPassError(error.message || 'Failed to update password.')
        return
      }
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setPassStatus('Password updated successfully.')
    } catch (err) {
      setPassError(err.message || 'Failed to update password.')
    }
  }

  const shownAvatar = avatarPreview || profile?.avatarUrl || ''
  const formId = 'sellerPasswordForm'
  const id = (name) => `seller_${name}`

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
        <section className={`${styles.card} ${styles.full}`}>
          <div
            className={`${styles.cardHeadRow} ${styles.personalHeadRow} ${
              isEditingPersonal ? styles.personalHeadRowEditing : ''
            }`}
          >
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
                {isEditingPersonal ? (
                  <>
                    <FiSave /> Save Changes
                  </>
                ) : (
                  <>
                    <FiEdit /> Edit
                  </>
                )}
              </button>
            </div>
          </div>

          <div className={styles.piAvatarRow}>
            <div className={styles.piAvatarLeft}>
              <button
                type="button"
                className={styles.avatarButton}
                onClick={() => isEditingPersonal && setAvatarModalOpen(true)}
                disabled={!isEditingPersonal || avatarLoading}
                aria-label="Open photo options"
              >
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
                    <div className={styles.avatarFallback}><FaUser /></div>
                  )}
                </div>
                {isEditingPersonal && (
                  <span className={styles.avatarEditIcon}>
                    <TbCamera />
                  </span>
                )}
              </button>
              {isEditingPersonal && (
                <>
                  <span className={styles.profileHintInline}>
                    PNG, JPG, or WEBP · Max {MAX_MB}MB
                  </span>
                </>
              )}
            </div>
          </div>

          {avatarModalOpen && isEditingPersonal && (
            <div className={styles.avatarModalOverlay} onClick={() => setAvatarModalOpen(false)}>
              <div className={styles.avatarModalCard} onClick={(e) => e.stopPropagation()}>
                <h3 className={styles.avatarModalTitle}>Profile Photo</h3>
                <p className={styles.avatarModalText}>Choose an action for your profile photo.</p>
                <div className={styles.avatarModalActions}>
                  <button
                    type="button"
                    className={`${styles.primaryBtn} ${styles.avatarModalBtn}`}
                    onClick={() => {
                      setAvatarModalOpen(false)
                      fileRef.current?.click()
                    }}
                    disabled={avatarLoading}
                  >
                    <FaUpload /> {avatarLoading ? 'Uploading…' : 'Change Photo'}
                  </button>
                  <button
                    type="button"
                    className={`${styles.dangerBtn} ${styles.avatarModalBtn}`}
                    onClick={async () => {
                      setAvatarModalOpen(false)
                      await onRemoveAvatar()
                    }}
                    disabled={avatarLoading || !shownAvatar}
                  >
                    <TbTrash /> Remove Photo
                  </button>
                </div>
              </div>
            </div>
          )}

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
                <label htmlFor={id('name')} className={styles.label}>Name</label>
                <input
                  id={id('name')}
                  value={draftName}
                  onChange={(e) => setDraftName(e.target.value)}
                  className={`${styles.input} ${!isEditingPersonal ? styles.inputReadOnly : ''}`}
                  disabled={!isEditingPersonal}
                />
              </div>
              <div className={styles.field}>
                <label htmlFor={id('email')} className={styles.label}>Email</label>
                <input
                  id={id('email')}
                  value={draftEmail}
                  onChange={(e) => setDraftEmail(e.target.value)}
                  className={`${styles.input} ${!isEditingPersonal ? styles.inputReadOnly : ''}`}
                  disabled={!isEditingPersonal}
                />
              </div>
            </div>
          </div>
        </section>

        <section className={styles.card}>
          <div className={`${styles.cardHeadRow} ${styles.passwordHeadRow}`}>
            <p className={styles.cardTitle}>Change Password</p>
            <button form={formId} type="submit" className={styles.primaryBtn}>
              <FiSave /> Save Changes
            </button>
          </div>
          <form id={formId} onSubmit={handlePasswordSubmit} className={styles.form}>
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
      </div>
      {toast && (
        <div
          className={`${styles.toast} ${
            toast.type === 'error' ? styles.toastError : styles.toastSuccess
          }`}
          role="status"
          aria-live="polite"
        >
          {toast.type === 'error' ? <MdErrorOutline /> : <MdCheckCircle />}
          <span>{toast.message}</span>
          <button
            type="button"
            className={styles.toastClose}
            onClick={() => setToast(null)}
            aria-label="Close notification"
          >
            ×
          </button>
        </div>
      )}
    </div>
  )
}
