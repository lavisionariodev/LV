import { buildPaymongoDestinationAccount } from '../paymongo/client.js'
import { isPaymongoDisbursementEnabled } from './sellerWalletSummary.js'

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
  return ''
}

/**
 * Withdraw + payout readiness for seller wallet UI.
 * @param {Record<string, unknown> | null | undefined} payoutSettings
 */
export function getSellerWithdrawReadiness(payoutSettings) {
  const env = getPaymongoDisbursementEnvStatus()
  const payoutMethod = String(payoutSettings?.payout_method || 'bank').trim().toLowerCase()
  const isManualPayout = payoutMethod === 'manual'
  const missingRow = !payoutSettings
  const validationError = missingRow
    ? 'Add your bank or GCash payout details before you can withdraw.'
    : validateSellerPayoutSettingsRow(payoutSettings)
  const payoutSettingsComplete = !validationError

  const disbursement = evaluateSellerPayoutSettingsForDisbursement(payoutSettings)
  let disbursementError = null
  if (payoutSettingsComplete && !disbursement.ok && disbursement.error) {
    disbursementError = disbursement.error
  }

  const manualPayoutOnly = isManualPayout && payoutSettingsComplete
  const withdrawReady =
    env.automatedReady && payoutSettingsComplete && disbursement.ok && !isManualPayout

  return {
    ...env,
    payoutMethod,
    isManualPayout,
    manualPayoutOnly,
    payoutSettingsComplete,
    payoutSettingsError: validationError || disbursementError,
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
    payoutMethod: String(payoutSettings?.payout_method || payoutSettings?.payoutMethod || '').toLowerCase(),
    destination: destination.destination,
  }
}
