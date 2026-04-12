import { supabase } from '@/lib/supabase/client'

const LISTING_IMAGES_BUCKET = 'listing-images'

/** Normalize jsonb / API quirks: plain object, JSON string, or camelCase `dynamicValues` on the row. */
export function parseListingDynamicValues(raw) {
  if (raw == null) return {}
  if (typeof raw === 'object' && !Array.isArray(raw)) return raw
  if (typeof raw === 'string') {
    try {
      const o = JSON.parse(raw)
      return o && typeof o === 'object' && !Array.isArray(o) ? o : {}
    } catch {
      return {}
    }
  }
  return {}
}

function normalizeListingRow(row) {
  const imageUrls = Array.isArray(row.image_urls) ? row.image_urls : []
  const dv = parseListingDynamicValues(row?.dynamic_values ?? row?.dynamicValues)
  return {
    ...row,
    image_urls: imageUrls,
    dynamic_values: dv,
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

export async function uploadListingImages(files) {
  const list = Array.isArray(files) ? files.filter(Boolean) : []
  if (!list.length) {
    return { data: [], error: null }
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return { data: [], error: 'Not authenticated.' }
  }

  const uploadedUrls = []
  for (const file of list) {
    const ext = (file?.name?.split('.').pop() || 'jpg').toLowerCase()
    const safeExt = ext.replace(/[^a-z0-9]/g, '') || 'jpg'
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${safeExt}`
    const filePath = `${user.id}/${fileName}`

    const { error: uploadError } = await supabase.storage
      .from(LISTING_IMAGES_BUCKET)
      .upload(filePath, file, { upsert: true, cacheControl: '3600' })

    if (uploadError) {
      return {
        data: [],
        error: uploadError.message || 'Failed to upload one or more listing images.',
      }
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from(LISTING_IMAGES_BUCKET).getPublicUrl(filePath)

    if (publicUrl) uploadedUrls.push(publicUrl)
  }

  return { data: uploadedUrls, error: null }
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

/**
 * Admin: all listings with seller business name (requires RLS policy for admins).
 */
export async function listSellerListingsForAdmin() {
  const { data, error } = await supabase
    .from('seller_listings')
    .select(
      `
      *,
      sellers (
        business_name,
        contact_name,
        email
      )
    `,
    )
    .order('updated_at', { ascending: false })

  if (error) {
    return { data: [], error: error.message || 'Failed to load listings.' }
  }

  const rows = (data || []).map((row) => {
    const { sellers, ...rest } = row
    const rel = sellers
    const seller = Array.isArray(rel) ? rel[0] : rel
    return normalizeListingRow({
      ...rest,
      seller_business_name: seller?.business_name ?? null,
      seller_contact_name: seller?.contact_name ?? null,
      seller_email: seller?.email ?? null,
    })
  })

  return { data: rows, error: null }
}
