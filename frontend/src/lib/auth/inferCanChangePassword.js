/**
 * @param {import('@supabase/supabase-js').User | null | undefined} user
 */
export function inferCanChangePassword(user) {
  if (!user) return false

  const meta = user.app_metadata || {}
  const userMeta = user.user_metadata || {}

  const providers = new Set()
  if (typeof meta.provider === 'string') providers.add(meta.provider)
  if (Array.isArray(meta.providers)) {
    meta.providers.forEach((p) => {
      if (typeof p === 'string') providers.add(p)
      else if (p && typeof p.provider === 'string') providers.add(p.provider)
    })
  }
  if (typeof userMeta.provider === 'string') providers.add(userMeta.provider)

  if (Array.isArray(user.identities)) {
    user.identities.forEach((id) => {
      const p = id?.provider || id?.identity_provider
      if (typeof p === 'string') providers.add(p)
    })
  }

  if (providers.size === 0) return true

  const lowered = Array.from(providers).map((p) => String(p).toLowerCase())
  if (lowered.some((p) => p === 'email' || p === 'password')) return true
  if (lowered.some((p) => p.includes('google'))) return false
  if (lowered.some((p) => p.includes('facebook'))) return false

  return lowered.some((p) =>
    ['google', 'facebook', 'github', 'twitter', 'apple', 'oidc', 'saml'].some((x) => p.includes(x)),
  )
    ? false
    : true
}
