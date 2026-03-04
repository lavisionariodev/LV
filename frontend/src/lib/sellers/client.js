import { supabase } from '@/lib/supabase/client';

/**
 * Fetch the seller record for a given auth user id.
 * Returns the seller row or null if not found or on error.
 */
export async function getSellerByUserId(userId) {
  if (!userId) return null;

  const { data, error } = await supabase
    .from('sellers')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data;
}

/**
 * Get the current seller status for a given auth user.
 * Returns a string such as "pending", "active", "suspended", or null if not found.
 */
export async function getSellerStatusForUser(userId) {
  const seller = await getSellerByUserId(userId);
  if (!seller) return null;
  return seller.status || null;
}

/**
 * Create or update a seller record for the given auth user with pending status.
 * This assumes a `sellers` table that has at least:
 * - user_id (uuid)
 * - business_name
 * - contact_name
 * - email
 * - phone
 * - status
 * - registered_at
 */
export async function upsertSellerForUser(user, payload) {
  if (!user) {
    return { data: null, error: 'Missing user' };
  }

  const base = {
    user_id: user.id,
    email: payload.email || user.email || null,
    business_name: payload.businessName || null,
    contact_name: payload.contactName || null,
    phone: payload.phone || null,
    status: payload.status || 'pending',
    registered_at: payload.registeredAt || new Date().toISOString(),
    business_info: payload.businessInfo || null,
    address: payload.address || null,
    documents: payload.documents || null,
  };

  const { data, error } = await supabase
    .from('sellers')
    .upsert(base, {
      onConflict: 'user_id',
    })
    .select()
    .maybeSingle();

  if (error) {
    return { data: null, error: error.message || 'Failed to save seller record.' };
  }

  return { data, error: null };
}

/**
 * Admin helper: list all sellers for management UI.
 * Returns an array of sellers or [] on error.
 */
export async function listSellersForAdmin() {
  const { data, error } = await supabase
    .from('sellers')
    .select('*')
    .order('registered_at', { ascending: false });

  if (error || !data) {
    return [];
  }

  return data;
}

/**
 * Admin helper: update a seller's status by seller id.
 */
export async function updateSellerStatus(sellerId, status) {
  if (!sellerId) {
    return { data: null, error: 'Missing seller id' };
  }

  const { data, error } = await supabase
    .from('sellers')
    .update({ status })
    .eq('id', sellerId)
    .select()
    .maybeSingle();

  if (error) {
    return { data: null, error: error.message || 'Failed to update seller status.' };
  }

  return { data, error: null };
}

