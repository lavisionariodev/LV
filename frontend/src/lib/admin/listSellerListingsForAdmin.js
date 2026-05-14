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

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} supabaseAdmin
 * @param {{ statusIn?: string[] | null, approvalStatusIn?: string[] | null, onlyActive?: boolean }} [options]
 */
export async function listSellerListingsForAdminQuery(supabaseAdmin, options = {}) {
  const statusInRaw = Array.isArray(options?.statusIn) ? options.statusIn : null
  const approvalStatusInRaw = Array.isArray(options?.approvalStatusIn) ? options.approvalStatusIn : null
  const onlyActive = options?.onlyActive !== false

  let query = supabaseAdmin
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
    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from('profiles')
      .select('id, avatar_url')
      .in('id', sellerIds)

    if (!profilesError && profiles) {
      for (const p of profiles) {
        avatarByUserId.set(p.id, normalizeAvatarUrl(p.avatar_url))
      }
    }
  }

  return {
    data: rows.map((r) => ({
      ...r,
      seller_avatar_url: avatarByUserId.get(r.seller_user_id) ?? null,
    })),
    error: null,
  }
}
