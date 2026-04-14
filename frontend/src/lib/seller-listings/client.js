import { supabase } from '@/lib/supabase/client'

const LISTING_IMAGES_BUCKET = 'listing-images'

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

/** Seller: submit an existing listing for admin review. */
export async function submitListingForReview(id) {
  const { data: existing, error: fetchErr } = await supabase
    .from('seller_listings')
    .select('id, approval_status')
    .eq('id', id)
    .maybeSingle()

  if (fetchErr) {
    return { data: null, error: fetchErr.message || 'Failed to load listing.' }
  }

  if (String(existing?.approval_status || '').toLowerCase() === 'approved') {
    const { data, error } = await supabase.from('seller_listings').select('*').eq('id', id).maybeSingle()
    if (error) {
      return { data: null, error: error.message || 'Failed to load listing.' }
    }
    return { data: data ? normalizeListingRow(data) : null, error: null }
  }

  const { data, error } = await supabase
    .from('seller_listings')
    .update({
      approval_status: 'pending',
      submitted_at: new Date().toISOString(),
      // Seller intent: ready to be visible once approved (shop RPC still gates on approval + seller status).
      status: 'active',
    })
    .eq('id', id)
    .select('*')
    .maybeSingle()

  if (error) {
    return { data: null, error: error.message || 'Failed to submit listing for review.' }
  }

  return { data: normalizeListingRow(data), error: null }
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
  const { error } = await supabase.from('seller_listings').delete().eq('id', id)

  if (error) {
    return { error: error.message || 'Failed to remove listing.' }
  }

  return { error: null }
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

  return { data: rows, error: null }
}
