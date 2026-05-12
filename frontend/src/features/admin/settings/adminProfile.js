'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase as browserSupabase } from '@/lib/supabase/client'

const AVATARS_BUCKET = 'avatars'

/**
 * Loads the current admin row + avatar public URL for topbar / settings / dashboard.
 * Uses the shared browser Supabase client.
 */
export async function fetchCurrentAdminProfile() {
  // `getUser()` makes a network call; `getSession()` is usually instant (cached).
  // For above-the-fold UI like avatars, prefer session and fall back to getUser.
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

  const avatarPath = data.avatar_url || null

  const avatarUrl = avatarPath
    ? browserSupabase.storage.from(AVATARS_BUCKET).getPublicUrl(avatarPath).data.publicUrl
    : null

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

/**
 * Shared logic for the admin personal-info form.
 *
 * Both `AdminSettingsClient` (desktop) and `AdminProfileClient` (mobile)
 * previously duplicated load / save / validate logic. This hook centralizes
 * the data layer; the JSX stays in each variant because of layout differences.
 *
 * @param {{
 *   supabase: import('@supabase/supabase-js').SupabaseClient,
 *   toast?: { success?: (m: string) => void, error?: (m: string) => void },
 * }} opts
 */
export function useAdminProfileForm({ supabase, toast } = {}) {
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
      const {
        data: { user },
        error: userErr,
      } = await supabase.auth.getUser()
      if (userErr || !user) throw new Error('Not authenticated.')

      const { data, error } = await supabase
        .from('admins')
        .select('id, first_name, last_name, email, sms_phone, avatar_url')
        .eq('id', user.id)
        .single()

      if (error) throw error
      if (cancelledRef.current) return

      const profileObj = {
        id: data.id,
        firstName: data.first_name || '',
        lastName: data.last_name || '',
        fullName: [data.first_name, data.last_name].filter(Boolean).join(' '),
        email: data.email || user.email || '',
        smsPhone: data.sms_phone || '',
        avatarUrl: data.avatar_url || null,
      }
      setProfile(profileObj)
      setDraftFirstName(profileObj.firstName)
      setDraftLastName(profileObj.lastName)
      setDraftEmail(profileObj.email)
      setDraftSmsPhone(profileObj.smsPhone)
    } catch (err) {
      if (!cancelledRef.current) {
        setSaveError(err?.message || 'Failed to load profile.')
      }
    } finally {
      if (!cancelledRef.current) setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    queueMicrotask(() => {
      load()
    })
  }, [load])

  const startEdit = useCallback(() => {
    if (profile) {
      setDraftFirstName(profile.firstName)
      setDraftLastName(profile.lastName)
      setDraftEmail(profile.email)
      setDraftSmsPhone(profile.smsPhone)
    }
    setSaveError('')
    setSaveStatus('')
    setEmailVerificationPending(false)
    setIsEditing(true)
  }, [profile])

  const cancelEdit = useCallback(() => {
    if (profile) {
      setDraftFirstName(profile.firstName)
      setDraftLastName(profile.lastName)
      setDraftEmail(profile.email)
      setDraftSmsPhone(profile.smsPhone)
    }
    setIsEditing(false)
    setSaveError('')
    setSaveStatus('')
  }, [profile])

  const save = useCallback(async () => {
    if (!profile) {
      setSaveError('Profile is not loaded yet.')
      return false
    }
    const firstName = String(draftFirstName || '').trim()
    if (!firstName) {
      setSaveError('First name is required.')
      return false
    }
    const lastNameRaw = String(draftLastName || '').trim()
    const trimmedEmail = String(draftEmail || '').trim()
    if (!/^\S+@\S+\.\S+$/.test(trimmedEmail)) {
      setSaveError('Enter a valid email.')
      return false
    }
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
          last_name: lastNameRaw || null,
          email: trimmedEmail,
          sms_phone: trimmedSms || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', profile.id)
      if (error) throw error
      const trimmedName = [firstName, lastNameRaw].filter(Boolean).join(' ')
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
          `We sent a verification link to ${trimmedEmail}. The email change applies once confirmed.`,
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
  }, [draftFirstName, draftLastName, draftEmail, draftSmsPhone, profile, supabase, toast])

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
    saveStatus,
    emailVerificationPending,
    setEmailVerificationPending,
    startEdit,
    cancelEdit,
    save,
    reload: load,
  }
}
