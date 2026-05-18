import test from 'node:test'
import assert from 'node:assert/strict'
import {
  evaluateSellerPayoutSettingsForDisbursement,
  getPaymongoDisbursementEnvStatus,
  getSellerWithdrawReadiness,
  validatePayoutFormats,
} from './disbursementConfig.js'
import { normalizeGcashNumber } from './payoutValidation.js'

test('getPaymongoDisbursementEnvStatus reports manual mode when env flag is off', () => {
  const previous = process.env.PAYMONGO_DISBURSEMENT_ENABLED
  process.env.PAYMONGO_DISBURSEMENT_ENABLED = 'false'
  const status = getPaymongoDisbursementEnvStatus()
  assert.equal(status.automatedReady, false)
  assert.equal(status.mode, 'manual')
  process.env.PAYMONGO_DISBURSEMENT_ENABLED = previous
})

test('evaluateSellerPayoutSettingsForDisbursement rejects manual payout method when automation is enabled', () => {
  const previous = process.env.PAYMONGO_DISBURSEMENT_ENABLED
  process.env.PAYMONGO_DISBURSEMENT_ENABLED = 'true'
  const result = evaluateSellerPayoutSettingsForDisbursement({
    payout_method: 'manual',
    notes: 'Pay outside PayMongo',
  })
  assert.equal(result.ok, false)
  assert.match(String(result.error || ''), /manual payout settings/i)
  process.env.PAYMONGO_DISBURSEMENT_ENABLED = previous
})

test('evaluateSellerPayoutSettingsForDisbursement accepts complete bank settings when automation is enabled', () => {
  const previous = process.env.PAYMONGO_DISBURSEMENT_ENABLED
  process.env.PAYMONGO_DISBURSEMENT_ENABLED = 'true'
  const result = evaluateSellerPayoutSettingsForDisbursement({
    payout_method: 'bank',
    account_holder_name: 'Seller One',
    bank_name: 'BDO',
    account_number: '1234567890',
  })
  assert.equal(result.ok, true)
  assert.equal(result.automated, true)
  assert.ok(result.destination?.number)
  process.env.PAYMONGO_DISBURSEMENT_ENABLED = previous
})

test('getSellerWithdrawReadiness requires approved verification for bank payouts', () => {
  const previous = process.env.PAYMONGO_DISBURSEMENT_ENABLED
  process.env.PAYMONGO_DISBURSEMENT_ENABLED = 'true'
  process.env.PAYMONGO_SECRET_KEY = 'sk_test'
  process.env.PAYMONGO_WALLET_SOURCE_ACCOUNT_NUMBER = '123'
  process.env.PAYMONGO_WALLET_SOURCE_ACCOUNT_NAME = 'Platform'

  const pending = getSellerWithdrawReadiness({
    payout_method: 'bank',
    account_holder_name: 'Seller',
    bank_name: 'BDO Unibank',
    account_number: '1234567890',
    verification_status: 'pending_review',
  })
  assert.equal(pending.withdrawReady, false)
  assert.match(String(pending.verificationError || ''), /pending admin review/i)

  const approved = getSellerWithdrawReadiness({
    payout_method: 'bank',
    account_holder_name: 'Seller',
    bank_name: 'BDO Unibank',
    account_number: '1234567890',
    verification_status: 'approved',
  })
  assert.equal(approved.payoutVerified, true)

  process.env.PAYMONGO_DISBURSEMENT_ENABLED = previous
})

test('validatePayoutFormats accepts valid GCash number', () => {
  assert.equal(normalizeGcashNumber('09171234567'), '09171234567')
  assert.equal(
    validatePayoutFormats({
      payout_method: 'gcash',
      gcash_name: 'Juan Dela Cruz',
      gcash_number: '09171234567',
    }),
    '',
  )
})

test('validatePayoutFormats rejects invalid bank account length', () => {
  const err = validatePayoutFormats({
    payout_method: 'bank',
    account_holder_name: 'Seller',
    bank_name: 'BDO Unibank',
    account_number: '123',
  })
  assert.match(err, /8–16 digits/)
})
