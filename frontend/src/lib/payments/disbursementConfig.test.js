import test from 'node:test'
import assert from 'node:assert/strict'
import {
  evaluateSellerPayoutSettingsForDisbursement,
  getPaymongoDisbursementEnvStatus,
} from './disbursementConfig.js'

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
