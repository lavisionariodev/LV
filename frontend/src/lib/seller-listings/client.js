import { supabase } from '@/lib/supabase/client'
import { mergePendingChangesPayload } from '@/lib/seller-listings/pendingChanges'

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
  const { data: row, error: fetchErr } = await supabase.from('seller_listings').select('*').eq('id', id).maybeSingle()

  if (fetchErr) {
    return { data: null, error: fetchErr.message || 'Failed to load listing.' }
  }
  if (!row) {
    return { data: null, error: 'Listing not found.' }
  }

  const pending = row.pending_changes
  const hasPending =
    pending &&
    typeof pending === 'object' &&
    !Array.isArray(pending) &&
    Object.keys(pending).length > 0

  const merge = hasPending ? mergePendingChangesPayload(pending) : {}

  const update = {
    approval_status: 'approved',
    status: 'active',
    reviewed_at: new Date().toISOString(),
    rejection_reason: null,
    staged_rejection_reason: null,
    ...(hasPending
      ? {
          ...merge,
          pending_changes: {},
          pending_changes_submitted_at: null,
        }
      : {}),
  }

  const { data, error } = await supabase
    .from('seller_listings')
    .update(update)
    .eq('id', id)
    .select('*')
    .maybeSingle()

  if (error) {
    return { data: null, error: error.message || 'Failed to approve listing.' }
  }

  return { data: normalizeListingRow(data), error: null }
}

/** Admin: reject a listing and include a reason. For approved listings with staged updates only, discards the stage. */
export async function rejectListing(id, reason) {
  const trimmed = String(reason ?? '').trim()

  const { data: row, error: fetchErr } = await supabase
    .from('seller_listings')
    .select('approval_status, pending_changes')
    .eq('id', id)
    .maybeSingle()

  if (fetchErr) {
    return { data: null, error: fetchErr.message || 'Failed to load listing.' }
  }
  if (!row) {
    return { data: null, error: 'Listing not found.' }
  }

  const approval = String(row.approval_status || '').toLowerCase()
  const pending = row.pending_changes
  const hasPending =
    pending &&
    typeof pending === 'object' &&
    !Array.isArray(pending) &&
    Object.keys(pending).length > 0

  if (approval === 'approved' && hasPending) {
    const { data, error } = await supabase
      .from('seller_listings')
      .update({
        pending_changes: {},
        pending_changes_submitted_at: null,
        staged_rejection_reason: trimmed || null,
      })
      .eq('id', id)
      .select('*')
      .maybeSingle()

    if (error) {
      return { data: null, error: error.message || 'Failed to reject staged updates.' }
    }

    return { data: normalizeListingRow(data), error: null }
  }

  const { data, error } = await supabase
    .from('seller_listings')
    .update({
      approval_status: 'rejected',
      rejection_reason: trimmed,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select('*')
    .maybeSingle()

  if (error) {
    return { data: null, error: error.message || 'Failed to reject listing.' }
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
