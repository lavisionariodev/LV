import { buildPaymongoDestinationAccount } from '../paymongo/client.js'
import { normalizeGcashNumber, resolvePhBank, validatePayoutFormats } from './payout.js'

export { normalizeGcashNumber, validatePayoutFormats }

export function isPaymongoDisbursementEnabled() {
  return String(process.env.PAYMONGO_DISBURSEMENT_ENABLED || '').toLowerCase() === 'true'
}

function hasPaymongoWalletSourceAccount() {
  const number = String(process.env.PAYMONGO_WALLET_SOURCE_ACCOUNT_NUMBER || '').trim()
  const name = String(process.env.PAYMONGO_WALLET_SOURCE_ACCOUNT_NAME || '').trim()
  return Boolean(number && name)
}

/**
 * @returns {string[]}
 */
export function getPaymongoDisbursementEnvIssues() {
  const issues = []
  if (!process.env.PAYMONGO_SECRET_KEY) {
    issues.push('PAYMONGO_SECRET_KEY is missing.')
  }
  if (isPaymongoDisbursementEnabled() && !hasPaymongoWalletSourceAccount()) {
    issues.push(
      'PayMongo wallet source account env vars are incomplete (PAYMONGO_WALLET_SOURCE_ACCOUNT_NUMBER, PAYMONGO_WALLET_SOURCE_ACCOUNT_NAME).',
    )
  }
  return issues
}

export function getPaymongoDisbursementEnvStatus() {
  const enabled = isPaymongoDisbursementEnabled()
  const secretKeyConfigured = Boolean(process.env.PAYMONGO_SECRET_KEY)
  const sourceAccountConfigured = hasPaymongoWalletSourceAccount()
  const automatedReady = enabled && secretKeyConfigured && sourceAccountConfigured

  return {
    enabled,
    secretKeyConfigured,
    sourceAccountConfigured,
    automatedReady,
    mode: automatedReady ? 'automated' : 'manual',
    issues: getPaymongoDisbursementEnvIssues(),
  }
}

/**
 * Seller-facing validation for saved payout_settings row (snake_case DB shape).
 * @param {Record<string, unknown> | null | undefined} row
 * @returns {string} Error message, or empty string if complete.
 */
export function validateSellerPayoutSettingsRow(row) {
  const method = String(row?.payout_method || 'bank').trim().toLowerCase()
  if (method === 'bank') {
    if (!String(row?.account_holder_name || '').trim()) {
      return 'Account holder name is required for bank payouts.'
    }
    if (!String(row?.bank_name || '').trim()) return 'Bank name is required for bank payouts.'
    if (!String(row?.account_number || '').trim()) return 'Account number is required for bank payouts.'
  }
  if (method === 'gcash') {
    if (!String(row?.gcash_name || '').trim()) return 'GCash account name is required.'
    if (!String(row?.gcash_number || '').trim()) return 'GCash number is required.'
  }
  if (method === 'manual' && !String(row?.notes || '').trim()) {
    return 'Please add payout instructions for manual payout.'
  }
  const email = String(row?.payout_email || '').trim()
  if (email && !/^\S+@\S+\.\S+$/.test(email)) return 'Please enter a valid payout email.'

  const formatError = validatePayoutFormats(row)
  if (formatError) return formatError

  return ''
}

/**
 * @param {Record<string, unknown> | null | undefined} payoutSettings
 * @returns {string}
 */
export function getPayoutVerificationError(payoutSettings) {
  if (!payoutSettings) return ''
  const method = String(payoutSettings.payout_method || 'bank').trim().toLowerCase()
  if (method === 'manual') return ''

  const status = String(payoutSettings.verification_status || 'pending_review').toLowerCase()
  if (status === 'approved') return ''
  if (status === 'rejected') {
    const reason = String(payoutSettings.verification_rejection_reason || '').trim()
    return reason || 'Your payout details were rejected. Update them and save for review.'
  }
  return 'Your payout details are pending admin review. You can withdraw after approval.'
}

/**
 * Withdraw + payout readiness for seller wallet UI.
 * @param {Record<string, unknown> | null | undefined} payoutSettings
 */
export function getSellerWithdrawReadiness(payoutSettings) {
  const env = getPaymongoDisbursementEnvStatus()
  const payoutMethod = String(payoutSettings?.payout_method || 'bank').trim().toLowerCase()
  const isManualPayout = payoutMethod === 'manual'
  const verificationStatus = String(payoutSettings?.verification_status || 'pending_review').toLowerCase()
  const missingRow = !payoutSettings
  const validationError = missingRow
    ? 'Add your bank or GCash payout details before you can withdraw.'
    : validateSellerPayoutSettingsRow(payoutSettings)
  const payoutSettingsComplete = !validationError
  const verificationError = payoutSettingsComplete ? getPayoutVerificationError(payoutSettings) : ''
  const payoutVerified = !verificationError

  const disbursement = evaluateSellerPayoutSettingsForDisbursement(payoutSettings)
  let disbursementError = null
  if (payoutSettingsComplete && !disbursement.ok && disbursement.error) {
    disbursementError = disbursement.error
  }

  const manualPayoutOnly = isManualPayout && payoutSettingsComplete
  const withdrawReady =
    env.automatedReady &&
    payoutSettingsComplete &&
    payoutVerified &&
    disbursement.ok &&
    !isManualPayout

  return {
    ...env,
    payoutMethod,
    isManualPayout,
    manualPayoutOnly,
    payoutSettingsComplete,
    payoutSettingsError: validationError || verificationError || disbursementError,
    verificationStatus,
    verificationError: verificationError || null,
    payoutVerified,
    disbursementError,
    withdrawReady,
  }
}

/**
 * @param {Record<string, unknown> | null | undefined} payoutSettings
 */
export function evaluateSellerPayoutSettingsForDisbursement(payoutSettings) {
  if (!isPaymongoDisbursementEnabled()) {
    return {
      ok: true,
      automated: false,
      reason: 'disbursement_disabled',
    }
  }

  const method = String(payoutSettings?.payout_method || payoutSettings?.payoutMethod || '').toLowerCase()
  if (method === 'bank') {
    const bankName = String(payoutSettings?.bank_name || payoutSettings?.bankName || '').trim()
    const { known } = resolvePhBank(bankName)
    if (bankName && !known) {
      return {
        ok: false,
        automated: false,
        error: 'Selected bank is not supported for automated transfers. Choose a bank from the list.',
      }
    }
  }

  const destination = buildPaymongoDestinationAccount(payoutSettings)
  if (!destination.ok) {
    return {
      ok: false,
      automated: false,
      error: destination.error,
    }
  }

  return {
    ok: true,
    automated: true,
    payoutMethod: method,
    destination: destination.destination,
  }
}
