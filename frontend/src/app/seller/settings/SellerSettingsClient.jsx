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
import { changePasswordWithReauth } from '@/lib/auth/changePassword'
import { fetchCurrentSellerProfile } from '@/features/seller/settings/getSellerProfile'
import {
  SELLER_BUSINESS_TYPE_OTHER,
  SELLER_BUSINESS_TYPE_PRESETS,
  businessTypeLabelFromFormState,
  businessTypeLabelToFormState,
  getSellerByUserId,
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
  const [passwordSaving, setPasswordSaving] = useState(false)
  const [sellerCanChangePassword, setSellerCanChangePassword] = useState(null)
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

  const goTab = useCallback((tabId) => {
    const next = normalizeSellerSettingsTab(tabId)
    router.replace(`/seller/settings?tab=${next}`, { scroll: false })
  }, [router])

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
        setSellerCanChangePassword(inferSellerCanChangePassword(user))
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
    // If the user navigates directly to ?tab=password but the account is OAuth-only,
    // redirect back to profile.
    if (sellerCanChangePassword === false && activeTab === 'password') {
      goTab('profile')
    }
  }, [sellerCanChangePassword, activeTab, goTab])

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
      return 'Please add admin notes for manual payout instructions.'
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
  const shownAvatarIsBlob = Boolean(shownAvatar && shownAvatar.startsWith('blob:'))
  const formId = 'sellerPasswordForm'
  const id = (name) => `seller_${name}`
  const shopId = (name) => `seller_shop_${name}`

  const profileTabId = 'seller-settings-tab-profile'
  const passwordTabId = 'seller-settings-tab-password'
  const shopTabId = 'seller-settings-tab-shop'
  const payoutsTabId = 'seller-settings-tab-payouts'
  const documentsTabId = 'seller-settings-tab-documents'
  const profilePanelId = 'seller-settings-panel-profile'
  const passwordPanelId = 'seller-settings-panel-password'
  const shopPanelId = 'seller-settings-panel-shop'
  const payoutsPanelId = 'seller-settings-panel-payouts'
  const documentsPanelId = 'seller-settings-panel-documents'

  if (loading) {
    return (
      <div className={styles.page}>
        <nav className={styles.tabBar} aria-label="Settings sections">
          {['profile', 'password', 'shop', 'payouts', 'documents'].map((tab) => (
            <button
              key={tab}
              type="button"
              disabled
              className={`${styles.tabItem} ${activeTab === tab ? styles.tabItemActive : ''}`}
            >
              <span className={styles.tabLabel}>
                {tab === 'profile'
                  ? 'Profile'
                  : tab === 'password'
                    ? 'Password'
                    : tab === 'shop'
                      ? 'Shop information'
                      : tab === 'payouts'
                        ? 'Payouts'
                        : 'Documents'}
              </span>
            </button>
          ))}
        </nav>
        <div className={`${styles.contentArea} ${styles.grid}`}>
          <section
            className={`${styles.card} ${styles.full}`}
            role="status"
            aria-live="polite"
            aria-busy="true"
            aria-label="Loading settings"
          >
            <div className={styles.tabDetailHead} aria-hidden>
              <span className={`${styles.settingsSkBar} ${styles.settingsSkHeadTitle}`} />
              <span className={`${styles.settingsSkBar} ${styles.settingsSkHeadSub}`} />
            </div>
            <div className={styles.settingsSkProfileRow}>
              <span className={`${styles.settingsSkBar} ${styles.settingsSkAvatar}`} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <span className={`${styles.settingsSkBar} ${styles.settingsSkField}`} />
                <span className={`${styles.settingsSkBar} ${styles.settingsSkField}`} />
              </div>
            </div>
            <div className={styles.settingsSkTwoCol} aria-hidden>
              <span className={`${styles.settingsSkBar} ${styles.settingsSkFieldShort}`} />
              <span className={`${styles.settingsSkBar} ${styles.settingsSkFieldShort}`} />
            </div>
            <span className={`${styles.settingsSkBar} ${styles.settingsSkField}`} />
            <span className={`${styles.settingsSkBar} ${styles.settingsSkField}`} style={{ maxWidth: 280 }} />
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
        {sellerCanChangePassword === true && (
          <button
            type="button"
            id={passwordTabId}
            className={`${styles.tabItem} ${activeTab === 'password' ? styles.tabItemActive : ''}`}
            onClick={() => goTab('password')}
            aria-current={activeTab === 'password' ? 'page' : undefined}
          >
            <span className={styles.tabLabel}>Password</span>
          </button>
        )}
        <button
          type="button"
          id={shopTabId}
          className={`${styles.tabItem} ${activeTab === 'shop' ? styles.tabItemActive : ''}`}
          onClick={() => goTab('shop')}
          aria-current={activeTab === 'shop' ? 'page' : undefined}
        >
          <span className={styles.tabLabel}>Shop information</span>
        </button>
        <button
          type="button"
          id={payoutsTabId}
          className={`${styles.tabItem} ${activeTab === 'payouts' ? styles.tabItemActive : ''}`}
          onClick={() => goTab('payouts')}
          aria-current={activeTab === 'payouts' ? 'page' : undefined}
        >
          <span className={styles.tabLabel}>Payouts</span>
        </button>
        <button
          type="button"
          id={documentsTabId}
          className={`${styles.tabItem} ${activeTab === 'documents' ? styles.tabItemActive : ''}`}
          onClick={() => goTab('documents')}
          aria-current={activeTab === 'documents' ? 'page' : undefined}
        >
          <span className={styles.tabLabel}>Documents</span>
        </button>
      </nav>

      <div className={`${styles.contentArea} ${styles.grid}`}>
        {activeTab === 'payouts' && (
          <section
            id={payoutsPanelId}
            role="tabpanel"
            aria-labelledby={payoutsTabId}
            className={`${styles.card} ${styles.full}`}
          >
            <div className={styles.tabDetailHead}>
              <div className={styles.tabDetailHeadRow}>
                <div className={styles.tabDetailHeadText}>
                  <h2 className={styles.tabDetailTitle}>Payout settings</h2>
                  <p className={styles.tabDetailSubtitle}>
                    Add the account details admins need to release seller payouts.
                  </p>
                </div>
              </div>
            </div>
            <form className={styles.form} onSubmit={handleSavePayout}>
              <label className={styles.field}>
                <span className={styles.label}>Payout method</span>
                <select
                  className={styles.input}
                  value={payoutForm.payoutMethod}
                  onChange={(e) => onPayoutFieldChange('payoutMethod', e.target.value)}
                >
                  <option value="bank">Bank transfer</option>
                  <option value="gcash">GCash</option>
                  <option value="manual">Manual / other</option>
                </select>
              </label>
              {payoutForm.payoutMethod === 'bank' && (
                <>
                  <label className={styles.field}>
                    <span className={styles.label}>Account holder name</span>
                    <input className={styles.input} value={payoutForm.accountHolderName} onChange={(e) => onPayoutFieldChange('accountHolderName', e.target.value)} />
                  </label>
                  <label className={styles.field}>
                    <span className={styles.label}>Bank name</span>
                    <input className={styles.input} value={payoutForm.bankName} onChange={(e) => onPayoutFieldChange('bankName', e.target.value)} />
                  </label>
                  <label className={styles.field}>
                    <span className={styles.label}>Account number</span>
                    <input
                      className={styles.input}
                      type="password"
                      autoComplete="off"
                      value={payoutForm.accountNumber}
                      onChange={(e) => onPayoutFieldChange('accountNumber', e.target.value)}
                    />
                  </label>
                </>
              )}
              {payoutForm.payoutMethod === 'gcash' && (
                <>
                  <label className={styles.field}>
                    <span className={styles.label}>GCash account name</span>
                    <input className={styles.input} value={payoutForm.gcashName} onChange={(e) => onPayoutFieldChange('gcashName', e.target.value)} />
                  </label>
                  <label className={styles.field}>
                    <span className={styles.label}>GCash number</span>
                    <input
                      className={styles.input}
                      type="password"
                      autoComplete="off"
                      value={payoutForm.gcashNumber}
                      onChange={(e) => onPayoutFieldChange('gcashNumber', e.target.value)}
                    />
                  </label>
                </>
              )}
              <label className={styles.field}>
                <span className={styles.label}>Payout email</span>
                <input className={styles.input} type="email" value={payoutForm.payoutEmail} onChange={(e) => onPayoutFieldChange('payoutEmail', e.target.value)} />
              </label>
              <label className={styles.field}>
                <span className={styles.label}>Admin notes</span>
                <textarea className={`${styles.input} ${styles.textarea}`} value={payoutForm.notes} onChange={(e) => onPayoutFieldChange('notes', e.target.value)} />
              </label>
              <div className={styles.headActions}>
                <button type="submit" className={styles.primaryBtn} disabled={payoutSaving}>
                  <FiSave /> {payoutSaving ? 'Saving...' : 'Save payout settings'}
                </button>
              </div>
            </form>
          </section>
        )}

        {activeTab === 'documents' && (
          <section
            id={documentsPanelId}
            role="tabpanel"
            aria-labelledby={documentsTabId}
            className={`${styles.card} ${styles.full}`}
          >
            <div className={styles.tabDetailHead}>
              <div className={styles.tabDetailHeadRow}>
                <div className={styles.tabDetailHeadText}>
                  <h2 className={styles.tabDetailTitle}>Compliance documents</h2>
                  <p className={styles.tabDetailSubtitle}>
                    Upload business permits, IDs, and payout verification files for admin review.
                  </p>
                </div>
              </div>
            </div>
            <form className={styles.form} onSubmit={handleUploadDocument}>
              <label className={styles.field}>
                <span className={styles.label}>Document type</span>
                <select className={styles.input} value={documentType} onChange={(e) => setDocumentType(e.target.value)}>
                  <option value="business_permit">Business permit</option>
                  <option value="valid_id">Valid ID</option>
                  <option value="bank_proof">Bank proof</option>
                  <option value="other">Other</option>
                </select>
              </label>
              <label className={styles.field}>
                <span className={styles.label}>File</span>
                <input ref={documentFileRef} className={styles.input} type="file" accept=".pdf,image/png,image/jpeg,image/webp" />
              </label>
              <div className={styles.headActions}>
                <button type="submit" className={styles.primaryBtn} disabled={documentUploading}>
                  <FaUpload /> {documentUploading ? 'Uploading...' : 'Upload document'}
                </button>
              </div>
            </form>
            <div className={styles.profileDetails} style={{ marginTop: 18 }}>
              {documents.length === 0 ? (
                <p className={styles.loadingText}>No documents uploaded yet.</p>
              ) : (
                documents.map((doc) => (
                  <div key={doc.id} className={styles.settingsRow}>
                    <div className={styles.settingsRowMeta}>
                      <div className={styles.settingsRowTitleRow}>
                        <h3 className={styles.settingsRowTitle}>{doc.displayName}</h3>
                      </div>
                      <p className={styles.settingsRowDesc}>
                        {doc.documentType.replace(/_/g, ' ')} · {doc.status}
                      </p>
                    </div>
                    <div className={`${styles.settingsRowControl} ${styles.headActions}`}>
                      {doc.previewUrl && (
                        <a
                          className={styles.secondaryBtn}
                          href={doc.previewUrl}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Preview
                        </a>
                      )}
                      {doc.status !== 'approved' && (
                        <button type="button" className={styles.dangerBtn} onClick={() => handleDeleteDocument(doc.id)}>
                          <TbTrash /> Remove
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        )}

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
                    <div className={`${styles.shopGridField} ${styles.shopFieldGridFull}`}>
                      <label htmlFor={shopId('turnaround')} className={styles.shopGridLabel}>
                        Typical response / lead time
                      </label>
                      <input
                        id={shopId('turnaround')}
                        type="text"
                        value={shopForm.shopTurnaround}
                        onChange={(e) => onShopFieldChange('shopTurnaround', e.target.value)}
                        className={`${styles.input} ${!isEditingShop || !canEditShop ? styles.inputReadOnly : ''}`}
                        disabled={!isEditingShop || !canEditShop}
                        placeholder='e.g. "Within 24 hours", "Same day", "1–2 business days"'
                        maxLength={160}
                      />
                      <p className={styles.shopGridHint}>
                        Optional. Shown on your public seller profile as average turnaround (buyers know how quickly you usually reply or start service).
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

        {activeTab === 'password' &&
          sellerCanChangePassword !== true && (
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
                      {sellerCanChangePassword === null
                        ? 'Checking your sign-in method...'
                        : 'Password change is available only for email/password accounts.'}
                    </p>
                  </div>
                </div>
              </div>
            </section>
          )}

        {sellerCanChangePassword === true && activeTab === 'password' && (
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
                      <button
                        type="button"
                        className={styles.secondaryBtn}
                        onClick={onCancelPasswordEdit}
                        disabled={passwordSaving}
                      >
                        Cancel
                      </button>
                      <button
                        form={formId}
                        type="submit"
                        className={styles.primaryBtn}
                        disabled={passwordSaving}
                        aria-busy={passwordSaving}
                      >
                        <FiSave /> {passwordSaving ? 'Saving…' : 'Save Changes'}
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
            <form
              id={formId}
              onSubmit={handlePasswordSubmit}
              className={styles.form}
              aria-busy={passwordSaving}
            >
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
                    disabled={!isEditingPassword || passwordSaving}
                    autoComplete="current-password"
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
                    disabled={!isEditingPassword || passwordSaving}
                    autoComplete="new-password"
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
                    disabled={!isEditingPassword || passwordSaving}
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
