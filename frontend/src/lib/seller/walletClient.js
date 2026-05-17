import { fetchJson } from '@/shared/utils/fetchJson'

/**
 * Wallet API fetch — uses shared fetchJson; coerces null bodies to {} (legacy parseJsonResponse behavior).
 * @param {string} url
 * @param {RequestInit} [init]
 */
async function sellerWalletFetch(url, init) {
  const data = await fetchJson(url, init, { fallbackError: 'Request failed.' })
  return data ?? {}
}

export async function fetchSellerWalletSummary() {
  return sellerWalletFetch('/api/seller/wallet', { credentials: 'include', cache: 'no-store' })
}

/**
 * @param {{ limit?: number, offset?: number }} [params]
 */
export async function fetchSellerWalletTransactions(params = {}) {
  const qs = new URLSearchParams()
  if (params.limit != null) qs.set('limit', String(params.limit))
  if (params.offset != null) qs.set('offset', String(params.offset))
  const query = qs.toString()
  return sellerWalletFetch(`/api/seller/wallet/transactions${query ? `?${query}` : ''}`, {
    credentials: 'include',
    cache: 'no-store',
  })
}

/**
 * @param {{ limit?: number }} [params]
 */
export async function fetchSellerWithdrawals(params = {}) {
  const qs = new URLSearchParams()
  if (params.limit != null) qs.set('limit', String(params.limit))
  const query = qs.toString()
  return sellerWalletFetch(`/api/seller/wallet/withdrawals${query ? `?${query}` : ''}`, {
    credentials: 'include',
    cache: 'no-store',
  })
}

/**
 * @param {{ amountPhp: number, idempotencyKey?: string }} params
 */
export async function createSellerWithdrawal(params) {
  return sellerWalletFetch('/api/seller/wallet/withdraw', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      amountPhp: params.amountPhp,
      idempotencyKey: params.idempotencyKey,
    }),
  })
}
