'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { supabase } from '@/lib/supabase/client'
import { signOut } from '@/lib/auth/session'
import { Logout } from '@/components/ui'
import styles from './settings.module.css'
import { FaUser } from 'react-icons/fa6'
import { LuPencil } from 'react-icons/lu'
import { LuLogOut } from 'react-icons/lu'
import { FiEdit, FiUpload } from 'react-icons/fi'
import { MdCheckCircle, MdErrorOutline } from 'react-icons/md'
import { TbMessage2Question, TbBell } from 'react-icons/tb'
import { validateNewPassword } from '@/lib/validators/authSchemas'
import { fetchCurrentAdminProfile } from '@/features/admin/settings/getAdminProfile'

const AVATARS_BUCKET = 'avatars'
const MAX_MB = 2
const ALLOWED = ['image/jpeg', 'image/png', 'image/webp']

export default function AdminSettingsClient() {
  const router = useRouter()
  const fileRef = useRef(null)
  const avatarPreviewRef = useRef('')

  const [loading, setLoading] = useState(true)
  const [isEditingPersonal, setIsEditingPersonal] = useState(false)
  const [isEditingPassword, setIsEditingPassword] = useState(false)
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
      const { error: updateError } = await supabase
        .from('admins')
        .update({ avatar_url: filePath, updated_at: new Date().toISOString() })
        .eq('id', profile.id)
      if (updateError) throw updateError
      const { data: { publicUrl } } = supabase.storage.from(AVATARS_BUCKET).getPublicUrl(filePath)
      await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', profile.id)
      setProfile((prev) => (prev ? { ...prev, avatarPath: filePath, avatarUrl: publicUrl } : prev))
      setPersonalStatus('Avatar updated successfully.')
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
        .from('admins')
        .update({ avatar_url: null, updated_at: new Date().toISOString() })
        .eq('id', profile.id)
      if (error) throw error
      await supabase.from('profiles').update({ avatar_url: null }).eq('id', profile.id)
      setProfile((prev) => (prev ? { ...prev, avatarPath: null, avatarUrl: null } : prev))
      setPersonalStatus('Avatar removed.')
    } catch (err) {
      setPersonalError(err.message || 'Failed to remove avatar.')
    } finally {
      setAvatarLoading(false)
    }
  }

  const onStartPersonalEdit = () => {
    setPersonalError('')
    setPersonalStatus('')
    if (profile) {
      setDraftName(profile.fullName || '')
      setDraftEmail(profile.email || '')
    }
    setIsEditingPersonal(true)
  }

  const onSavePersonal = async () => {
    setPersonalError('')
    setPersonalStatus('')
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
        .from('admins')
        .update({
          full_name: trimmedName,
          email: trimmedEmail,
          updated_at: new Date().toISOString(),
        })
        .eq('id', profile.id)
      if (error) throw error
      setProfile((prev) => (prev ? { ...prev, fullName: trimmedName, email: trimmedEmail } : prev))
      setIsEditingPersonal(false)
      setPersonalStatus('Profile updated successfully.')
    } catch (err) {
      setPersonalError(err.message || 'Failed to update profile.')
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
  const formId = 'adminPasswordForm'
  const id = (name) => `admin_${name}`

  const [showLogout, setShowLogout] = useState(false)

  const handleLogout = async () => {
    await signOut()
    router.push('/administrator')
  }

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.grid}>
          <section className={`${styles.card} ${styles.full}`}>
            <p className={styles.cardTitle}>Profile</p>
            <p className={styles.loadingText}>Loading profile…</p>
          </section>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.page}>

      {/* ── MOBILE LAYOUT (≤ 640px) ── */}
      <div className={styles.mobileSettings}>
        {/* Profile hero */}
        <div className={styles.mobileProfileHero}>
          <div className={styles.mobileAvatar}>
            {shownAvatar ? (
              <Image
                src={shownAvatar}
                alt="Profile avatar"
                width={72}
                height={72}
                className={styles.mobileAvatarImg}
                unoptimized
              />
            ) : (
              <FaUser />
            )}
          </div>
          <div className={styles.mobileProfileInfo}>
            <p className={styles.mobileName}>{profile?.fullName || 'Admin'}</p>
            <p className={styles.mobileEmail}>{profile?.email || ''}</p>
          </div>
        </div>

        {/* Account section */}
        <div className={styles.mobileSection}>
          <p className={styles.mobileSectionLabel}>Account</p>
          <div className={styles.mobileMenuGroup}>
            <button
              type="button"
              className={styles.mobileMenuItem}
              onClick={onStartPersonalEdit}
            >
              <span className={styles.mobileMenuIcon}><FaUser /></span>
              <span className={styles.mobileMenuLabel}>Manage Profile</span>
              <span className={styles.mobileMenuArrow}>›</span>
            </button>
            <button
              type="button"
              className={styles.mobileMenuItem}
              onClick={() => setIsEditingPassword(true)}
            >
              <span className={styles.mobileMenuIcon}><LuPencil /></span>
              <span className={styles.mobileMenuLabel}>Password &amp; Security</span>
              <span className={styles.mobileMenuArrow}>›</span>
            </button>
            <a href="/admin/notifications" className={styles.mobileMenuItem}>
              <span className={styles.mobileMenuIcon}><TbBell /></span>
              <span className={styles.mobileMenuLabel}>Notifications</span>
              <span className={styles.mobileMenuArrow}>›</span>
            </a>
          </div>
        </div>

        {/* Support section */}
        <div className={styles.mobileSection}>
          <p className={styles.mobileSectionLabel}>Support</p>
          <div className={styles.mobileMenuGroup}>
            <a href="/admin/help" className={styles.mobileMenuItem}>
              <span className={styles.mobileMenuIcon}><TbMessage2Question /></span>
              <span className={styles.mobileMenuLabel}>Help Center</span>
              <span className={styles.mobileMenuArrow}>›</span>
            </a>
            <button
              type="button"
              className={`${styles.mobileMenuItem} ${styles.mobileMenuItemDanger}`}
              onClick={() => setShowLogout(true)}
            >
              <span className={`${styles.mobileMenuIcon} ${styles.mobileMenuIconDanger}`}><LuLogOut /></span>
              <span className={`${styles.mobileMenuLabel} ${styles.mobileMenuLabelDanger}`}>Log Out</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── DESKTOP LAYOUT (> 640px) ── */}
      <div className={styles.grid}>
        <section className={`${styles.card} ${styles.full}`}>
          <div className={styles.cardHeadRow}>
            <p className={styles.cardTitle}>Profile</p>
            <div className={styles.headActions}>
              {isEditingPersonal ? (
                <>
                  <button
                    className={styles.secondaryBtn}
                    onClick={onCancelPersonalEdit}
                    disabled={avatarLoading}
                  >
                    Cancel
                  </button>
                  <button
                    className={styles.primaryBtn}
                    onClick={onSavePersonal}
                    disabled={avatarLoading}
                  >
                    Save Changes
                  </button>
                </>
              ) : (
                <button
                  className={styles.primaryBtn}
                  onClick={onStartPersonalEdit}
                  disabled={avatarLoading}
                >
                  <FiEdit /> Edit
                </button>
              )}
            </div>
          </div>

          <div className={styles.piAvatarRow}>
            <div className={styles.piAvatarLeft}>
              <div
                className={styles.avatar}
                style={isEditingPersonal ? { cursor: 'pointer' } : {}}
                onClick={isEditingPersonal ? () => fileRef.current?.click() : undefined}
                title={isEditingPersonal ? 'Change photo' : undefined}
              >
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
                <div className={styles.avatarBtnRow}>
                  <button
                    type="button"
                    className={styles.secondaryBtn}
                    onClick={() => fileRef.current?.click()}
                    disabled={avatarLoading}
                    style={{ fontSize: '11px' }}
                  >
                    <FiUpload /> Upload
                  </button>
                  {shownAvatar && (
                    <button
                      type="button"
                      className={styles.dangerBtn}
                      onClick={onRemoveAvatar}
                      disabled={avatarLoading}
                      style={{ fontSize: '11px' }}
                    >
                      Remove
                    </button>
                  )}
                </div>
              )}
              <input
                ref={fileRef}
                type="file"
                accept={ALLOWED.join(',')}
                className={styles.fileInput}
                onChange={onPickAvatar}
              />
            </div>
          </div>

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

          {isEditingPersonal && personalError && (
            <div className={styles.msgError}><MdErrorOutline /> {personalError}</div>
          )}
          {isEditingPersonal && personalStatus && (
            <div className={styles.msgOk}><MdCheckCircle /> {personalStatus}</div>
          )}
        </section>

        <section className={styles.card}>
          <div className={styles.cardHeadRow}>
            <p className={styles.cardTitle}>Change Password</p>
            <button form={formId} type="submit" className={styles.primaryBtn}>
              Save Changes
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
            {passError && (
              <div className={styles.msgError}><MdErrorOutline /> {passError}</div>
            )}
            {passStatus && (
              <div className={styles.msgOk}><MdCheckCircle /> {passStatus}</div>
            )}
          </form>
        </section>
      </div>

      {isEditingPersonal && (
        <div className={`${styles.bottomSheetRoot} ${styles.mobileOnly}`}>
          <div
            className={styles.bottomSheetBackdrop}
            onClick={onCancelPersonalEdit}
          />
          <div
            className={styles.bottomSheet}
            role="dialog"
            aria-modal="true"
            aria-labelledby="adminPersonalSheetTitle"
          >
            <div className={styles.bottomSheetHandle} />
            <div className={styles.bottomSheetHeader}>
              <button
                type="button"
                className={`${styles.sheetHeaderBtn} ${styles.sheetCancelBtn}`}
                onClick={onCancelPersonalEdit}
              >
                Cancel
              </button>
              <p id="adminPersonalSheetTitle" className={styles.bottomSheetTitle}>
                Edit Profile
              </p>
              <button
                type="button"
                className={`${styles.sheetHeaderBtn} ${styles.sheetSaveBtn}`}
                onClick={onSavePersonal}
                disabled={avatarLoading}
              >
                Save
              </button>
            </div>

            <div className={styles.bottomSheetBody}>
              <div className={styles.sheetAvatarSection}>
                <div className={styles.sheetAvatarWrap}>
                  <div className={`${styles.avatar} ${styles.avatarLarge}`}>
                    {shownAvatar ? (
                      <Image
                        src={shownAvatar}
                        alt="Profile avatar"
                        width={72}
                        height={72}
                        className={styles.avatarImg}
                        unoptimized
                      />
                    ) : (
                      <div className={styles.avatarFallback}><FaUser /></div>
                    )}
                  </div>
                  <button
                    type="button"
                    className={styles.avatarEditBtn}
                    onClick={() => fileRef.current?.click()}
                    disabled={avatarLoading}
                    aria-label="Change profile photo"
                  >
                    <LuPencil />
                  </button>
                </div>
                {shownAvatar && (
                  <button
                    type="button"
                    className={styles.sheetRemoveBtn}
                    onClick={onRemoveAvatar}
                    disabled={avatarLoading}
                  >
                    Remove
                  </button>
                )}
                <span className={styles.sheetAvatarHint}>
                  PNG, JPG, or WEBP · Max {MAX_MB}MB
                </span>
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
                    <label htmlFor={`${id('name')}_sheet`} className={styles.label}>Name</label>
                    <input
                      id={`${id('name')}_sheet`}
                      value={draftName}
                      onChange={(e) => setDraftName(e.target.value)}
                      className={styles.input}
                    />
                  </div>
                  <div className={styles.field}>
                    <label htmlFor={`${id('email')}_sheet`} className={styles.label}>Email</label>
                    <input
                      id={`${id('email')}_sheet`}
                      value={draftEmail}
                      onChange={(e) => setDraftEmail(e.target.value)}
                      className={styles.input}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className={styles.bottomSheetFooter}>
              {personalError && (
                <div className={styles.msgError}><MdErrorOutline /> {personalError}</div>
              )}
              {personalStatus && (
                <div className={styles.msgOk}><MdCheckCircle /> {personalStatus}</div>
              )}
            </div>
          </div>
        </div>
      )}

      {isEditingPassword && (
        <div className={styles.bottomSheetRoot}>
          <div
            className={styles.bottomSheetBackdrop}
            onClick={() => { setIsEditingPassword(false); setPassError(''); setPassStatus('') }}
          />
          <div
            className={styles.bottomSheet}
            role="dialog"
            aria-modal="true"
            aria-labelledby="adminPasswordSheetTitle"
          >
            <div className={styles.bottomSheetHandle} />
            <div className={styles.bottomSheetHeader}>
              <button
                type="button"
                className={`${styles.sheetHeaderBtn} ${styles.sheetCancelBtn}`}
                onClick={() => { setIsEditingPassword(false); setPassError(''); setPassStatus('') }}
              >
                Cancel
              </button>
              <p id="adminPasswordSheetTitle" className={styles.bottomSheetTitle}>
                Password &amp; Security
              </p>
              <button
                type="button"
                className={`${styles.sheetHeaderBtn} ${styles.sheetSaveBtn}`}
                onClick={() => document.getElementById(`${formId}_sheet`).requestSubmit()}
              >
                Save
              </button>
            </div>

            <div className={styles.bottomSheetBody}>
              <form id={`${formId}_sheet`} onSubmit={async (e) => { await handlePasswordSubmit(e); if (!passError) setIsEditingPassword(false) }} className={styles.form}>
                <div className={styles.field}>
                  <label htmlFor={id('current_password_sheet')} className={styles.label}>Current Password</label>
                  <input
                    id={id('current_password_sheet')}
                    type="password"
                    placeholder="Enter current password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className={styles.input}
                  />
                </div>
                <div className={styles.field}>
                  <label htmlFor={id('new_password_sheet')} className={styles.label}>New Password</label>
                  <input
                    id={id('new_password_sheet')}
                    type="password"
                    placeholder="Enter new password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className={styles.input}
                  />
                </div>
                <div className={styles.field}>
                  <label htmlFor={id('confirm_password_sheet')} className={styles.label}>Confirm New Password</label>
                  <input
                    id={id('confirm_password_sheet')}
                    type="password"
                    placeholder="Re-enter new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={styles.input}
                  />
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
            </div>

            <div className={styles.bottomSheetFooter}>
              {passError && (
                <div className={styles.msgError}><MdErrorOutline /> {passError}</div>
              )}
              {passStatus && (
                <div className={styles.msgOk}><MdCheckCircle /> {passStatus}</div>
              )}
            </div>
          </div>
        </div>
      )}

      <Logout
        open={showLogout}
        onCancel={() => setShowLogout(false)}
        onConfirm={handleLogout}
      />
    </div>
  )
}