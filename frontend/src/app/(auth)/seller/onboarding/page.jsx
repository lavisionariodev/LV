'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import styles from './onboarding.module.css'
import { useAuth } from '@/contexts/AuthContext'
import SellerComplianceDocuments from '@/features/seller/compliance/SellerComplianceDocuments'
import {
  SELLER_BUSINESS_TYPE_OTHER,
  SELLER_BUSINESS_TYPE_PRESETS,
  businessTypeLabelFromFormState,
  businessTypeLabelToFormState,
  getSellerByUserId,
  upsertSellerForUser,
  validateSellerBusinessTypeForm,
  validateSellerShopUsername,
  validateSellerSpecialtiesInput,
  validateSellerTagline,
} from '@/lib/sellers/client'
import { getUserRole, ROLE_SELLER } from '@/lib/auth/roles'
import { useToast } from '@/contexts/ToastContext'

/* ── Inline SVG icons (no extra dep needed) ── */
function IconShop() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l1-5h16l1 5" /><path d="M3 9a2 2 0 0 0 4 0 2 2 0 0 0 4 0 2 2 0 0 0 4 0 2 2 0 0 0 4 0" />
      <path d="M5 21V9M19 9v12" /><rect x="9" y="13" width="6" height="8" rx="1" />
    </svg>
  )
}

function IconContact() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
    </svg>
  )
}

function IconDoc() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
      <line x1="9" y1="13" x2="15" y2="13" /><line x1="9" y1="17" x2="13" y2="17" />
    </svg>
  )
}

function IconUpload() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="16 16 12 12 8 16" /><line x1="12" y1="12" x2="12" y2="21" />
      <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" />
    </svg>
  )
}

