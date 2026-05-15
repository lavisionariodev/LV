export async function fetchSellerWithdrawSummary() {
  const res = await fetch('/api/seller/withdraw', { credentials: 'include' })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(data.error || 'Failed to load withdrawal summary.')
  }
  return data
}

/**
 * @param {{ amountPhp: number, idempotencyKey?: string }} params
 */
export async function createSellerWithdrawal(params) {
  const res = await fetch('/api/seller/withdraw', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      amountPhp: params.amountPhp,
      idempotencyKey: params.idempotencyKey,
    }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(data.error || 'Withdrawal failed.')
  }
  return data
}
