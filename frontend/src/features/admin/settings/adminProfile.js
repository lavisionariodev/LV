'use client'

import { resolveStoredAvatar, validateAvatarImage } from '@/shared/utils'
import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase as browserSupabase } from '@/lib/supabase/client'
import { removeAdminAvatar, uploadAdminAvatar } from '@/lib/admin/adminAvatar'
/**
 * Loads the current admin row + avatar public URL for topbar / settings / dashboard.
 * Uses the shared browser Supabase client.
 */
export async function fetchCurrentAdminProfile() {
  const {
    data: { session },
  } = await browserSupabase.auth.getSession()

  let user = session?.user ?? null
  if (!user) {
    const {
      data: { user: verifiedUser },
      error: userError,
    } = await browserSupabase.auth.getUser()
    if (userError || !verifiedUser) throw new Error('Not authenticated.')
    user = verifiedUser
  }

  const { data, error } = await browserSupabase
    .from('admins')
    .select('id, first_name, last_name, email, avatar_url, sms_phone')
    .eq('id', user.id)
    .single()

  if (error) {
    throw error
  }

  const { avatarPath, avatarUrl } = resolveStoredAvatar(browserSupabase, data.avatar_url)

  const firstName = data.first_name || ''
  const lastName = data.last_name || ''
  const fullName = [firstName, lastName].filter(Boolean).join(' ')

  return {
    id: data.id,
    firstName,
    lastName,
    fullName,
    email: data.email || '',
    smsPhone: data.sms_phone || '',
    avatarPath,
    avatarUrl,
  }
}

export function validateAdminFirstName(value) {
  const v = String(value || '').trim()
  if (!v) return 'Please enter your first name.'
  if (v.length < 2) return 'First name is too short.'
  return ''
}

export function validateAdminEmail(value) {
  const v = String(value || '').trim()
  if (!v) return 'Please enter a valid email.'
  if (!/^\S+@\S+\.\S+$/.test(v)) return 'Please enter a valid email format.'
  return ''
}

export function validateAdminSmsPhone(value) {
  const v = String(value || '').trim()
  if (!v) return ''
  const digits = v.replace(/\D/g, '')
  if (digits.length < 7) return 'Enter a valid phone number (at least 7 digits).'
  if (digits.length > 15) return 'Phone number is too long.'
  return ''
}

function splitNameParts(profile) {
  const firstName =
    profile?.firstName || (profile?.fullName || '').trim().split(' ')[0] || ''
  const lastName =
    profile?.lastName ||
    (() => {
      const parts = (profile?.fullName || '').trim().split(' ').filter(Boolean)
      return parts.length > 1 ? parts.slice(1).join(' ') : ''
    })()
  return { firstName, lastName }
}

/**
 * Shared logic for the admin personal-info form.
 *
 * @param {{
 *   supabase?: import('@supabase/supabase-js').SupabaseClient,
 *   toast?: { success?: (m: string) => void, error?: (m: string) => void },
 * }} opts
 */
