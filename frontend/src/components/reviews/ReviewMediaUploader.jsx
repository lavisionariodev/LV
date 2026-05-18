'use client'

import { useId, useRef, useState } from 'react'
import {
  REVIEW_MAX_IMAGES,
  REVIEW_MAX_VIDEOS,
  REVIEW_MEDIA_GUIDELINE_TEXT,
  REVIEW_MEDIA_HELPER_TEXT,
  maxBytesForReviewMediaKind,
  reviewMediaKindFromMime,
  allowedMimeLabelForKind,
  humanMaxSizeForKind,
} from '@/lib/reviews/reviewMediaLimits'
import styles from './ReviewMediaUploader.module.css'

/**
 * @typedef {{ url: string, path?: string, kind: 'image' | 'video', uploading?: boolean }} ReviewMediaItem
 */

/**
 * @param {{
 *   orderItemId: string,
 *   imageUrls: string[],
 *   videoUrls: string[],
 *   onChange: (next: { imageUrls: string[], videoUrls: string[] }) => void,
 *   disabled?: boolean,
 * }} props
 */
export default function ReviewMediaUploader({
  orderItemId,
  imageUrls = [],
  videoUrls = [],
  onChange,
  disabled = false,
}) {
  const imageInputId = useId()
  const videoInputId = useId()
  const imageInputRef = useRef(null)
  const videoInputRef = useRef(null)
  const [error, setError] = useState('')
  const [uploadingCount, setUploadingCount] = useState(0)

  const images = Array.isArray(imageUrls) ? imageUrls : []
  const videos = Array.isArray(videoUrls) ? videoUrls : []
  const busy = disabled || uploadingCount > 0

  function emit(nextImages, nextVideos) {
    onChange?.({
      imageUrls: nextImages,
      videoUrls: nextVideos,
    })
  }

  function validateFile(file, kind) {
    const detected = reviewMediaKindFromMime(file.type)
    if (detected !== kind) {
      return `Only ${allowedMimeLabelForKind(kind)} files are allowed.`
    }
    const maxBytes = maxBytesForReviewMediaKind(kind)
    if (file.size > maxBytes) {
      return `File must be ${humanMaxSizeForKind(kind)} or less.`
    }
    if (file.size <= 0) {
      return 'File is empty.'
    }
    return null
  }

  async function uploadFile(file, kind) {
    const form = new FormData()
    form.append('orderItemId', orderItemId)
    form.append('kind', kind)
    form.append('file', file)

    const res = await fetch('/api/buyer/reviews/media', {
      method: 'POST',
      body: form,
    })
    const body = await res.json().catch(() => null)
    if (!res.ok) {
      throw new Error(typeof body?.error === 'string' ? body.error : 'Upload failed.')
    }
    return String(body?.url ?? '').trim()
  }

  async function handleFilesSelected(fileList, kind) {
    setError('')
    const files = Array.from(fileList ?? [])
    if (!files.length) return

    const maxCount = kind === 'video' ? REVIEW_MAX_VIDEOS : REVIEW_MAX_IMAGES
    const currentCount = kind === 'video' ? videos.length : images.length
    const slotsLeft = maxCount - currentCount
    if (slotsLeft <= 0) {
      setError(`Maximum ${maxCount} ${kind === 'video' ? 'video' : 'photos'} allowed.`)
      return
    }

    const batch = files.slice(0, slotsLeft)
    if (files.length > slotsLeft) {
      setError(`Only ${slotsLeft} more ${kind === 'video' ? 'video' : 'photo'}(s) can be added.`)
    }

    setUploadingCount((n) => n + batch.length)
    const nextImages = [...images]
    const nextVideos = [...videos]

    try {
      for (const file of batch) {
        const validationError = validateFile(file, kind)
        if (validationError) {
          setError(validationError)
          continue
        }
        const url = await uploadFile(file, kind)
        if (!url) {
          setError('Upload failed.')
          continue
        }
        if (kind === 'video') {
          nextVideos.push(url)
        } else if (!nextImages.includes(url)) {
          nextImages.push(url)
        }
      }
      emit(nextImages, nextVideos)
    } catch (e) {
      setError(e?.message ? String(e.message) : 'Upload failed.')
    } finally {
      setUploadingCount((n) => Math.max(0, n - batch.length))
    }
  }

  function removeUrl(kind, url) {
    if (busy) return
    if (kind === 'image') {
      emit(
        images.filter((u) => u !== url),
        videos,
      )
    } else {
      emit(
        images,
        videos.filter((u) => u !== url),
      )
    }
  }

  return (
    <div className={styles.wrap}>
      <p className={styles.hint}>{REVIEW_MEDIA_HELPER_TEXT}</p>
      <p className={styles.guideline}>{REVIEW_MEDIA_GUIDELINE_TEXT}</p>

      {(images.length > 0 || videos.length > 0) && (
        <div className={styles.grid} aria-label="Uploaded attachments">
          {images.map((url) => (
            <div key={url} className={styles.tile}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" className={styles.tileMedia} />
              <button
                type="button"
                className={styles.removeBtn}
                onClick={() => removeUrl('image', url)}
                disabled={busy}
                aria-label="Remove photo"
              >
                <svg width="10" height="10" viewBox="0 0 16 16" fill="none" aria-hidden>
                  <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              </button>
            </div>
          ))}
          {videos.map((url) => (
            <div key={url} className={styles.tile}>
              <video src={url} className={styles.tileMedia} muted playsInline preload="metadata" />
              <span className={styles.videoBadge}>VIDEO</span>
              <button
                type="button"
                className={styles.removeBtn}
                onClick={() => removeUrl('video', url)}
                disabled={busy}
                aria-label="Remove video"
              >
                <svg width="10" height="10" viewBox="0 0 16 16" fill="none" aria-hidden>
                  <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      {uploadingCount > 0 ? (
        <p className={styles.hint} aria-live="polite">
          Uploading…
        </p>
      ) : null}

      {error ? <p className={styles.error}>{error}</p> : null}

      <div className={styles.actions}>
        <label className={styles.addBtn} htmlFor={imageInputId}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <path d="M12 8v8M8 12h8" />
          </svg>
          Add photos
        </label>
        <input
          ref={imageInputRef}
          id={imageInputId}
          className={styles.hiddenInput}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          disabled={busy || images.length >= REVIEW_MAX_IMAGES}
          onChange={(e) => {
            handleFilesSelected(e.target.files, 'image')
            e.target.value = ''
          }}
        />

        <label className={styles.addBtn} htmlFor={videoInputId}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M8 5v14l11-7z" />
          </svg>
          Add video
        </label>
        <input
          ref={videoInputRef}
          id={videoInputId}
          className={styles.hiddenInput}
          type="file"
          accept="video/mp4,video/webm"
          disabled={busy || videos.length >= REVIEW_MAX_VIDEOS}
          onChange={(e) => {
            handleFilesSelected(e.target.files, 'video')
            e.target.value = ''
          }}
        />
      </div>
    </div>
  )
}
