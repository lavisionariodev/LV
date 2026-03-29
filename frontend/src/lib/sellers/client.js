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

export async function upsertSellerForUser(user, payload) {
  if (!user) {
    return { data: null, error: 'Missing user' };
  }

  const sellerData = {
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

  // First try to check if seller exists
  const { data: existing } = await supabase
    .from('sellers')
    .select('user_id')
    .eq('user_id', user.id)
    .maybeSingle();

  let result;
  if (existing) {
    // Update existing record
    result = await supabase
      .from('sellers')
      .update(sellerData)
      .eq('user_id', user.id)
      .select()
      .maybeSingle();
  } else {
    // Insert new record
    result = await supabase
      .from('sellers')
      .insert(sellerData)
      .select()
      .maybeSingle();
  }

  if (result.error) {
    return { data: null, error: result.error.message || 'Failed to save seller record.' };
  }

  return { data: result.data, error: null };
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

export async function updateSellerStatus(sellerId, status) {
  if (!sellerId) {
    return { data: null, error: 'Missing seller id' };
  }

  const updateData = { status };
  if (status === 'active') {
    updateData.approved_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from('sellers')
    .update(updateData)
    .eq('user_id', sellerId)
    .select()
    .maybeSingle();

  if (error) {
    return { data: null, error: error.message || 'Failed to update seller status.' };
  }

  return { data, error: null };
}

