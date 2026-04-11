const VALID_SETTINGS_TABS = new Set(['profile', 'password', 'notifications', 'billing', 'content'])

export function normalizeSettingsTab(tab) {
  if (tab === 'general' || tab === 'my-details') return 'profile'
  if (tab && VALID_SETTINGS_TABS.has(tab)) return tab
  return 'profile'
}
