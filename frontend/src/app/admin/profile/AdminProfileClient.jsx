'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import { supabase } from '@/lib/supabase/client'
import { signOut } from '@/lib/auth/session'
import { Logout } from '@/components/ui'
import styles from '../settings/settings.module.css'
import { FaUser } from 'react-icons/fa6'
import { LuLogOut, LuPencil } from 'react-icons/lu'
import { FiUpload } from 'react-icons/fi'
import { MdCheckCircle, MdErrorOutline } from 'react-icons/md'
import { TbMessage2Question, TbBell, TbCreditCard } from 'react-icons/tb'
import { HiOutlineNewspaper } from 'react-icons/hi'
import { validateNewPassword } from '@/lib/validators/authSchemas'
import { fetchCurrentAdminProfile } from '@/features/admin/settings/getAdminProfile'
import { useMediaQuery } from '@/shared/hooks'
import loadingStyles from '../admin-loading.module.css'
import { normalizeSettingsTab } from '../settings/adminSettingsTabs'
const AVATARS_BUCKET = 'avatars'
const MAX_MB = 2
const ALLOWED = ['image/jpeg', 'image/png', 'image/webp']

const PROFILE_TABS = [
  { id: 'profile', label: 'Profile', href: '/admin/profile?tab=profile' },
  { id: 'password', label: 'Password', href: '/admin/profile?tab=password' },
  { id: 'notifications', label: 'Notification', href: '/admin/profile/notifications' },
  { id: 'billing', label: 'Billing', href: '/admin/profile/billing' },
  { id: 'content', label: 'Content', href: '/admin/profile/content' },
]

