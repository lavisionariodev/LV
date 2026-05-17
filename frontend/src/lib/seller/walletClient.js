async function parseJsonResponse(res) {
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(data.error || 'Request failed.')
  }
  return data
}

export async function fetchSellerWalletSummary() {
  const res = await fetch('/api/seller/wallet', { credentials: 'include', cache: 'no-store' })
  return parseJsonResponse(res)
}

/**
 * @param {{ limit?: number, offset?: number }} [params]
 */
export async function fetchSellerWalletTransactions(params = {}) {
  const qs = new URLSearchParams()
  if (params.limit != null) qs.set('limit', String(params.limit))
  if (params.offset != null) qs.set('offset', String(params.offset))
  const query = qs.toString()
  const res = await fetch(`/api/seller/wallet/transactions${query ? `?${query}` : ''}`, {
    credentials: 'include',
    cache: 'no-store',
  })
  return parseJsonResponse(res)
}

/**
 * @param {{ limit?: number }} [params]
 */
export async function fetchSellerWithdrawals(params = {}) {
  const qs = new URLSearchParams()
  if (params.limit != null) qs.set('limit', String(params.limit))
  const query = qs.toString()
  const res = await fetch(`/api/seller/wallet/withdrawals${query ? `?${query}` : ''}`, {
    credentials: 'include',
    cache: 'no-store',
  })
  return parseJsonResponse(res)
}

/**
 * @param {{ amountPhp: number, idempotencyKey?: string }} params
 */
export async function createSellerWithdrawal(params) {
  const res = await fetch('/api/seller/wallet/withdraw', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      amountPhp: params.amountPhp,
      idempotencyKey: params.idempotencyKey,
    }),
  })
  return parseJsonResponse(res)
}