export function useAdminProfileForm({ supabase = browserSupabase, toast } = {}) {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [draftFirstName, setDraftFirstName] = useState('')
  const [draftLastName, setDraftLastName] = useState('')
  const [draftEmail, setDraftEmail] = useState('')
  const [draftSmsPhone, setDraftSmsPhone] = useState('')
  const [saveError, setSaveError] = useState('')
  const [saveStatus, setSaveStatus] = useState('')
  const [emailVerificationPending, setEmailVerificationPending] = useState(false)
  const cancelledRef = useRef(false)

  const syncDraftFromProfile = useCallback((nextProfile) => {
    const { firstName, lastName } = splitNameParts(nextProfile)
    setDraftFirstName(firstName)
    setDraftLastName(lastName)
    setDraftEmail(nextProfile?.email || '')
    setDraftSmsPhone(nextProfile?.smsPhone || '')
  }, [])

  useEffect(() => {
    cancelledRef.current = false
    return () => {
      cancelledRef.current = true
    }
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    setSaveError('')
    try {
      const data = await fetchCurrentAdminProfile()
      if (cancelledRef.current) return
      setProfile(data)
      syncDraftFromProfile(data)
    } catch (err) {
      if (!cancelledRef.current) {
        setSaveError(err?.message || 'Failed to load profile.')
      }
    } finally {
      if (!cancelledRef.current) setLoading(false)
    }
  }, [syncDraftFromProfile])

  useEffect(() => {
    queueMicrotask(() => {
      load()
    })
  }, [load])

  const startEdit = useCallback(() => {
    if (profile) syncDraftFromProfile(profile)
    setSaveError('')
    setSaveStatus('')
    setEmailVerificationPending(false)
    setIsEditing(true)
  }, [profile, syncDraftFromProfile])

  const cancelEdit = useCallback(() => {
    if (profile) syncDraftFromProfile(profile)
    setIsEditing(false)
    setSaveError('')
    setSaveStatus('')
  }, [profile, syncDraftFromProfile])

  const save = useCallback(async () => {
    if (!profile) {
      setSaveError('Profile is not loaded yet.')
      return false
    }

    const firstErr = validateAdminFirstName(draftFirstName)
    if (firstErr) {
      setSaveError(firstErr)
      return false
    }
    const emailErr = validateAdminEmail(draftEmail)
    if (emailErr) {
      setSaveError(emailErr)
      return false
    }
    const phoneErr = validateAdminSmsPhone(draftSmsPhone)
    if (phoneErr) {
      setSaveError(phoneErr)
      return false
    }

    const firstName = String(draftFirstName || '').trim()
    const lastNameRaw = String(draftLastName || '').trim()
    const lastName = lastNameRaw ? lastNameRaw : null
    const trimmedName = [firstName, lastNameRaw].filter(Boolean).join(' ')
    const trimmedEmail = String(draftEmail || '').trim()
    const trimmedSms = String(draftSmsPhone || '').trim()
    const emailChanged = trimmedEmail !== (profile.email || '')

    setSaveError('')
    try {
      if (emailChanged) {
        const { error: authError } = await supabase.auth.updateUser({
          email: trimmedEmail,
        })
        if (authError) throw authError
      }
      const { error } = await supabase
        .from('admins')
        .update({
          first_name: firstName,
          last_name: lastName,
          email: trimmedEmail,
          sms_phone: trimmedSms || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', profile.id)
      if (error) throw error
      setProfile((prev) =>
        prev
          ? {
              ...prev,
              firstName,
              lastName: lastNameRaw,
              fullName: trimmedName,
              email: trimmedEmail,
              smsPhone: trimmedSms,
            }
          : prev,
      )
      setIsEditing(false)
      setSaveStatus('Profile updated successfully.')
      if (emailChanged) {
        setEmailVerificationPending(true)
        toast?.success?.(
          `Verification link sent to ${trimmedEmail}. Email change applies once confirmed.`,
        )
      } else {
        toast?.success?.('Profile updated successfully.')
      }
      return true
    } catch (err) {
      const message = err?.message || 'Failed to update profile.'
      setSaveError(message)
      toast?.error?.(message)
      return false
    }
  }, [draftEmail, draftFirstName, draftLastName, draftSmsPhone, profile, supabase, toast])

  return {
    profile,
    setProfile,
    loading,
    isEditing,
    setIsEditing,
    draftFirstName,
    setDraftFirstName,
    draftLastName,
    setDraftLastName,
    draftEmail,
    setDraftEmail,
    draftSmsPhone,
    setDraftSmsPhone,
    saveError,
    setSaveError,
    saveStatus,
    setSaveStatus,
    emailVerificationPending,
    setEmailVerificationPending,
    startEdit,
    cancelEdit,
    save,
    reload: load,
  }
}

/**
 * Personal profile + avatar state for admin settings/profile surfaces.
 *
 * @param {{
 *   supabase?: import('@supabase/supabase-js').SupabaseClient,
 *   toast?: { success?: (m: string) => void, error?: (m: string) => void },
 * }} opts
 */
export function useAdminPersonalProfile({ supabase = browserSupabase, toast } = {}) {
  const fileRef = useRef(null)
  const avatarPreviewRef = useRef('')
  const form = useAdminProfileForm({ supabase, toast })
  const [avatarPreview, setAvatarPreview] = useState('')
  const [avatarLoading, setAvatarLoading] = useState(false)
  const [removeAvatarConfirmOpen, setRemoveAvatarConfirmOpen] = useState(false)

  useEffect(
    () => () => {
      if (avatarPreviewRef.current) URL.revokeObjectURL(avatarPreviewRef.current)
    },
    [],
  )

  const resetAvatarPreview = useCallback(() => {
    if (avatarPreviewRef.current) {
      URL.revokeObjectURL(avatarPreviewRef.current)
      avatarPreviewRef.current = ''
    }
    setAvatarPreview('')
    if (fileRef.current) fileRef.current.value = ''
  }, [])

  const onPickAvatar = useCallback(
    async (e) => {
      form.setSaveError('')
      form.setSaveStatus('')
      const file = e.target.files?.[0]
      if (!file) return
      const error = validateAvatarImage(file)
      if (error) {
        form.setSaveError(error)
        return
      }
      if (!form.profile) {
        form.setSaveError('Profile is not loaded yet.')
        return
      }
      resetAvatarPreview()
      const url = URL.createObjectURL(file)
      avatarPreviewRef.current = url
      setAvatarPreview(url)
      try {
        setAvatarLoading(true)
        const nextAvatar = await uploadAdminAvatar(supabase, form.profile, file)
        form.setProfile((prev) => (prev ? { ...prev, ...nextAvatar } : prev))
        resetAvatarPreview()
        form.setSaveStatus('Avatar updated successfully.')
      } catch (err) {
        form.setSaveError(err?.message || 'Failed to upload avatar.')
      } finally {
        setAvatarLoading(false)
      }
    },
    [form, resetAvatarPreview, supabase],
  )

  const openRemoveAvatarConfirm = useCallback(() => {
    if (!form.profile || (!form.profile.avatarPath && !form.profile.avatarUrl)) return
    setRemoveAvatarConfirmOpen(true)
  }, [form.profile])

  const executeRemoveAvatar = useCallback(async () => {
    form.setSaveError('')
    if (!form.profile || (!form.profile.avatarPath && !form.profile.avatarUrl)) return
    resetAvatarPreview()
    try {
      setAvatarLoading(true)
      await removeAdminAvatar(supabase, form.profile)
      form.setProfile((prev) => (prev ? { ...prev, avatarPath: null, avatarUrl: null } : prev))
      form.setSaveStatus('Avatar removed.')
    } catch (err) {
      form.setSaveError(err?.message || 'Failed to remove avatar.')
    } finally {
      setAvatarLoading(false)
    }
  }, [form, resetAvatarPreview, supabase])

  const onStartPersonalEdit = useCallback(() => {
    form.startEdit()
  }, [form])

  const onSavePersonal = useCallback(async () => {
    await form.save()
  }, [form])

  const onCancelPersonalEdit = useCallback(() => {
    form.cancelEdit()
    resetAvatarPreview()
  }, [form, resetAvatarPreview])

  return {
    fileRef,
    loading: form.loading,
    profile: form.profile,
    setProfile: form.setProfile,
    draftFirstName: form.draftFirstName,
    setDraftFirstName: form.setDraftFirstName,
    draftLastName: form.draftLastName,
    setDraftLastName: form.setDraftLastName,
    draftEmail: form.draftEmail,
    setDraftEmail: form.setDraftEmail,
    draftSmsPhone: form.draftSmsPhone,
    setDraftSmsPhone: form.setDraftSmsPhone,
    avatarPreview,
    personalStatus: form.saveStatus,
    personalError: form.saveError,
    setPersonalError: form.setSaveError,
    setPersonalStatus: form.setSaveStatus,
    avatarLoading,
    removeAvatarConfirmOpen,
    setRemoveAvatarConfirmOpen,
    isEditingPersonal: form.isEditing,
    onPickAvatar,
    openRemoveAvatarConfirm,
    executeRemoveAvatar,
    onStartPersonalEdit,
    onSavePersonal,
    onCancelPersonalEdit,
  }
}
