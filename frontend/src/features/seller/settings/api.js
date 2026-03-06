import { supabase } from '@/lib/supabase/client'

const AVATARS_BUCKET = 'avatars'

/**
 * Extract storage path from a Supabase public avatar URL.
 * e.g. "https://.../object/public/avatars/userId/file" -> "userId/file"
 */
function pathFromAvatarUrl(avatarUrl) {
  if (!avatarUrl || typeof avatarUrl !== 'string') return null
  const match = avatarUrl.split('/avatars/')[1]
  return match || null
}

export async function fetchCurrentSellerProfile() {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    throw new Error('Not authenticated.')
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, email, avatar_url')
    .eq('id', user.id)
    .single()

  if (error) {
    throw error
  }

  const avatarUrl = data.avatar_url || null
  const avatarPath = avatarUrl ? pathFromAvatarUrl(avatarUrl) : null

  return {
    id: data.id,
    fullName: data.full_name || '',
    email: data.email || '',
    avatarPath,
    avatarUrl,
  }
}

export async function updateSellerProfile({ id, fullName, email }) {
  const trimmedName = fullName.trim()
  const trimmedEmail = email.trim()

  const { error: authError } = await supabase.auth.updateUser({
    email: trimmedEmail,
  })

  if (authError) {
    throw authError
  }

  const { error } = await supabase
    .from('profiles')
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

export async function uploadSellerAvatar({ userId, file, oldAvatarUrl }) {
  if (!file) {
    throw new Error('No file provided.')
  }

  const fileExt = file.name.split('.').pop()
  const fileName = `avatar-${Date.now()}.${fileExt}`
  const filePath = `${userId}/${fileName}`

  const oldPath = oldAvatarUrl ? pathFromAvatarUrl(oldAvatarUrl) : null
  if (oldPath) {
    await supabase.storage.from(AVATARS_BUCKET).remove([oldPath])
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

  const {
    data: { publicUrl },
  } = supabase.storage.from(AVATARS_BUCKET).getPublicUrl(filePath)

  const { error: updateError } = await supabase
    .from('profiles')
    .update({
      avatar_url: publicUrl,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId)

  if (updateError) {
    throw updateError
  }

  return {
    avatarPath: filePath,
    avatarUrl: publicUrl,
  }
}

export async function removeSellerAvatar({ userId, avatarUrl }) {
  const path = avatarUrl ? pathFromAvatarUrl(avatarUrl) : null
  if (path) {
    await supabase.storage.from(AVATARS_BUCKET).remove([path])
  }

  const { error } = await supabase
    .from('profiles')
    .update({
      avatar_url: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId)

  if (error) {
    throw error
  }
}
