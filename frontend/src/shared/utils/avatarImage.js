export const AVATAR_MAX_MB = 2
export const AVATAR_ALLOWED_TYPES = Object.freeze(['image/jpeg', 'image/png', 'image/webp'])

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
