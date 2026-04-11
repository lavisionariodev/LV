'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import styles from './onboarding.module.css'
import { useAuth } from '@/contexts/AuthContext'
import { getSellerByUserId, upsertSellerForUser } from '@/lib/sellers/client'
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
  const [form, setForm] = useState({
    businessName: '',
    contactName: '',
    email: '',
    phone: '',
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

        setSellerStatus(existing?.status || null)

        setForm((prev) => ({
          businessName: existing?.business_name || prev.businessName || '',
          contactName: existing?.contact_name || prev.contactName || (user.user_metadata?.full_name || ''),
          email: existing?.email || prev.email || user.email || '',
          phone: existing?.phone || prev.phone || '',
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

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!user || saving || sellerStatus === 'pending') return

    if (!form.businessName.trim() || !form.contactName.trim() || !form.email.trim()) {
      toast.error('Please fill in at least business name, contact name, and email.')
      return
    }

    if (!form.businessStartedAt?.trim()) {
      toast.error('Please select when your business began operations (In service since).')
      return
    }

    setSaving(true)
    try {
      const { error } = await upsertSellerForUser(user, {
        businessName: form.businessName.trim(),
        contactName: form.contactName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        businessInfo: form.businessInfo.trim(),
        address: form.address.trim(),
        businessStartedAt: form.businessStartedAt.trim(),
        status: 'pending',
      })

      if (error) {
        toast.error(error)
        return
      }

      toast.success('Shop information submitted! Your seller account is now pending review.')
      setSellerStatus('pending')
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

        {/* Form card */}
        <div className={styles.card}>
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
                You can proceed without uploading files for now. Our team may reach out to request
                business permits, accreditation, or other documents during the review process.
              </p>
              <div className={styles.placeholderBox}>
                <IconUpload />
                Document upload will be available in a future update.
              </div>
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

      </main>
    </div>
  )
}