import { supabase } from '@/lib/supabase/client';

function normalizeAvatarUrl(url) {
  if (url == null || typeof url !== 'string') return null;
  const t = url.trim();
  return t.length ? t : null;
}

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

  const { data: existing } = await supabase
    .from('sellers')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();

  const status =
    payload.status !== undefined && payload.status !== null
      ? payload.status
      : (existing?.status ?? 'pending');

  const registeredAt =
    payload.registeredAt !== undefined && payload.registeredAt !== null
      ? payload.registeredAt
      : (existing?.registered_at ?? new Date().toISOString());

  const businessStartedAt =
    payload.businessStartedAt !== undefined
      ? (payload.businessStartedAt && String(payload.businessStartedAt).trim()
          ? String(payload.businessStartedAt).trim()
          : null)
      : (existing?.business_started_at ?? null);

  const packageOptions =
    payload.packageOptions !== undefined
      ? payload.packageOptions
      : (existing?.package_options ?? []);

  const sellerData = {
    user_id: user.id,
    email: payload.email || user.email || null,
    business_name: payload.businessName || null,
    contact_name: payload.contactName || null,
    phone: payload.phone || null,
    status,
    registered_at: registeredAt,
    business_info: payload.businessInfo || null,
    address: payload.address || null,
    business_started_at: businessStartedAt,
    package_options: Array.isArray(packageOptions)
      ? packageOptions.map((x) => String(x).trim()).filter(Boolean)
      : [],
    // documents field is not yet in schema (future update)
    // documents: payload.documents || null,
  };

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

  const rows = data.filter(Boolean);
  const ids = [...new Set(rows.map((r) => r.user_id).filter(Boolean))];
  if (ids.length === 0) {
    return rows.map((r) => ({ ...r, avatarUrl: null }));
  }

  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id, avatar_url')
    .in('id', ids);

  const avatarByUserId = new Map();
  if (!profilesError && profiles) {
    for (const p of profiles) {
      avatarByUserId.set(p.id, normalizeAvatarUrl(p.avatar_url));
    }
  }

  return rows.map((r) => ({
    ...r,
    avatarUrl: avatarByUserId.get(r.user_id) ?? null,
  }));
}

/**
 * Admin helper: search sellers for typeahead (small, fast results).
 * Matches business name, contact name, or email (case-insensitive).
 */
export async function searchSellersForAdmin(query, limit = 6) {
  const q = String(query || '').trim();
  if (!q) return [];

  const like = `%${q}%`;
  const { data, error } = await supabase
    .from('sellers')
    .select('user_id, business_name, contact_name, email, status, registered_at')
    .or(`business_name.ilike.${like},contact_name.ilike.${like},email.ilike.${like}`)
    .order('registered_at', { ascending: false })
    .limit(limit);

  if (error || !data) return [];

  const rows = data.filter(Boolean);
  const ids = [...new Set(rows.map((r) => r.user_id).filter(Boolean))];
  if (ids.length === 0) return rows.map((r) => ({ ...r, avatarUrl: null }));

  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id, avatar_url')
    .in('id', ids);

  const avatarByUserId = new Map();
  if (!profilesError && profiles) {
    for (const p of profiles) {
      avatarByUserId.set(p.id, normalizeAvatarUrl(p.avatar_url));
    }
  }

  return rows.map((r) => ({
    ...r,
    avatarUrl: avatarByUserId.get(r.user_id) ?? null,
  }));
}

export async function updateSellerStatus(sellerId, status) {
  if (!sellerId) {
    return { data: null, error: 'Missing seller id' };
  }

  const res = await fetch(`/api/admin/sellers/${encodeURIComponent(sellerId)}/status`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
    credentials: 'same-origin',
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { data: null, error: json.error || 'Failed to update seller status.' };
  }

  return { data: json.data ?? null, error: null };
}

