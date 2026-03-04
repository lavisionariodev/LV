import { supabase } from '@/lib/supabase/client';

export const ROLE_BUYER = 'buyer';
export const ROLE_SELLER = 'seller';

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

