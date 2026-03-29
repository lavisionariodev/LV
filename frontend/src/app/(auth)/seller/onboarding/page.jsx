'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import styles from './onboarding.module.css'
import { useAuth } from '@/contexts/AuthContext'
import { getSellerByUserId, upsertSellerForUser } from '@/lib/sellers/client'
import { useToast } from '@/contexts/ToastContext'

export default function SellerOnboardingPage() {
  const { user } = useAuth()
  const router = useRouter()
  const toast = useToast()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    businessName: '',
    contactName: '',
    email: '',
    phone: '',
    businessInfo: '',
    address: '',
  })

  useEffect(() => {
    let cancelled = false

    async function load() {
      if (!user) {
        setLoading(false)
        return
      }

      try {
        const existing = await getSellerByUserId(user.id)
        if (cancelled) return

        if (existing?.status === 'active') {
          router.replace('/seller')
          return
        }

        setForm((prev) => ({
          businessName: existing?.business_name || prev.businessName || '',
          contactName: existing?.contact_name || prev.contactName || (user.user_metadata?.full_name || ''),
          email: existing?.email || prev.email || user.email || '',
          phone: existing?.phone || prev.phone || '',
          businessInfo: existing?.business_info || prev.businessInfo || '',
          address: existing?.address || prev.address || '',
        }))
      } catch (err) {
        console.error('Failed to load seller info:', err)
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    load()

    return () => {
      cancelled = true
    }
  }, [user])

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!user || saving) return

    if (!form.businessName.trim() || !form.contactName.trim() || !form.email.trim()) {
      toast.error('Please fill in at least business name, contact name, and email.')
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
        status: 'pending',
      })

      if (error) {
        toast.error(error)
        return
      }

      toast.success('Shop information submitted! Your seller account is now pending review.')
      router.replace('/')
    } catch (err) {
      console.error('Failed to save seller onboarding info:', err)
      toast.error('An error occurred while saving your details. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  if (!user && loading) {
    return (
      <div className={styles.loadingShell}>
        Checking your session…
      </div>
    )
  }

  if (!user) {
    return (
      <div className={styles.loadingShell}>
        You must be signed in as a seller to complete onboarding.
      </div>
    )
  }

  return (
    <main className={styles.wrapper}>
      <section className={styles.header}>
        <div className={styles.headerInner}>
          <div>
            <h1 className={styles.title}>Seller Onboarding</h1>
            <p className={styles.subtitle}>
              Tell us about your shop so we can verify your account and list your services.
            </p>
          </div>
          <div className={styles.badge}>Step 1 of 1</div>
        </div>
      </section>

      <section className={styles.content}>
        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Shop information</h2>
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
                />
              </div>
            </div>
          </div>

          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Business details</h2>
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
                />
              </div>
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Business address</label>
              <input
                type="text"
                className={styles.input}
                value={form.address}
                onChange={(e) => handleChange('address', e.target.value)}
                placeholder="Street, city, province"
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Business description</label>
              <textarea
                className={`${styles.input} ${styles.textarea}`}
                rows={4}
                value={form.businessInfo}
                onChange={(e) => handleChange('businessInfo', e.target.value)}
                placeholder="Share the types of funeral or memorial services you offer, coverage areas, and any specializations."
              />
            </div>
          </div>

          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Permits & documents</h2>
            <p className={styles.helperText}>
              For now, you can proceed without uploading files. Our team may reach out to request
              business permits, accreditation, or other documents during the review.
            </p>
            <div className={styles.placeholderBox}>
              Document upload will be available in a future update.
            </div>
          </div>

          <div className={styles.actions}>
            <button
              type="submit"
              className={styles.primaryButton}
              disabled={saving}
            >
              {saving ? 'Submitting…' : 'Submit for review'}
            </button>
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={() => router.push('/')}
            >
              Back to homepage
            </button>
          </div>
        </form>
      </section>
    </main>
  )
}

