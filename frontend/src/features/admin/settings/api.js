import { supabase } from '@/lib/supabase/client'

const AVATARS_BUCKET = 'avatars'

export async function fetchCurrentAdminProfile() {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    throw new Error('Not authenticated.')
  }

  const { data, error } = await supabase
    .from('admins')
    .select('id, full_name, email, avatar_url')
    .eq('id', user.id)
    .single()

  if (error) {
    throw error
  }

  const avatarPath = data.avatar_url || null

  const avatarUrl = avatarPath
    ? supabase.storage.from(AVATARS_BUCKET).getPublicUrl(avatarPath).data.publicUrl
    : null

  return {
    id: data.id,
    fullName: data.full_name || '',
    email: data.email || '',
    avatarPath,
    avatarUrl,
  }
}

export async function updateAdminProfile({ id, fullName, email }) {
  const trimmedName = fullName.trim()
  const trimmedEmail = email.trim()

  const { error: authError } = await supabase.auth.updateUser({
    email: trimmedEmail,
  })

  if (authError) {
    throw authError
  }

  const { error } = await supabase
    .from('admins')
    .update({
      full_name: trimmedName,
      email: trimmedEmail,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) {
    throw error
  }
}

export async function uploadAdminAvatar({ adminId, file, oldAvatarPath }) {
  if (!file) {
    throw new Error('No file provided.')
  }

  const fileExt = file.name.split('.').pop()
  const fileName = `avatar-${Date.now()}.${fileExt}`
  const filePath = `${adminId}/${fileName}`

  if (oldAvatarPath) {
    await supabase.storage.from(AVATARS_BUCKET).remove([oldAvatarPath])
  }

  const { error: uploadError } = await supabase.storage
    .from(AVATARS_BUCKET)
    .upload(filePath, file, {
      upsert: true,
      cacheControl: '3600',
    })

  if (uploadError) {
    throw uploadError
  }

  const { error: updateError } = await supabase
    .from('admins')
    .update({
      avatar_url: filePath,
      updated_at: new Date().toISOString(),
    })
    .eq('id', adminId)

  if (updateError) {
    throw updateError
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(AVATARS_BUCKET).getPublicUrl(filePath)

  // Keep global profiles avatar in sync so topbars and other
  // profile-aware components show the same image.
  await supabase
    .from('profiles')
    .update({ avatar_url: publicUrl })
    .eq('id', adminId)

  return {
    avatarPath: filePath,
    avatarUrl: publicUrl,
  }
}

export async function removeAdminAvatar({ adminId, avatarPath }) {
  if (avatarPath) {
    await supabase.storage.from(AVATARS_BUCKET).remove([avatarPath])
  }

  const { error } = await supabase
    .from('admins')
    .update({
      avatar_url: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', adminId)

  if (error) {
    throw error
  }

  // Also clear avatar from profiles so shared UI uses fallback.
  await supabase
    .from('profiles')
    .update({ avatar_url: null })
    .eq('id', adminId)
}

