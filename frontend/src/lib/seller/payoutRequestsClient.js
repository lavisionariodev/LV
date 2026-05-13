import { fetchJson } from '@/shared/utils/fetchJson'

export async function listSellerPayoutRequests() {
  const body = await fetchJson('/api/seller/payout-requests', { cache: 'no-store' }, {
    fallbackError: 'Failed to load payout requests.',
  })
  return Array.isArray(body?.requests) ? body.requests : []
}

export async function createSellerPayoutRequest({ note, requestedAmount }) {
  return fetchJson(
    '/api/seller/payout-requests',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ note, requestedAmount }),
    },
    { fallbackError: 'Failed to submit payout request.' },
  )
}
