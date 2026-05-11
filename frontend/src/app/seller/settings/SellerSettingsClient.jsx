'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import styles from './settings.module.css'
import { FaUser, FaUpload } from 'react-icons/fa6'
import { TbCamera, TbTrash } from 'react-icons/tb'
import { FiEdit, FiPlus, FiSave } from 'react-icons/fi'
import { MdCheckCircle, MdErrorOutline } from 'react-icons/md'
import { validateNewPassword } from '@/lib/validators/authSchemas'
import { fetchCurrentSellerProfile } from '@/features/seller/settings/getSellerProfile'
import {
  SELLER_BUSINESS_TYPE_OTHER,
  SELLER_BUSINESS_TYPE_PRESETS,
  businessTypeLabelFromFormState,
  businessTypeLabelToFormState,
  getSellerByUserId,
  upsertSellerForUser,
  // social links live under sellers.social_links; normalized in lib/sellers/socialLinks
  validateSellerBusinessTypeForm,
  normalizeSellerSpecialties,
  validateSellerShopUsername,
  validateSellerSpecialtiesInput,
  validateSellerTagline,
} from '@/lib/sellers/client'
import { normalizeSellerSocialLinks, validateSellerSocialLinks } from '@/lib/sellers/socialLinks'
import { normalizeSellerSettingsTab } from './sellerSettingsTabs'

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

const AVATARS_BUCKET = 'avatars'
const MAX_MB = 2
const ALLOWED = ['image/jpeg', 'image/png', 'image/webp']

/** Path in `avatars` bucket from a public object URL. */
function pathFromAvatarsPublicUrl(url) {
  if (!url || typeof url !== 'string') return null
  const match = url.split('/avatars/')[1]
  return match ? match.split('?')[0] : null
}

