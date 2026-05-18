/**
 * Payout validation, settings mappers, and shared constants (client + server safe).
 */

export const MIN_WITHDRAWAL_PHP = 100

export const PH_BANKS = [
  { id: 'bdo', label: 'BDO Unibank', bic: 'BNORPHMMXXX', aliases: ['bdo', 'banco de oro'] },
  { id: 'bpi', label: 'Bank of the Philippine Islands (BPI)', bic: 'BOPIPHMMXXX', aliases: ['bpi'] },
  { id: 'metrobank', label: 'Metrobank', bic: 'MBTCPHMMXXX', aliases: ['metrobank', 'metro bank'] },
  { id: 'landbank', label: 'Land Bank of the Philippines', bic: 'TLBPPHMMXXX', aliases: ['landbank', 'land bank'] },
  { id: 'unionbank', label: 'UnionBank', bic: 'UBPHPHMMXXX', aliases: ['unionbank', 'union bank'] },
  { id: 'chinabank', label: 'China Banking Corporation', bic: 'CHBKPHMMXXX', aliases: ['chinabank', 'china bank'] },
  { id: 'security', label: 'Security Bank', bic: 'SETCPHMMXXX', aliases: ['security bank', 'securitybank'] },
  { id: 'eastwest', label: 'EastWest Bank', bic: 'EWBCPHMMXXX', aliases: ['eastwest', 'east west'] },
  { id: 'rcbc', label: 'RCBC', bic: 'RCBCPHMMXXX', aliases: ['rcbc'] },
  { id: 'pnb', label: 'Philippine National Bank (PNB)', bic: 'PNBMPHMMXXX', aliases: ['pnb', 'philippine national bank'] },
]

export const PH_BANK_OPTIONS = PH_BANKS.map((b) => ({ value: b.label, label: b.label }))

/**
 * @param {string} bankNameOrId
 * @returns {{ bank: typeof PH_BANKS[0] | null, bic: string | null, known: boolean }}
 */
export function resolvePhBank(bankNameOrId) {
  const raw = String(bankNameOrId || '').trim()
  if (!raw) return { bank: null, bic: null, known: false }

  const lower = raw.toLowerCase()
  for (const bank of PH_BANKS) {
    if (bank.id === lower || bank.label.toLowerCase() === lower) {
      return { bank, bic: bank.bic, known: true }
    }
    if (bank.aliases.some((a) => lower.includes(a) || a.includes(lower))) {
      return { bank, bic: bank.bic, known: true }
    }
  }
  return { bank: null, bic: null, known: false }
}

/** Platform fee deducted from seller gross withdrawal (PayMongo fees are separate). */
export function getPlatformWithdrawalFeePhp() {
  const raw = process.env.PLATFORM_WITHDRAWAL_FEE_PHP
  if (raw == null || raw === '') return 0
  const n = Number(raw)
  return Number.isFinite(n) && n >= 0 ? n : 0
}

/**
 * Normalize GCash mobile to 09XXXXXXXXX (11 digits).
 * @param {string} raw
 * @returns {string}
 */
export function normalizeGcashNumber(raw) {
  let digits = String(raw || '').replace(/\D/g, '')
  if (digits.startsWith('63') && digits.length === 12) {
    digits = `0${digits.slice(2)}`
  }
  if (digits.length === 10 && digits.startsWith('9')) {
    digits = `0${digits}`
  }
  return digits
}

/**
 * Format validation for payout account fields (snake_case row).
 * @param {Record<string, unknown> | null | undefined} row
 * @returns {string} Error message, or empty string.
 */
export function validatePayoutFormats(row) {
  const method = String(row?.payout_method || row?.payoutMethod || 'bank').trim().toLowerCase()

  if (method === 'bank') {
    const name = String(row?.account_holder_name || row?.accountHolderName || '').trim()
    if (name.length < 2) return 'Account holder name must be at least 2 characters.'
    const acct = String(row?.account_number || row?.accountNumber || '').replace(/\D/g, '')
    if (acct.length < 8 || acct.length > 16) {
      return 'Bank account number must be 8–16 digits.'
    }
    const bankName = String(row?.bank_name || row?.bankName || '').trim()
    if (bankName) {
      const { known } = resolvePhBank(bankName)
      if (!known) {
        return 'Please select a supported bank from the list.'
      }
    }
  }

  if (method === 'gcash') {
    const gcashName = String(row?.gcash_name || row?.gcashName || '').trim()
    if (gcashName.length < 2) return 'GCash account name must be at least 2 characters.'
    const gcash = normalizeGcashNumber(row?.gcash_number || row?.gcashNumber)
    if (!/^09\d{9}$/.test(gcash)) {
      return 'GCash number must be a valid Philippine mobile number (09XXXXXXXXX).'
    }
  }

  return ''
}

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
