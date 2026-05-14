import { supabase } from '@/lib/supabase/client';
import { normalizeSellerSocialLinks } from '@/lib/sellers/socialLinks';

/** Stored without `@`; lowercase; used in public storefront. */
export function normalizeSellerShopUsername(raw) {
  if (raw == null) return null;
  let s = String(raw).trim();
  if (!s) return null;
  if (s.startsWith('@')) s = s.slice(1).trim();
  return s.toLowerCase() || null;
}

const MAX_TAGLINE_CHARS = 500;
const MAX_BUSINESS_TYPE_LABEL_CHARS = 80;

/** Public partner-directory presets (seller picks one or “Others”). */
export const SELLER_BUSINESS_TYPE_PRESETS = Object.freeze([
  'Full Service',
  'Cremation',
  'Products',
  'Florals',
  'Facilities',
  'Transport',
  'Memorial Park',
]);

/** Form-only sentinel when saving a custom label (stored as plain text in `business_type_label`). */
export const SELLER_BUSINESS_TYPE_OTHER = '__other__';

const PRESET_BY_LOWER = new Map(
  SELLER_BUSINESS_TYPE_PRESETS.map((p) => [p.toLowerCase(), p]),
);

/** Sellers.business_type_label — short directory / card label (e.g. Full Service). */
export function normalizeSellerBusinessTypeLabel(raw) {
  if (raw == null) return null;
  const s = String(raw).trim();
  if (!s) return null;
  return s.length > MAX_BUSINESS_TYPE_LABEL_CHARS
    ? s.slice(0, MAX_BUSINESS_TYPE_LABEL_CHARS)
    : s;
}

export function validateSellerBusinessTypeLabel(raw) {
  const s = String(raw ?? '').trim();
  if (!s) return '';
  if (s.length > MAX_BUSINESS_TYPE_LABEL_CHARS) {
    return `Business type label must be ${MAX_BUSINESS_TYPE_LABEL_CHARS} characters or fewer.`;
  }
  return '';
}

/** Map saved `business_type_label` to shop form `{ choice, otherSpecify }`. */
export function businessTypeLabelToFormState(storedLabel) {
  const raw = String(storedLabel ?? '').trim();
  if (!raw) return { choice: '', otherSpecify: '' };
  const canon = PRESET_BY_LOWER.get(raw.toLowerCase());
  if (canon) return { choice: canon, otherSpecify: '' };
  return { choice: SELLER_BUSINESS_TYPE_OTHER, otherSpecify: raw };
}

/** Persistable label from dropdown + optional “Others” text. */
export function businessTypeLabelFromFormState(choice, otherSpecify) {
  const c = String(choice ?? '').trim();
  if (!c) return null;
  if (c === SELLER_BUSINESS_TYPE_OTHER) {
    return normalizeSellerBusinessTypeLabel(otherSpecify);
  }
  if (!SELLER_BUSINESS_TYPE_PRESETS.includes(c)) {
    return null;
  }
  return normalizeSellerBusinessTypeLabel(c);
}

/** @returns {string} Empty when valid; otherwise validation message */
export function validateSellerBusinessTypeForm(choice, otherSpecify) {
  const c = String(choice ?? '').trim();
  if (!c) return '';
  if (c === SELLER_BUSINESS_TYPE_OTHER) {
    const t = String(otherSpecify ?? '').trim();
    if (!t) return 'Please specify your business type.';
    return validateSellerBusinessTypeLabel(t);
  }
  if (!SELLER_BUSINESS_TYPE_PRESETS.includes(c)) {
    return 'Please choose a business type from the list.';
  }
  return '';
}

/** Sellers.tagline — optional short storefront blurb (`sellers.tagline`). */
export function normalizeSellerTagline(raw) {
  if (raw == null) return null;
  const s = String(raw).trim();
  if (!s) return null;
  return s.length > MAX_TAGLINE_CHARS ? s.slice(0, MAX_TAGLINE_CHARS) : s;
}

const MAX_SPECIALTY_ITEMS = 24;
const MAX_SPECIALTY_CHARS = 120;

