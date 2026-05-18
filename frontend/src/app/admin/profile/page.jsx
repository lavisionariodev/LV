'use client'

import { AVATAR_ALLOWED_TYPES, AVATAR_MAX_MB, shouldUseUnoptimizedAvatarSrc } from '@/shared/utils'
import { useEffect, useState } from 'react'
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
import { TbMessage2Question, TbBell, TbCreditCard, TbChevronRight } from 'react-icons/tb'
import { HiOutlineNewspaper } from 'react-icons/hi'
import { changePasswordWithReauth } from '@/lib/auth/changePassword'
import { useAuthToast } from '@/contexts/ToastContext'
import { useAdminPersonalProfile } from '@/features/admin/settings/adminProfile'

import { useMediaQuery } from '@/shared/hooks'
import { ADMIN_SETTINGS_NAV, getSettingsSectionFromPathname } from '../settings/adminSettingsNav'
import ConfirmModal from '@/components/ui/Modal/ConfirmModal'

function MobileMenuArrow() {
  return <TbChevronRight className={styles.mobileMenuArrow} aria-hidden />
}

function ProfileMobileTabBar({
  activeAccountSheet = false,
  passwordSheetOpen = false,
  onAccountTab,
  onPasswordTab,
}) {
  const pathname = usePathname()
  const routeSection = getSettingsSectionFromPathname(pathname)
  let activeId = pathname === '/admin/profile' ? 'account' : routeSection ?? 'account'
  if (passwordSheetOpen) activeId = 'password'
  else if (activeAccountSheet && pathname === '/admin/profile') activeId = 'account'

  return (
    <nav className={styles.tabBar} aria-label="Settings sections">
      {ADMIN_SETTINGS_NAV.map((tab) => {
        const isActive = activeId === tab.id
        if (tab.id === 'account' && typeof onAccountTab === 'function') {
          return (
            <button
              key={tab.id}
              type="button"
              className={`${styles.tabItem} ${isActive ? styles.tabItemActive : ''}`}
              onClick={onAccountTab}
              aria-current={isActive ? 'page' : undefined}
            >
              <span className={styles.tabLabel}>{tab.label}</span>
            </button>
          )
        }
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

export default function AdminProfilePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const toast = useAuthToast()
  const {
    fileRef,
    loading,
    profile,
    draftFirstName,
    setDraftFirstName,
    draftLastName,
    setDraftLastName,
    draftEmail,
    setDraftEmail,
    draftSmsPhone,
    setDraftSmsPhone,
    avatarPreview,
    personalStatus,
    personalError,
    avatarLoading,
    removeAvatarConfirmOpen,
    setRemoveAvatarConfirmOpen,
    isEditingPersonal,
    onPickAvatar,
    openRemoveAvatarConfirm,
    executeRemoveAvatar,
    onStartPersonalEdit,
    onSavePersonal,
    onCancelPersonalEdit,
  } = useAdminPersonalProfile({ supabase, toast })

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passError, setPassError] = useState('')
  const [passwordSaving, setPasswordSaving] = useState(false)

  const handlePasswordSubmit = async (e) => {
    e.preventDefault()
    if (passwordSaving) return false
    setPassError('')
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
      toast.success(okMsg)
      setShowPasswordSheet(false)
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

  const onClosePasswordSheet = () => {
    if (passwordSaving) return
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
  const shownAvatarIsBlob = shouldUseUnoptimizedAvatarSrc(shownAvatar)
  const passwordSheetFormId = 'adminProfilePasswordSheetForm'
  const id = (name) => `admin_profile_${name}`

  const [showLogout, setShowLogout] = useState(false)
  const [showPasswordSheet, setShowPasswordSheet] = useState(false)
  const isMobile = useMediaQuery('(max-width: 640px)')

  const activeTab = 'profile'

  useEffect(() => {
    if (!isMobile) {
      router.replace('/admin/settings/account', { scroll: false })
    }
  }, [isMobile, router])

  useEffect(() => {
    if (!isMobile) return
    const sheet = searchParams.get('sheet')
    if (sheet === 'account') {
      queueMicrotask(() => {
        onStartPersonalEdit()
        router.replace('/admin/profile', { scroll: false })
      })
      return
    }
    if (sheet === 'password') {
      queueMicrotask(() => {
        setPassError('')
        setShowPasswordSheet(true)
        router.replace('/admin/profile', { scroll: false })
      })
    }
  }, [isMobile, onStartPersonalEdit, router, searchParams])

  useEffect(() => {
    if (!showPasswordSheet) return
    const onKey = (e) => {
      if (e.key === 'Escape' && !passwordSaving) {
        setPassError('')
        setCurrentPassword('')
        setNewPassword('')
        setConfirmPassword('')
        setShowPasswordSheet(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [showPasswordSheet, passwordSaving])

  const handleLogout = async () => {
    await signOut()
    router.push('/administrator')
  }

  if (!isMobile) {
    return (
      <div className={styles.page} role="status" aria-live="polite" aria-busy="true" aria-label="Opening settings">
        <div className={`${styles.contentArea} ${styles.grid}`}>
          <section className={`${styles.card} ${styles.full}`}>
            <div className={styles.settingsSkCardHead}>
              <span className={`${styles.settingsSkBar} ${styles.settingsSkTitle}`} />
              <span className={`${styles.settingsSkBar} ${styles.settingsSkSubtitle}`} />
            </div>
            <div className={styles.settingsSkAvatarRow}>
              <span className={`${styles.settingsSkBar} ${styles.settingsSkAvatar}`} />
              <div className={styles.settingsSkFields} style={{ flex: 1 }}>
                <span className={`${styles.settingsSkBar} ${styles.settingsSkField}`} />
                <span className={`${styles.settingsSkBar} ${styles.settingsSkField}`} style={{ maxWidth: '85%' }} />
              </div>
            </div>
          </section>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className={styles.page} data-portal-profile-hub role="status" aria-live="polite" aria-busy="true" aria-label="Loading your profile">
        <div className={styles.mobileSettingsFlow} aria-hidden>
          <div className={styles.mobileSettings}>
            <div className={styles.settingsSkMobileHero}>
              <span className={`${styles.settingsSkBar} ${styles.settingsSkMobileAvatar}`} />
              <div className={styles.settingsSkMobileHeroText}>
                <span className={`${styles.settingsSkBar} ${styles.settingsSkMobileName}`} />
                <span className={`${styles.settingsSkBar} ${styles.settingsSkMobileEmail}`} />
              </div>
            </div>

            <div className={styles.settingsSkMobileSection}>
              <span className={`${styles.settingsSkBar} ${styles.settingsSkMobileSectionLabel}`} />
              <div className={styles.settingsSkMobileMenuGroup}>
                {[0, 1, 2, 3, 4].map((i) => (
                  <div key={`acct-sk-${i}`} className={styles.settingsSkMobileMenuItem}>
                    <span className={`${styles.settingsSkBar} ${styles.settingsSkMobileMenuIcon}`} />
                    <span className={`${styles.settingsSkBar} ${styles.settingsSkMobileMenuLabel}`} />
                    <span className={`${styles.settingsSkBar} ${styles.settingsSkMobileMenuArrow}`} />
                  </div>
                ))}
              </div>
            </div>

            <div className={styles.settingsSkMobileSection}>
              <span className={`${styles.settingsSkBar} ${styles.settingsSkMobileSectionLabel}`} />
              <div className={styles.settingsSkMobileMenuGroup}>
                {[0, 1].map((i) => (
                  <div key={`sup-sk-${i}`} className={styles.settingsSkMobileMenuItem}>
                    <span className={`${styles.settingsSkBar} ${styles.settingsSkMobileMenuIcon}`} />
                    <span className={`${styles.settingsSkBar} ${styles.settingsSkMobileMenuLabel}`} />
                    {i === 0 ? (
                      <span className={`${styles.settingsSkBar} ${styles.settingsSkMobileMenuArrow}`} />
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.page} data-portal-profile-hub>

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
                    <span className={styles.mobileMenuLabel}>Account</span>
                    <MobileMenuArrow />
                  </button>
                  <button
                    type="button"
                    className={styles.mobileMenuItem}
                    onClick={onOpenPasswordSheet}
                  >
                    <span className={styles.mobileMenuIcon}><LuPencil /></span>
                    <span className={styles.mobileMenuLabel}>Password</span>
                    <MobileMenuArrow />
                  </button>
                  <Link href="/admin/settings/notifications" className={styles.mobileMenuItem}>
                    <span className={styles.mobileMenuIcon}><TbBell /></span>
                    <span className={styles.mobileMenuLabel}>Notification</span>
                    <MobileMenuArrow />
                  </Link>
                  <Link href="/admin/settings/billing" className={styles.mobileMenuItem}>
                    <span className={styles.mobileMenuIcon}><TbCreditCard /></span>
                    <span className={styles.mobileMenuLabel}>Billing</span>
                    <MobileMenuArrow />
                  </Link>
                  <Link href="/admin/settings/site-content" className={styles.mobileMenuItem}>
                    <span className={styles.mobileMenuIcon}><HiOutlineNewspaper /></span>
                    <span className={styles.mobileMenuLabel}>Site content</span>
                    <MobileMenuArrow />
                  </Link>
                </div>
              </div>

              <div className={styles.mobileSection}>
                <p className={styles.mobileSectionLabel}>Support</p>
                <div className={styles.mobileMenuGroup}>
                  <Link href="/admin/help" className={styles.mobileMenuItem}>
                    <span className={styles.mobileMenuIcon}><TbMessage2Question /></span>
                    <span className={styles.mobileMenuLabel}>Help Center</span>
                    <MobileMenuArrow />
                  </Link>
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
        activeAccountSheet={isEditingPersonal}
        passwordSheetOpen={showPasswordSheet}
        onAccountTab={onStartPersonalEdit}
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
                          onClick={openRemoveAvatarConfirm}
                          disabled={avatarLoading}
                          style={{ fontSize: '11px' }}
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  )}
                  <input
                    type="file"
                    accept={AVATAR_ALLOWED_TYPES.join(',')}
                    className={styles.fileInput}
                    onChange={onPickAvatar}
                    tabIndex={-1}
                    aria-hidden="true"
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
                Account
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
                    onClick={openRemoveAvatarConfirm}
                    disabled={avatarLoading}
                  >
                    Remove
                  </button>
                )}
                <span className={styles.sheetAvatarHint}>
                  PNG, JPG, or WEBP ? Max {AVATAR_MAX_MB}MB
                </span>
                <input
                  ref={fileRef}
                  type="file"
                  accept={AVATAR_ALLOWED_TYPES.join(',')}
                  className={styles.fileInput}
                  onChange={onPickAvatar}
                />
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
          <div
            className={styles.bottomSheetBackdrop}
            onClick={() => !passwordSaving && onClosePasswordSheet()}
          />
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
                disabled={passwordSaving}
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
                disabled={passwordSaving}
                aria-busy={passwordSaving}
              >
                {passwordSaving ? 'SavingG?' : 'Save'}
              </button>
            </div>

            <div className={styles.bottomSheetBody}>
              <form
                id={passwordSheetFormId}
                onSubmit={handlePasswordSubmit}
                className={styles.form}
                aria-busy={passwordSaving}
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
                      disabled={passwordSaving}
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
                      disabled={passwordSaving}
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
                      disabled={passwordSaving}
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

      <ConfirmModal
        open={removeAvatarConfirmOpen}
        variant="danger"
        title="Remove profile avatar?"
        message="Your profile photo will be cleared from storage and no longer shown in admin. You can upload a new photo anytime."
        confirmLabel="Remove"
        confirmLoadingLabel="Removing..."
        cancelLabel="Cancel"
        loading={avatarLoading}
        subtitleAlign="left"
        onCancel={() => {
          if (avatarLoading) return
          setRemoveAvatarConfirmOpen(false)
        }}
        onConfirm={async () => {
          try {
            await executeRemoveAvatar()
          } finally {
            setRemoveAvatarConfirmOpen(false)
          }
        }}
      />
    </div>
  )
}
