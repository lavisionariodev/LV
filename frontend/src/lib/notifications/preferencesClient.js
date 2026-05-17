import { fetchJson } from '@/shared/utils'

export async function fetchAdminNotificationPreferences() {
  const body = await fetchJson('/api/admin/notification-preferences', { cache: 'no-store' }, {
    fallbackError: 'Failed to load preferences.',
  })
  return body?.preferences
}

export async function saveAdminNotificationPreferences(preferences) {
  const body = await fetchJson(
    '/api/admin/notification-preferences',
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ preferences }),
    },
    { fallbackError: 'Could not save preferences.' },
  )
  return body?.preferences
}

export async function fetchSellerNotificationPreferences() {
  const body = await fetchJson('/api/seller/notification-preferences', { cache: 'no-store' }, {
    fallbackError: 'Failed to load notification preferences.',
  })
  return body?.preferences
}

export async function saveSellerNotificationPreferences(preferences) {
  const body = await fetchJson(
    '/api/seller/notification-preferences',
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ preferences }),
    },
    { fallbackError: 'Failed to save notification preferences.' },
  )
  return body?.preferences
}

export async function fetchBuyerNotificationPreferences() {
  const body = await fetchJson('/api/buyer/notification-preferences', { cache: 'no-store' }, {
    fallbackError: 'Failed to load notification preferences.',
  })
  return body?.preferences
}

export async function saveBuyerNotificationPreferences(preferences) {
  const body = await fetchJson(
    '/api/buyer/notification-preferences',
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ preferences }),
    },
    { fallbackError: 'Failed to save notification preferences.' },
  )
  return body?.preferences
}