/**
 * Normalizes seller specialty labels for `sellers.specialties` (text[]).
 * Accepts an array of strings or one string with lines / commas.
 */
export function normalizeSellerSpecialties(raw) {
  let list = [];
  if (raw == null) return [];
  if (Array.isArray(raw)) {
    list = raw.map((x) => String(x).trim()).filter(Boolean);
  } else if (typeof raw === 'string') {
    list = raw.split(/[\n,]+/).map((s) => s.trim()).filter(Boolean);
  } else {
    return [];
  }
  const out = [];
  const seen = new Set();
  for (const s of list) {
    const t = s.slice(0, MAX_SPECIALTY_CHARS);
    const k = t.toLowerCase();
    if (!t || seen.has(k)) continue;
    seen.add(k);
    out.push(t);
    if (out.length >= MAX_SPECIALTY_ITEMS) break;
  }
  return out;
}

/** @returns {string} Empty if valid; otherwise a short validation message */
export function validateSellerSpecialtiesInput(raw) {
  const lines =
    typeof raw === 'string'
      ? raw.split(/[\n,]+/).map((s) => s.trim()).filter(Boolean)
      : Array.isArray(raw)
        ? raw.map((x) => String(x).trim()).filter(Boolean)
        : [];
  if (lines.length > MAX_SPECIALTY_ITEMS) {
    return `Use at most ${MAX_SPECIALTY_ITEMS} specialties (one per line).`;
  }
  for (const s of lines) {
    if (s.length > MAX_SPECIALTY_CHARS) {
      return `Each specialty must be ${MAX_SPECIALTY_CHARS} characters or fewer.`;
    }
  }
  return '';
}

/** @returns {string} Empty if valid or blank optional; otherwise a validation message */
export function validateSellerTagline(raw) {
  const s = String(raw ?? '').trim();
  if (!s) return '';
  if (s.length > MAX_TAGLINE_CHARS) return `Tagline must be ${MAX_TAGLINE_CHARS} characters or fewer.`;
  return '';
}

export function validateSellerShopUsername(raw) {
  const n = normalizeSellerShopUsername(raw);
  if (!n) return '';
  if (n.length < 3 || n.length > 30) return 'Shop username must be 3–30 characters.';
  if (!/^[a-z0-9][a-z0-9_]{2,29}$/.test(n)) {
    return 'Use only letters, numbers, and underscores. It must start with a letter or number.';
  }
  return '';
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
 * Returns a string such as "pending", "active", "suspended", "rejected", or null if not found.
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

  // Compliance uploads use `seller_documents` (see sellerDocuments.js), not this sellers row.
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

  const username =
    payload.username !== undefined
      ? normalizeSellerShopUsername(payload.username)
      : (existing?.username ?? null);

  const tagline =
    payload.tagline !== undefined
      ? normalizeSellerTagline(payload.tagline)
      : (existing?.tagline ?? null);

  const businessTypeLabel =
    payload.businessTypeLabel !== undefined
      ? normalizeSellerBusinessTypeLabel(payload.businessTypeLabel)
      : normalizeSellerBusinessTypeLabel(existing?.business_type_label ?? '');

  const specialties =
    payload.specialties !== undefined
      ? normalizeSellerSpecialties(payload.specialties)
      : normalizeSellerSpecialties(existing?.specialties ?? []);

  const socialLinks =
    payload.socialLinks !== undefined
      ? normalizeSellerSocialLinks(payload.socialLinks)
      : normalizeSellerSocialLinks(existing?.social_links ?? {});

  const coverPhotoUrl =
    payload.coverPhotoUrl !== undefined
      ? payload.coverPhotoUrl == null || !String(payload.coverPhotoUrl).trim()
        ? null
        : String(payload.coverPhotoUrl).trim()
      : existing?.cover_photo_url != null && String(existing.cover_photo_url).trim()
        ? String(existing.cover_photo_url).trim()
        : null;

  const turnaround =
    payload.turnaround !== undefined
      ? payload.turnaround == null || !String(payload.turnaround).trim()
        ? null
        : String(payload.turnaround).trim().slice(0, 160)
      : existing?.turnaround != null && String(existing.turnaround).trim()
        ? String(existing.turnaround).trim().slice(0, 160)
        : null;

  const sellerData = {
    user_id: user.id,
    email: payload.email || user.email || null,
    business_name: payload.businessName || null,
    contact_name: payload.contactName || null,
    phone: payload.phone || null,
    username,
    tagline,
    business_type_label: businessTypeLabel,
    specialties,
    status,
    registered_at: registeredAt,
    business_info: payload.businessInfo || null,
    address: payload.address || null,
    business_started_at: businessStartedAt,
    package_options: Array.isArray(packageOptions)
      ? packageOptions.map((x) => String(x).trim()).filter(Boolean)
      : [],
    social_links: socialLinks,
    cover_photo_url: coverPhotoUrl,
    turnaround,
  };

  if (existing?.status === 'rejected' && status === 'pending') {
    sellerData.rejection_reason = null;
    sellerData.rejected_at = null;
  }

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
    const code = result.error.code;
    const msg = String(result.error.message || '');
    if (code === '23505' && (msg.includes('sellers_username') || msg.includes('username'))) {
      return { data: null, error: 'This shop username is already taken. Try another.' };
    }
    return { data: null, error: result.error.message || 'Failed to save seller record.' };
  }

  return { data: result.data, error: null };
}

