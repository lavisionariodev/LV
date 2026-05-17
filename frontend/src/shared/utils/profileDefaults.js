/**
 * Default shape for `public.profiles` row used in client state (snake_case keys).
 */
const EMPTY_PROFILE_ROW = {
  full_name: '',
  avatar_url: '',
  username: '',
  username_locked: false,
  phone: '',
  gender: '',
  date_of_birth: '',
  address_street: '',
  address_city: '',
  address_province: '',
  address_zip: '',
};

/**
 * Map a Supabase profiles row to client state (strings for dates).
 * @param {Record<string, unknown> | null | undefined} data
 */
export function mapProfileRow(data) {
  if (!data) {
    return { ...EMPTY_PROFILE_ROW };
  }
  const dob = data.date_of_birth;
  let dateStr = '';
  if (dob != null) {
    if (typeof dob === 'string') {
      dateStr = dob.slice(0, 10);
    } else if (dob instanceof Date) {
      dateStr = dob.toISOString().slice(0, 10);
    }
  }
  return {
    full_name: data.full_name || '',
    avatar_url: data.avatar_url || '',
    username: data.username || '',
    username_locked: Boolean(data.username_locked),
    phone: data.phone || '',
    gender: data.gender || '',
    date_of_birth: dateStr,
    address_street: data.address_street || '',
    address_city: data.address_city || '',
    address_province: data.address_province || '',
    address_zip: data.address_zip || '',
  };
}

/**
 * Row payload for Supabase `profiles` upsert from edited client state.
 * Enforces username lock rules (first non-empty username locks the handle).
 * @param {typeof EMPTY_PROFILE_ROW} local
 * @param {{ id: string, email?: string | null }} user
 * @param {typeof EMPTY_PROFILE_ROW} authProfile — server snapshot from AuthContext
 */
export function buildProfileUpsert(local, user, authProfile) {
  const locked = authProfile.username_locked;
  const hadUsername = !!(authProfile.username || '').trim();
  let username = (local.username || '').trim() || null;
  let username_locked = locked;
  if (locked) {
    username = (authProfile.username || '').trim() || null;
    username_locked = true;
  } else if (!hadUsername && username) {
    username_locked = true;
  }

  return {
    id: user.id,
    email: user.email ?? null,
    full_name: local.full_name || null,
    avatar_url: local.avatar_url || null,
    username,
    username_locked,
    phone: local.phone || null,
    gender: local.gender || null,
    date_of_birth: local.date_of_birth || null,
    address_street: local.address_street || null,
    address_city: local.address_city || null,
    address_province: local.address_province || null,
    address_zip: local.address_zip || null,
  };
}