export default function SellerSettingsClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const activeTab = normalizeSellerSettingsTab(searchParams.get('tab'))

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
  const [toast, setToast] = useState(null)
  const [avatarModalOpen, setAvatarModalOpen] = useState(false)

  const [seller, setSeller] = useState(null)
  const [sessionEmail, setSessionEmail] = useState('')
  const [shopForm, setShopForm] = useState(() => mapSellerToShopForm(null, null, ''))
  const [isEditingShop, setIsEditingShop] = useState(false)
  const [shopSaving, setShopSaving] = useState(false)
  const [coverLoading, setCoverLoading] = useState(false)
  const [shopSubTab, setShopSubTab] = useState('storefront')

  const goTab = (tabId) => {
    const next = normalizeSellerSettingsTab(tabId)
    router.replace(`/seller/settings?tab=${next}`, { scroll: false })
  }

  const notifyToast = useCallback((type, message) => {
    const msg = typeof message === 'string' ? message.trim() : String(message ?? '').trim()
    if (!msg) return
    setToast({ id: Date.now(), type, message: msg })
  }, [])

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
        setSessionEmail(email)
        const sellerRow = user?.id ? await getSellerByUserId(user.id) : null
        if (cancelled) return
        setSeller(sellerRow)
        setShopForm(mapSellerToShopForm(sellerRow, data, email))
        setIsEditingShop(false)
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
      const { data: auth } = await supabase.auth.getUser()
      const user = auth?.user
      if (!user?.id) {
        notifyToast('error', 'You must be signed in to update your shop cover.')
        return
      }
      setCoverLoading(true)
      const fileExt = file.name.split('.').pop()
      const fileName = `cover-${Date.now()}.${fileExt}`
      const filePath = `${user.id}/${fileName}`
      const prevPath = seller?.cover_photo_url
        ? pathFromAvatarsPublicUrl(String(seller.cover_photo_url))
        : null
      const { error: uploadError } = await supabase.storage
        .from(AVATARS_BUCKET)
        .upload(filePath, file, { upsert: true, cacheControl: '3600' })
      if (uploadError) throw uploadError
      const {
        data: { publicUrl },
      } = supabase.storage.from(AVATARS_BUCKET).getPublicUrl(filePath)
      const { error: updateError } = await supabase
        .from('sellers')
        .update({ cover_photo_url: publicUrl, updated_at: new Date().toISOString() })
        .eq('user_id', user.id)
      if (updateError) {
        await supabase.storage.from(AVATARS_BUCKET).remove([filePath])
        throw updateError
      }
      if (prevPath && prevPath !== filePath) {
        await supabase.storage.from(AVATARS_BUCKET).remove([prevPath])
      }
      const refreshed = await getSellerByUserId(user.id)
      setSeller(refreshed)
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
      const { data: auth } = await supabase.auth.getUser()
      const user = auth?.user
      if (!user?.id) {
        notifyToast('error', 'You must be signed in to remove your shop cover.')
        return
      }
      setCoverLoading(true)
      const prevPath = pathFromAvatarsPublicUrl(String(seller.cover_photo_url))
      const { error: updateError } = await supabase
        .from('sellers')
        .update({ cover_photo_url: null, updated_at: new Date().toISOString() })
        .eq('user_id', user.id)
      if (updateError) throw updateError
      if (prevPath) {
        await supabase.storage.from(AVATARS_BUCKET).remove([prevPath])
      }
      const refreshed = await getSellerByUserId(user.id)
      setSeller(refreshed)
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
      const { data: auth } = await supabase.auth.getUser()
      const user = auth?.user
      if (!user) {
        notifyToast('error', 'You must be signed in to save shop information.')
        return
      }
      setShopSaving(true)
      const socialLinks = normalizeSellerSocialLinks({
        phone: shopForm.socialPhoneEnabled ? shopForm.socialPhone : '',
        whatsapp: shopForm.socialWhatsappEnabled ? shopForm.socialWhatsapp : '',
        email: shopForm.socialEmailEnabled ? shopForm.socialEmail : '',
        facebook: shopForm.socialFacebookEnabled ? shopForm.socialFacebook : '',
        messenger: shopForm.socialMessengerEnabled ? shopForm.socialMessenger : '',
      })
      const { data: saved, error } = await upsertSellerForUser(user, {
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
        status: seller?.status ?? 'pending',
        registeredAt: seller?.registered_at,
        socialLinks,
      })
      if (error) {
        notifyToast(
          'error',
          typeof error === 'string' ? error : error.message || 'Failed to save shop information.',
        )
        return
      }
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
      if (profile.avatarPath) {
        await supabase.storage.from(AVATARS_BUCKET).remove([profile.avatarPath])
      }
      const { error } = await supabase
        .from('profiles')
        .update({ avatar_url: null, updated_at: new Date().toISOString() })
        .eq('id', profile.id)
      if (error) throw error
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
    if (!isEditingPassword) return
    setToast(null)
    if (!currentPassword) {
      notifyToast('error', 'Please enter your current password.')
      return
    }
    const validation = validateNewPassword(newPassword, confirmPassword)
    if (!validation.valid) {
      notifyToast('error', validation.message)
      return
    }
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) {
        notifyToast('error', error.message || 'Failed to update password.')
        return
      }
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      notifyToast('success', 'Password updated successfully.')
      setIsEditingPassword(false)
    } catch (err) {
      notifyToast('error', err.message || 'Failed to update password.')
    }
  }

  const onStartPasswordEdit = () => {
    setToast(null)
    setIsEditingPassword(true)
  }

  const onCancelPasswordEdit = () => {
    setToast(null)
    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
    setIsEditingPassword(false)
  }

  const shownAvatar = avatarPreview || profile?.avatarUrl || ''
  const shownAvatarIsBlob = Boolean(shownAvatar && shownAvatar.startsWith('blob:'))
  const formId = 'sellerPasswordForm'
  const id = (name) => `seller_${name}`
  const shopId = (name) => `seller_shop_${name}`

  const profileTabId = 'seller-settings-tab-profile'
  const passwordTabId = 'seller-settings-tab-password'
  const shopTabId = 'seller-settings-tab-shop'
  const profilePanelId = 'seller-settings-panel-profile'
  const passwordPanelId = 'seller-settings-panel-password'
  const shopPanelId = 'seller-settings-panel-shop'

  if (loading) {
    return (
      <div className={styles.page}>
        <nav className={styles.tabBar} aria-label="Settings sections">
          {['profile', 'password', 'shop'].map((tab) => (
            <button
              key={tab}
              type="button"
              disabled
              className={`${styles.tabItem} ${activeTab === tab ? styles.tabItemActive : ''}`}
            >
              <span className={styles.tabLabel}>
                {tab === 'profile' ? 'Profile' : tab === 'password' ? 'Password' : 'Shop information'}
              </span>
            </button>
          ))}
        </nav>
        <div className={`${styles.contentArea} ${styles.grid}`}>
          <section className={`${styles.card} ${styles.full}`}>
            <p className={styles.loadingText}>Loading settings…</p>
          </section>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <nav className={styles.tabBar} aria-label="Settings sections">
        <button
          type="button"
          id={profileTabId}
          className={`${styles.tabItem} ${activeTab === 'profile' ? styles.tabItemActive : ''}`}
          onClick={() => goTab('profile')}
          aria-current={activeTab === 'profile' ? 'page' : undefined}
        >
          <span className={styles.tabLabel}>Profile</span>
        </button>
        <button
          type="button"
          id={passwordTabId}
          className={`${styles.tabItem} ${activeTab === 'password' ? styles.tabItemActive : ''}`}
          onClick={() => goTab('password')}
          aria-current={activeTab === 'password' ? 'page' : undefined}
        >
          <span className={styles.tabLabel}>Password</span>
        </button>
        <button
          type="button"
          id={shopTabId}
          className={`${styles.tabItem} ${activeTab === 'shop' ? styles.tabItemActive : ''}`}
          onClick={() => goTab('shop')}
          aria-current={activeTab === 'shop' ? 'page' : undefined}
        >
          <span className={styles.tabLabel}>Shop information</span>
        </button>
      </nav>

      <div className={`${styles.contentArea} ${styles.grid}`}>
        {activeTab === 'shop' && (
          <section
            id={shopPanelId}
            role="tabpanel"
            aria-labelledby={shopTabId}
            className={`${styles.card} ${styles.full}`}
          >
          <div className={styles.tabDetailHead}>
            <div className={styles.tabDetailHeadRow}>
              <div className={styles.tabDetailHeadText}>
                <h2 className={styles.tabDetailTitle}>Shop information</h2>
                <p className={styles.tabDetailSubtitle}>
                  Business details, cover image, and contact methods shown on your public profile.
                </p>
              </div>
              <div className={styles.headActions}>
                {isEditingShop && (
                  <button
                    type="button"
                    className={styles.secondaryBtn}
                    onClick={onCancelShopEdit}
                    disabled={shopSaving}
                  >
                    Cancel
                  </button>
                )}
                <button
                  type="button"
                  className={styles.primaryBtn}
                  onClick={onClickEditSaveShop}
                  disabled={shopSaving || !canEditShop}
                >
                  {isEditingShop ? (
                    <>
                      <FiSave /> {shopSaving ? 'Saving…' : 'Save Changes'}
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

          {!seller && (
            <p className={styles.shopHelper}>
              You have not saved shop details yet, or they are still loading. You can enter them here, or use the{' '}
              <Link href="/seller/onboarding" className={styles.inlineLink}>
                seller onboarding
              </Link>{' '}
              flow.
            </p>
          )}

          {seller && (
            <div className={styles.shopStatusRow}>
              <span className={styles.shopStatusLabel}>Account status</span>
              <span className={`${styles.statusPill} ${shopStatusPillClass(seller.status)}`}>
                {seller.status || '—'}
              </span>
            </div>
          )}

          {!canEditShop && (
            <div className={styles.msgError} role="status">
              <MdErrorOutline aria-hidden />
              <span>Your seller account is suspended. Shop details cannot be edited here. Please contact support.</span>
            </div>
          )}

          <div className={styles.shopSubTabsShell}>
            <nav className={styles.shopSubTabBar} aria-label="Shop information categories">
              {[
                { id: 'storefront', label: 'Storefront' },
                { id: 'business', label: 'Business details' },
                { id: 'publicContact', label: 'Public contact' },
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className={`${styles.shopSubTab} ${shopSubTab === t.id ? styles.shopSubTabActive : ''}`}
                  onClick={() => setShopSubTab(t.id)}
                  aria-current={shopSubTab === t.id ? 'page' : undefined}
                >
                  {t.label}
                </button>
              ))}
            </nav>
          </div>

          <div className={styles.shopBody}>
            {shopSubTab === 'storefront' && (
              <>
                <div className={styles.shopInfoCard}>
                  <h3 className={styles.shopInfoCardTitle}>Shop identity</h3>
                  <div className={styles.shopFieldGrid}>
                    <div className={styles.shopGridField}>
                      <label htmlFor={shopId('business')} className={styles.shopGridLabel}>
                        Business / Shop name <span className={styles.requiredMark}>*</span>
                      </label>
                      <input
                        id={shopId('business')}
                        value={shopForm.businessName}
                        onChange={(e) => onShopFieldChange('businessName', e.target.value)}
                        className={`${styles.input} ${!isEditingShop || !canEditShop ? styles.inputReadOnly : ''}`}
                        disabled={!isEditingShop || !canEditShop}
                        placeholder="e.g. Peaceful Rest Funeral Home"
                      />
                    </div>
                    <div className={styles.shopGridField}>
                      <label htmlFor={shopId('username')} className={styles.shopGridLabel}>
                        Shop username
                      </label>
                      <input
                        id={shopId('username')}
                        value={shopForm.shopUsername}
                        onChange={(e) => onShopFieldChange('shopUsername', e.target.value)}
                        className={`${styles.input} ${!isEditingShop || !canEditShop ? styles.inputReadOnly : ''}`}
                        disabled={!isEditingShop || !canEditShop}
                        placeholder="your_shop_handle"
                        autoComplete="nickname"
                        spellCheck={false}
                      />
                      <p className={styles.shopGridHint}>
                        Shows as <strong>@handle</strong> on your public shop profile. Letters, numbers, underscores; 3–30 characters. Leave blank if you prefer not to set one yet.
                      </p>
                    </div>
                    <div className={styles.shopGridField}>
                      <label htmlFor={shopId('started')} className={styles.shopGridLabel}>
                        Business operating since <span className={styles.requiredMark}>*</span>
                      </label>
                      <input
                        id={shopId('started')}
                        type="date"
                        value={shopForm.businessStartedAt}
                        max={new Date().toISOString().slice(0, 10)}
                        onChange={(e) => onShopFieldChange('businessStartedAt', e.target.value)}
                        className={`${styles.input} ${!isEditingShop || !canEditShop ? styles.inputReadOnly : ''}`}
                        disabled={!isEditingShop || !canEditShop}
                      />
                      <p className={styles.shopGridHint}>
                        Shown as &quot;In service&quot; / member timeline on your public profile. Separate from when you joined this site.
                      </p>
                    </div>
                    <div className={`${styles.shopGridField} ${styles.shopFieldGridFull}`}>
                      <label htmlFor={shopId('tagline')} className={styles.shopGridLabel}>
                        Shop tagline
                      </label>
                      <textarea
                        id={shopId('tagline')}
                        rows={3}
                        value={shopForm.shopTagline}
                        onChange={(e) => onShopFieldChange('shopTagline', e.target.value)}
                        className={`${styles.input} ${styles.textarea} ${!isEditingShop || !canEditShop ? styles.inputReadOnly : ''}`}
                        disabled={!isEditingShop || !canEditShop}
                        placeholder="A short sentence or two visitors see below your ratings (optional)."
                        maxLength={500}
                      />
                      <p className={styles.shopGridHint}>
                        Short summary under your stats — separate from the full &quot;Business description&quot; (About tab). Maximum 500 characters.
                      </p>
                    </div>
                  </div>
                </div>

                <div className={styles.shopInfoCard}>
                  <h3 className={styles.shopInfoCardTitle}>Classification &amp; specialties</h3>
                  <div className={styles.shopFieldGrid}>
                    <div className={`${styles.shopGridField} ${styles.shopFieldGridFull}`}>
                      <label htmlFor={shopId('biz-type')} className={styles.shopGridLabel}>
                        Business type label
                      </label>
                      <select
                        id={shopId('biz-type')}
                        value={shopForm.shopBusinessTypeChoice}
                        onChange={(e) => onBusinessTypeChoiceChange(e.target.value)}
                        className={`${styles.input} ${styles.selectInput} ${!isEditingShop || !canEditShop ? styles.inputReadOnly : ''}`}
                        disabled={!isEditingShop || !canEditShop}
                      >
                        <option value="">Not set (optional)</option>
                        {SELLER_BUSINESS_TYPE_PRESETS.map((label) => (
                          <option key={label} value={label}>
                            {label}
                          </option>
                        ))}
                        <option value={SELLER_BUSINESS_TYPE_OTHER}>Others, please specify</option>
                      </select>
                      {shopForm.shopBusinessTypeChoice === SELLER_BUSINESS_TYPE_OTHER && (
                        <div className={styles.businessTypeOtherWrap}>
                          <input
                            id={shopId('biz-type-other')}
                            aria-label="Specify your business type"
                            value={shopForm.shopBusinessTypeOtherSpecify}
                            onChange={(e) =>
                              onShopFieldChange('shopBusinessTypeOtherSpecify', e.target.value)
                            }
                            className={`${styles.input} ${!isEditingShop || !canEditShop ? styles.inputReadOnly : ''}`}
                            disabled={!isEditingShop || !canEditShop}
                            placeholder="Describe your business type"
                            maxLength={80}
                            autoComplete="off"
                          />
                        </div>
                      )}
                      <p className={styles.shopGridHint}>
                        Shown on the public Partners directory and filters. Preset options keep the list consistent; use Others for anything else (80 characters max).
                      </p>
                    </div>
                    <div className={`${styles.shopGridField} ${styles.shopFieldGridFull}`}>
                      <span id={shopId('specialties-label')} className={styles.shopGridLabel}>
                        Specialties
                      </span>
                      <div
                        className={styles.shopSpecialtyList}
                        role="group"
                        aria-labelledby={shopId('specialties-label')}
                      >
                        <div className={styles.shopSpecialtyGrid}>
                        {specialtiesFormStringToLines(shopForm.shopSpecialties).map((line, index) => (
                          <div key={`spec-${index}`} className={styles.shopSpecialtyCell}>
                            <div className={styles.shopSpecialtyRow}>
                            <input
                              type="text"
                              id={index === 0 ? shopId('specialties') : undefined}
                              value={line}
                              onChange={(e) => {
                                const lines = specialtiesFormStringToLines(shopForm.shopSpecialties)
                                lines[index] = e.target.value
                                onShopFieldChange('shopSpecialties', lines.join('\n'))
                              }}
                              className={`${styles.input} ${!isEditingShop || !canEditShop ? styles.inputReadOnly : ''}`}
                              disabled={!isEditingShop || !canEditShop}
                              placeholder="e.g. Traditional Catholic rites"
                              maxLength={120}
                              spellCheck={true}
                              aria-label={`Speciality ${index + 1}`}
                            />
                            <button
                              type="button"
                              className={styles.shopSpecialtyRemoveBtn}
                              onClick={() => {
                                const lines = specialtiesFormStringToLines(shopForm.shopSpecialties)
                                lines.splice(index, 1)
                                onShopFieldChange('shopSpecialties', lines.join('\n'))
                              }}
                              disabled={!isEditingShop || !canEditShop}
                              aria-label={`Remove speciality ${index + 1}`}
                            >
                              <TbTrash aria-hidden />
                            </button>
                            </div>
                          </div>
                        ))}
                        </div>
                        <button
                          type="button"
                          className={`${styles.secondaryBtn} ${styles.shopSpecialtyAddBtn}`}
                          onClick={() => {
                            const lines = specialtiesFormStringToLines(shopForm.shopSpecialties)
                            lines.push('')
                            onShopFieldChange('shopSpecialties', lines.join('\n'))
                          }}
                          disabled={
                            !isEditingShop ||
                            !canEditShop ||
                            normalizeSellerSpecialties(shopForm.shopSpecialties ?? '').length >= 24
                          }
                        >
                          <FiPlus aria-hidden /> Add speciality
                        </button>
                      </div>
                      <p className={styles.shopGridHint}>
                        Shown as badges on your public seller profile (up to 24 specialties, 120 characters each). Use
                        Add speciality for each item, or remove rows you do not need.
                      </p>
                    </div>
                  </div>
                </div>

                <div className={styles.shopInfoCard}>
                  <h3 className={styles.shopInfoCardTitle}>Location &amp; cover image</h3>
                  <div className={styles.shopFieldGrid}>
                    <div className={`${styles.shopGridField} ${styles.shopFieldGridFull}`}>
                      <label htmlFor={shopId('address')} className={styles.shopGridLabel}>
                        Business address
                      </label>
                      <input
                        id={shopId('address')}
                        value={shopForm.address}
                        onChange={(e) => onShopFieldChange('address', e.target.value)}
                        className={`${styles.input} ${!isEditingShop || !canEditShop ? styles.inputReadOnly : ''}`}
                        disabled={!isEditingShop || !canEditShop}
                        placeholder="Street, city, province"
                      />
                      <p className={styles.shopGridHint}>
                        Helps buyers see where you operate; displayed as your storefront location where applicable.
                      </p>
                    </div>
                    <div className={`${styles.shopGridField} ${styles.shopFieldGridFull}`}>
                      <span className={styles.shopGridLabel}>Shop cover photo</span>
                      <p className={styles.shopGridHint}>
                        Wide image used on the homepage partner carousel and similar surfaces. PNG, JPG, or WEBP;
                        max {MAX_MB}MB. Same storage rules as your profile avatar.
                      </p>
                      {seller?.cover_photo_url ? (
                        <div className={styles.shopCoverPreview}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={seller.cover_photo_url}
                            alt="Shop cover preview"
                            className={styles.shopCoverImg}
                          />
                        </div>
                      ) : (
                        <p className={styles.shopGridHint}>
                          No cover image yet — upload one so your business can stand out on the homepage.
                        </p>
                      )}
                      <input
                        ref={coverFileRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className={styles.fileInput}
                        onChange={onPickShopCover}
                        aria-label="Upload shop cover photo"
                      />
                      <div className={styles.shopCoverToolbar}>
                        <button
                          type="button"
                          className={styles.primaryBtn}
                          disabled={!isEditingShop || !canEditShop || coverLoading}
                          onClick={() => coverFileRef.current?.click()}
                        >
                          <FaUpload aria-hidden />
                          {seller?.cover_photo_url ? 'Replace cover' : 'Upload cover'}
                        </button>
                        {seller?.cover_photo_url ? (
                          <button
                            type="button"
                            className={styles.dangerBtn}
                            disabled={!isEditingShop || !canEditShop || coverLoading}
                            onClick={onRemoveShopCover}
                          >
                            <TbTrash aria-hidden />
                            Remove cover
                          </button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}

            {shopSubTab === 'business' && (
              <>
                <div className={styles.shopInfoCard}>
                  <h3 className={styles.shopInfoCardTitle}>About your business</h3>
                  <div className={styles.shopFieldGrid}>
                    <div className={`${styles.shopGridField} ${styles.shopFieldGridFull}`}>
                      <label htmlFor={shopId('info')} className={styles.shopGridLabel}>
                        Business description (About)
                      </label>
                      <textarea
                        id={shopId('info')}
                        rows={4}
                        value={shopForm.businessInfo}
                        onChange={(e) => onShopFieldChange('businessInfo', e.target.value)}
                        className={`${styles.input} ${styles.textarea} ${!isEditingShop || !canEditShop ? styles.inputReadOnly : ''}`}
                        disabled={!isEditingShop || !canEditShop}
                        placeholder="Your full story, services, coverage areas, and differentiators."
                      />
                      <p className={styles.shopGridHint}>Shown on your public seller profile under the About tab.</p>
                    </div>
                  </div>
                </div>

                <div className={styles.shopInfoCard}>
                  <h3 className={styles.shopInfoCardTitle}>Primary coordination</h3>
                  <div className={styles.shopFieldGrid}>
                    <div className={styles.shopGridField}>
                      <label htmlFor={shopId('contact')} className={styles.shopGridLabel}>
                        Primary contact person <span className={styles.requiredMark}>*</span>
                      </label>
                      <input
                        id={shopId('contact')}
                        value={shopForm.contactName}
                        onChange={(e) => onShopFieldChange('contactName', e.target.value)}
                        className={`${styles.input} ${!isEditingShop || !canEditShop ? styles.inputReadOnly : ''}`}
                        disabled={!isEditingShop || !canEditShop}
                        placeholder="Full name of the person we coordinate with"
                      />
                    </div>
                    <div className={styles.shopGridField}>
                      <label htmlFor={shopId('email')} className={styles.shopGridLabel}>
                        Business email <span className={styles.requiredMark}>*</span>
                      </label>
                      <input
                        id={shopId('email')}
                        type="email"
                        value={shopForm.email}
                        onChange={(e) => onShopFieldChange('email', e.target.value)}
                        className={`${styles.input} ${!isEditingShop || !canEditShop ? styles.inputReadOnly : ''}`}
                        disabled={!isEditingShop || !canEditShop}
                        placeholder="you@example.com"
                      />
                    </div>
                    <div className={styles.shopGridField}>
                      <label htmlFor={shopId('phone')} className={styles.shopGridLabel}>
                        Business phone
                      </label>
                      <input
                        id={shopId('phone')}
                        type="tel"
                        value={shopForm.phone}
                        onChange={(e) => onShopFieldChange('phone', e.target.value)}
                        className={`${styles.input} ${!isEditingShop || !canEditShop ? styles.inputReadOnly : ''}`}
                        disabled={!isEditingShop || !canEditShop}
                        placeholder="+63 9XX XXX XXXX"
                      />
                    </div>
                  </div>
                </div>
              </>
            )}

            {shopSubTab === 'publicContact' && (
              <div className={styles.shopInfoCard}>
                <h3 className={styles.shopInfoCardTitle}>Contact methods (shown on your public profile)</h3>
                <p className={styles.shopGridHint} style={{ marginBottom: 12 }}>
                  Enable the channels you want buyers to use when they click <strong>Message</strong> / <strong>Chat now</strong>.
                </p>
                <div className={styles.shopFieldGrid}>
                  <div className={`${styles.shopGridField} ${styles.shopFieldGridFull}`}>
                    <label className={styles.shopSocialRow}>
                      <input
                        type="checkbox"
                        checked={Boolean(shopForm.socialPhoneEnabled)}
                        onChange={(e) => onShopFieldChange('socialPhoneEnabled', e.target.checked)}
                        disabled={!isEditingShop || !canEditShop}
                      />
                      <span className={styles.shopSocialLabel}>Phone (Call / SMS)</span>
                    </label>
                    {shopForm.socialPhoneEnabled && (
                      <input
                        value={shopForm.socialPhone}
                        onChange={(e) => onShopFieldChange('socialPhone', e.target.value)}
                        className={`${styles.input} ${!isEditingShop || !canEditShop ? styles.inputReadOnly : ''}`}
                        disabled={!isEditingShop || !canEditShop}
                        placeholder="e.g. +63 917 123 4567"
                        aria-label="Phone for Call or SMS"
                      />
                    )}
                  </div>
                  <div className={`${styles.shopGridField} ${styles.shopFieldGridFull}`}>
                    <label className={styles.shopSocialRow}>
                      <input
                        type="checkbox"
                        checked={Boolean(shopForm.socialWhatsappEnabled)}
                        onChange={(e) => onShopFieldChange('socialWhatsappEnabled', e.target.checked)}
                        disabled={!isEditingShop || !canEditShop}
                      />
                      <span className={styles.shopSocialLabel}>WhatsApp</span>
                    </label>
                    {shopForm.socialWhatsappEnabled && (
                      <input
                        value={shopForm.socialWhatsapp}
                        onChange={(e) => onShopFieldChange('socialWhatsapp', e.target.value)}
                        className={`${styles.input} ${!isEditingShop || !canEditShop ? styles.inputReadOnly : ''}`}
                        disabled={!isEditingShop || !canEditShop}
                        placeholder="Phone number for WhatsApp (digits or +63…)"
                        aria-label="WhatsApp number"
                      />
                    )}
                  </div>
                  <div className={`${styles.shopGridField} ${styles.shopFieldGridFull}`}>
                    <label className={styles.shopSocialRow}>
                      <input
                        type="checkbox"
                        checked={Boolean(shopForm.socialEmailEnabled)}
                        onChange={(e) => onShopFieldChange('socialEmailEnabled', e.target.checked)}
                        disabled={!isEditingShop || !canEditShop}
                      />
                      <span className={styles.shopSocialLabel}>Email</span>
                    </label>
                    {shopForm.socialEmailEnabled && (
                      <input
                        type="email"
                        value={shopForm.socialEmail}
                        onChange={(e) => onShopFieldChange('socialEmail', e.target.value)}
                        className={`${styles.input} ${!isEditingShop || !canEditShop ? styles.inputReadOnly : ''}`}
                        disabled={!isEditingShop || !canEditShop}
                        placeholder="e.g. inquiries@yourshop.com"
                        aria-label="Public contact email"
                      />
                    )}
                  </div>
                  <div className={`${styles.shopGridField} ${styles.shopFieldGridFull}`}>
                    <label className={styles.shopSocialRow}>
                      <input
                        type="checkbox"
                        checked={Boolean(shopForm.socialFacebookEnabled)}
                        onChange={(e) => onShopFieldChange('socialFacebookEnabled', e.target.checked)}
                        disabled={!isEditingShop || !canEditShop}
                      />
                      <span className={styles.shopSocialLabel}>Facebook</span>
                    </label>
                    {shopForm.socialFacebookEnabled && (
                      <input
                        value={shopForm.socialFacebook}
                        onChange={(e) => onShopFieldChange('socialFacebook', e.target.value)}
                        className={`${styles.input} ${!isEditingShop || !canEditShop ? styles.inputReadOnly : ''}`}
                        disabled={!isEditingShop || !canEditShop}
                        placeholder="https://facebook.com/yourpage"
                        aria-label="Facebook URL"
                      />
                    )}
                  </div>
                  <div className={`${styles.shopGridField} ${styles.shopFieldGridFull}`}>
                    <label className={styles.shopSocialRow}>
                      <input
                        type="checkbox"
                        checked={Boolean(shopForm.socialMessengerEnabled)}
                        onChange={(e) => onShopFieldChange('socialMessengerEnabled', e.target.checked)}
                        disabled={!isEditingShop || !canEditShop}
                      />
                      <span className={styles.shopSocialLabel}>Messenger</span>
                    </label>
                    {shopForm.socialMessengerEnabled && (
                      <input
                        value={shopForm.socialMessenger}
                        onChange={(e) => onShopFieldChange('socialMessenger', e.target.value)}
                        className={`${styles.input} ${!isEditingShop || !canEditShop ? styles.inputReadOnly : ''}`}
                        disabled={!isEditingShop || !canEditShop}
                        placeholder="m.me/yourpage or yourpage"
                        aria-label="Messenger link or handle"
                      />
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>
        )}

        {activeTab === 'profile' && (
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
          </section>
        )}

        {activeTab === 'password' && (
          <section
            id={passwordPanelId}
            role="tabpanel"
            aria-labelledby={passwordTabId}
            className={`${styles.card} ${styles.full}`}
          >
            <div className={styles.tabDetailHead}>
              <div className={styles.tabDetailHeadRow}>
                <div className={styles.tabDetailHeadText}>
                  <h2 className={styles.tabDetailTitle}>Change Password</h2>
                  <p className={styles.tabDetailSubtitle}>
                    Update your password to keep your account secure.
                  </p>
                </div>
                <div className={styles.headActions}>
                  {isEditingPassword ? (
                    <>
                      <button type="button" className={styles.secondaryBtn} onClick={onCancelPasswordEdit}>
                        Cancel
                      </button>
                      <button form={formId} type="submit" className={styles.primaryBtn}>
                        <FiSave /> Save Changes
                      </button>
                    </>
                  ) : (
                    <button type="button" className={styles.primaryBtn} onClick={onStartPasswordEdit}>
                      Change Password
                    </button>
                  )}
                </div>
              </div>
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
                    className={`${styles.input} ${!isEditingPassword ? styles.inputReadOnly : ''}`}
                    disabled={!isEditingPassword}
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
                    className={`${styles.input} ${!isEditingPassword ? styles.inputReadOnly : ''}`}
                    disabled={!isEditingPassword}
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
                    className={`${styles.input} ${!isEditingPassword ? styles.inputReadOnly : ''}`}
                    disabled={!isEditingPassword}
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
        )}
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
