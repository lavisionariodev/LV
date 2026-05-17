'use client'

import { resolveStoredAvatar, shouldUseUnoptimizedAvatarSrc } from '@/shared/utils'
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import styles from '@/app/seller/settings/settings.module.css'
import productSelectStyles from '@/app/seller/products/products.module.css'
import { supabase } from '@/lib/supabase/client'
import { changePasswordWithReauth } from '@/lib/auth/changePassword'
import { getOAuthRedirectUrl, linkOAuthIdentity, unlinkOAuthIdentity } from '@/lib/auth/client'
import {
  defaultBucketChannels,
  mergeSellerNotificationPreferences,
  NOTIFICATION_PREFERENCE_CHANNELS,
  SELLER_NOTIFICATION_BUCKETS,
} from '@/lib/notifications/preferenceSchema'
import {
  fetchSellerNotificationPreferences,
  saveSellerNotificationPreferences,
} from '@/lib/notifications/preferencesClient'
import { NotificationPrefSwitch } from '@/lib/notifications/NotificationPrefSwitch'
import { useNotificationPreferences } from '@/lib/notifications/useNotificationPreferences'
import {
  SELLER_BUSINESS_TYPE_OTHER,
  SELLER_BUSINESS_TYPE_PRESETS,
  businessTypeLabelToFormState,
  getSellerByUserId,
  validateSellerBusinessTypeForm,
  validateSellerShopUsername,
  validateSellerSpecialtiesInput,
  validateSellerTagline,
} from '@/lib/sellers/client'
import { normalizeSellerSocialLinks, validateSellerSocialLinks } from '@/lib/sellers/socialLinks'
import { useMediaQuery } from '@/shared/hooks'

async function fetchCurrentSellerProfile() {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    throw new Error('Not authenticated.')
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, email, avatar_url')
    .eq('id', user.id)
    .single()

  if (error) {
    throw error
  }

  const { avatarPath, avatarUrl } = resolveStoredAvatar(supabase, data.avatar_url)

  return {
    id: data.id,
    fullName: data.full_name || '',
    email: data.email || '',
    avatarPath,
    avatarUrl,
  }
}

const PAYOUT_METHOD_OPTIONS = [
  { value: 'bank', label: 'Bank transfer' },
  { value: 'gcash', label: 'GCash' },
  { value: 'manual', label: 'Manual / other' },
]

const DOCUMENT_TYPE_OPTIONS = [
  { value: 'business_permit', label: 'Business permit' },
  { value: 'valid_id', label: 'Valid ID' },
  { value: 'bank_proof', label: 'Bank proof' },
  { value: 'other', label: 'Other' },
]

const SHOP_BUSINESS_TYPE_OPTIONS = [
  { value: '', label: 'Not set (optional)' },
  ...SELLER_BUSINESS_TYPE_PRESETS.map((label) => ({ value: label, label })),
  { value: SELLER_BUSINESS_TYPE_OTHER, label: 'Others, please specify' },
]

function asPortalSelectValue(value) {
  if (value == null) return ''
  return String(value)
}

