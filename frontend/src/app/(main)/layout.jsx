import { Suspense } from 'react'
import { PublicNavbar, PublicFooter } from '@/components/layout'
import { CartProvider } from '@/contexts/CartContext'
import { FavoritesProvider } from '@/contexts/FavoritesContext'
import styles from './layout.module.css'

/** Public/main site only. Admin and seller portals use their own layouts (no PublicNavbar/PublicFooter). */
export default function PublicLayout({ children }) {
  return (
    <CartProvider>
    <FavoritesProvider>
    <Suspense fallback={null}>
      <PublicNavbar />
    </Suspense>
      <main className={styles.main}>
        <Suspense fallback={null}>
          {children}
        </Suspense>
      </main>
      <PublicFooter />
    </FavoritesProvider>
    </CartProvider>
  )
}