import { PublicNavbar, PublicFooter } from '@/components/layout'

export default function PublicLayout({ children }) {
  return (
    <>
      <PublicNavbar />
      <main>{children}</main>
      <PublicFooter />
    </>
  )
}