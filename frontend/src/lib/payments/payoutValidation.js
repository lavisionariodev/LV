import { resolvePhBank } from './phBanks.js'

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
