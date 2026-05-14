import { supabase } from '@/lib/supabase/client'
import { resolveStoredAvatar } from '@/shared/utils/avatarImage'

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

  const { avatarPath, avatarUrl } = resolveStoredAvatar(supabase, data.avatar_url)

  return {
    id: data.id,
    fullName: data.full_name || '',
    email: data.email || '',
    avatarPath,
    avatarUrl,
  }
}
