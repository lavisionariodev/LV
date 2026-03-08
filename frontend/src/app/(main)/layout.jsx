import { Suspense } from 'react'
import { PublicNavbar, PublicFooter } from '@/components/layout'
import { CartProvider } from '@/contexts/CartContext'
import styles from './layout.module.css'

/** Public/main site only. Admin and seller portals use their own layouts (no PublicNavbar/PublicFooter). */
export default function PublicLayout({ children }) {
  return (
    <CartProvider>
      <PublicNavbar />
      <main className={styles.main}>
        <Suspense fallback={null}>
          {children}
        </Suspense>
      </main>
      <PublicFooter />
    </CartProvider>
  )
}