export default function SellerOnboardingPage() {
  const { user } = useAuth()
  const router = useRouter()
  const toast = useToast()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [sellerStatus, setSellerStatus] = useState(null)
  const [rejectionReasonShown, setRejectionReasonShown] = useState(null)
  /** Rejected sellers see reviewer note first; they tap a button before the onboarding form opens. */
  const [rejectedFormUnlocked, setRejectedFormUnlocked] = useState(false)
  const formCardRef = useRef(null)
  const [form, setForm] = useState({
    businessName: '',
    shopUsername: '',
    shopBusinessTypeChoice: '',
    shopBusinessTypeOtherSpecify: '',
    contactName: '',
    email: '',
    phone: '',
    tagline: '',
    specialtiesLines: '',
    businessInfo: '',
    address: '',
    businessStartedAt: '',
  })

  useEffect(() => {
    let cancelled = false

    async function load() {
      if (!user) {
        setLoading(false)
        return
      }

      try {
        const role = await getUserRole(user.id)
        if (cancelled) return

        if (role !== ROLE_SELLER) {
          router.replace('/')
          return
        }

        const existing = await getSellerByUserId(user.id)
        if (cancelled) return

        if (existing?.status === 'active') {
          router.replace('/seller')
          return
        }

        const statusRaw = existing?.status || null
        setSellerStatus(statusRaw)

        /* Rejected: keep the reviewer note but clear the prior submission so shop details start fresh */
        const isRejected = statusRaw === 'rejected'
        setRejectionReasonShown(
          isRejected && typeof existing.rejection_reason === 'string'
            ? existing.rejection_reason.trim()
            : null,
        )

        if (isRejected) {
          setRejectedFormUnlocked(false)
          return
        }

        const bizType = businessTypeLabelToFormState(existing?.business_type_label)
        setForm((prev) => ({
          businessName: existing?.business_name || prev.businessName || '',
          shopUsername: existing?.username || prev.shopUsername || '',
          shopBusinessTypeChoice: bizType.choice || prev.shopBusinessTypeChoice || '',
          shopBusinessTypeOtherSpecify:
            bizType.otherSpecify || prev.shopBusinessTypeOtherSpecify || '',
          contactName: existing?.contact_name || prev.contactName || (user.user_metadata?.full_name || ''),
          email: existing?.email || prev.email || user.email || '',
          phone: existing?.phone || prev.phone || '',
          tagline: existing?.tagline || prev.tagline || '',
          specialtiesLines: Array.isArray(existing?.specialties)
            ? existing.specialties.map((x) => String(x)).filter(Boolean).join('\n')
            : prev.specialtiesLines || '',
          businessInfo: existing?.business_info || prev.businessInfo || '',
          address: existing?.address || prev.address || '',
          businessStartedAt: existing?.business_started_at
            ? String(existing.business_started_at).slice(0, 10)
            : prev.businessStartedAt || '',
        }))
      } catch (err) {
        console.error('Failed to load seller info:', err)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [user])

  const buildFreshRejectedFormDraft = useCallback(() => ({
    businessName: '',
    shopUsername: '',
    shopBusinessTypeChoice: '',
    shopBusinessTypeOtherSpecify: '',
    contactName: String(user?.user_metadata?.full_name ?? '').trim(),
    email: String(user?.email ?? '').trim(),
    phone: '',
    tagline: '',
    specialtiesLines: '',
    businessInfo: '',
    address: '',
    businessStartedAt: '',
  }), [user])

  const handleStartNewApplicationAfterRejection = useCallback(() => {
    setForm(buildFreshRejectedFormDraft())
    setRejectedFormUnlocked(true)
    requestAnimationFrame(() => {
      formCardRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'start' })
    })
  }, [buildFreshRejectedFormDraft])

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const onBusinessTypeChoiceChange = (value) => {
    setForm((prev) => ({
      ...prev,
      shopBusinessTypeChoice: value,
      shopBusinessTypeOtherSpecify:
        value === SELLER_BUSINESS_TYPE_OTHER ? prev.shopBusinessTypeOtherSpecify : '',
    }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!user || saving || sellerStatus === 'pending') return

    if (sellerStatus === 'rejected' && !rejectedFormUnlocked) {
      toast.info('Tap “Submit new application” below the reviewer feedback to begin a fresh onboarding form.')
      return
    }

    if (!form.businessName.trim() || !form.contactName.trim() || !form.email.trim()) {
      toast.error('Please fill in business name, contact name, and email.')
      return
    }
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) {
      toast.error('Please enter a valid business email address.')
      return
    }

    if (!form.businessStartedAt?.trim()) {
      toast.error('Please select when your business began operations (In service since).')
      return
    }

    if (!String(form.shopUsername ?? '').trim()) {
      toast.error('Please enter a shop username (public @handle).')
      return
    }
    const uErr = validateSellerShopUsername(form.shopUsername)
    if (uErr) {
      toast.error(uErr)
      return
    }

    if (!String(form.shopBusinessTypeChoice ?? '').trim()) {
      toast.error('Please select a business type label.')
      return
    }
    const bizErr = validateSellerBusinessTypeForm(
      form.shopBusinessTypeChoice,
      form.shopBusinessTypeOtherSpecify,
    )
    if (bizErr) {
      toast.error(bizErr)
      return
    }

    if (!String(form.tagline ?? '').trim()) {
      toast.error('Please enter a shop tagline (short summary for your public profile).')
      return
    }
    const tagErr = validateSellerTagline(form.tagline)
    if (tagErr) {
      toast.error(tagErr)
      return
    }

    const specLines =
      typeof form.specialtiesLines === 'string'
        ? form.specialtiesLines
            .split(/[\n,]+/)
            .map((s) => s.trim())
            .filter(Boolean)
        : []
    if (specLines.length === 0) {
      toast.error('Please enter at least one specialty (one per line).')
      return
    }
    const specErr = validateSellerSpecialtiesInput(form.specialtiesLines ?? '')
    if (specErr) {
      toast.error(specErr)
      return
    }

    setSaving(true)
    try {
      const bizLabel =
        businessTypeLabelFromFormState(
          form.shopBusinessTypeChoice,
          form.shopBusinessTypeOtherSpecify,
        ) ?? ''

      const { error } = await upsertSellerForUser(user, {
        businessName: form.businessName.trim(),
        username: form.shopUsername.trim(),
        tagline: form.tagline.trim(),
        businessTypeLabel: bizLabel,
        contactName: form.contactName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        specialties: form.specialtiesLines ?? '',
        businessInfo: form.businessInfo.trim(),
        address: form.address.trim(),
        businessStartedAt: form.businessStartedAt.trim(),
        status: 'pending',
      })

      if (error) {
        toast.error(error)
        return
      }

      toast.success(
        sellerStatus === 'rejected'
          ? 'Your updated application has been resubmitted and is pending review.'
          : 'Shop information submitted! Your seller account is now pending review.',
      )
      setSellerStatus('pending')
      setRejectionReasonShown(null)
      setRejectedFormUnlocked(false)
    } catch (err) {
      console.error('Failed to save seller onboarding info:', err)
      toast.error('An error occurred while saving your details. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  /* ── Loading / auth states ── */
  if (!user && loading) {
    return <div className={styles.loadingShell}>Checking your session…</div>
  }

  if (!user) {
    return (
      <div className={styles.loadingShell}>
        You must be signed in as a seller to complete onboarding.
      </div>
    )
  }

  /* ── Main UI ── */
  return (
    <div className={styles.pageWrapper}>

      {/* Sticky top bar */}
      <header className={styles.topBar}>
        <div className={styles.topBarInner}>
          <div className={styles.logoMark}>
            <div className={styles.logoIcon}>S</div>
            <span className={styles.logoName}>Seller Centre</span>
          </div>
          <span className={styles.topBarMeta}>Seller Onboarding</span>
        </div>
      </header>

      <main className={styles.wrapper}>

        {/* Page heading */}
        <div className={styles.header}>
          <p className={styles.eyebrow}>Seller Onboarding</p>
          <h1 className={styles.title}>Set up your shop</h1>
          <p className={styles.subtitle}>
            {sellerStatus === 'pending'
              ? 'Your business information has been submitted and is being reviewed by our team.'
              : sellerStatus === 'rejected'
                ? rejectedFormUnlocked
                  ? 'You’re submitting a fresh application with new shop details. Complete every section below, then send it for review again.'
                  : 'Your previous application wasn’t approved. Read the reviewer’s feedback, then tap Submit new application to open a blank form and try again.'
                : 'Fill in your business details so we can verify your account and get your services listed.'}
          </p>
        </div>

        {sellerStatus === 'pending' && (
          <div className={styles.pendingBanner} role="status" aria-live="polite">
            <span className={styles.pendingBadge}>Pending Review</span>
            <span className={styles.pendingBannerText}>
              We’ll review your details and activate your seller account once approved. You can view your submitted information below.
            </span>
          </div>
        )}

        {sellerStatus === 'rejected' && (
          <div className={styles.rejectedBanner} role="alert">
            <span className={styles.rejectedBadge}>Not Approved</span>
            <div className={styles.rejectedBannerBody}>
              <p className={styles.rejectedBannerLead}>
                {rejectedFormUnlocked
                  ? 'Reviewer feedback (for reference while you refill the form below).'
                  : 'This onboarding submission could not be approved. Please read the reviewer’s comments carefully before starting a new application.'}
              </p>
              {rejectionReasonShown ? (
                <pre className={styles.rejectedReason}>{rejectionReasonShown}</pre>
              ) : (
                <p className={styles.rejectedBannerText}>Please follow the emailed instructions before applying again.</p>
              )}
            </div>
          </div>
        )}

        {sellerStatus === 'rejected' && !rejectedFormUnlocked && (
          <div className={styles.rejectedGate}>
            <button
              type="button"
              className={styles.rejectedGateButton}
              onClick={handleStartNewApplicationAfterRejection}
            >
              Submit new application
            </button>
            <p className={styles.rejectedGateHint}>
              Opens a clean onboarding form. Your old answers stay in our records until you submit this new application.
            </p>
          </div>
        )}

        {(sellerStatus !== 'rejected' || rejectedFormUnlocked) && (
          <div className={styles.card} ref={formCardRef}>
          <form className={styles.form} onSubmit={handleSubmit}>

            {/* ── Section 1: Shop info ── */}
            <div className={styles.section}>
              <div className={styles.sectionHeader}>
                <div className={styles.sectionIcon}><IconShop /></div>
                <span className={styles.sectionTitle}>Shop Information</span>
              </div>
              <div className={styles.fieldGrid}>
                <div className={styles.field}>
                  <label className={styles.label}>
                    Business / Shop name <span className={styles.required}>*</span>
                  </label>
                  <input
                    type="text"
                    className={styles.input}
                    value={form.businessName}
                    onChange={(e) => handleChange('businessName', e.target.value)}
                    placeholder="e.g. Peaceful Rest Funeral Home"
                    disabled={sellerStatus === 'pending' || saving}
                  />
                </div>

                <div className={styles.field}>
                  <label className={styles.label}>
                    Shop username <span className={styles.required}>*</span>
                  </label>
                  <input
                    type="text"
                    className={styles.input}
                    value={form.shopUsername}
                    onChange={(e) => handleChange('shopUsername', e.target.value)}
                    placeholder="your_shop_handle"
                    autoComplete="nickname"
                    spellCheck={false}
                    disabled={sellerStatus === 'pending' || saving}
                  />
                  <p className={styles.helperInline}>
                    Shows as @handle on your public profile. Letters, numbers, underscores; 3–30 characters.
                  </p>
                </div>

                <div className={`${styles.field} ${styles.fullWidth}`}>
                  <label htmlFor="onboarding-biz-type" className={styles.label}>
                    Business type label <span className={styles.required}>*</span>
                  </label>
                  <select
                    id="onboarding-biz-type"
                    className={`${styles.input} ${styles.selectInput}`}
                    value={form.shopBusinessTypeChoice}
                    onChange={(e) => onBusinessTypeChoiceChange(e.target.value)}
                    disabled={sellerStatus === 'pending' || saving}
                  >
                    <option value="">Select a type…</option>
                    {SELLER_BUSINESS_TYPE_PRESETS.map((label) => (
                      <option key={label} value={label}>
                        {label}
                      </option>
                    ))}
                    <option value={SELLER_BUSINESS_TYPE_OTHER}>Others, please specify</option>
                  </select>
                  {form.shopBusinessTypeChoice === SELLER_BUSINESS_TYPE_OTHER && (
                    <div className={styles.businessTypeOtherWrap}>
                      <input
                        type="text"
                        className={styles.input}
                        aria-label="Specify your business type"
                        value={form.shopBusinessTypeOtherSpecify}
                        onChange={(e) =>
                          handleChange('shopBusinessTypeOtherSpecify', e.target.value)
                        }
                        placeholder="Describe your business type"
                        maxLength={80}
                        disabled={sellerStatus === 'pending' || saving}
                        autoComplete="off"
                      />
                    </div>
                  )}
                  <p className={styles.helperInline}>
                    Used on the Partners directory and filters (80 characters max for custom text).
                  </p>
                </div>

                <div className={styles.field}>
                  <label className={styles.label}>
                    Primary contact person <span className={styles.required}>*</span>
                  </label>
                  <input
                    type="text"
                    className={styles.input}
                    value={form.contactName}
                    onChange={(e) => handleChange('contactName', e.target.value)}
                    placeholder="Full name of the person we coordinate with"
                    disabled={sellerStatus === 'pending' || saving}
                  />
                </div>
              </div>
            </div>

            {/* ── Section 2: Business details ── */}
            <div className={styles.section}>
              <div className={styles.sectionHeader}>
                <div className={styles.sectionIcon}><IconContact /></div>
                <span className={styles.sectionTitle}>Business Details</span>
              </div>
              <div className={styles.fieldGrid}>
                <div className={styles.field}>
                  <label className={styles.label}>
                    Business email <span className={styles.required}>*</span>
                  </label>
                  <input
                    type="email"
                    className={styles.input}
                    value={form.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    placeholder="you@example.com"
                    disabled={sellerStatus === 'pending' || saving}
                  />
                </div>

                <div className={styles.field}>
                  <label className={styles.label}>Business phone</label>
                  <input
                    type="tel"
                    className={styles.input}
                    value={form.phone}
                    onChange={(e) => handleChange('phone', e.target.value)}
                    placeholder="+63 9XX XXX XXXX"
                    disabled={sellerStatus === 'pending' || saving}
                  />
                </div>

                <div className={styles.field}>
                  <label className={styles.label}>
                    Business operating since <span className={styles.required}>*</span>
                  </label>
                  <input
                    type="date"
                    className={styles.input}
                    value={form.businessStartedAt}
                    onChange={(e) => handleChange('businessStartedAt', e.target.value)}
                    max={new Date().toISOString().slice(0, 10)}
                    disabled={sellerStatus === 'pending' || saving}
                  />
                  <p className={styles.helperText} style={{ marginTop: 6 }}>
                    When your funeral or memorial business first began serving families (shown as &quot;In
                    service&quot; on your public shop profile). This is separate from when you joined this
                    website.
                  </p>
                </div>

                <div className={`${styles.field} ${styles.fullWidth}`}>
                  <label className={styles.label}>Business address</label>
                  <input
                    type="text"
                    className={styles.input}
                    value={form.address}
                    onChange={(e) => handleChange('address', e.target.value)}
                    placeholder="Street, city, province"
                    disabled={sellerStatus === 'pending' || saving}
                  />
                </div>

                <div className={`${styles.field} ${styles.fullWidth}`}>
                  <label className={styles.label}>
                    Shop tagline <span className={styles.required}>*</span>
                  </label>
                  <textarea
                    className={`${styles.input} ${styles.textarea}`}
                    rows={3}
                    value={form.tagline}
                    onChange={(e) => handleChange('tagline', e.target.value)}
                    placeholder="One or two short sentences for your public profile (below your stats)."
                    disabled={sellerStatus === 'pending' || saving}
                    maxLength={500}
                  />
                  <p className={styles.helperText} style={{ marginTop: 6 }}>
                    Shown on your storefront as a quick summary. Full story optional in &quot;Business description&quot; below (max 500 characters).
                  </p>
                </div>

                <div className={`${styles.field} ${styles.fullWidth}`}>
                  <label className={styles.label}>
                    Specialties <span className={styles.required}>*</span>
                  </label>
                  <textarea
                    className={`${styles.input} ${styles.textarea}`}
                    rows={4}
                    value={form.specialtiesLines}
                    onChange={(e) => handleChange('specialtiesLines', e.target.value)}
                    placeholder={'One specialty per line.\nShown as badges on your public profile.'}
                    disabled={sellerStatus === 'pending' || saving}
                    spellCheck={true}
                  />
                  <p className={styles.helperText} style={{ marginTop: 6 }}>
                    At least one line required. Up to 24 lines, up to 120 characters each — e.g. services your shop offers.
                  </p>
                </div>

                <div className={`${styles.field} ${styles.fullWidth}`}>
                  <label className={styles.label}>Business description</label>
                  <textarea
                    className={`${styles.input} ${styles.textarea}`}
                    rows={4}
                    value={form.businessInfo}
                    onChange={(e) => handleChange('businessInfo', e.target.value)}
                    placeholder="Share the types of funeral or memorial services you offer, coverage areas, and any specializations."
                    disabled={sellerStatus === 'pending' || saving}
                  />
                </div>
              </div>
            </div>

            {/* ── Section 3: Permits ── */}
            <div className={styles.section}>
              <div className={styles.sectionHeader}>
                <div className={styles.sectionIcon}><IconDoc /></div>
                <span className={styles.sectionTitle}>Permits &amp; Documents</span>
              </div>
              <p className={styles.helperText}>
                Optional uploads help speed up review. You can add or update documents later in Seller
                Settings under Documents after your account is active.
              </p>
              <SellerComplianceDocuments
                className={styles.documentsPanel}
                formClassName={styles.documentsForm}
                fieldClassName={styles.field}
                labelClassName={styles.label}
                inputClassName={styles.input}
                primaryBtnClassName={styles.primaryButton}
                secondaryBtnClassName={styles.secondaryButton}
                dangerBtnClassName={styles.secondaryButton}
                listClassName={styles.documentsList}
                rowClassName={styles.documentRow}
                rowTitleClassName={styles.documentTitle}
                rowDescClassName={styles.helperText}
                emptyClassName={styles.helperText}
                actionsClassName={styles.documentActions}
                disabled={['rejected', 'suspended'].includes(sellerStatus) || saving}
                onToast={(type, message) => {
                  if (type === 'success') toast.success(message)
                  else toast.error(message)
                }}
              />
            </div>

            {/* ── Actions ── */}
            <div className={styles.actions}>
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={() => router.push('/')}
              >
                Back to homepage
              </button>
              <button
                type="submit"
                className={styles.primaryButton}
                disabled={saving || sellerStatus === 'pending'}
              >
                {sellerStatus === 'pending'
                  ? 'Submitted for review'
                  : saving
                    ? 'Submitting…'
                    : 'Submit for review'}
              </button>
            </div>

          </form>
          </div>
        )}

      </main>
    </div>
  )
}