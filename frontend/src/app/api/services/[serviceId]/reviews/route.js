import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { apiLog, errorMessage } from '@/lib/observability/apiLog'

const SERVICE_ID_ALLOWED = new Set(['cremation', 'traditional-burial', 'memorial-planning'])

function formatISODate(dateIso) {
  const d = new Date(dateIso)
  if (Number.isNaN(d.getTime())) return new Date().toISOString()
  return d.toISOString()
}

export async function GET(request, { params }) {
  const { serviceId: serviceIdRaw } = await params
  const serviceId = String(serviceIdRaw ?? '').trim()
  if (!SERVICE_ID_ALLOWED.has(serviceId)) {
    return NextResponse.json({ error: 'Invalid serviceId.' }, { status: 400 })
  }

  const supabaseAdmin = getSupabaseAdmin()

  const { data: reviewRows, error: reviewsErr } = await supabaseAdmin
    .from('order_item_reviews')
    .select('order_item_id,buyer_id,rating,review_text,listing_label,created_at')
    .eq('service_id', serviceId)
    .order('created_at', { ascending: false })

  if (reviewsErr) {
    apiLog('service.reviews.list.failed', { err: errorMessage(reviewsErr), serviceId })
    return NextResponse.json({ error: 'Failed to load service reviews.' }, { status: 500 })
  }

  const reviews = reviewRows ?? []
  const reviewCount = reviews.length
  const avgRating =
    reviewCount > 0
      ? Number((reviews.reduce((sum, r) => sum + (Number(r.rating) || 0), 0) / reviewCount).toFixed(1))
      : null

  const buyerIds = [...new Set(reviews.map((r) => r.buyer_id).filter(Boolean))]
  const { data: profileRows, error: profilesErr } = buyerIds.length
    ? await supabaseAdmin.from('profiles').select('id,full_name').in('id', buyerIds)
    : { data: [], error: null }

  if (profilesErr) {
    apiLog('service.reviews.profiles_load_failed', { err: errorMessage(profilesErr), serviceId })
  }

  const nameByBuyerId = new Map((profileRows ?? []).map((p) => [p.id, p.full_name]))

  const mapped = reviews.map((r) => ({
    id: String(r.order_item_id),
    author: nameByBuyerId.get(r.buyer_id) || 'Buyer',
    rating: Number(r.rating) || 0,
    date: formatISODate(r.created_at),
    title: String(r.listing_label ?? ''),
    body: String(r.review_text ?? ''),
    images: [],
    videos: [],
  }))

  return NextResponse.json(
    {
      ok: true,
      serviceId,
      aggregates: { avgRating, reviewCount },
      reviews: mapped,
    },
    { status: 200 },
  )
}

