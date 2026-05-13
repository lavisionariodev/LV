import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { apiLog, errorMessage } from '@/lib/observability/apiLog'

function computeInitials(fullName) {
  const s = String(fullName ?? '').trim()
  if (!s) return ''
  const parts = s.split(/\s+/).filter(Boolean)
  return parts
    .slice(0, 2)
    .map((p) => p[0] || '')
    .join('')
    .toUpperCase()
}

function formatMonthYear(dateIso) {
  const d = new Date(dateIso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

export async function loadSellerReviews(sellerId) {
  const supabaseAdmin = getSupabaseAdmin()

  const { data: reviewRows, error: reviewsErr } = await supabaseAdmin
    .from('order_item_reviews')
    .select('order_item_id,buyer_id,rating,review_text,listing_label,created_at')
    .eq('seller_user_id', sellerId)
    .order('created_at', { ascending: false })

  if (reviewsErr) {
    apiLog('seller.reviews.list.failed', { err: errorMessage(reviewsErr) })
    throw new Error('Failed to load seller reviews.')
  }

  const reviews = reviewRows ?? []
  const reviewCount = reviews.length
  const avgRating =
    reviewCount > 0
      ? Number(
          (
            reviews.reduce((sum, r) => sum + (Number(r.rating) || 0), 0) / reviewCount
          ).toFixed(1),
        )
      : null

  const buyerIds = [...new Set(reviews.map((r) => r.buyer_id).filter(Boolean))]
  const { data: profileRows, error: profilesErr } = buyerIds.length
    ? await supabaseAdmin.from('profiles').select('id,full_name,avatar_url').in('id', buyerIds)
    : { data: [], error: null }

  if (profilesErr) {
    apiLog('seller.reviews.profiles_load_failed', { err: errorMessage(profilesErr) })
  }

  const initialsByBuyerId = new Map(
    (profileRows ?? []).map((p) => [p.id, computeInitials(p.full_name)]),
  )
  const nameByBuyerId = new Map((profileRows ?? []).map((p) => [p.id, p.full_name]))
  const avatarByBuyerId = new Map((profileRows ?? []).map((p) => [p.id, p.avatar_url]))

  const mapped = reviews.map((r) => {
    const reviewerName = nameByBuyerId.get(r.buyer_id) || 'Buyer'
    return {
      id: String(r.order_item_id),
      reviewerName,
      reviewerInitials: initialsByBuyerId.get(r.buyer_id) || '',
      reviewerAvatarUrl: avatarByBuyerId.get(r.buyer_id) || '',
      rating: Number(r.rating) || 0,
      date: formatMonthYear(r.created_at),
      service: String(r.listing_label ?? ''),
      text: String(r.review_text ?? ''),
    }
  })

  return {
    sellerId,
    aggregates: { avgRating, reviewCount },
    reviews: mapped,
  }
}
