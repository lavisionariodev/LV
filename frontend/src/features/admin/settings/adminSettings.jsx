'use client'

import { useRef, useState } from 'react'
import { useAdminProfileForm } from './adminProfile'

/**
 * Shared avatar upload control. Accepts a callback `onUploaded(url)`.
 *
 * Uses Supabase storage bucket `avatars` (matches existing AdminSettings/AdminProfile flows).
 */
export function AdminAvatarUpload({ supabase, userId, currentUrl, onUploaded, toast, className }) {
  const fileRef = useRef(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const onPick = () => fileRef.current?.click()

  const onChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file || !userId) return
    setError('')
    setBusy(true)
    try {
      const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
      const path = `admin/${userId}/${Date.now()}.${ext}`
      const { error: upErr } = await supabase.storage
        .from('avatars')
        .upload(path, file, { upsert: true, contentType: file.type })
      if (upErr) throw upErr
      const { data: publicUrlData } = supabase.storage.from('avatars').getPublicUrl(path)
      const url = publicUrlData?.publicUrl
      if (!url) throw new Error('Failed to resolve uploaded avatar URL.')

      const { error: updateErr } = await supabase
        .from('admins')
        .update({ avatar_url: url, updated_at: new Date().toISOString() })
        .eq('id', userId)
      if (updateErr) throw updateErr

      onUploaded?.(url)
      toast?.success?.('Avatar updated.')
    } catch (err) {
      setError(err?.message || 'Upload failed.')
      toast?.error?.(err?.message || 'Upload failed.')
    } finally {
      setBusy(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  return (
    <div className={className} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <div
        style={{
          width: 56,
          height: 56,
          borderRadius: '50%',
          background: '#e2e8f0',
          backgroundImage: currentUrl ? `url(${currentUrl})` : 'none',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
        aria-hidden
      />
      <div>
        <button type="button" onClick={onPick} disabled={busy}>
          {busy ? 'Uploading…' : 'Change avatar'}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          onChange={onChange}
          style={{ display: 'none' }}
        />
        {error ? (
          <p role="alert" style={{ color: '#b91c1c', fontSize: 12, marginTop: 6 }}>
            {error}
          </p>
        ) : null}
      </div>
    </div>
  )
}

/**
 * Shared password change section. Uses the existing `changePasswordWithReauth`
 * helper (passed in to keep this file independent of import paths).
 */
export function AdminPasswordSection({ supabase, changePasswordWithReauth, toast, className }) {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const onSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      const result = await changePasswordWithReauth(supabase, {
        currentPassword,
        newPassword,
        confirmPassword,
      })
      if (!result?.ok) {
        setError(result?.error || 'Could not update password.')
        toast?.error?.(result?.error || 'Could not update password.')
        return
      }
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      toast?.success?.('Password updated.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form className={className} onSubmit={onSubmit}>
      <h3 style={{ margin: 0, fontSize: 16 }}>Change password</h3>
      {error ? (
        <p role="alert" style={{ color: '#b91c1c', margin: '8px 0', fontSize: 13 }}>
          {error}
        </p>
      ) : null}
      <div style={{ display: 'grid', gap: 8, marginTop: 8 }}>
        <label style={{ display: 'grid', gap: 4, fontSize: 12 }}>
          Current password
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
            style={{ padding: '6px 10px' }}
          />
        </label>
        <label style={{ display: 'grid', gap: 4, fontSize: 12 }}>
          New password
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            minLength={8}
            required
            style={{ padding: '6px 10px' }}
          />
        </label>
        <label style={{ display: 'grid', gap: 4, fontSize: 12 }}>
          Confirm new password
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            minLength={8}
            required
            style={{ padding: '6px 10px' }}
          />
        </label>
      </div>
      <div style={{ marginTop: 12 }}>
        <button type="submit" disabled={saving}>
          {saving ? 'Saving…' : 'Update password'}
        </button>
      </div>
    </form>
  )
}

/**
 * Shared, layout-light personal-info section for admin profile/settings pages.
 *
 * NOTE: Admin settings and profile routes still use their own tightly-styled JSX.
 * This component exists for new admin profile surfaces (e.g. an embedded modal)
 * and to make the canonical save flow available.
 */
export function AdminPersonalSection({ supabase, toast, className }) {
  const form = useAdminProfileForm({ supabase, toast })
  const [saving, setSaving] = useState(false)

  if (form.loading) {
    return (
      <section className={className} aria-busy>
        Loading…
      </section>
    )
  }

  return (
    <section className={className}>
      <h3 style={{ margin: 0, fontSize: 16 }}>Personal information</h3>
      {form.saveError ? (
        <p role="alert" style={{ color: '#b91c1c', margin: '8px 0', fontSize: 13 }}>
          {form.saveError}
        </p>
      ) : null}
      {form.emailVerificationPending ? (
        <p style={{ color: '#0f766e', margin: '8px 0', fontSize: 13 }}>
          Verification email sent. The change applies after you confirm it.
        </p>
      ) : null}
      <div style={{ display: 'grid', gap: 8, marginTop: 8 }}>
        <label style={{ display: 'grid', gap: 4, fontSize: 12 }}>
          First name
          <input
            value={form.draftFirstName}
            onChange={(e) => form.setDraftFirstName(e.target.value)}
            disabled={!form.isEditing}
            style={{ padding: '6px 10px' }}
          />
        </label>
        <label style={{ display: 'grid', gap: 4, fontSize: 12 }}>
          Last name
          <input
            value={form.draftLastName}
            onChange={(e) => form.setDraftLastName(e.target.value)}
            disabled={!form.isEditing}
            style={{ padding: '6px 10px' }}
          />
        </label>
        <label style={{ display: 'grid', gap: 4, fontSize: 12 }}>
          Email
          <input
            type="email"
            value={form.draftEmail}
            onChange={(e) => form.setDraftEmail(e.target.value)}
            disabled={!form.isEditing}
            style={{ padding: '6px 10px' }}
          />
        </label>
        <label style={{ display: 'grid', gap: 4, fontSize: 12 }}>
          SMS phone
          <input
            value={form.draftSmsPhone}
            onChange={(e) => form.setDraftSmsPhone(e.target.value)}
            disabled={!form.isEditing}
            style={{ padding: '6px 10px' }}
          />
        </label>
      </div>
      <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
        {form.isEditing ? (
          <>
            <button
              type="button"
              onClick={async () => {
                setSaving(true)
                try {
                  await form.save()
                } finally {
                  setSaving(false)
                }
              }}
              disabled={saving}
            >
              {saving ? 'Saving…' : 'Save changes'}
            </button>
            <button type="button" onClick={form.cancelEdit} disabled={saving}>
              Cancel
            </button>
          </>
        ) : (
          <button type="button" onClick={form.startEdit}>
            Edit
          </button>
        )}
      </div>
    </section>
  )
}