function ProfileMobileTabBar({ onPasswordTab, passwordSheetOpen = false }) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const tabFromQuery = normalizeSettingsTab(searchParams.get('tab') || undefined)

  let activeId = 'profile'
  if (pathname === '/admin/profile/notifications') activeId = 'notifications'
  else if (pathname === '/admin/profile/billing') activeId = 'billing'
  else if (pathname === '/admin/profile/content') activeId = 'content'
  else if (pathname === '/admin/profile') {
    if (passwordSheetOpen || tabFromQuery === 'password') activeId = 'password'
    else activeId = tabFromQuery
  }

  return (
    <nav className={styles.tabBar} aria-label="Settings sections">
      {PROFILE_TABS.map((tab) => {
        const isActive = activeId === tab.id
        if (tab.id === 'password' && typeof onPasswordTab === 'function') {
          return (
            <button
              key={tab.id}
              type="button"
              className={`${styles.tabItem} ${isActive ? styles.tabItemActive : ''}`}
              onClick={onPasswordTab}
              aria-current={isActive ? 'page' : undefined}
            >
              <span className={styles.tabLabel}>{tab.label}</span>
            </button>
          )
        }
        return (
          <Link
            key={tab.id}
            href={tab.href}
            className={`${styles.tabItem} ${isActive ? styles.tabItemActive : ''}`}
            aria-current={isActive ? 'page' : undefined}
          >
            <span className={styles.tabLabel}>{tab.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}

export default function AdminProfileClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const fileRef = useRef(null)
  const avatarPreviewRef = useRef('')

  const [loading, setLoading] = useState(true)
  const [isEditingPersonal, setIsEditingPersonal] = useState(false)
  const [profile, setProfile] = useState(null)
  const [draftFirstName, setDraftFirstName] = useState('')
  const [draftLastName, setDraftLastName] = useState('')
  const [draftEmail, setDraftEmail] = useState('')
  const [draftSmsPhone, setDraftSmsPhone] = useState('')
  const [avatarPreview, setAvatarPreview] = useState('')
  const [personalStatus, setPersonalStatus] = useState('')
  const [personalError, setPersonalError] = useState('')
  const [avatarLoading, setAvatarLoading] = useState(false)

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
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
        setDraftFirstName(data.firstName || (data.fullName || '').trim().split(' ')[0] || '')
        setDraftLastName(
          data.lastName ||
            (() => {
              const parts = (data.fullName || '').trim().split(' ').filter(Boolean)
              return parts.length > 1 ? parts.slice(1).join(' ') : ''
            })(),
        )
        setDraftEmail(data.email || '')
        setDraftSmsPhone(data.smsPhone || '')
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

  const validateFirstName = (value) => {
    const v = String(value || '').trim()
    if (!v) return 'Please enter your first name.'
    if (v.length < 2) return 'First name is too short.'
    return ''
  }

  const validateSmsPhone = (value) => {
    const v = value.trim()
    if (!v) return ''
    const digits = v.replace(/\D/g, '')
    if (digits.length < 7) return 'Enter a valid phone number (at least 7 digits).'
    if (digits.length > 15) return 'Phone number is too long.'
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
      setDraftFirstName(profile.firstName || (profile.fullName || '').trim().split(' ')[0] || '')
      setDraftLastName(
        profile.lastName ||
          (() => {
            const parts = (profile.fullName || '').trim().split(' ').filter(Boolean)
            return parts.length > 1 ? parts.slice(1).join(' ') : ''
          })(),
      )
      setDraftEmail(profile.email || '')
      setDraftSmsPhone(profile.smsPhone || '')
    }
    setIsEditingPersonal(true)
  }

  const onSavePersonal = async () => {
    setPersonalError('')
    setPersonalStatus('')
    const firstErr = validateFirstName(draftFirstName)
    if (firstErr) {
      setPersonalError(firstErr)
      return
    }
    const emailErr = validateEmail(draftEmail)
    if (emailErr) {
      setPersonalError(emailErr)
      return
    }
    const phoneErr = validateSmsPhone(draftSmsPhone)
    if (phoneErr) {
      setPersonalError(phoneErr)
      return
    }
    if (!profile) {
      setPersonalError('Profile is not loaded yet.')
      return
    }
    const firstName = String(draftFirstName || '').trim()
    const lastNameRaw = String(draftLastName || '').trim()
    const lastName = lastNameRaw ? lastNameRaw : null
    const trimmedName = [firstName, lastNameRaw].filter(Boolean).join(' ')
    const trimmedEmail = draftEmail.trim()
    const trimmedSms = draftSmsPhone.trim()
    try {
      const { error: authError } = await supabase.auth.updateUser({ email: trimmedEmail })
      if (authError) throw authError
      const { error } = await supabase
        .from('admins')
        .update({
          first_name: firstName,
          last_name: lastName,
          email: trimmedEmail,
          sms_phone: trimmedSms || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', profile.id)
      if (error) throw error
      setProfile((prev) =>
        prev
          ? {
              ...prev,
              firstName,
              lastName,
              fullName: trimmedName,
              email: trimmedEmail,
              smsPhone: trimmedSms,
            }
          : prev,
      )
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
      setDraftFirstName(profile.firstName || (profile.fullName || '').trim().split(' ')[0] || '')
      setDraftLastName(
        profile.lastName ||
          (() => {
            const parts = (profile.fullName || '').trim().split(' ').filter(Boolean)
            return parts.length > 1 ? parts.slice(1).join(' ') : ''
          })(),
      )
      setDraftEmail(profile.email || '')
      setDraftSmsPhone(profile.smsPhone || '')
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
    if (!currentPassword) {
      setPassError('Please enter your current password.')
      return false
    }
    const validation = validateNewPassword(newPassword, confirmPassword)
    if (!validation.valid) {
      setPassError(validation.message)
      return false
    }
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) {
        setPassError(error.message || 'Failed to update password.')
        return false
      }
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setShowPasswordSheet(false)
      return true
    } catch (err) {
      setPassError(err.message || 'Failed to update password.')
      return false
    }
  }

  const onClosePasswordSheet = () => {
    setPassError('')
    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
    setShowPasswordSheet(false)
  }

  const onOpenPasswordSheet = () => {
    setPassError('')
    setShowPasswordSheet(true)
  }

  const shownAvatar = avatarPreview || profile?.avatarUrl || ''
  const shownAvatarIsBlob = Boolean(shownAvatar && shownAvatar.startsWith('blob:'))
  const passwordSheetFormId = 'adminProfilePasswordSheetForm'
  const id = (name) => `admin_profile_${name}`

  const [showLogout, setShowLogout] = useState(false)
  const [showPasswordSheet, setShowPasswordSheet] = useState(false)
  const isMobile = useMediaQuery('(max-width: 640px)')

  const normalizedTab = normalizeSettingsTab(searchParams.get('tab') || undefined)
  const activeTab =
    normalizedTab === 'password'
      ? 'profile'
      : ['notifications', 'billing', 'content'].includes(normalizedTab)
        ? 'profile'
        : normalizedTab

  useEffect(() => {
    if (!isMobile) {
      const q = searchParams.toString()
      router.replace(q ? `/admin/settings?${q}` : '/admin/settings', { scroll: false })
    }
  }, [isMobile, router, searchParams])

  useEffect(() => {
    if (!isMobile) return
    const t = searchParams.get('tab')
    if (t === 'notifications' || t === 'billing' || t === 'content') {
      router.replace(`/admin/profile/${t}`, { scroll: false })
    }
  }, [isMobile, searchParams, router])

  useEffect(() => {
    if (!isMobile) return
    if (searchParams.get('tab') === 'password') {
      setPassError('')
      setShowPasswordSheet(true)
      router.replace('/admin/profile', { scroll: false })
    }
  }, [isMobile, searchParams, router])

  useEffect(() => {
    if (!showPasswordSheet) return
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setPassError('')
        setCurrentPassword('')
        setNewPassword('')
        setConfirmPassword('')
        setShowPasswordSheet(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [showPasswordSheet])

  const handleLogout = async () => {
    await signOut()
    router.push('/administrator')
  }

  if (!isMobile) {
    return (
      <div className={styles.page}>
        <div className={`${styles.contentArea} ${styles.grid}`}>
          <section className={`${styles.card} ${styles.full}`}>
            <div
              className={`${loadingStyles.root} ${loadingStyles.variantCard}`}
              role="status"
              aria-live="polite"
              aria-busy="true"
            >
              <span className={loadingStyles.spinner} aria-hidden />
              <span className={loadingStyles.label}>Opening settings</span>
            </div>
          </section>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={`${styles.contentArea} ${styles.grid}`}>
          <section className={`${styles.card} ${styles.full}`}>
            <div
              className={`${loadingStyles.root} ${loadingStyles.variantCard}`}
              role="status"
              aria-live="polite"
              aria-busy="true"
            >
              <span className={loadingStyles.spinner} aria-hidden />
              <span className={loadingStyles.label}>Loading your profile</span>
            </div>
          </section>
        </div>
      </div>
    )
  }

  const tabParam = searchParams.get('tab')
  const pageClass = [
    styles.page,
    activeTab === 'profile' && tabParam === 'profile' ? styles.pageMobileTabView : null,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={pageClass}>

      <div className={styles.mobileSettingsFlow}>
        <div className={styles.mobileSettingsTrack}>
          <div className={styles.mobileSettingsPaneList} id="admin-mobile-settings-list">
            <div className={styles.mobileSettings}>
              <div className={styles.mobileProfileHero}>
                <div className={styles.mobileAvatar}>
                  {shownAvatar ? (
                    <Image
                      src={shownAvatar}
                      alt="Profile avatar"
                      width={56}
                      height={56}
                      className={styles.mobileAvatarImg}
                      sizes="56px"
                      unoptimized={shownAvatarIsBlob}
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
                    onClick={onOpenPasswordSheet}
                  >
                    <span className={styles.mobileMenuIcon}><LuPencil /></span>
                    <span className={styles.mobileMenuLabel}>Password</span>
                    <span className={styles.mobileMenuArrow}>›</span>
                  </button>
                  <Link href="/admin/profile/notifications" className={styles.mobileMenuItem}>
                    <span className={styles.mobileMenuIcon}><TbBell /></span>
                    <span className={styles.mobileMenuLabel}>Notification</span>
                    <span className={styles.mobileMenuArrow}>›</span>
                  </Link>
                  <Link href="/admin/profile/billing" className={styles.mobileMenuItem}>
                    <span className={styles.mobileMenuIcon}><TbCreditCard /></span>
                    <span className={styles.mobileMenuLabel}>Billing</span>
                    <span className={styles.mobileMenuArrow}>›</span>
                  </Link>
                  <Link href="/admin/profile/content" className={styles.mobileMenuItem}>
                    <span className={styles.mobileMenuIcon}><HiOutlineNewspaper /></span>
                    <span className={styles.mobileMenuLabel}>Site content</span>
                    <span className={styles.mobileMenuArrow}>›</span>
                  </Link>
                </div>
              </div>

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
          </div>
        </div>
      </div>

      <ProfileMobileTabBar
        passwordSheetOpen={showPasswordSheet}
        onPasswordTab={onOpenPasswordSheet}
      />

      <div className={`${styles.contentArea} ${styles.grid}`}>
        {activeTab === 'profile' && (
        <section className={`${styles.card} ${styles.full}`}>
          <div className={styles.tabDetailHead}>
            <div className={styles.tabDetailHeadRow}>
              <div className={styles.tabDetailHeadText}>
                <h2 className={styles.tabDetailTitle}>Manage Profile</h2>
                <p className={styles.tabDetailSubtitle}>
                  View and update your name, email, and profile photo.
                </p>
              </div>
              <div className={styles.headActions}>
                {isEditingPersonal ? (
                  <>
                    <button
                      type="button"
                      className={styles.secondaryBtn}
                      onClick={onCancelPersonalEdit}
                      disabled={avatarLoading}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className={styles.primaryBtn}
                      onClick={onSavePersonal}
                      disabled={avatarLoading}
                    >
                      Save Changes
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    className={styles.primaryBtn}
                    onClick={onStartPersonalEdit}
                    disabled={avatarLoading}
                  >
                    Edit
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className={styles.profileDetails}>
            <div className={styles.settingsRow}>
              <div className={styles.settingsRowMeta}>
                <div className={styles.settingsRowTitleRow}>
                  <p className={styles.settingsRowTitle}>Avatar</p>
                </div>
                <p className={styles.settingsRowDesc}>Shown across admin-facing experiences.</p>
              </div>
              <div className={`${styles.settingsRowControl} ${styles.profileControl}`}>
                <div className={styles.profilePhotoControl}>
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
                        width={96}
                        height={96}
                        className={styles.avatarImg}
                        sizes="96px"
                        unoptimized={shownAvatarIsBlob}
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
            </div>

            <div className={styles.settingsRow}>
              <div className={styles.settingsRowMeta}>
                <div className={styles.settingsRowTitleRow}>
                  <p className={styles.settingsRowTitle}>Name</p>
                </div>
                <p className={styles.settingsRowDesc}>Used for account and audit references.</p>
              </div>
              <div className={`${styles.settingsRowControl} ${styles.profileControl}`}>
                <div style={{ display: 'grid', gap: 10 }}>
                  <input
                    id={id('first_name')}
                    placeholder="First name"
                    value={draftFirstName}
                    onChange={(e) => setDraftFirstName(e.target.value)}
                    className={`${styles.input} ${!isEditingPersonal ? styles.inputReadOnly : ''}`}
                    disabled={!isEditingPersonal}
                  />
                  <input
                    id={id('last_name')}
                    placeholder="Last name"
                    value={draftLastName}
                    onChange={(e) => setDraftLastName(e.target.value)}
                    className={`${styles.input} ${!isEditingPersonal ? styles.inputReadOnly : ''}`}
                    disabled={!isEditingPersonal}
                  />
                </div>
              </div>
            </div>

            <div className={styles.settingsRow}>
              <div className={styles.settingsRowMeta}>
                <div className={styles.settingsRowTitleRow}>
                  <p className={styles.settingsRowTitle}>Email</p>
                </div>
                <p className={styles.settingsRowDesc}>Changes will update your sign-in email.</p>
              </div>
              <div className={`${styles.settingsRowControl} ${styles.profileControl}`}>
                <input
                  id={id('email')}
                  value={draftEmail}
                  onChange={(e) => setDraftEmail(e.target.value)}
                  className={`${styles.input} ${!isEditingPersonal ? styles.inputReadOnly : ''}`}
                  disabled={!isEditingPersonal}
                />
              </div>
            </div>

            <div className={styles.settingsRow}>
              <div className={styles.settingsRowMeta}>
                <div className={styles.settingsRowTitleRow}>
                  <p className={styles.settingsRowTitle}>SMS contact number</p>
                </div>
                <p className={styles.settingsRowDesc}>
                  Optional mobile number for SMS contact.
                </p>
              </div>
              <div className={`${styles.settingsRowControl} ${styles.profileControl}`}>
                <input
                  id={id('sms_phone')}
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="e.g. +63 900 000 0000"
                  value={draftSmsPhone}
                  onChange={(e) => setDraftSmsPhone(e.target.value)}
                  className={`${styles.input} ${!isEditingPersonal ? styles.inputReadOnly : ''}`}
                  disabled={!isEditingPersonal}
                  aria-label="SMS contact number"
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
        )}

      </div>

      {isEditingPersonal && (
        <div className={`${styles.bottomSheetRoot} ${styles.mobileOnly}`}>
          <div
            className={styles.bottomSheetBackdrop}
            onClick={onCancelPersonalEdit}
          />
          <div
            className={`${styles.bottomSheet} ${styles.bottomSheetProfileEdit}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="adminPersonalSheetTitle"
          >
            <div className={styles.bottomSheetHandle} />
            <div className={`${styles.bottomSheetHeader} ${styles.bottomSheetHeaderTextActions}`}>
              <button
                type="button"
                className={`${styles.sheetHeaderTextBtn} ${styles.sheetHeaderTextBtnCancel}`}
                onClick={onCancelPersonalEdit}
                disabled={avatarLoading}
              >
                Cancel
              </button>
              <p id="adminPersonalSheetTitle" className={styles.bottomSheetTitle}>
                Edit Profile
              </p>
              <button
                type="button"
                className={`${styles.sheetHeaderTextBtn} ${styles.sheetHeaderTextBtnSave}`}
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
                        width={88}
                        height={88}
                        className={styles.avatarImg}
                        sizes="88px"
                        unoptimized={shownAvatarIsBlob}
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

              <div className={styles.piFieldsRow}>
                <div className={styles.piGrid}>
                  <div className={styles.field}>
                    <label htmlFor={`${id('first_name')}_sheet`} className={styles.label}>
                      First name
                    </label>
                    <input
                      id={`${id('first_name')}_sheet`}
                      value={draftFirstName}
                      onChange={(e) => setDraftFirstName(e.target.value)}
                      className={styles.input}
                    />
                  </div>
                  <div className={styles.field}>
                    <label htmlFor={`${id('last_name')}_sheet`} className={styles.label}>
                      Last name
                    </label>
                    <input
                      id={`${id('last_name')}_sheet`}
                      value={draftLastName}
                      onChange={(e) => setDraftLastName(e.target.value)}
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
                  <div className={`${styles.field} ${styles.piFieldFull}`}>
                    <label htmlFor={`${id('sms_phone')}_sheet`} className={styles.label}>
                      SMS contact number
                    </label>
                    <input
                      id={`${id('sms_phone')}_sheet`}
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel"
                      placeholder="e.g. +63 900 000 0000"
                      value={draftSmsPhone}
                      onChange={(e) => setDraftSmsPhone(e.target.value)}
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

      {showPasswordSheet && (
        <div className={`${styles.bottomSheetRoot} ${styles.mobileOnly}`}>
          <div className={styles.bottomSheetBackdrop} onClick={onClosePasswordSheet} />
          <div
            className={styles.bottomSheet}
            role="dialog"
            aria-modal="true"
            aria-labelledby="adminPasswordSheetTitle"
          >
            <div className={styles.bottomSheetHandle} />
            <div className={`${styles.bottomSheetHeader} ${styles.bottomSheetHeaderTextActions}`}>
              <button
                type="button"
                className={`${styles.sheetHeaderTextBtn} ${styles.sheetHeaderTextBtnCancel}`}
                onClick={onClosePasswordSheet}
              >
                Cancel
              </button>
              <p id="adminPasswordSheetTitle" className={styles.bottomSheetTitle}>
                Change Password
              </p>
              <button
                type="submit"
                form={passwordSheetFormId}
                className={`${styles.sheetHeaderTextBtn} ${styles.sheetHeaderTextBtnSave}`}
              >
                Save
              </button>
            </div>

            <div className={styles.bottomSheetBody}>
              <form
                id={passwordSheetFormId}
                onSubmit={handlePasswordSubmit}
                className={styles.form}
              >
                <div className={styles.passGrid}>
                  <div className={styles.passField}>
                    <label htmlFor={`${id('current_password')}_sheet`} className={styles.label}>
                      Current Password
                    </label>
                    <input
                      id={`${id('current_password')}_sheet`}
                      type="password"
                      placeholder="Enter current password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className={styles.input}
                      autoComplete="current-password"
                    />
                  </div>
                  <div className={styles.passField}>
                    <label htmlFor={`${id('new_password')}_sheet`} className={styles.label}>
                      New Password
                    </label>
                    <input
                      id={`${id('new_password')}_sheet`}
                      type="password"
                      placeholder="Enter new password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className={styles.input}
                      autoComplete="new-password"
                    />
                  </div>
                  <div className={styles.passField}>
                    <label htmlFor={`${id('confirm_password')}_sheet`} className={styles.label}>
                      Confirm New Password
                    </label>
                    <input
                      id={`${id('confirm_password')}_sheet`}
                      type="password"
                      placeholder="Re-enter new password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className={styles.input}
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
            </div>

            <div className={styles.bottomSheetFooter}>
              {passError && (
                <div className={styles.msgError}><MdErrorOutline /> {passError}</div>
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
