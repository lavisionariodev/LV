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
