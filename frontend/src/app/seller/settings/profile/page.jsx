'use client'

import { Suspense, useEffect, useState } from 'react'
import Image from 'next/image'
import { useRouter, useSearchParams } from 'next/navigation'
import { FaUser, FaUpload } from 'react-icons/fa6'
import { TbCamera, TbTrash } from 'react-icons/tb'
import { FiEdit, FiSave } from 'react-icons/fi'
import { ALLOWED, MAX_MB, useSellerSettings } from '@/features/seller/settings/sellerSettings'
import SellerLinkDeviceModal from '@/features/seller/settings/SellerLinkDeviceModal'
import SellerSignedInDevices from '@/features/seller/settings/SellerSignedInDevices'
import { clearSellerLinkDeviceScanTarget } from '@/lib/auth/sellerLinkDeviceState'
import styles from '../settings.module.css'

function ProfilePageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [linkDeviceOpen, setLinkDeviceOpen] = useState(false)
  const [linkDeviceInitialTarget, setLinkDeviceInitialTarget] = useState(null)

  useEffect(() => {
    if (searchParams.get('linkDevice') !== '1') return

    const challengeId = searchParams.get('challenge')?.trim() || ''
    const approveToken = searchParams.get('token')?.trim() || ''
    if (challengeId && approveToken) {
      setLinkDeviceInitialTarget({ challengeId, approveToken })
    }

    setLinkDeviceOpen(true)
    router.replace('/seller/settings/profile', { scroll: false })
  }, [router, searchParams])

  const openLinkDeviceModal = () => {
    clearSellerLinkDeviceScanTarget()
    setLinkDeviceInitialTarget(null)
    setLinkDeviceOpen(true)
  }

  const closeLinkDeviceModal = () => {
    clearSellerLinkDeviceScanTarget()
    setLinkDeviceInitialTarget(null)
    setLinkDeviceOpen(false)
  }

  const ctx = useSellerSettings()
  const {
    profileTabId,
    profilePanelId,
    isEditingPersonal,
    onCancelPersonalEdit,
    onClickEditSavePersonal,
    avatarLoading,
    shownAvatar,
    shownAvatarIsBlob,
    avatarModalOpen,
    setAvatarModalOpen,
    fileRef,
    onPickAvatar,
    onRemoveAvatar,
    draftName,
    setDraftName,
    draftEmail,
    setDraftEmail,
    id,
    authIdentities,
    linkedProviders,
    canUnlinkIdentity,
    identityBusy,
    handleUnlinkIdentity,
    handleLinkProvider,
  } = ctx

  return (
                  <section
            id={profilePanelId}
            role="tabpanel"
            aria-labelledby={profileTabId}
            className={`${styles.card} ${styles.full}`}
          >
            <div className={styles.tabDetailHead}>
              <div className={styles.tabDetailHeadRow}>
                <div className={styles.tabDetailHeadText}>
                  <h2 className={styles.tabDetailTitle}>Manage Profile</h2>
                  <p className={styles.tabDetailSubtitle}>
                    View and update your name, email, and profile photo.
                  </p>
                </div>
                <div className={styles.headActions}>
                  {isEditingPersonal && (
                    <button
                      type="button"
                      className={styles.secondaryBtn}
                      onClick={onCancelPersonalEdit}
                      disabled={avatarLoading}
                    >
                      Cancel
                    </button>
                  )}
                  <button
                    type="button"
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
            </div>

            <div className={styles.profileDetails}>
              <div className={styles.settingsRow}>
                <div className={styles.settingsRowMeta}>
                  <div className={styles.settingsRowTitleRow}>
                    <p className={styles.settingsRowTitle}>Avatar</p>
                  </div>
                  <p className={styles.settingsRowDesc}>
                    PNG, JPG, or WEBP · Max {MAX_MB}MB. Tap the photo while editing to change or remove it.
                  </p>
                </div>
                <div className={`${styles.settingsRowControl} ${styles.profileControl}`}>
                  <div className={styles.profilePhotoControl}>
                    <button
                      type="button"
                      className={styles.avatarButton}
                      onClick={() => isEditingPersonal && setAvatarModalOpen(true)}
                      disabled={!isEditingPersonal || avatarLoading}
                      aria-label="Open photo options"
                    >
                      <div className={`${styles.avatar} ${styles.avatarSettings}`}>
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
                        <span className={styles.avatarEditIcon}>
                          <TbCamera />
                        </span>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              <div className={styles.settingsRow}>
                <div className={styles.settingsRowMeta}>
                  <div className={styles.settingsRowTitleRow}>
                    <p className={styles.settingsRowTitle}>Name</p>
                  </div>
                </div>
                <div className={`${styles.settingsRowControl} ${styles.profileControl}`}>
                  <input
                    id={id('name')}
                    value={draftName}
                    onChange={(e) => setDraftName(e.target.value)}
                    className={`${styles.input} ${!isEditingPersonal ? styles.inputReadOnly : ''}`}
                    disabled={!isEditingPersonal}
                    placeholder="Your full name"
                    aria-label="Name"
                  />
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
                    type="email"
                    value={draftEmail}
                    onChange={(e) => setDraftEmail(e.target.value)}
                    className={`${styles.input} ${!isEditingPersonal ? styles.inputReadOnly : ''}`}
                    disabled={!isEditingPersonal}
                    aria-label="Email"
                  />
                </div>
              </div>

              <div className={styles.settingsRow}>
                <div className={styles.settingsRowMeta}>
                  <div className={styles.settingsRowTitleRow}>
                    <p className={styles.settingsRowTitle}>Linked sign-in methods</p>
                  </div>
                  <p className={styles.settingsRowDesc}>
                    Link Google or Facebook. Keep at least one sign-in method.
                  </p>
                </div>
                <div className={`${styles.settingsRowControl} ${styles.profileControl}`}>
                  <div className={styles.identityList}>
                    {authIdentities.length === 0 ? (
                      <p className={styles.settingsRowDesc}>No linked sign-in methods found.</p>
                    ) : (
                      authIdentities.map((identity) => {
                        const provider = String(identity?.provider || identity?.identity_provider || 'account')
                        return (
                          <div key={identity.identity_id || provider} className={styles.identityRow}>
                            <span className={styles.identityProvider}>{provider}</span>
                            {provider !== 'email' ? (
                              <button
                                type="button"
                                className={styles.identityActionLink}
                                onClick={() => handleUnlinkIdentity(identity)}
                                disabled={!canUnlinkIdentity(identity) || identityBusy === provider}
                              >
                                {identityBusy === provider ? 'Working…' : 'Unlink'}
                              </button>
                            ) : (
                              <span className={styles.identityBadge}>Primary</span>
                            )}
                          </div>
                        )
                      })
                    )}
                  </div>
                  <div className={styles.identityActions}>
                    {!linkedProviders.has('google') ? (
                      <button
                        type="button"
                        className={styles.identityActionLink}
                        onClick={() => handleLinkProvider('google')}
                        disabled={identityBusy === 'google'}
                      >
                        {identityBusy === 'google' ? 'Redirecting…' : 'Link Google'}
                      </button>
                    ) : null}
                    {!linkedProviders.has('facebook') ? (
                      <button
                        type="button"
                        className={styles.identityActionLink}
                        onClick={() => handleLinkProvider('facebook')}
                        disabled={identityBusy === 'facebook'}
                      >
                        {identityBusy === 'facebook' ? 'Redirecting…' : 'Link Facebook'}
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>

              <SellerSignedInDevices />

              <div className={styles.settingsRow}>
                <div className={styles.settingsRowMeta}>
                  <div className={styles.settingsRowTitleRow}>
                    <p className={styles.settingsRowTitle}>Link device</p>
                  </div>
                  <p className={styles.settingsRowDesc}>
                    Approve sign-in on another browser by scanning its QR code from this one. Both browsers can stay signed in.
                  </p>
                </div>
                <div className={`${styles.settingsRowControl} ${styles.profileControl}`}>
                  <button
                    type="button"
                    className={`${styles.primaryBtn} ${styles.linkDeviceBtn}`}
                    onClick={openLinkDeviceModal}
                  >
                    Link device
                  </button>
                </div>
              </div>
            </div>

            <SellerLinkDeviceModal
              open={linkDeviceOpen}
              initialScanTarget={linkDeviceInitialTarget}
              onClose={closeLinkDeviceModal}
            />

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
          </section>
  )
}

export default function Page() {
  return (
    <Suspense fallback={null}>
      <ProfilePageContent />
    </Suspense>
  )
}
