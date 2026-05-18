'use client'

import styles from './ReviewMediaGallery.module.css'

/**
 * @param {{ images?: string[], videos?: string[], size?: 'sm' | 'md', className?: string }} props
 */
export default function ReviewMediaGallery({
  images = [],
  videos = [],
  size = 'md',
  className = '',
}) {
  const imageList = Array.isArray(images) ? images.filter(Boolean) : []
  const videoList = Array.isArray(videos) ? videos.filter(Boolean) : []
  if (imageList.length === 0 && videoList.length === 0) return null

  const isSm = size === 'sm'
  const galleryClass = [styles.gallery, isSm ? styles.gallerySm : '', className].filter(Boolean).join(' ')
  const thumbClass = [styles.thumb, isSm ? styles.thumbSm : ''].filter(Boolean).join(' ')

  return (
    <div className={galleryClass} aria-label="Review attachments">
      {imageList.map((src, i) => (
        <a
          key={`img-${src}-${i}`}
          href={src}
          target="_blank"
          rel="noopener noreferrer"
          className={thumbClass}
          aria-label={`Review photo ${i + 1}`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt={`Review photo ${i + 1}`} className={styles.media} />
          <span className={styles.badge} aria-hidden>
            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor" stroke="none" />
              <path d="M21 15l-5-5L5 21" />
            </svg>
          </span>
        </a>
      ))}
      {videoList.map((src, i) => (
        <a
          key={`vid-${src}-${i}`}
          href={src}
          target="_blank"
          rel="noopener noreferrer"
          className={thumbClass}
          aria-label={`Review video ${i + 1}`}
        >
          <video src={src} className={styles.media} muted playsInline preload="metadata" />
          <span className={`${styles.badge} ${styles.badgeVideo}`} aria-hidden>
            <svg width="8" height="8" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 5v14l11-7z" />
            </svg>
          </span>
        </a>
      ))}
    </div>
  )
}
