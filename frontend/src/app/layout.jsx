import './globals.css'
import { AuthProvider } from '@/contexts/AuthContext'
import { ToastProvider } from '@/contexts/ToastContext'
import { RoleProvider } from '@/contexts/RoleContext'
import RecoveryRedirect from '@/components/auth/RecoveryRedirect'
import RoleSwitcher from '@/components/auth/RoleSwitcher'

export const metadata = {
  title: {
    default: 'Lavisionario',
    template: '%s | Lavisionario',
  },
  description: 'No description yet',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <ToastProvider>
            <RoleProvider>
              <RecoveryRedirect />
              <RoleSwitcher />
              {children}
            </RoleProvider>
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  )
}