export const REVIEW_MEDIA_BUCKET = 'review-media'

export const REVIEW_IMAGE_MIME = new Set(['image/jpeg', 'image/png', 'image/webp'])
export const REVIEW_VIDEO_MIME = new Set(['video/mp4', 'video/webm'])

export const REVIEW_MAX_IMAGES = 3
export const REVIEW_MAX_VIDEOS = 1
export const REVIEW_MAX_IMAGE_BYTES = 5 * 1024 * 1024
export const REVIEW_MAX_VIDEO_BYTES = 25 * 1024 * 1024

export const REVIEW_MEDIA_HELPER_TEXT =
  'Up to 3 photos (5 MB each) and 1 video (25 MB, MP4 or WebM). Attachments are optional.'

export const REVIEW_MEDIA_GUIDELINE_TEXT =
  'Share respectful photos or videos of the service only. Avoid sensitive or private content.'

export function reviewMediaKindFromMime(mime) {
  const type = String(mime ?? '').trim().toLowerCase()
  if (REVIEW_IMAGE_MIME.has(type)) return 'image'
  if (REVIEW_VIDEO_MIME.has(type)) return 'video'
  return null
}

export function maxBytesForReviewMediaKind(kind) {
  return kind === 'video' ? REVIEW_MAX_VIDEO_BYTES : REVIEW_MAX_IMAGE_BYTES
}

export function maxCountForReviewMediaKind(kind) {
  return kind === 'video' ? REVIEW_MAX_VIDEOS : REVIEW_MAX_IMAGES
}

export function humanMaxSizeForKind(kind) {
  return kind === 'video' ? '25 MB' : '5 MB'
}

export function allowedMimeLabelForKind(kind) {
  return kind === 'video' ? 'MP4 or WebM' : 'JPG, PNG, or WebP'
}
