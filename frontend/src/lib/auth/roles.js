import { supabase } from '@/lib/supabase/client';

export const ROLE_BUYER = 'buyer';
export const ROLE_SELLER = 'seller';

/**
 * Get the app role for a user from public.users.
 * @param {string | undefined} userId
 * @returns {Promise<'buyer' | 'seller' | null>} null if not found or error. Admin is not stored here; use isAdmin() from ./admin.
 */
export async function getUserRole(userId) {
  if (!userId) return null;

  const { data, error } = await supabase
    .from('users')
    .select('role')
    .eq('id', userId)
    .maybeSingle();

  if (error || !data) return null;
  return data.role;
}

export function isBuyerRole(role) {
  return role === ROLE_BUYER;
}

export function isSellerRole(role) {
  return role === ROLE_SELLER;
}

