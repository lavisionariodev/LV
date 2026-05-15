'use client'

import { useEffect, useMemo } from 'react'
import Image from 'next/image'
import { FaFacebook, FaFacebookMessenger, FaWhatsapp, FaPhoneAlt, FaEnvelope } from 'react-icons/fa'
import styles from './ContactSellerModal.module.css'
import BodyPortal from './BodyPortal'
import { buildSellerContactOptions } from '@/lib/sellers/socialLinks'

function iconForPlatform(platform) {
  if (platform === 'messenger') return <FaFacebookMessenger />
  if (platform === 'facebook') return <FaFacebook />
  if (platform === 'whatsapp') return <FaWhatsapp />
  if (platform === 'phone') return <FaPhoneAlt />
  if (platform === 'email') return <FaEnvelope />
  return null
}

export default function ContactSellerModal({
  open,
  onClose,
  sellerName,
  sellerAvatarUrl,
  socialLinks,
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e) => {
      if (e.key !== 'Escape') return
      onClose?.()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const options = useMemo(
    () => buildSellerContactOptions({ sellerName, socialLinks }),
    [sellerName, socialLinks],
  )

  if (!open) return null

  const stop = (e) => e.stopPropagation()
  const initial = (sellerName || 'S').trim().charAt(0).toUpperCase()

  return (
    <BodyPortal>
    <div className={styles.overlay} role="dialog" aria-modal="true" onClick={onClose}>
      <div className={styles.modal} onClick={stop}>
        <div className={styles.head}>
          <div className={styles.titleRow}>
            <h3 className={styles.title}>Contact seller</h3>
            <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Close">
              ×
            </button>
          </div>
          <div className={styles.sellerRow}>
            <div className={styles.avatar} aria-hidden>
              {sellerAvatarUrl ? (
                <Image
                  src={sellerAvatarUrl}
                  alt=""
                  width={38}
                  height={38}
                  style={{ objectFit: 'cover' }}
                />
              ) : (
                initial
              )}
            </div>
            <div className={styles.sellerMeta}>
              <div className={styles.sellerName}>{sellerName || 'Seller'}</div>
              <div className={styles.sellerSub}>Choose how to reach them</div>
            </div>
          </div>
        </div>

        <div className={styles.body}>
          {options.length === 0 ? (
            <div className={styles.empty}>This seller hasn’t added any contact methods yet.</div>
          ) : (
            <div className={styles.optionList}>
              {options.map((opt) => (
                <a
                  key={opt.platform}
                  className={styles.option}
                  href={opt.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={onClose}
                >
                  <span className={styles.optionIcon} aria-hidden>
                    {iconForPlatform(opt.platform)}
                  </span>
                  <span>{opt.label}</span>
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
    </BodyPortal>
  )
}

