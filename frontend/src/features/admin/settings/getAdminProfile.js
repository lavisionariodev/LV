import { supabase } from '@/lib/supabase/client'

const AVATARS_BUCKET = 'avatars'

export async function fetchCurrentAdminProfile() {
  // `getUser()` makes a network call; `getSession()` is usually instant (cached).
  // For above-the-fold UI like avatars, prefer session and fall back to getUser.
  const {
    data: { session },
  } = await supabase.auth.getSession()

  let user = session?.user ?? null
  if (!user) {
    const {
      data: { user: verifiedUser },
      error: userError,
    } = await supabase.auth.getUser()
    if (userError || !verifiedUser) throw new Error('Not authenticated.')
    user = verifiedUser
  }

  const { data, error } = await supabase
    .from('admins')
    .select('id, first_name, last_name, email, avatar_url, sms_phone')
    .eq('id', user.id)
    .single()

  if (error) {
    throw error
  }

  const avatarPath = data.avatar_url || null

  const avatarUrl = avatarPath
    ? supabase.storage.from(AVATARS_BUCKET).getPublicUrl(avatarPath).data.publicUrl
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
