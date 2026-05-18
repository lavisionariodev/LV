import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { REVIEW_MEDIA_BUCKET } from '@/lib/reviews/reviewMediaLimits'
import { reviewMediaPathFromPublicUrl } from '@/lib/reviews/validateReviewMediaUrls'

/**
 * @param {string} buyerId
 * @param {string} orderItemId
 * @param {string} ext
 */
export function buildReviewMediaObjectPath(buyerId, orderItemId, ext) {
  const safeExt = String(ext ?? 'bin')
    .replace(/[^a-z0-9]/gi, '')
    .toLowerCase() || 'bin'
  const fileName = `${Date.now()}-${crypto.randomUUID()}.${safeExt}`
  return `${buyerId}/reviews/${orderItemId}/${fileName}`
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} supabaseAdmin
 * @param {string} path
 */
export function reviewMediaPublicUrl(supabaseAdmin, path) {
  const {
    data: { publicUrl },
  } = supabaseAdmin.storage.from(REVIEW_MEDIA_BUCKET).getPublicUrl(path)
  return publicUrl
}

/**
 * Remove storage objects for URLs no longer referenced after an edit.
 * @param {import('@supabase/supabase-js').SupabaseClient} supabaseAdmin
 * @param {string[]} previousUrls
 * @param {string[]} nextUrls
 */
export async function removeOrphanedReviewMedia(supabaseAdmin, previousUrls, nextUrls) {
  const nextSet = new Set((nextUrls ?? []).map((u) => String(u).trim()).filter(Boolean))
  const uniquePaths = [
    ...new Set(
      (previousUrls ?? [])
        .filter((url) => !nextSet.has(String(url).trim()))
        .map((url) => reviewMediaPathFromPublicUrl(url))
        .filter(Boolean),
    ),
  ]

  if (uniquePaths.length === 0) return

  await supabaseAdmin.storage.from(REVIEW_MEDIA_BUCKET).remove(uniquePaths)
}
