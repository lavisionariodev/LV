import { maskPayoutSecret, normalizeGcashNumber, validatePayoutFormats } from '../payments/payout.js'

const SETTLEMENT_SELECT =
  'id,legal_name,address,tax_id,billing_email,settlement_notes,settlement_method,settlement_account_holder_name,settlement_bank_name,settlement_account_number,settlement_gcash_name,settlement_gcash_number,default_commission_percent,updated_at'

export { SETTLEMENT_SELECT }

/**
 * Map DB row to API shape with masked secrets.
 * @param {Record<string, unknown> | null | undefined} row
 */
/**
 * DB row safe for API JSON (masks settlement account numbers).
 * @param {Record<string, unknown> | null | undefined} row
 */
export function sanitizeBillingRowForApi(row) {
  if (!row) return null
  const mapped = mapPlatformBillingForAdmin(row)
  return {
    ...row,
    settlement_account_number: mapped.hasSettlementAccountNumber
      ? mapped.maskedSettlementAccountNumber
      : null,
    settlement_gcash_number: mapped.hasSettlementGcashNumber
      ? mapped.maskedSettlementGcashNumber
      : null,
  }
}

export function mapPlatformBillingForAdmin(row) {
  if (!row) return null
  const accountNumber = String(row.settlement_account_number || '').trim()
  const gcashNumber = String(row.settlement_gcash_number || '').trim()
  return {
    id: row.id,
    legalName: row.legal_name || '',
    address: row.address || '',
    taxId: row.tax_id || '',
    billingEmail: row.billing_email || '',
    settlementNotes: row.settlement_notes || '',
    settlementMethod: row.settlement_method || 'bank',
    settlementAccountHolderName: row.settlement_account_holder_name || '',
    settlementBankName: row.settlement_bank_name || '',
    hasSettlementAccountNumber: Boolean(accountNumber),
    maskedSettlementAccountNumber: maskPayoutSecret(accountNumber),
    settlementGcashName: row.settlement_gcash_name || '',
    hasSettlementGcashNumber: Boolean(gcashNumber),
    maskedSettlementGcashNumber: maskPayoutSecret(gcashNumber),
    defaultCommissionPercent:
      row.default_commission_percent != null ? Number(row.default_commission_percent) : 10,
    updatedAt: row.updated_at,
  }
}

/**
 * @param {Record<string, unknown> | null | undefined} mapped from mapPlatformBillingForAdmin
 */
export function settlementConfiguredSummary(mapped) {
  if (!mapped) return { configured: false, label: 'Not configured' }
  const method = String(mapped.settlementMethod || 'bank').toLowerCase()
  if (method === 'bank') {
    const ok =
      Boolean(mapped.settlementAccountHolderName) &&
      Boolean(mapped.settlementBankName) &&
      mapped.hasSettlementAccountNumber
    if (!ok) return { configured: false, label: 'Not configured' }
    return {
      configured: true,
      label: `Bank · ${mapped.settlementBankName} · ${mapped.maskedSettlementAccountNumber || '—'}`,
    }
  }
  if (method === 'gcash') {
    const ok = Boolean(mapped.settlementGcashName) && mapped.hasSettlementGcashNumber
    if (!ok) return { configured: false, label: 'Not configured' }
    return {
      configured: true,
      label: `GCash · ${mapped.settlementGcashName} · ${mapped.maskedSettlementGcashNumber || '—'}`,
    }
  }
  if (method === 'manual') {
    const ok = Boolean(String(mapped.settlementNotes || '').trim())
    return {
      configured: ok,
      label: ok ? 'Manual settlement (see notes)' : 'Not configured',
    }
  }
  return { configured: false, label: 'Not configured' }
}

/**
 * Build snake_case patch from PATCH body camelCase fields.
 * @param {Record<string, unknown>} body
 * @returns {{ patch: Record<string, unknown>, error?: string }}
 */
export function buildSettlementPatchFromBody(body) {
  const patch = {}

  if (body?.settlementMethod !== undefined) {
    const method = String(body.settlementMethod || 'bank').trim().toLowerCase()
    if (!['bank', 'gcash', 'manual'].includes(method)) {
      return { patch: {}, error: 'settlementMethod must be bank, gcash, or manual.' }
    }
    patch.settlement_method = method
  }

  const stringFields = {
    settlementAccountHolderName: 'settlement_account_holder_name',
    settlementBankName: 'settlement_bank_name',
    settlementAccountNumber: 'settlement_account_number',
    settlementGcashName: 'settlement_gcash_name',
    settlementGcashNumber: 'settlement_gcash_number',
    settlementNotes: 'settlement_notes',
  }

  for (const [camel, snake] of Object.entries(stringFields)) {
    if (body?.[camel] === undefined) continue
    const v = body[camel]
    if (v == null || v === '') {
      patch[snake] = null
      continue
    }
    if (typeof v !== 'string') {
      return { patch: {}, error: `${camel} must be a string.` }
    }
    if (snake === 'settlement_gcash_number') {
      patch[snake] = normalizeGcashNumber(v) || null
    } else if (snake === 'settlement_account_number') {
      patch[snake] = v.replace(/\D/g, '').trim() || null
    } else {
      patch[snake] = v.trim().slice(0, 4000) || null
    }
  }

  return { patch }
}

/**
 * Validate settlement row for save (after merge with existing).
 * @param {Record<string, unknown>} row snake_case
 */
export function validatePlatformSettlementRow(row) {
  const method = String(row.settlement_method || 'bank').trim().toLowerCase()
  if (method === 'manual') {
    if (!String(row.settlement_notes || '').trim()) {
      return 'Settlement notes are required for manual settlement.'
    }
    return ''
  }
  return validatePayoutFormats({
    payout_method: method,
    account_holder_name: row.settlement_account_holder_name,
    bank_name: row.settlement_bank_name,
    account_number: row.settlement_account_number,
    gcash_name: row.settlement_gcash_name,
    gcash_number: row.settlement_gcash_number,
  })
}
