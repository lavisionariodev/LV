/**
 * PayMongo REST helpers (server-only). Uses PAYMONGO_SECRET_KEY.
 * Amounts for PayMongo are in the smallest currency unit (centavos for PHP).
 *
 * Disbursement prerequisites:
 * - PAYMONGO_DISBURSEMENT_ENABLED=true
 * - PAYMONGO_SECRET_KEY with money-movement scopes
 * - Funded PayMongo wallet and PAYMONGO_WALLET_SOURCE_* account env vars
 */

const PAYMONGO_API_BASE = 'https://api.paymongo.com'
const DEFAULT_SOURCE_BIC = 'PAEYPHM2XXX'
const DEFAULT_DESTINATION_BIC = 'PAEYPHM2XXX'

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

function getPaymongoSecretKey() {
  return process.env.PAYMONGO_SECRET_KEY || ''
}

function getPaymongoSourceAccount() {
  const number = String(process.env.PAYMONGO_WALLET_SOURCE_ACCOUNT_NUMBER || '').trim()
  const name = String(process.env.PAYMONGO_WALLET_SOURCE_ACCOUNT_NAME || '').trim()
  const bic = String(process.env.PAYMONGO_WALLET_SOURCE_BIC || DEFAULT_SOURCE_BIC).trim()
  if (!number || !name || !bic) return null
  return { number, name, bic }
}

function normalizeBankBic(bankName) {
  const normalized = String(bankName || '').trim().toLowerCase()
  const map = {
    bdo: 'BNORPHMMXXX',
    bpi: 'BOPIPHMMXXX',
    metrobank: 'MBTCPHMMXXX',
    landbank: 'TLBPPHMMXXX',
    unionbank: 'UBPHPHMMXXX',
    gcash: DEFAULT_DESTINATION_BIC,
  }
  for (const [key, bic] of Object.entries(map)) {
    if (normalized.includes(key)) return bic
  }
  return String(process.env.PAYMONGO_DEFAULT_DESTINATION_BIC || DEFAULT_DESTINATION_BIC).trim()
}

/**
 * @param {Record<string, unknown> | null | undefined} payoutSettings
 */
export function buildPaymongoDestinationAccount(payoutSettings) {
  if (!payoutSettings) {
    return { ok: false, error: 'Seller payout settings are missing.' }
  }

  const method = String(payoutSettings.payout_method || payoutSettings.payoutMethod || '').toLowerCase()
  if (method === 'manual') {
    return { ok: false, error: 'Manual payout settings cannot be sent through automated PayMongo disbursement.' }
  }

  if (method === 'gcash') {
    const number = String(payoutSettings.gcash_number || payoutSettings.gcashNumber || '').trim()
    const name = String(payoutSettings.gcash_name || payoutSettings.gcashName || '').trim()
    if (!number || !name) {
      return { ok: false, error: 'GCash payout settings are incomplete.' }
    }
    return {
      ok: true,
      destination: {
        number,
        name,
        bic: normalizeBankBic('gcash'),
      },
    }
  }

  const number = String(payoutSettings.account_number || payoutSettings.accountNumber || '').trim()
  const name = String(payoutSettings.account_holder_name || payoutSettings.accountHolderName || '').trim()
  const bankName = String(payoutSettings.bank_name || payoutSettings.bankName || '').trim()
  if (!number || !name || !bankName) {
    return { ok: false, error: 'Bank payout settings are incomplete.' }
  }

  return {
    ok: true,
    destination: {
      number,
      name,
      bic: normalizeBankBic(bankName),
    },
  }
}

/**
 * @param {{ amountPhp: number, destination: { number: string, name: string, bic: string }, referenceNumber: string, metadata?: Record<string, unknown>, provider?: string, callbackUrl?: string | null }} params
 */
export async function createPaymongoBatchTransfer(params) {
  const secretKey = getPaymongoSecretKey()
  if (!secretKey) {
    return { ok: false, error: 'Missing PAYMONGO_SECRET_KEY on server.' }
  }

  const sourceAccount = getPaymongoSourceAccount()
  if (!sourceAccount) {
    return {
      ok: false,
      error:
        'Missing PayMongo wallet source account env vars (PAYMONGO_WALLET_SOURCE_ACCOUNT_NUMBER, PAYMONGO_WALLET_SOURCE_ACCOUNT_NAME).',
    }
  }

  const amountCentavos = phpToCentavos(params.amountPhp)
  if (!amountCentavos || amountCentavos <= 0) {
    return { ok: false, error: 'Invalid disbursement amount.' }
  }

  const body = {
    transfers: [
      {
        source_account: sourceAccount,
        destination_account: params.destination,
        amount: amountCentavos,
        currency: 'PHP',
        provider: params.provider || 'instapay',
        reference_number: params.referenceNumber,
        purpose: 'seller_payout',
        description: 'Marketplace seller payout',
        callback_url: params.callbackUrl || undefined,
        metadata: params.metadata || {},
      },
    ],
  }

  const res = await fetch(`${PAYMONGO_API_BASE}/v2/batch_transfers`, {
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
      `PayMongo batch transfer failed (${res.status})`
    return { ok: false, error: String(msg), status: res.status, raw }
  }

  const batchId = raw?.data?.id ? String(raw.data.id) : null
  const transfer = Array.isArray(raw?.data?.transfers) ? raw.data.transfers[0] : null
  const transferId = transfer?.id ? String(transfer.id) : null
  const transferStatus = transfer?.status ? String(transfer.status) : 'pending'

  if (!batchId || !transferId) {
    return { ok: false, error: 'PayMongo batch transfer response missing transfer id.', raw }
  }

  return {
    ok: true,
    batchId,
    transferId,
    transferStatus,
    raw,
  }
}

/**
 * @param {string} batchTransferId
 */
export async function getPaymongoBatchTransfer(batchTransferId) {
  const secretKey = getPaymongoSecretKey()
  if (!secretKey) {
    return { ok: false, error: 'Missing PAYMONGO_SECRET_KEY on server.' }
  }
  if (!batchTransferId) {
    return { ok: false, error: 'Missing batch transfer id.' }
  }

  const res = await fetch(`${PAYMONGO_API_BASE}/v2/batch_transfers/${encodeURIComponent(batchTransferId)}`, {
    method: 'GET',
    headers: {
      Authorization: getBasicAuthHeader(secretKey),
      Accept: 'application/json',
    },
  })

  const raw = await res.json().catch(() => null)
  if (!res.ok) {
    const msg =
      raw?.errors?.[0]?.detail ||
      raw?.errors?.[0]?.code ||
      raw?.message ||
      `PayMongo batch transfer lookup failed (${res.status})`
    return { ok: false, error: String(msg), status: res.status, raw }
  }

  const batchId = raw?.data?.id ? String(raw.data.id) : batchTransferId
  const transfers = Array.isArray(raw?.data?.transfers) ? raw.data.transfers : []
  return { ok: true, batchId, transfers, raw }
}
