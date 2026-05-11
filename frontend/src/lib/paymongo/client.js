/**
 * PayMongo REST helpers (server-only). Uses PAYMONGO_SECRET_KEY.
 * Amounts for PayMongo are in the smallest currency unit (centavos for PHP).
 */

function getBasicAuthHeader(secretKey) {
  const token = Buffer.from(`${secretKey}:`).toString('base64')
  return `Basic ${token}`
}

/**
 * @param {number} amountPhp
 * @returns {number | null}
 */
export function phpToCentavos(amountPhp) {
  const num = Number(amountPhp)
  if (!Number.isFinite(num)) return null
  return Math.round(num * 100)
}

/**
 * Create a refund against a PayMongo Payment.
 * @see https://developers.paymongo.com/reference/create-a-refund
 * @param {{ paymentId: string, amountCentavos: number, notes?: string, reason?: string }} params
 * @returns {Promise<{ ok: true, refundId: string, raw: unknown } | { ok: false, error: string, status?: number, raw?: unknown }>}
 */
export async function createPaymongoRefund(params) {
  const secretKey = process.env.PAYMONGO_SECRET_KEY
  if (!secretKey) {
    return { ok: false, error: 'Missing PAYMONGO_SECRET_KEY on server.' }
  }

  const { paymentId, amountCentavos, notes, reason } = params
  if (!paymentId || !amountCentavos || amountCentavos <= 0) {
    return { ok: false, error: 'Invalid refund parameters.' }
  }

  const body = {
    data: {
      attributes: {
        amount: amountCentavos,
        notes: notes ?? '',
        payment_id: paymentId,
        reason: reason ?? 'requested_by_customer',
      },
    },
  }

  const res = await fetch('https://api.paymongo.com/v1/refunds', {
    method: 'POST',
    headers: {
      Authorization: getBasicAuthHeader(secretKey),
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(body),
  })

  const raw = await res.json().catch(() => null)
  if (!res.ok) {
    const msg =
      raw?.errors?.[0]?.detail ||
      raw?.errors?.[0]?.code ||
      raw?.message ||
      `PayMongo refund failed (${res.status})`
    return { ok: false, error: String(msg), status: res.status, raw }
  }

  const refundId = raw?.data?.id ?? null
  if (!refundId) {
    return { ok: false, error: 'PayMongo refund response missing id.', raw }
  }

  return { ok: true, refundId: String(refundId), raw }
}
