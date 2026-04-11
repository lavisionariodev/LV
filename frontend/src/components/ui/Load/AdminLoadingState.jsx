'use client'

import styles from './AdminLoadingState.module.css'

const VARIANT = {
  page: styles.variantPage,
  card: styles.variantCard,
  embed: styles.variantEmbed,
  gate: styles.variantGate,
}

/**
 * Shared loading UI: admin shell gate, settings Suspense, profile fetch, site content panel.
 */
export default function AdminLoadingState({ label = 'Loading', variant = 'card' }) {
  const extra = VARIANT[variant] ?? VARIANT.card
  return (
    <div
      className={`${styles.root} ${extra}`}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <span className={styles.spinner} aria-hidden />
      <span className={styles.label}>{label}</span>
    </div>
  )
}
