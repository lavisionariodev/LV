export function isAdminAppPath(pathname) {
  return pathname === '/admin' || pathname.startsWith('/admin/')
}

/**
 * @param {string} pathname
 * @param {Record<string, string | undefined>} env
 */
export function shouldRedirectAdminWithoutPublicSupabaseEnv(pathname, env = process.env) {
  if (!isAdminAppPath(pathname)) return false
  return !env.NEXT_PUBLIC_SUPABASE_URL || !env.NEXT_PUBLIC_SUPABASE_ANON_KEY
}
