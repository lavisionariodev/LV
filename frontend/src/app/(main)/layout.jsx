import { Suspense } from 'react'
import { PublicNavbar, PublicFooter } from '@/components/layout'
import { CartProvider } from '@/contexts/CartContext'

export default function PublicLayout({ children }) {
  return (
    <CartProvider>
      <PublicNavbar />
      <main>
        <Suspense fallback={null}>
          {children}
        </Suspense>
      </main>
      <PublicFooter />
    </CartProvider>
  )
}