export const ADMIN_SETTINGS_NAV = [
  { id: 'account', label: 'Account', href: '/admin/settings/account' },
  { id: 'password', label: 'Password', href: '/admin/settings/password' },
  { id: 'notifications', label: 'Notification', href: '/admin/settings/notifications' },
  { id: 'billing', label: 'Billing', href: '/admin/settings/billing' },
  { id: 'site-content', label: 'Content', href: '/admin/settings/site-content' },
]

export function getSettingsSectionFromPathname(pathname) {
  if (!pathname) return null
  const match = pathname.match(/^\/admin\/settings\/([^/]+)/)
  if (!match) return null
  const segment = match[1]
  return ADMIN_SETTINGS_NAV.some((item) => item.id === segment) ? segment : null
}
