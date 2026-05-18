import test from 'node:test'
import assert from 'node:assert/strict'
import {
  getPlatformWithdrawalFeePhp,
  normalizeGcashNumber,
  validatePayoutFormats,
} from './payoutValidation.js'
import { sensitivePayoutFieldsChanged, normalizePayoutPayload } from './payoutSettings.js'

test('getPlatformWithdrawalFeePhp defaults to zero', () => {
  const prev = process.env.PLATFORM_WITHDRAWAL_FEE_PHP
  delete process.env.PLATFORM_WITHDRAWAL_FEE_PHP
  assert.equal(getPlatformWithdrawalFeePhp(), 0)
  process.env.PLATFORM_WITHDRAWAL_FEE_PHP = '15.5'
  assert.equal(getPlatformWithdrawalFeePhp(), 15.5)
  if (prev == null) delete process.env.PLATFORM_WITHDRAWAL_FEE_PHP
  else process.env.PLATFORM_WITHDRAWAL_FEE_PHP = prev
})

test('sensitivePayoutFieldsChanged detects account number updates', () => {
  assert.equal(
    sensitivePayoutFieldsChanged(
      { payout_method: 'bank', account_number: '111122223333' },
      { payout_method: 'bank', account_number: '999988887777' },
    ),
    true,
  )
  assert.equal(
    sensitivePayoutFieldsChanged(
      { payout_method: 'bank', account_number: '111122223333', notes: 'old' },
      { payout_method: 'bank', account_number: '111122223333', notes: 'new' },
    ),
    false,
  )
})

test('normalizePayoutPayload clears gcash fields for bank method', () => {
  const out = normalizePayoutPayload({
    payout_method: 'bank',
    account_holder_name: 'A',
    bank_name: 'BDO Unibank',
    account_number: '1234567890',
    gcash_name: 'Old',
    gcash_number: '09171234567',
  })
  assert.equal(out.gcash_name, null)
  assert.equal(out.gcash_number, null)
})

test('normalizeGcashNumber handles +63 prefix', () => {
  assert.equal(normalizeGcashNumber('639171234567'), '09171234567')
})

test('validatePayoutFormats rejects unknown bank', () => {
  const err = validatePayoutFormats({
    payout_method: 'bank',
    account_holder_name: 'Seller Name',
    bank_name: 'Unknown Bank XYZ',
    account_number: '1234567890',
  })
  assert.match(err, /supported bank/i)
})
