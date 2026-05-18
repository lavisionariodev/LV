/**
 * Seller payout settings helpers: masking, normalization, sensitive-change detection.
 */

export function maskPayoutSecret(value) {
  const s = String(value || '').trim()
  if (!s) return ''
  if (s.length <= 4) return '*'.repeat(s.length)
  return `${'*'.repeat(Math.max(0, s.length - 4))}${s.slice(-4)}`
}

/**
 * @param {Record<string, unknown> | null | undefined} row
 */
export function mapPayoutSettingsForSeller(row) {
  if (!row) return null
  const accountNumber = String(row.account_number || '').trim()
  const gcashNumber = String(row.gcash_number || '').trim()
  return {
    payoutMethod: row.payout_method || 'bank',
    accountHolderName: row.account_holder_name || '',
    bankName: row.bank_name || '',
    hasAccountNumber: Boolean(accountNumber),
    maskedAccountNumber: maskPayoutSecret(accountNumber),
    gcashName: row.gcash_name || '',
    hasGcashNumber: Boolean(gcashNumber),
    maskedGcashNumber: maskPayoutSecret(gcashNumber),
    payoutEmail: row.payout_email || '',
    notes: row.notes || '',
    verificationStatus: row.verification_status || 'pending_review',
    verificationRejectionReason: row.verification_rejection_reason || '',
    updatedAt: row.updated_at,
  }
}

/**
 * @param {Record<string, unknown> | null | undefined} row
 */
export function mapPayoutSettingsForAdmin(row) {
  if (!row) return null
  return {
    payoutMethod: row.payout_method || 'bank',
    accountHolderName: row.account_holder_name || '',
    bankName: row.bank_name || '',
    accountNumber: row.account_number || '',
    maskedAccountNumber: maskPayoutSecret(row.account_number),
    gcashName: row.gcash_name || '',
    gcashNumber: row.gcash_number || '',
    maskedGcashNumber: maskPayoutSecret(row.gcash_number),
    payoutEmail: row.payout_email || '',
    notes: row.notes || '',
    verificationStatus: row.verification_status || 'pending_review',
    verificationRejectionReason: row.verification_rejection_reason || '',
    verifiedAt: row.verified_at,
    verifiedBy: row.verified_by,
    updatedAt: row.updated_at,
    createdAt: row.created_at,
  }
}

/**
 * @param {Record<string, unknown> | null | undefined} existing
 * @param {Record<string, unknown>} cleaned snake_case payload
 */
export function sensitivePayoutFieldsChanged(existing, cleaned) {
  if (!existing) return true
  const fields = [
    'payout_method',
    'account_holder_name',
    'bank_name',
    'account_number',
    'gcash_name',
    'gcash_number',
  ]
  return fields.some((key) => {
    const prev = String(existing[key] ?? '').trim()
    const next = String(cleaned[key] ?? '').trim()
    return prev !== next
  })
}

/**
 * Null out columns not used by the selected payout method.
 * @param {Record<string, unknown>} cleaned
 */
export function normalizePayoutPayload(cleaned) {
  const method = String(cleaned.payout_method || 'bank').trim().toLowerCase()
  const out = { ...cleaned }

  if (method === 'bank') {
    out.gcash_name = null
    out.gcash_number = null
  } else if (method === 'gcash') {
    out.account_holder_name = null
    out.bank_name = null
    out.account_number = null
  } else if (method === 'manual') {
    out.account_holder_name = null
    out.bank_name = null
    out.account_number = null
    out.gcash_name = null
    out.gcash_number = null
  }

  return out
}
