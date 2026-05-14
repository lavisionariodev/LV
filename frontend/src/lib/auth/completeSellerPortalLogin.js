import { isAdmin } from '@/lib/auth/admin'
import { getUserRole, ROLE_SELLER } from '@/lib/auth/roles'
import { getSellerStatusForUser } from '@/lib/sellers/client'

/**
 * @param {{
 *   supabase: import('@supabase/supabase-js').SupabaseClient,
 *   user: import('@supabase/supabase-js').User,
 *   redirect?: string | null,
 * }} params
 * @returns {Promise<{ ok: true, target: string } | { ok: false, error: string, signOut?: boolean }>}
 */
export async function completeSellerPortalLogin({ supabase, user, redirect }) {
  const admin = await isAdmin(supabase, user.id)
  if (admin) {
    return {
      ok: false,
      error: 'Please use the admin portal to log in.',
      signOut: true,
    }
  }

  const role = await getUserRole(user.id)
  if (!role) {
    return {
      ok: false,
      error: 'Your account is not configured for this portal.',
      signOut: true,
    }
  }

  if (role !== ROLE_SELLER) {
    return {
      ok: false,
      error: 'Please use the correct portal for your account.',
      signOut: true,
    }
  }

  let target = !redirect || redirect === '/' ? '/seller' : redirect
  const sellerStatus = await getSellerStatusForUser(user.id)
  if (sellerStatus === 'pending' || sellerStatus === 'rejected') {
    target = '/seller/onboarding'
  }

  return { ok: true, target }
}
