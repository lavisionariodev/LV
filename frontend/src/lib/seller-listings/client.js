import { supabase } from '@/lib/supabase/client'

function normalizeListingRow(row) {
  const imageUrls = Array.isArray(row.image_urls) ? row.image_urls : []
  return {
    ...row,
    image_urls: imageUrls,
    dynamic_values:
      row.dynamic_values && typeof row.dynamic_values === 'object'
        ? row.dynamic_values
        : {},
  }
}

export async function listMySellerListings() {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return { data: [], error: 'Not authenticated.' }
  }

  const { data, error } = await supabase
    .from('seller_listings')
    .select('*')
    .eq('seller_user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) {
    return { data: [], error: error.message || 'Failed to load listings.' }
  }

  return { data: (data || []).map(normalizeListingRow), error: null }
}

export async function createSellerListing(payload) {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return { data: null, error: 'Not authenticated.' }
  }

  const insertPayload = {
    ...payload,
    seller_user_id: user.id,
  }

  const { data, error } = await supabase
    .from('seller_listings')
    .insert(insertPayload)
    .select('*')
    .maybeSingle()

  if (error) {
    return { data: null, error: error.message || 'Failed to create listing.' }
  }

  return { data: normalizeListingRow(data), error: null }
}

export async function updateSellerListing(id, payload) {
  const { data, error } = await supabase
    .from('seller_listings')
    .update(payload)
    .eq('id', id)
    .select('*')
    .maybeSingle()

  if (error) {
    return { data: null, error: error.message || 'Failed to update listing.' }
  }

  return { data: normalizeListingRow(data), error: null }
}

export async function deleteSellerListing(id) {
  const { error } = await supabase.from('seller_listings').delete().eq('id', id)

  if (error) {
    return { error: error.message || 'Failed to remove listing.' }
  }

  return { error: null }
}
