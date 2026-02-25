import { PublicNavbar, PublicFooter } from '@/components/layout'
import { CartProvider } from '@/contexts/CartContext'

export default function PublicLayout({ children }) {
  return (
    <CartProvider>
      <PublicNavbar />
      <main>{children}</main>
      <PublicFooter />
    </CartProvider>
  )
}