function SellerPortalSelect({
  label,
  value,
  options,
  onChange,
  placeholder = 'Select',
  disabled = false,
  className = '',
}) {
  const isNarrow = useMediaQuery('(max-width: 640px)')
  const [sheetOpen, setSheetOpen] = useState(false)
  const [desktopOpen, setDesktopOpen] = useState(false)
  const desktopDropdownRef = useRef(null)
  const rawValue = asPortalSelectValue(value)
  const opts = Array.isArray(options) ? options : []

  useEffect(() => {
    if (!sheetOpen) return
    const onKey = (event) => {
      if (event.key === 'Escape') setSheetOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [sheetOpen])

  useEffect(() => {
    if (!desktopOpen || isNarrow) return
    const handleClickOutside = (event) => {
      if (desktopDropdownRef.current && !desktopDropdownRef.current.contains(event.target)) {
        setDesktopOpen(false)
      }
    }
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [desktopOpen, isNarrow])

  useEffect(() => {
    if (!sheetOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [sheetOpen])

  const selectedLabel = opts.find((option) => option.value === rawValue)?.label || placeholder

  const handleSelect = (nextValue) => {
    if (disabled) return
    onChange(nextValue)
    setDesktopOpen(false)
    setSheetOpen(false)
  }

  if (!isNarrow) {
    return (
      <div
        className={`${productSelectStyles.filterDropdownWrap} ${productSelectStyles.modalDropdownWrap} ${
          desktopOpen ? productSelectStyles.filterDropdownOpen : ''
        } ${className}`.trim()}
        ref={desktopDropdownRef}
      >
        <button
          type="button"
          className={productSelectStyles.filterDropdownTrigger}
          onClick={() => {
            if (disabled) return
            setDesktopOpen((prev) => !prev)
          }}
          aria-haspopup="listbox"
          aria-expanded={desktopOpen}
          aria-label={label}
          disabled={disabled}
        >
          <span className={productSelectStyles.filterDropdownLabel}>{selectedLabel}</span>
          <span className={productSelectStyles.filterDropdownChevron} aria-hidden>
            ▾
          </span>
        </button>
        {desktopOpen && !disabled ? (
          <div className={productSelectStyles.filterDropdownPanel} role="listbox" aria-label={`${label} options`}>
            {opts.map((option) => (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={rawValue === option.value}
                className={`${productSelectStyles.filterDropdownOption} ${
                  rawValue === option.value ? productSelectStyles.filterDropdownOptionSelected : ''
                }`}
                onClick={() => handleSelect(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
        ) : null}
      </div>
    )
  }

  const sheet = sheetOpen ? (
    <div className={productSelectStyles.listingFormSelectSheetRoot}>
      <button
        type="button"
        className={productSelectStyles.listingFormSelectSheetBackdrop}
        onClick={() => setSheetOpen(false)}
        tabIndex={-1}
        aria-label="Dismiss"
      />
      <div
        className={productSelectStyles.listingFormSelectSheet}
        role="dialog"
        aria-modal="true"
        aria-label={label}
      >
        <div className={productSelectStyles.listingFormSelectSheetHeader}>
          <span className={productSelectStyles.listingFormSelectSheetTitle}>{label}</span>
          <button
            type="button"
            className={productSelectStyles.listingFormSelectSheetClose}
            onClick={() => setSheetOpen(false)}
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <div className={productSelectStyles.listingFormSelectSheetList} role="listbox">
          {opts.map((option) => (
            <button
              key={option.value}
              type="button"
              role="option"
              aria-selected={rawValue === option.value}
              className={`${productSelectStyles.listingFormSelectSheetRow} ${
                rawValue === option.value ? productSelectStyles.listingFormSelectSheetRowActive : ''
              }`}
              onClick={() => handleSelect(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  ) : null

  return (
    <>
      <button
        type="button"
        className={`${productSelectStyles.listingFormSelect} ${productSelectStyles.listingFormSelectTrigger} ${className}`.trim()}
        onClick={() => {
          if (disabled) return
          setSheetOpen(true)
        }}
        aria-haspopup="listbox"
        aria-expanded={sheetOpen}
        aria-label={label}
        disabled={disabled}
      >
        <span className={productSelectStyles.listingFormSelectTriggerLabel}>{selectedLabel}</span>
        <span className={productSelectStyles.listingFormSelectTriggerCaret} aria-hidden>
          ▾
        </span>
      </button>
      {typeof document !== 'undefined' && sheet ? createPortal(sheet, document.body) : null}
    </>
  )
}

function mapSellerToShopForm(sellerRow, profile, sessionEmail) {
  const bizType = businessTypeLabelToFormState(sellerRow?.business_type_label)
  const socials = normalizeSellerSocialLinks(sellerRow?.social_links ?? {})
  return {
    businessName: sellerRow?.business_name ?? '',
    shopUsername: sellerRow?.username ?? '',
    shopTagline: sellerRow?.tagline ?? '',
    shopBusinessTypeChoice: bizType.choice,
    shopBusinessTypeOtherSpecify: bizType.otherSpecify,
    contactName: sellerRow?.contact_name ?? profile?.fullName ?? '',
    email: sellerRow?.email ?? profile?.email ?? sessionEmail ?? '',
    phone: sellerRow?.phone ?? '',
    businessInfo: sellerRow?.business_info ?? '',
    shopSpecialties: Array.isArray(sellerRow?.specialties)
      ? sellerRow.specialties.map((x) => String(x)).filter(Boolean).join('\n')
      : '',
    address: sellerRow?.address ?? '',
    businessStartedAt: sellerRow?.business_started_at
      ? String(sellerRow.business_started_at).slice(0, 10)
      : '',
    shopTurnaround: typeof sellerRow?.turnaround === 'string' ? sellerRow.turnaround : '',
    socialPhoneEnabled: Boolean(socials.phone),
    socialPhone: socials.phone,
    socialWhatsappEnabled: Boolean(socials.whatsapp),
    socialWhatsapp: socials.whatsapp,
    socialEmailEnabled: Boolean(socials.email),
    socialEmail: socials.email,
    socialFacebookEnabled: Boolean(socials.facebook),
    socialFacebook: socials.facebook,
    socialMessengerEnabled: Boolean(socials.messenger),
    socialMessenger: socials.messenger,
  }
}

function validateShopForm(form) {
  if (!form.businessName.trim()) return 'Please enter your business or shop name.'
  const uErr = validateSellerShopUsername(form.shopUsername)
  if (uErr) return uErr
  const tagErr = validateSellerTagline(form.shopTagline)
  if (tagErr) return tagErr
  const bizTypeErr = validateSellerBusinessTypeForm(
    form.shopBusinessTypeChoice,
    form.shopBusinessTypeOtherSpecify,
  )
  if (bizTypeErr) return bizTypeErr
  const specErr = validateSellerSpecialtiesInput(form.shopSpecialties ?? '')
  if (specErr) return specErr
  if (!form.contactName.trim()) return 'Please enter the primary contact person.'
  if (!form.email.trim()) return 'Please enter a business email.'
  if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) return 'Please enter a valid email format.'
  if (!form.businessStartedAt?.trim()) return 'Please select when your business began operations.'

  const turn = String(form.shopTurnaround ?? '').trim()
  if (turn.length > 160) return 'Typical response time must be 160 characters or fewer.'

  const socialLinks = normalizeSellerSocialLinks({
    phone: form.socialPhoneEnabled ? form.socialPhone : '',
    whatsapp: form.socialWhatsappEnabled ? form.socialWhatsapp : '',
    email: form.socialEmailEnabled ? form.socialEmail : '',
    facebook: form.socialFacebookEnabled ? form.socialFacebook : '',
    messenger: form.socialMessengerEnabled ? form.socialMessenger : '',
  })
  const socialErrs = validateSellerSocialLinks(socialLinks)
  if (Object.keys(socialErrs).length > 0) {
    return Object.values(socialErrs)[0] || 'Please check your social links.'
  }

  return ''
}

function inferSellerCanChangePassword(user) {
  // Heuristic based on common Supabase GoTrue user fields. If we can't detect
  // the provider reliably, fail-open to avoid blocking legitimate local users.
  if (!user) return false

  const meta = user.app_metadata || {}
  const userMeta = user.user_metadata || {}

  const providers = new Set()
  if (typeof meta.provider === 'string') providers.add(meta.provider)
  if (Array.isArray(meta.providers)) {
    meta.providers.forEach((p) => {
      if (typeof p === 'string') providers.add(p)
      else if (p && typeof p.provider === 'string') providers.add(p.provider)
    })
  }
  if (typeof userMeta.provider === 'string') providers.add(userMeta.provider)

  // Some Supabase identity payloads include identities on the user object.
  if (Array.isArray(user.identities)) {
    user.identities.forEach((id) => {
      const p = id?.provider || id?.identity_provider
      if (typeof p === 'string') providers.add(p)
    })
  }

  if (providers.size === 0) return true

  const lowered = Array.from(providers).map((p) => String(p).toLowerCase())

  // Supabase users can have multiple identities (e.g. email/password + linked Google).
  // If *any* email/password identity exists, they must be able to use “change password”.
  // This check MUST run before OAuth-only rejection, or linked Google hides the tab wrongly.
  if (lowered.some((p) => p === 'email' || p === 'password')) return true

  // OAuth-only sellers (no local email/password identity) should not see “change password”.
  if (lowered.some((p) => p.includes('google'))) return false
  if (lowered.some((p) => p.includes('facebook'))) return false

  // If we see some other provider and still can't confirm local credentials,
  // err on the side of hiding.
  return lowered.some((p) =>
    ['google', 'facebook', 'github', 'twitter', 'apple', 'oidc', 'saml'].some((x) => p.includes(x)),
  )
    ? false
    : true
}

/** Lines for the specialties list UI (newline-separated in `shopForm.shopSpecialties`). */
function specialtiesFormStringToLines(s) {
  const raw = String(s ?? '')
  if (!raw) return []
  return raw.split('\n')
}

function shopStatusPillClass(status) {
  if (status === 'active') return styles.statusPillActive
  if (status === 'pending') return styles.statusPillPending
  if (status === 'suspended') return styles.statusPillSuspended
  return ''
}

const MAX_MB = 2
const ALLOWED = ['image/jpeg', 'image/png', 'image/webp']
const DOC_ALLOWED = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp']

const EMPTY_PAYOUT_FORM = {
  payoutMethod: 'bank',
  accountHolderName: '',
  bankName: '',
  accountNumber: '',
  gcashName: '',
  gcashNumber: '',
  payoutEmail: '',
  notes: '',
}

function SellerSettingsSkeletonHead({ showAction = false }) {
  return (
    <div className={styles.tabDetailHead} aria-hidden>
      <div className={styles.tabDetailHeadRow}>
        <div className={styles.tabDetailHeadText}>
          <span className={`${styles.settingsSkBar} ${styles.settingsSkHeadTitle}`} />
          <span className={`${styles.settingsSkBar} ${styles.settingsSkHeadSub}`} />
        </div>
        {showAction ? <span className={`${styles.settingsSkBar} ${styles.settingsSkHeadAction}`} /> : null}
      </div>
    </div>
  )
}

function SellerSettingsSkeletonField({ className = '' }) {
  return <span className={`${styles.settingsSkBar} ${styles.settingsSkField} ${className}`.trim()} />
}

function SellerSettingsSkeletonSettingsRow({ withDesc = false }) {
  return (
    <div className={styles.settingsSkSettingsRow}>
      <div className={styles.settingsSkRowMeta}>
        <span className={`${styles.settingsSkBar} ${styles.settingsSkRowTitle}`} />
        {withDesc ? <span className={`${styles.settingsSkBar} ${styles.settingsSkRowDesc}`} /> : null}
      </div>
      <SellerSettingsSkeletonField className={styles.settingsSkFieldFlush} />
    </div>
  )
}

function SellerSettingsProfileSkeleton() {
  return (
    <>
      <SellerSettingsSkeletonHead showAction />
      <div className={styles.profileDetails}>
        <div className={styles.settingsSkSettingsRow}>
          <div className={styles.settingsSkRowMeta}>
            <span className={`${styles.settingsSkBar} ${styles.settingsSkRowTitle}`} />
            <span className={`${styles.settingsSkBar} ${styles.settingsSkRowDesc}`} />
          </div>
          <div className={styles.settingsSkProfileRow}>
            <span className={`${styles.settingsSkBar} ${styles.settingsSkAvatar}`} />
          </div>
        </div>
        <SellerSettingsSkeletonSettingsRow />
        <SellerSettingsSkeletonSettingsRow withDesc />
        <div className={styles.settingsSkSettingsRow}>
          <div className={styles.settingsSkRowMeta}>
            <span className={`${styles.settingsSkBar} ${styles.settingsSkRowTitle}`} />
            <span className={`${styles.settingsSkBar} ${styles.settingsSkRowDesc}`} />
          </div>
          <div className={styles.settingsSkIdentityStack}>
            <span className={`${styles.settingsSkBar} ${styles.settingsSkIdentityRow}`} />
            <span className={`${styles.settingsSkBar} ${styles.settingsSkIdentityRow}`} />
          </div>
        </div>
      </div>
    </>
  )
}

function SellerSettingsPasswordSkeleton() {
  return (
    <>
      <SellerSettingsSkeletonHead showAction />
      <div className={styles.settingsSkPassGrid}>
        <SellerSettingsSkeletonField className={styles.settingsSkFieldFlush} />
        <SellerSettingsSkeletonField className={styles.settingsSkFieldFlush} />
        <SellerSettingsSkeletonField className={styles.settingsSkFieldFlush} />
      </div>
    </>
  )
}

function SellerSettingsShopSkeleton() {
  return (
    <>
      <SellerSettingsSkeletonHead showAction />
      <div className={styles.settingsSkSubTabBar}>
        {[0, 1, 2, 3].map((index) => (
          <span key={index} className={`${styles.settingsSkBar} ${styles.settingsSkSubTab}`} />
        ))}
      </div>
      <div className={styles.settingsSkCardBlock}>
        <span className={`${styles.settingsSkBar} ${styles.settingsSkCardTitle}`} />
        <div className={styles.settingsSkFieldGrid}>
          <SellerSettingsSkeletonField className={styles.settingsSkFieldFlush} />
          <SellerSettingsSkeletonField className={styles.settingsSkFieldFlush} />
          <SellerSettingsSkeletonField className={styles.settingsSkFieldFlush} />
        </div>
      </div>
      <div className={styles.settingsSkCardBlock}>
        <span className={`${styles.settingsSkBar} ${styles.settingsSkCardTitle}`} />
        <div className={styles.settingsSkTwoCol}>
          <SellerSettingsSkeletonField className={styles.settingsSkFieldFlush} />
          <SellerSettingsSkeletonField className={styles.settingsSkFieldFlush} />
        </div>
        <SellerSettingsSkeletonField />
      </div>
    </>
  )
}

function SellerSettingsPayoutsSkeleton() {
  return (
    <>
      <SellerSettingsSkeletonHead />
      <div className={styles.settingsSkFormStack}>
        <div className={styles.settingsSkTwoCol}>
          <SellerSettingsSkeletonField className={styles.settingsSkFieldFlush} />
          <SellerSettingsSkeletonField className={styles.settingsSkFieldFlush} />
        </div>
        <SellerSettingsSkeletonField className={styles.settingsSkFieldFlush} />
        <SellerSettingsSkeletonField className={styles.settingsSkFieldFlush} />
        <span className={`${styles.settingsSkBar} ${styles.settingsSkFieldTall}`} />
        <span className={`${styles.settingsSkBar} ${styles.settingsSkPrimaryBtn}`} />
      </div>
      <div className={styles.settingsSkEmbeddedCard}>
        <div className={styles.settingsSkEmbeddedHead}>
          <span className={`${styles.settingsSkBar} ${styles.settingsSkEmbeddedTitle}`} />
          <span className={`${styles.settingsSkBar} ${styles.settingsSkEmbeddedButton}`} />
        </div>
        <span className={`${styles.settingsSkBar} ${styles.settingsSkListRow}`} />
        <span className={`${styles.settingsSkBar} ${styles.settingsSkListRow}`} />
      </div>
    </>
  )
}

function SellerSettingsDocumentsSkeleton() {
  return (
    <>
      <SellerSettingsSkeletonHead />
      <div className={styles.settingsSkFormStack}>
        <SellerSettingsSkeletonField className={styles.settingsSkFieldFlush} />
        <SellerSettingsSkeletonField className={styles.settingsSkFieldFlush} />
        <span className={`${styles.settingsSkBar} ${styles.settingsSkPrimaryBtn}`} />
      </div>
      <div className={styles.settingsSkListStack}>
        <span className={`${styles.settingsSkBar} ${styles.settingsSkListRow}`} />
        <span className={`${styles.settingsSkBar} ${styles.settingsSkListRow}`} />
      </div>
    </>
  )
}

function SellerSettingsNotificationsSkeleton() {
  return (
    <>
      <SellerSettingsSkeletonHead />
      <span className={`${styles.settingsSkBar} ${styles.settingsSkDisclaimer}`} />
      <div className={styles.settingsSkPrefStack}>
        {[0, 1, 2].map((index) => (
          <div key={index} className={styles.settingsSkPrefRow}>
            <div className={styles.settingsSkPrefMeta}>
              <span className={`${styles.settingsSkBar} ${styles.settingsSkRowTitle}`} />
              <span className={`${styles.settingsSkBar} ${styles.settingsSkRowDesc}`} />
            </div>
            <span className={`${styles.settingsSkBar} ${styles.settingsSkSwitch}`} />
          </div>
        ))}
      </div>
    </>
  )
}

function SellerSettingsPanelSkeleton({ variant = 'profile' }) {
  switch (variant) {
    case 'password':
      return <SellerSettingsPasswordSkeleton />
    case 'shop-information':
      return <SellerSettingsShopSkeleton />
    case 'payouts':
      return <SellerSettingsPayoutsSkeleton />
    case 'documents':
      return <SellerSettingsDocumentsSkeleton />
    case 'notifications':
      return <SellerSettingsNotificationsSkeleton />
    case 'profile':
    default:
      return <SellerSettingsProfileSkeleton />
  }
}

const CATEGORIES = [
  {
    key: 'order',
    title: 'Orders & bookings',
    description: 'Confirmations, service progress, and booking updates.',
  },
  {
    key: 'payment',
    title: 'Payments & refunds',
    description: 'Paid bookings, refunds, and payout-related notices.',
  },
  {
    key: 'listing',
    title: 'Listings & approvals',
    description: 'Listing submissions, approvals, and review outcomes.',
  },
  {
    key: 'alert',
    title: 'Alerts & disputes',
    description: 'Urgent booking issues, disputes, and operational alerts.',
  },
  {
    key: 'system',
    title: 'System & account',
    description: 'Platform updates, account notices, and support replies.',
  },
]

function defaultPrefs() {
  const out = {}
  for (const key of SELLER_NOTIFICATION_BUCKETS) {
    out[key] = defaultBucketChannels()
  }
  return out
}

function SellerNotificationPreferencesPanel() {
  const { prefs, loading, saveError, toggleChannel } = useNotificationPreferences({
    fetchPreferences: fetchSellerNotificationPreferences,
    savePreferences: saveSellerNotificationPreferences,
    mergePreferences: mergeSellerNotificationPreferences,
    defaultPreferences: defaultPrefs,
    debounceMs: 450,
    loadErrorMessage: 'Failed to load notification preferences.',
    saveErrorMessage: 'Failed to save notification preferences.',
  })

  return (
    <div className={styles.notifPrefPanel}>
      <p className={styles.tabDetailSubtitle}>
        Choose which seller alerts can reach you in-app or by email. Open your{' '}
        <Link href="/seller/notifications" className={styles.inlineLink}>
          notification inbox
        </Link>{' '}
        to review recent activity.
      </p>
      {loading ? <p className={styles.loadingText}>Loading notification preferences…</p> : null}
      {saveError ? <p className={styles.notifPrefError}>{saveError}</p> : null}
      <div className={styles.notifPrefList}>
        {CATEGORIES.map((category, index) => (
          <div
            key={category.key}
            className={`${styles.notifPrefRow} ${index > 0 ? styles.notifPrefRowBorder : ''}`}
          >
            <div className={styles.notifPrefMeta}>
              <p className={styles.notifPrefTitle} id={`seller-notif-pref-${category.key}`}>
                {category.title}
              </p>
              <p className={styles.notifPrefDesc}>{category.description}</p>
            </div>
            <div className={styles.notifPrefControls}>
              {NOTIFICATION_PREFERENCE_CHANNELS.map((channel) => (
                <div key={channel.id} className={styles.notifPrefChannel}>
                  <div className={styles.notifPrefChannelLabel}>
                    <span className={styles.notifPrefChannelName}>{channel.label}</span>
                    {channel.hint ? <span className={styles.notifPrefChannelHint}>{channel.hint}</span> : null}
                  </div>
                  <NotificationPrefSwitch
                    checked={Boolean(prefs[category.key]?.[channel.id])}
                    onToggle={(value) => toggleChannel(category.key, channel.id, value)}
                    disabled={loading}
                    labelledBy={`seller-notif-pref-${category.key}`}
                    styles={styles}
                  />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

const SellerSettingsContext = createContext(null)

export function useSellerSettings() {
  const ctx = useContext(SellerSettingsContext)
  if (!ctx) throw new Error('useSellerSettings must be used within SellerSettingsProvider')
  return ctx
}

export default function SellerSettingsProvider({ children }) {
  const fileRef = useRef(null)
  const coverFileRef = useRef(null)
  const avatarPreviewRef = useRef('')

  const [loading, setLoading] = useState(true)
  const [isEditingPersonal, setIsEditingPersonal] = useState(false)
  const [profile, setProfile] = useState(null)
  const [draftName, setDraftName] = useState('')
  const [draftEmail, setDraftEmail] = useState('')
  const [avatarPreview, setAvatarPreview] = useState('')
  const [avatarLoading, setAvatarLoading] = useState(false)

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isEditingPassword, setIsEditingPassword] = useState(false)
  const [passwordSaving, setPasswordSaving] = useState(false)
  const [sellerCanChangePassword, setSellerCanChangePassword] = useState(null)
  const [authIdentities, setAuthIdentities] = useState([])
  const [identityBusy, setIdentityBusy] = useState('')
  const [toast, setToast] = useState(null)
  const [avatarModalOpen, setAvatarModalOpen] = useState(false)

  const [seller, setSeller] = useState(null)
  const [sessionEmail, setSessionEmail] = useState('')
  const [shopForm, setShopForm] = useState(() => mapSellerToShopForm(null, null, ''))
  const [isEditingShop, setIsEditingShop] = useState(false)
  const [shopSaving, setShopSaving] = useState(false)
  const [coverLoading, setCoverLoading] = useState(false)
  const [shopSubTab, setShopSubTab] = useState('storefront')
  const documentFileRef = useRef(null)
  const [payoutForm, setPayoutForm] = useState(EMPTY_PAYOUT_FORM)
  const [payoutSaving, setPayoutSaving] = useState(false)
  const [documents, setDocuments] = useState([])
  const [documentType, setDocumentType] = useState('business_permit')
  const [documentUploading, setDocumentUploading] = useState(false)

    const notifyToast = useCallback((type, message) => {
    const msg = typeof message === 'string' ? message.trim() : String(message ?? '').trim()
    if (!msg) return
    setToast({ id: Date.now(), type, message: msg })
  }, [])

  const refreshAuthIdentities = useCallback(async () => {
    const { data: auth } = await supabase.auth.getUser()
    const user = auth?.user
    setAuthIdentities(Array.isArray(user?.identities) ? user.identities : [])
    setSellerCanChangePassword(inferSellerCanChangePassword(user))
  }, [])

  const linkedProviders = useMemo(() => {
    const set = new Set()
    authIdentities.forEach((identity) => {
      const provider = String(identity?.provider || identity?.identity_provider || '').toLowerCase()
      if (provider) set.add(provider)
    })
    return set
  }, [authIdentities])

  const canUnlinkIdentity = useCallback((identity) => {
    if (authIdentities.length <= 1) return false
    const remaining = authIdentities.filter((row) => row.identity_id !== identity.identity_id)
    if (remaining.length === 0) return false
    const hasPassword = remaining.some((row) => {
      const provider = String(row?.provider || row?.identity_provider || '').toLowerCase()
      return provider === 'email' || provider === 'password'
    })
    return hasPassword || remaining.length >= 1
  }, [authIdentities])

  const handleLinkProvider = async (provider) => {
    setIdentityBusy(provider)
    try {
      const redirectTo = getOAuthRedirectUrl({ redirectPath: '/seller/settings/profile', portal: 'seller' })
      const { error } = await linkOAuthIdentity({ provider, redirectTo })
      if (error) throw new Error(error)
    } catch (err) {
      notifyToast('error', err?.message || `Could not link ${provider}.`)
      setIdentityBusy('')
    }
  }

  const handleUnlinkIdentity = async (identity) => {
    if (!canUnlinkIdentity(identity)) {
      notifyToast('error', 'Keep a password or another sign-in method before unlinking this account.')
      return
    }
    const provider = String(identity?.provider || identity?.identity_provider || 'account')
    setIdentityBusy(provider)
    try {
      const { error } = await unlinkOAuthIdentity(identity)
      if (error) throw new Error(error)
      await refreshAuthIdentities()
      notifyToast('success', `${provider} unlinked.`)
    } catch (err) {
      notifyToast('error', err?.message || `Could not unlink ${provider}.`)
    } finally {
      setIdentityBusy('')
    }
  }

  useEffect(() => {
    let cancelled = false
    async function loadProfile() {
      setLoading(true)
      setToast(null)
      try {
        const data = await fetchCurrentSellerProfile()
        if (cancelled) return
        setProfile(data)
        setDraftName(data.fullName || '')
        setDraftEmail(data.email || '')
        const { data: auth } = await supabase.auth.getUser()
        const user = auth?.user
        const email = user?.email ?? ''
        if (cancelled) return
        setSellerCanChangePassword(inferSellerCanChangePassword(user))
        setAuthIdentities(Array.isArray(user?.identities) ? user.identities : [])
        setSessionEmail(email)
        const sellerRow = user?.id ? await getSellerByUserId(user.id) : null
        if (cancelled) return
        setSeller(sellerRow)
        setShopForm(mapSellerToShopForm(sellerRow, data, email))
        setIsEditingShop(false)
        const [payoutRes, docsRes] = await Promise.all([
          fetch('/api/seller/payout-settings', { cache: 'no-store' }),
          fetch('/api/seller/documents', { cache: 'no-store' }),
        ])
        const [payoutBody, docsBody] = await Promise.all([
          payoutRes.json().catch(() => null),
          docsRes.json().catch(() => null),
        ])
        if (!cancelled && payoutRes.ok && payoutBody?.settings) {
          setPayoutForm({ ...EMPTY_PAYOUT_FORM, ...payoutBody.settings })
        }
        if (!cancelled && docsRes.ok) {
          setDocuments(Array.isArray(docsBody?.documents) ? docsBody.documents : [])
        }
      } catch (err) {
        if (!cancelled) notifyToast('error', err.message || 'Failed to load profile.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    loadProfile()
    return () => {
      cancelled = true
      if (avatarPreviewRef.current) URL.revokeObjectURL(avatarPreviewRef.current)
    }
  }, [notifyToast])

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

  const canEditShop = !seller || seller.status !== 'suspended'

  const onPayoutFieldChange = (field, value) => {
    setPayoutForm((prev) => ({ ...prev, [field]: value }))
  }

  const validatePayoutForm = () => {
    if (payoutForm.payoutMethod === 'bank') {
      if (!payoutForm.accountHolderName.trim()) return 'Account holder name is required for bank payouts.'
      if (!payoutForm.bankName.trim()) return 'Bank name is required for bank payouts.'
      if (!payoutForm.accountNumber.trim()) return 'Account number is required for bank payouts.'
    }
    if (payoutForm.payoutMethod === 'gcash') {
      if (!payoutForm.gcashName.trim()) return 'GCash account name is required.'
      if (!payoutForm.gcashNumber.trim()) return 'GCash number is required.'
    }
    if (payoutForm.payoutMethod === 'manual' && !payoutForm.notes.trim()) {
      return 'Please add payout instructions for manual payout.'
    }
    if (payoutForm.payoutEmail.trim() && !/^\S+@\S+\.\S+$/.test(payoutForm.payoutEmail.trim())) {
      return 'Please enter a valid payout email.'
    }
    return ''
  }

  const handleSavePayout = async (e) => {
    e.preventDefault()
    const validationError = validatePayoutForm()
    if (validationError) {
      notifyToast('error', validationError)
      return
    }
    setPayoutSaving(true)
    setToast(null)
    try {
      const res = await fetch('/api/seller/payout-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payoutForm),
      })
      const body = await res.json().catch(() => null)
      if (!res.ok) throw new Error(body?.error || 'Failed to save payout settings.')
      setPayoutForm({ ...EMPTY_PAYOUT_FORM, ...(body?.settings || {}) })
      notifyToast('success', 'Payout settings saved.')
    } catch (err) {
      notifyToast('error', err.message || 'Failed to save payout settings.')
    } finally {
      setPayoutSaving(false)
    }
  }

  const validateDocument = (file) => {
    if (!file) return 'Select a document to upload.'
    if (!DOC_ALLOWED.includes(file.type)) return 'Only PDF, PNG, JPG, or WEBP files are allowed.'
    const mb = file.size / (1024 * 1024)
    if (mb > 8) return 'Document must be 8MB or less.'
    return ''
  }

  const handleUploadDocument = async (e) => {
    e.preventDefault()
    const file = documentFileRef.current?.files?.[0]
    const err = validateDocument(file)
    if (err) {
      notifyToast('error', err)
      return
    }
    setDocumentUploading(true)
    setToast(null)
    try {
      const form = new FormData()
      form.append('documentType', documentType)
      form.append('file', file)

      const res = await fetch('/api/seller/documents', {
        method: 'POST',
        body: form,
      })
      const body = await res.json().catch(() => null)
      if (!res.ok) throw new Error(body?.error || 'Failed to save document metadata.')
      setDocuments((prev) => [body.document, ...prev].filter(Boolean))
      if (documentFileRef.current) documentFileRef.current.value = ''
      notifyToast('success', 'Document uploaded for review.')
    } catch (uploadErr) {
      notifyToast('error', uploadErr.message || 'Failed to upload document.')
    } finally {
      setDocumentUploading(false)
    }
  }

  const handleDeleteDocument = async (docId) => {
    if (!docId) return
    setToast(null)
    try {
      const res = await fetch(`/api/seller/documents?id=${encodeURIComponent(docId)}`, { method: 'DELETE' })
      const body = await res.json().catch(() => null)
      if (!res.ok) throw new Error(body?.error || 'Failed to remove document.')
      setDocuments((prev) => prev.filter((doc) => doc.id !== docId))
      notifyToast('success', 'Document removed.')
    } catch (err) {
      notifyToast('error', err.message || 'Failed to remove document.')
    }
  }

  const onShopFieldChange = (field, value) => {
    setShopForm((prev) => ({ ...prev, [field]: value }))
  }

  const onBusinessTypeChoiceChange = (value) => {
    setShopForm((prev) => ({
      ...prev,
      shopBusinessTypeChoice: value,
      shopBusinessTypeOtherSpecify:
        value === SELLER_BUSINESS_TYPE_OTHER ? prev.shopBusinessTypeOtherSpecify : '',
    }))
  }

  const onCancelShopEdit = () => {
    setToast(null)
    if (coverFileRef.current) coverFileRef.current.value = ''
    if (profile) {
      setShopForm(mapSellerToShopForm(seller, profile, sessionEmail))
    }
    setIsEditingShop(false)
  }

  const onPickShopCover = async (e) => {
    setToast(null)
    const file = e.target.files?.[0]
    if (!file) return
    const imgErr = validateImage(file)
    if (imgErr) {
      notifyToast('error', imgErr)
      return
    }
    if (!canEditShop) return
    try {
      setCoverLoading(true)
      const form = new FormData()
      form.append('kind', 'cover')
      form.append('file', file)
      const res = await fetch('/api/seller/settings', { method: 'POST', body: form })
      const body = await res.json().catch(() => null)
      if (!res.ok) throw new Error(body?.error || 'Failed to upload shop cover.')
      setSeller(body?.seller || seller)
      notifyToast('success', 'Shop cover photo updated.')
    } catch (err) {
      notifyToast('error', err.message || 'Failed to upload shop cover.')
    } finally {
      setCoverLoading(false)
      if (coverFileRef.current) coverFileRef.current.value = ''
    }
  }

  const onRemoveShopCover = async () => {
    setToast(null)
    if (!seller?.cover_photo_url || !canEditShop) return
    try {
      setCoverLoading(true)
      const res = await fetch('/api/seller/settings?kind=cover', { method: 'DELETE' })
      const body = await res.json().catch(() => null)
      if (!res.ok) throw new Error(body?.error || 'Failed to remove shop cover.')
      setSeller(body?.seller || null)
      notifyToast('success', 'Shop cover photo removed.')
    } catch (err) {
      notifyToast('error', err.message || 'Failed to remove shop cover.')
    } finally {
      setCoverLoading(false)
    }
  }

  const onClickEditSaveShop = async () => {
    setToast(null)
    if (!canEditShop) return
    if (!isEditingShop) {
      setIsEditingShop(true)
      return
    }
    const err = validateShopForm(shopForm)
    if (err) {
      notifyToast('error', err)
      return
    }
    try {
      setShopSaving(true)
      const socialLinks = normalizeSellerSocialLinks({
        phone: shopForm.socialPhoneEnabled ? shopForm.socialPhone : '',
        whatsapp: shopForm.socialWhatsappEnabled ? shopForm.socialWhatsapp : '',
        email: shopForm.socialEmailEnabled ? shopForm.socialEmail : '',
        facebook: shopForm.socialFacebookEnabled ? shopForm.socialFacebook : '',
        messenger: shopForm.socialMessengerEnabled ? shopForm.socialMessenger : '',
      })
      const res = await fetch('/api/seller/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'shop',
          shop: {
            businessName: shopForm.businessName.trim(),
            username: shopForm.shopUsername?.trim() ? shopForm.shopUsername : '',
            tagline: shopForm.shopTagline?.trim() ? shopForm.shopTagline : '',
            businessTypeLabel:
              businessTypeLabelFromFormState(
                shopForm.shopBusinessTypeChoice,
                shopForm.shopBusinessTypeOtherSpecify,
              ) ?? '',
            contactName: shopForm.contactName.trim(),
            email: shopForm.email.trim(),
            phone: shopForm.phone.trim(),
            businessInfo: shopForm.businessInfo.trim(),
            specialties: shopForm.shopSpecialties ?? '',
            address: shopForm.address.trim(),
            businessStartedAt: shopForm.businessStartedAt.trim(),
            turnaround: shopForm.shopTurnaround?.trim() ? shopForm.shopTurnaround.trim() : '',
            status: seller?.status ?? 'pending',
            registeredAt: seller?.registered_at,
            socialLinks,
          },
        }),
      })
      const body = await res.json().catch(() => null)
      if (!res.ok) throw new Error(body?.error || 'Failed to save shop information.')
      const saved = body?.seller
      if (saved) {
        setSeller(saved)
        setShopForm(mapSellerToShopForm(saved, profile, sessionEmail))
      }
      setIsEditingShop(false)
      notifyToast('success', 'Shop information saved.')
    } catch (err) {
      notifyToast('error', err.message || 'Failed to save shop information.')
    } finally {
      setShopSaving(false)
    }
  }

  const onPickAvatar = async (e) => {
    setToast(null)
    const file = e.target.files?.[0]
    if (!file) return
    const error = validateImage(file)
    if (error) {
      notifyToast('error', error)
      return
    }
    if (!profile) {
      notifyToast('error', 'Profile is not loaded yet.')
      return
    }
    if (avatarPreviewRef.current) URL.revokeObjectURL(avatarPreviewRef.current)
    const url = URL.createObjectURL(file)
    avatarPreviewRef.current = url
    setAvatarPreview(url)
    try {
      setAvatarLoading(true)
      const form = new FormData()
      form.append('kind', 'avatar')
      form.append('file', file)
      const res = await fetch('/api/seller/settings', { method: 'POST', body: form })
      const body = await res.json().catch(() => null)
      if (!res.ok) throw new Error(body?.error || 'Failed to upload avatar.')
      setProfile((prev) =>
        prev ? { ...prev, avatarPath: body?.avatarPath || null, avatarUrl: body?.avatarUrl || null } : prev,
      )
      if (avatarPreviewRef.current) {
        URL.revokeObjectURL(avatarPreviewRef.current)
        avatarPreviewRef.current = ''
      }
      setAvatarPreview('')
      if (fileRef.current) fileRef.current.value = ''
      notifyToast('success', 'Avatar updated successfully.')
    } catch (err) {
      notifyToast('error', err.message || 'Failed to upload avatar.')
    } finally {
      setAvatarLoading(false)
    }
  }

  const onRemoveAvatar = async () => {
    setToast(null)
    if (!profile || (!profile.avatarPath && !profile.avatarUrl)) return
    if (avatarPreviewRef.current) {
      URL.revokeObjectURL(avatarPreviewRef.current)
      avatarPreviewRef.current = ''
      setAvatarPreview('')
    }
    if (fileRef.current) fileRef.current.value = ''
    try {
      setAvatarLoading(true)
      const res = await fetch('/api/seller/settings?kind=avatar', { method: 'DELETE' })
      const body = await res.json().catch(() => null)
      if (!res.ok) throw new Error(body?.error || 'Failed to remove avatar.')
      setProfile((prev) => (prev ? { ...prev, avatarPath: null, avatarUrl: null } : prev))
      notifyToast('success', 'Avatar removed.')
    } catch (err) {
      notifyToast('error', err.message || 'Failed to remove avatar.')
    } finally {
      setAvatarLoading(false)
    }
  }

  const onClickEditSavePersonal = async () => {
    setToast(null)
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
      notifyToast('error', nameErr)
      return
    }
    const emailErr = validateEmail(draftEmail)
    if (emailErr) {
      notifyToast('error', emailErr)
      return
    }
    if (!profile) {
      notifyToast('error', 'Profile is not loaded yet.')
      return
    }
    const trimmedName = draftName.trim()
    const trimmedEmail = draftEmail.trim()
    try {
      const res = await fetch('/api/seller/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'profile', fullName: trimmedName, email: trimmedEmail }),
      })
      const body = await res.json().catch(() => null)
      if (!res.ok) throw new Error(body?.error || 'Failed to update personal information.')
      setProfile((prev) => (prev ? { ...prev, fullName: trimmedName, email: trimmedEmail } : prev))
      setIsEditingPersonal(false)
      notifyToast('success', 'Personal information updated successfully.')
    } catch (err) {
      notifyToast('error', err.message || 'Failed to update personal information.')
    }
  }

  const onCancelPersonalEdit = () => {
    setToast(null)
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
    if (!isEditingPassword || passwordSaving) return
    setToast(null)
    setPasswordSaving(true)
    try {
      const result = await changePasswordWithReauth(supabase, {
        currentPassword,
        newPassword,
        confirmPassword,
      })
      if (!result.ok) {
        notifyToast('error', result.error)
        return
      }
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      const okMsg = result.warning
        ? `Password updated. ${result.warning}`
        : 'Password updated successfully. Other sessions were signed out.'
      notifyToast('success', okMsg)
      setIsEditingPassword(false)
    } catch (err) {
      notifyToast('error', err.message || 'Failed to update password.')
    } finally {
      setPasswordSaving(false)
    }
  }

  const onStartPasswordEdit = () => {
    setToast(null)
    setIsEditingPassword(true)
  }

  const onCancelPasswordEdit = () => {
    if (passwordSaving) return
    setToast(null)
    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
    setIsEditingPassword(false)
  }

  const shownAvatar = avatarPreview || profile?.avatarUrl || ''
  const shownAvatarIsBlob = shouldUseUnoptimizedAvatarSrc(shownAvatar)
  const formId = 'sellerPasswordForm'
  const id = (name) => `seller_${name}`
  const shopId = (name) => `seller_shop_${name}`

  const profileTabId = 'seller-settings-tab-profile'
  const passwordTabId = 'seller-settings-tab-password'
  const shopTabId = 'seller-settings-tab-shop'
  const payoutsTabId = 'seller-settings-tab-payouts'
  const documentsTabId = 'seller-settings-tab-documents'
  const notificationsTabId = 'seller-settings-tab-notifications'
  const profilePanelId = 'seller-settings-panel-profile'
  const passwordPanelId = 'seller-settings-panel-password'
  const shopPanelId = 'seller-settings-panel-shop'
  const payoutsPanelId = 'seller-settings-panel-payouts'
  const documentsPanelId = 'seller-settings-panel-documents'
  const notificationsPanelId = 'seller-settings-panel-notifications'

  const value = {
    loading,
    sellerCanChangePassword,
    refreshAuthIdentities,
    notifyToast,
    toast,
    setToast,
    profile,
    seller,
    sessionEmail,
    shopForm,
    setShopForm,
    isEditingShop,
    setIsEditingShop,
    shopSaving,
    coverLoading,
    shopSubTab,
    setShopSubTab,
    canEditShop,
    onShopFieldChange,
    onBusinessTypeChoiceChange,
    onCancelShopEdit,
    onClickEditSaveShop,
    onPickShopCover,
    onRemoveShopCover,
    coverFileRef,
    payoutForm,
    payoutSaving,
    onPayoutFieldChange,
    handleSavePayout,
    documents,
    documentType,
    setDocumentType,
    documentUploading,
    documentFileRef,
    handleUploadDocument,
    handleDeleteDocument,
    isEditingPersonal,
    draftName,
    setDraftName,
    draftEmail,
    setDraftEmail,
    avatarLoading,
    shownAvatar,
    shownAvatarIsBlob,
    avatarModalOpen,
    setAvatarModalOpen,
    fileRef,
    onCancelPersonalEdit,
    onClickEditSavePersonal,
    onPickAvatar,
    onRemoveAvatar,
    authIdentities,
    linkedProviders,
    canUnlinkIdentity,
    identityBusy,
    handleLinkProvider,
    handleUnlinkIdentity,
    currentPassword,
    setCurrentPassword,
    newPassword,
    setNewPassword,
    confirmPassword,
    setConfirmPassword,
    isEditingPassword,
    passwordSaving,
    handlePasswordSubmit,
    onStartPasswordEdit,
    onCancelPasswordEdit,
    formId,
    id,
    shopId,
    profileTabId,
    passwordTabId,
    shopTabId,
    payoutsTabId,
    documentsTabId,
    notificationsTabId,
    profilePanelId,
    passwordPanelId,
    shopPanelId,
    payoutsPanelId,
    documentsPanelId,
    notificationsPanelId,
  }

  return <SellerSettingsContext.Provider value={value}>{children}</SellerSettingsContext.Provider>
}

export {
  SellerPortalSelect,
  SellerSettingsPanelSkeleton,
  SellerNotificationPreferencesPanel,
  PAYOUT_METHOD_OPTIONS,
  DOCUMENT_TYPE_OPTIONS,
  SHOP_BUSINESS_TYPE_OPTIONS,
  EMPTY_PAYOUT_FORM,
  MAX_MB,
  ALLOWED,
  DOC_ALLOWED,
  mapSellerToShopForm,
  validateShopForm,
  inferSellerCanChangePassword,
  specialtiesFormStringToLines,
  shopStatusPillClass,
  useSellerSettings,
}
