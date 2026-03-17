import { supabase } from '@/lib/supabase/client';

export const ROLE_BUYER = 'buyer';
export const ROLE_SELLER = 'seller';
export const ROLE_ADMIN = 'admin';

/**
 * Get the app roles for a user from public.users.
 * @param {string | undefined} userId
 * @returns {Promise<string[] | null>} array of roles or null if not found or error.
 */
export async function getUserRoles(userId) {
  if (!userId) return null;

  const { data, error } = await supabase
    .from('users')
    .select('roles')
    .eq('id', userId)
    .maybeSingle();

  if (error || !data) return null;
  return data.roles || [];
}

/**
 * Get the primary role for a user (first in array, or buyer if multiple).
 * @param {string | undefined} userId
 * @returns {Promise<string | null>}
 */
export async function getUserRole(userId) {
  const roles = await getUserRoles(userId);
  return roles ? roles[0] || null : null;
}

export function hasRole(userRoles, role) {
  return userRoles && userRoles.includes(role);
}

export function isBuyerRole(roles) {
  return hasRole(roles, ROLE_BUYER);
}

export function isSellerRole(roles) {
  return hasRole(roles, ROLE_SELLER);
}

export function isAdminRole(roles) {
  return hasRole(roles, ROLE_ADMIN);
}

