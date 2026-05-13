const VALID_SETTINGS_TABS = new Set(['profile', 'password', 'shop', 'payouts', 'documents', 'notifications'])

export function normalizeSellerSettingsTab(tab) {
  if (tab === 'general' || tab === 'my-details') return 'profile'
  if (tab && VALID_SETTINGS_TABS.has(tab)) return tab
  return 'profile'
}
