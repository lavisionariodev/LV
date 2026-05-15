'use client'

import styles from './PortalBootstrapLoader.module.css'

const COPY = {
  seller: 'Opening Seller Centre…',
  admin: 'Opening Administrator Centre…',
}

/**
 * Full-screen loader shown only after a successful portal login
 * (seller: /seller/login, admin: /administrator) while redirecting into the portal.
 */
export default function PortalBootstrapLoader({ variant = 'seller', message, label = 'Loading portal' }) {
  const screenClass =
    variant === 'admin'
      ? `${styles.screen} ${styles.screenAdmin}`
      : `${styles.screen} ${styles.screenSeller}`

  return (
    <div
      className={screenClass}
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label={label}
    >
      <div className={styles.brandMark} aria-hidden="true">
        L
      </div>
      <div className={styles.spinner} aria-hidden="true" />
      <p className={styles.message}>{message ?? COPY[variant] ?? COPY.seller}</p>
    </div>
  )
}
