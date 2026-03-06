import { supabase } from '@/lib/supabase/client'

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
