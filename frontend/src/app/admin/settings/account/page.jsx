'use client'

import { AVATAR_ALLOWED_TYPES, shouldUseUnoptimizedAvatarSrc } from '@/shared/utils'
import Image from 'next/image'
import { FaUser } from 'react-icons/fa6'
import { FiUpload } from 'react-icons/fi'
import { MdCheckCircle, MdErrorOutline } from 'react-icons/md'
import { supabase } from '@/lib/supabase/client'
import { useAuthToast } from '@/contexts/ToastContext'
import { useAdminPersonalProfile } from '@/features/admin/settings/adminProfile'
import ConfirmModal from '@/components/ui/Modal/ConfirmModal'
import { useMediaQuery } from '@/shared/hooks'
import styles from '../settings.module.css'

export default function Page() {
  const isProfileDetail = useMediaQuery('(max-width: 640px)')
  const idPrefix = 'admin'
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

  const shownAvatar = avatarPreview || profile?.avatarUrl || ''
  const shownAvatarIsBlob = shouldUseUnoptimizedAvatarSrc(shownAvatar)
  const id = (name) => `${idPrefix}_${name}`

  if (loading) {
    return (
      <section className={`${styles.card} ${styles.full} ${isProfileDetail ? styles.cardBorderless : ''}`}>
        <div className={styles.settingsSkCardHead}>
          <span className={`${styles.settingsSkBar} ${styles.settingsSkTitle}`} />
          <span className={`${styles.settingsSkBar} ${styles.settingsSkSubtitle}`} />
        </div>
      </section>
    )
  }

  return (
    <>
      <section className={`${styles.card} ${styles.full} ${isProfileDetail ? styles.cardBorderless : ''}`}>
        <div className={styles.tabDetailHead}>
            <div className={styles.tabDetailHeadRow}>
              <div className={styles.tabDetailHeadText}>
                <h2 className={styles.tabDetailTitle}>Account</h2>
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
                    <div className={styles.avatarFallback}>
                      <FaUser />
                    </div>
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
                  ref={fileRef}
                  type="file"
                  accept={AVATAR_ALLOWED_TYPES.join(',')}
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
              <div className={styles.nameFieldsRow}>
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
              <p className={styles.settingsRowDesc}>Optional mobile number for SMS contact.</p>
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
          <div className={styles.msgError}>
            <MdErrorOutline /> {personalError}
          </div>
        )}
        {isEditingPersonal && personalStatus && (
          <div className={styles.msgOk}>
            <MdCheckCircle /> {personalStatus}
          </div>
        )}
      </section>

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
    </>
  )
}
