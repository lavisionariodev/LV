'use client'

import { createPortal } from 'react-dom'

/**
 * Renders into document.body so position:fixed overlays span the real viewport on mobile.
 * Modals inside overflow scroll regions (e.g. seller .mainScroll) otherwise sit under the
 * sticky top bar / fixed bottom nav on iOS Safari.
 */
export default function BodyPortal({ children }) {
  if (typeof document === 'undefined') return null
  return createPortal(children, document.body)
}
