import './globals.css'
import { AuthProvider } from '@/contexts/AuthContext'
import { ToastProvider } from '@/contexts/ToastContext'
import RecoveryRedirect from '@/components/auth/RecoveryRedirect'

export const metadata = {
  title: {
    default: 'Lavisionario',
    template: '%s | Lavisionario',
  },
  description: 'No description yet',
  manifest: '/manifest.webmanifest',
}

export const viewport = {
  themeColor: '#102820',
  viewportFit: 'cover',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body>
        <AuthProvider>
          <ToastProvider>
            <RecoveryRedirect />
            {children}
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  )
}