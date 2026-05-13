export const AVATAR_MAX_MB = 2
export const AVATAR_ALLOWED_TYPES = Object.freeze(['image/jpeg', 'image/png', 'image/webp'])

const AVATARS_BUCKET = 'avatars'
const PUBLIC_AVATARS_MARKER = '/storage/v1/object/public/avatars/'

/**
 * @param {string | null | undefined} url
 * @returns {string | null}
 */
export function pathFromAvatarsPublicUrl(url) {
  if (!url || typeof url !== 'string') return null
  const idx = url.indexOf(PUBLIC_AVATARS_MARKER)
  if (idx !== -1) {
    return decodeURIComponent(url.slice(idx + PUBLIC_AVATARS_MARKER.length).split('?')[0])
  }
  const legacy = url.split('/avatars/')[1]
  return legacy ? decodeURIComponent(legacy.split('?')[0]) : null
}

/**
 * Normalize a stored avatar value (storage path or public URL) for display and cleanup.
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {string | null | undefined} stored
 * @returns {{ avatarPath: string | null, avatarUrl: string | null }}
 */
export function resolveStoredAvatar(supabase, stored) {
  if (stored == null) return { avatarPath: null, avatarUrl: null }
  const raw = String(stored).trim()
  if (!raw) return { avatarPath: null, avatarUrl: null }

  if (/^https?:\/\//i.test(raw) || /^blob:/i.test(raw)) {
    return {
      avatarPath: pathFromAvatarsPublicUrl(raw),
      avatarUrl: raw,
    }
  }

  const avatarPath = raw
  const {
    data: { publicUrl },
  } = supabase.storage.from(AVATARS_BUCKET).getPublicUrl(avatarPath)

  return {
    avatarPath,
    avatarUrl: publicUrl || null,
  }
}

/**
 * @param {string | null | undefined} src
 */
export function shouldUseUnoptimizedAvatarSrc(src) {
  if (!src) return false
  return src.startsWith('blob:') || src.startsWith('http://') || src.startsWith('https://')
}

/**
 * @param {File | null | undefined} file
 * @returns {string} Empty when valid; otherwise a user-facing validation message.
 */
export function validateAvatarImage(file) {
  if (!file) return 'No file selected.'
  if (!AVATAR_ALLOWED_TYPES.includes(file.type)) {
    return 'Only PNG, JPG, or WEBP images are allowed.'
  }
  const mb = file.size / (1024 * 1024)
  if (mb > AVATAR_MAX_MB) return `Image must be ${AVATAR_MAX_MB}MB or less.`
  return ''
}
