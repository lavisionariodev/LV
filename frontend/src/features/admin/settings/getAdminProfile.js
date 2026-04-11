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
    .select('id, full_name, email, avatar_url, sms_phone')
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
    smsPhone: data.sms_phone || '',
    avatarPath,
    avatarUrl,
  }
}
