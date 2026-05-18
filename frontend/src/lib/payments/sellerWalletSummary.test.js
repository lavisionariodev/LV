import test from 'node:test'
import assert from 'node:assert/strict'
import { isPaymongoDisbursementEnabled } from './disbursement.js'
import { buildSellerWalletSummary, resolveEscrowDisbursementState } from './wallet.js'

test('buildSellerWalletSummary derives held, wallet, and withdrawal totals', () => {
  const escrows = [
    { id: 'e1', status: 'escrowed', gross_amount: 1000, commission_amount: 100, net_amount: 900, currency: 'PHP' },
    { id: 'e2', status: 'on_hold', gross_amount: 500, commission_amount: 50, net_amount: 450, currency: 'PHP' },
    { id: 'e3', status: 'released', gross_amount: 800, commission_amount: 80, net_amount: 720, currency: 'PHP' },
    { id: 'e4', status: 'released', gross_amount: 200, commission_amount: 20, net_amount: 180, currency: 'PHP' },
    { id: 'e5', status: 'refunded', gross_amount: 300, commission_amount: 30, net_amount: 270, currency: 'PHP' },
  ]
  const disbursements = [{ escrow_id: 'e4', amount_php: 180, status: 'succeeded' }]
  const withdrawals = [
    { amount_php: 100, status: 'succeeded' },
    { amount_php: 50, status: 'submitted' },
  ]

  const summary = buildSellerWalletSummary(escrows, disbursements, withdrawals, [])

  assert.equal(summary.heldBalanceNet, 1350)
  assert.equal(summary.walletBalanceNet, 720)
  assert.equal(summary.pendingWithdrawalNet, 50)
  assert.equal(summary.availableNet, 570)
  assert.equal(summary.paidOutNet, 280)
  assert.equal(summary.releasedNet, 900)
})

test('resolveEscrowDisbursementState marks wallet and legacy paid rows', () => {
  assert.equal(resolveEscrowDisbursementState({ status: 'released' }, null), 'wallet_credited')
  assert.equal(
    resolveEscrowDisbursementState({ status: 'released' }, { status: 'succeeded' }),
    'legacy_paid',
  )
  assert.equal(resolveEscrowDisbursementState({ status: 'escrowed' }, null), 'none')
})

test('isPaymongoDisbursementEnabled reads env flag', () => {
  const previous = process.env.PAYMONGO_DISBURSEMENT_ENABLED
  process.env.PAYMONGO_DISBURSEMENT_ENABLED = 'true'
  assert.equal(isPaymongoDisbursementEnabled(), true)
  process.env.PAYMONGO_DISBURSEMENT_ENABLED = previous
})
