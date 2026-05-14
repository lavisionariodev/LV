import { supabase } from '@/lib/supabase/client'

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

  try {
    const form = new FormData()
    list.forEach((file) => form.append('files', file))
    const res = await fetch('/api/seller/listings/images', {
      method: 'POST',
      body: form,
    })
    const body = await res.json().catch(() => null)
    if (!res.ok) {
      return { data: [], error: body?.error || 'Failed to upload one or more listing images.' }
    }
    return { data: Array.isArray(body?.urls) ? body.urls : [], error: null }
  } catch (e) {
    return { data: [], error: e?.message || 'Failed to upload one or more listing images.' }
  }
}

export async function createSellerListing(payload) {
  try {
    const res = await fetch('/api/seller/listings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload || {}),
    })
    const body = await res.json().catch(() => null)
    if (!res.ok) {
      return { data: null, error: body?.error || 'Failed to create listing.' }
    }
    return { data: body?.data ? normalizeListingRow(body.data) : null, error: null }
  } catch (e) {
    return { data: null, error: e?.message || 'Failed to create listing.' }
  }
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

/** Seller: withdraw a pending new-listing review or staged update request. */
export async function cancelListingReviewRequest(id) {
  try {
    const res = await fetch(`/api/seller/listings/${encodeURIComponent(id)}/cancel-review`, {
      method: 'POST',
    })
    const body = await res.json().catch(() => null)
    if (!res.ok) {
      return { data: null, error: body?.error || 'Failed to cancel review request.' }
    }
    const row = body?.data
    return { data: row ? normalizeListingRow(row) : null, error: null }
  } catch (e) {
    return { data: null, error: e?.message || 'Failed to cancel review request.' }
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
 * Admin: all listings with seller business name (server route).
 */
export async function listSellerListingsForAdmin(options = {}) {
  const statusIn = Array.isArray(options?.statusIn) ? options.statusIn : null
  const approvalStatusIn = Array.isArray(options?.approvalStatusIn) ? options.approvalStatusIn : null
  const onlyActive = options?.onlyActive !== false

  const params = new URLSearchParams()
  if (statusIn?.length) {
    params.set('statusIn', statusIn.join(','))
  }
  if (approvalStatusIn?.length) {
    params.set('approvalStatusIn', approvalStatusIn.join(','))
  }
  if (!onlyActive) {
    params.set('onlyActive', 'false')
  }

  const query = params.toString()
  const url = query ? `/api/admin/listings?${query}` : '/api/admin/listings'

  try {
    const res = await fetch(url, { credentials: 'include' })
    const body = await res.json().catch(() => null)
    if (!res.ok) {
      return { data: [], error: body?.error || 'Failed to load listings.' }
    }
    const rows = Array.isArray(body?.listings) ? body.listings : []
    return { data: rows.map(normalizeListingRow), error: null }
  } catch (e) {
    return { data: [], error: e?.message || 'Failed to load listings.' }
  }
}
