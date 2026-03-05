'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { getSellerByUserId, upsertSellerForUser } from '@/lib/sellers/client'
import { useToast } from '@/contexts/ToastContext'

export default function SellerMyAccountPage() {
  const { user } = useAuth()
  const toast = useToast()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    businessName: '',
    address: '',
    businessInfo: '',
  })

  useEffect(() => {
    let cancelled = false

    async function load() {
      if (!user) {
        setLoading(false)
        return
      }

      try {
        const seller = await getSellerByUserId(user.id)
        if (cancelled) return

        setForm({
          fullName: user.user_metadata?.full_name || '',
          email: user.email || '',
          phone: seller?.phone || '',
          businessName: seller?.business_name || '',
          address: seller?.address || '',
          businessInfo: seller?.business_info || '',
        })
      } catch (err) {
        console.error('Failed to load seller account info:', err)
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

    setSaving(true)
    try {
      const { error } = await upsertSellerForUser(user, {
        businessName: form.businessName.trim(),
        contactName: form.fullName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        address: form.address.trim(),
        businessInfo: form.businessInfo.trim(),
      })

      if (error) {
        toast.error(error)
        return
      }

      toast.success('Account details updated.')
    } catch (err) {
      console.error('Failed to update seller account info:', err)
      toast.error('An error occurred while updating your details. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  if (!user && loading) {
    return (
      <div style={loadingShellStyle}>
        Loading your account…
      </div>
    )
  }

  if (!user) {
    return (
      <div style={loadingShellStyle}>
        You must be signed in as a seller to view this page.
      </div>
    )
  }

  return (
    <main style={{ padding: '2rem 1.5rem', maxWidth: 840, margin: '0 auto' }}>
      <header style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '0.25rem' }}>My Account</h1>
        <p style={{ fontSize: '0.95rem', color: '#4b5563' }}>
          Update your profile and business details used across the seller portal.
        </p>
      </header>

      <form
        onSubmit={handleSubmit}
        style={{
          borderRadius: '0.75rem',
          border: '1px solid #e5e7eb',
          padding: '1.5rem 1.75rem',
          backgroundColor: '#ffffff',
        }}
      >
        <section style={{ marginBottom: '1.5rem' }}>
          <h2 style={sectionTitleStyle}>Profile</h2>
          <div style={fieldGridStyle}>
            <div style={fieldStyle}>
              <label style={labelStyle}>Full name</label>
              <input
                type="text"
                style={inputStyle}
                value={form.fullName}
                onChange={(e) => handleChange('fullName', e.target.value)}
                placeholder="Your full name"
              />
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>Email</label>
              <input
                type="email"
                style={inputStyle}
                value={form.email}
                onChange={(e) => handleChange('email', e.target.value)}
                placeholder="you@example.com"
              />
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>Phone</label>
              <input
                type="tel"
                style={inputStyle}
                value={form.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                placeholder="+63 9XX XXX XXXX"
              />
            </div>
          </div>
        </section>

        <section style={{ marginBottom: '1.5rem' }}>
          <h2 style={sectionTitleStyle}>Business</h2>
          <div style={fieldGridStyle}>
            <div style={fieldStyle}>
              <label style={labelStyle}>Business / Shop name</label>
              <input
                type="text"
                style={inputStyle}
                value={form.businessName}
                onChange={(e) => handleChange('businessName', e.target.value)}
                placeholder="e.g. Peaceful Rest Funeral Home"
              />
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>Address</label>
              <input
                type="text"
                style={inputStyle}
                value={form.address}
                onChange={(e) => handleChange('address', e.target.value)}
                placeholder="Street, city, province"
              />
            </div>
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Business description</label>
            <textarea
              rows={4}
              style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' }}
              value={form.businessInfo}
              onChange={(e) => handleChange('businessInfo', e.target.value)}
              placeholder="Share the types of services you offer, coverage areas, and key differentiators."
            />
          </div>
        </section>

        <div style={{ textAlign: 'right' }}>
          <button
            type="submit"
            disabled={saving}
            style={primaryButtonStyle}
          >
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </form>
    </main>
  )
}

const loadingShellStyle = {
  minHeight: '50vh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '0.95rem',
  color: '#4b5563',
}

const sectionTitleStyle = {
  fontSize: '0.95rem',
  fontWeight: 600,
  marginBottom: '0.75rem',
}

const fieldGridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
  gap: '0.75rem 1rem',
}

const fieldStyle = {
  marginBottom: '0.75rem',
}

const labelStyle = {
  display: 'block',
  fontSize: '0.8rem',
  fontWeight: 500,
  color: '#4b5563',
  marginBottom: '0.25rem',
}

const inputStyle = {
  width: '100%',
  borderRadius: '0.5rem',
  border: '1px solid #e5e7eb',
  padding: '0.45rem 0.6rem',
  fontSize: '0.85rem',
  outline: 'none',
}

const primaryButtonStyle = {
  borderRadius: '999px',
  border: 'none',
  padding: '0.45rem 1.4rem',
  fontSize: '0.85rem',
  fontWeight: 500,
  backgroundColor: '#204F38',
  color: '#ffffff',
  cursor: 'pointer',
}

