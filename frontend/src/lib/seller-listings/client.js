import { supabase } from '@/lib/supabase/client'

const LISTING_IMAGES_BUCKET = 'listing-images'

function normalizeAvatarUrl(url) {
  if (url == null || typeof url !== 'string') return null
  const t = url.trim()
  return t.length ? t : null
}

function normalizeListingRow(row) {
  const imageUrls = Array.isArray(row.image_urls) ? row.image_urls : []
  return {
    ...row,
    image_urls: imageUrls,
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
  try {
    const res = await fetch(`/api/seller/listings/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload || {}),
    })
    const body = await res.json().catch(() => null)
    if (!res.ok) {
      return { data: null, error: body?.error || 'Failed to update listing.' }
    }
    return { data: body?.data ? normalizeListingRow(body.data) : null, error: null }
  } catch (e) {
    return { data: null, error: e?.message || 'Failed to update listing.' }
  }
}

/** Seller: submit an existing listing for admin review (server route notifies admins). */
export async function submitListingForReview(id) {
  try {
    const res = await fetch(`/api/seller/listings/${encodeURIComponent(id)}/submit-for-review`, {
      method: 'POST',
    })
    const body = await res.json().catch(() => null)
    if (!res.ok) {
      return { data: null, error: body?.error || 'Failed to submit listing for review.' }
    }
    const row = body?.data
    return { data: row ? normalizeListingRow(row) : null, error: null }
  } catch (e) {
    return { data: null, error: e?.message || 'Failed to submit listing for review.' }
  }
}

/** Seller: resubmit after rejection (same as submit; DB trigger clears rejection fields on pending). */
export async function resubmitListingForReview(id) {
  return submitListingForReview(id)
}

/** Admin: approve a listing (shop-visible if seller/listing are active). Merges pending_changes when present. */
export async function approveListing(id) {
  try {
    const res = await fetch(`/api/admin/listings/${id}/approve`, { method: 'POST' })
    const body = await res.json().catch(() => null)
    if (!res.ok) {
      return { data: null, error: body?.error || 'Failed to approve listing.' }
    }
    return { data: body?.data ? normalizeListingRow(body.data) : null, error: null }
  } catch (e) {
    return { data: null, error: e?.message || 'Failed to approve listing.' }
  }
}

/** Admin: reject a listing and include a reason. For approved listings with staged updates only, discards the stage. */
export async function rejectListing(id, reason) {
  const trimmed = String(reason ?? '').trim()
  try {
    const res = await fetch(`/api/admin/listings/${id}/reject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: trimmed }),
    })
    const body = await res.json().catch(() => null)
    if (!res.ok) {
      return { data: null, error: body?.error || 'Failed to reject listing.' }
    }
    return { data: body?.data ? normalizeListingRow(body.data) : null, error: null }
  } catch (e) {
    return { data: null, error: e?.message || 'Failed to reject listing.' }
  }
}

export async function deleteSellerListing(id) {
  try {
    const res = await fetch(`/api/seller/listings/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    })
    const body = await res.json().catch(() => null)
    if (!res.ok) {
      return { error: body?.error || 'Failed to remove listing.' }
    }
    return { error: null }
  } catch (e) {
    return { error: e?.message || 'Failed to remove listing.' }
  }
}

/**
 * Admin: all listings with seller business name (requires RLS policy for admins).
 */
export async function listSellerListingsForAdmin(options = {}) {
  const statusInRaw = Array.isArray(options?.statusIn) ? options.statusIn : null
  const approvalStatusInRaw = Array.isArray(options?.approvalStatusIn) ? options.approvalStatusIn : null
  const onlyActive = options?.onlyActive !== false

  let query = supabase
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

  const statusIn = statusInRaw
    ? statusInRaw.map((s) => String(s || '').trim().toLowerCase()).filter(Boolean)
    : null
  const approvalStatusIn = approvalStatusInRaw
    ? approvalStatusInRaw.map((s) => String(s || '').trim().toLowerCase()).filter(Boolean)
    : null

  if (statusIn?.length) {
    query = query.in('status', statusIn)
  } else if (onlyActive) {
    query = query.ilike('status', 'active')
  }

  if (approvalStatusIn?.length) {
    query = query.in('approval_status', approvalStatusIn)
  }

  const { data, error } = await query

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

  const sellerIds = [...new Set(rows.map((r) => r.seller_user_id).filter(Boolean))]
  const avatarByUserId = new Map()
  if (sellerIds.length > 0) {
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, avatar_url')
      .in('id', sellerIds)

    if (!profilesError && profiles) {
      for (const p of profiles) {
        avatarByUserId.set(p.id, normalizeAvatarUrl(p.avatar_url))
      }
    }
  }

  const enriched = rows.map((r) => ({
    ...r,
    seller_avatar_url: avatarByUserId.get(r.seller_user_id) ?? null,
  }))

  return { data: enriched, error: null }
}