/**
 * Admin helper: list all sellers for management UI.
 * Returns an array of sellers or [] on error.
 */
export async function listSellersForAdmin() {
  const res = await fetch('/api/admin/sellers', { credentials: 'include', cache: 'no-store' })
  const body = await res.json().catch(() => null)
  if (!res.ok) return []
  return Array.isArray(body?.sellers) ? body.sellers : []
}

/**
 * Admin helper: search sellers for typeahead (small, fast results).
 * Matches business name, contact name, or email (case-insensitive).
 */
export async function searchSellersForAdmin(query, limit = 6) {
  const q = String(query || '').trim();
  if (!q) return [];

  const params = new URLSearchParams({ q, limit: String(limit) });
  const res = await fetch(`/api/admin/sellers/search?${params.toString()}`, {
    credentials: 'include',
    cache: 'no-store',
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) return [];
  return Array.isArray(body?.sellers) ? body.sellers : [];
}

/**
 * Active seller storefront row when they have no rows in `get_active_shop_listings` (e.g. no listings yet).
 * @param {string} sellerUserId
 * @returns {Promise<object|null>} first RPC row or null
 */
export async function fetchPublicSellerProfile(sellerUserId) {
  if (!sellerUserId) return null;

  const { data, error } = await supabase.rpc('get_public_seller_profile', {
    p_seller_user_id: sellerUserId,
  });

  if (error) {
    console.warn('[seller-profile] get_public_seller_profile:', error.message, error);
    return null;
  }

  const rows = Array.isArray(data) ? data : [];
  return rows[0] ?? null;
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

/**
 * Admin: toggle partners-page spotlight for a seller.
 * @param {string} sellerId
 * @param {boolean} featured
 */
/**
 * Admin: reject onboarding application with a reason emailed to the seller.
 * @param {string} sellerId
 * @param {string} reason
 */
export async function rejectSellerApplication(sellerId, reason) {
  if (!sellerId) {
    return { data: null, error: 'Missing seller id' };
  }

  const res = await fetch(`/api/admin/sellers/${encodeURIComponent(sellerId)}/reject`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason }),
    credentials: 'same-origin',
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { data: null, error: json.error || 'Failed to reject application.' };
  }

  return { data: json.data ?? null, error: null };
}

export async function updateSellerPartnersFeatured(sellerId, featured) {
  if (!sellerId) {
    return { data: null, error: 'Missing seller id' };
  }

  const res = await fetch(`/api/admin/sellers/${encodeURIComponent(sellerId)}/featured`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ featured }),
    credentials: 'same-origin',
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { data: null, error: json.error || 'Failed to update spotlight.' };
  }

  return { data: json.data ?? null, error: null };
}

