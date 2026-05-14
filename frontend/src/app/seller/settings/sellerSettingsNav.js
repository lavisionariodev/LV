export const SELLER_SETTINGS_NAV = [
  { id: 'profile', label: 'Profile', href: '/seller/settings/profile' },
  { id: 'password', label: 'Password', href: '/seller/settings/password' },
  { id: 'shop-information', label: 'Shop information', href: '/seller/settings/shop-information' },
  { id: 'payouts', label: 'Payouts', href: '/seller/settings/payouts' },
  { id: 'documents', label: 'Documents', href: '/seller/settings/documents' },
  { id: 'notifications', label: 'Notifications', href: '/seller/settings/notifications' },
]

export function getSettingsSectionFromPathname(pathname) {
  if (!pathname) return null
  const match = pathname.match(/^\/seller\/settings\/([^/]+)/)
  if (!match) return null
  const segment = match[1]
  return SELLER_SETTINGS_NAV.some((item) => item.id === segment) ? segment : null
}
