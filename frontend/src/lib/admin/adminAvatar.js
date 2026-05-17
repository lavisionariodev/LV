import { pathFromAvatarsPublicUrl } from '@/shared/utils'

const AVATARS_BUCKET = 'avatars'

function resolveAvatarStoragePath(profile) {
  return profile.avatarPath || pathFromAvatarsPublicUrl(profile.avatarUrl)
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {{ id: string, avatarPath?: string | null, avatarUrl?: string | null }} profile
 * @param {File} file
 */
export async function uploadAdminAvatar(supabase, profile, file) {
  const fileExt = file.name.split('.').pop()
  const fileName = `avatar-${Date.now()}.${fileExt}`
  const filePath = `${profile.id}/${fileName}`

  const existingPath = resolveAvatarStoragePath(profile)
  if (existingPath) {
    await supabase.storage.from(AVATARS_BUCKET).remove([existingPath])
  }

  const { error: uploadError } = await supabase.storage
    .from(AVATARS_BUCKET)
    .upload(filePath, file, { upsert: true, cacheControl: '3600' })
  if (uploadError) throw uploadError

  const { error: updateError } = await supabase
    .from('admins')
    .update({ avatar_url: filePath, updated_at: new Date().toISOString() })
    .eq('id', profile.id)
  if (updateError) throw updateError

  const {
    data: { publicUrl },
  } = supabase.storage.from(AVATARS_BUCKET).getPublicUrl(filePath)
  await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', profile.id)

  return { avatarPath: filePath, avatarUrl: publicUrl }
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {{ id: string, avatarPath?: string | null, avatarUrl?: string | null }} profile
 */
export async function removeAdminAvatar(supabase, profile) {
  const existingPath = resolveAvatarStoragePath(profile)
  if (existingPath) {
    await supabase.storage.from(AVATARS_BUCKET).remove([existingPath])
  }

  const { error } = await supabase
    .from('admins')
    .update({ avatar_url: null, updated_at: new Date().toISOString() })
    .eq('id', profile.id)
  if (error) throw error

  await supabase.from('profiles').update({ avatar_url: null }).eq('id', profile.id)
}
