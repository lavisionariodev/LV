'use client'

import { createPortal } from 'react-dom'

/**
 * Renders into document.body so position:fixed overlays span the real viewport on mobile.
 * Modals portaled to body avoid stacking issues with sticky top bars and fixed bottom navs on
 * sticky top bar / fixed bottom nav on iOS Safari.
 */
export default function BodyPortal({ children }) {
  if (typeof document === 'undefined') return null
  return createPortal(children, document.body)
}
