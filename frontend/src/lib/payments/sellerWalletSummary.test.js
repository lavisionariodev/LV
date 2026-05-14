import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buildSellerWalletSummary,
  resolveEscrowDisbursementState,
  isPaymongoDisbursementEnabled,
} from './sellerWalletSummary.js'

test('buildSellerWalletSummary derives held, pending, and paid-out totals', () => {
  const escrows = [
    { id: 'e1', status: 'escrowed', gross_amount: 1000, commission_amount: 100, net_amount: 900, currency: 'PHP' },
    { id: 'e2', status: 'on_hold', gross_amount: 500, commission_amount: 50, net_amount: 450, currency: 'PHP' },
    { id: 'e3', status: 'released', gross_amount: 800, commission_amount: 80, net_amount: 720, currency: 'PHP' },
    { id: 'e4', status: 'escrowed', gross_amount: 200, commission_amount: 20, net_amount: 180, currency: 'PHP' },
    { id: 'e5', status: 'refunded', gross_amount: 300, commission_amount: 30, net_amount: 270, currency: 'PHP' },
  ]
  const disbursements = [
    { escrow_id: 'e3', amount_php: 720, status: 'succeeded' },
    { escrow_id: 'e4', amount_php: 180, status: 'submitted' },
    { escrow_id: 'e1', amount_php: 900, status: 'pending' },
  ]
  const ledger = [{ entry_type: 'withdrawal', amount_php: 100 }]

  const summary = buildSellerWalletSummary(escrows, disbursements, ledger)

  assert.equal(summary.heldBalanceNet, 1530)
  assert.equal(summary.escrowedNet, 1080)
  assert.equal(summary.heldNet, 450)
  assert.equal(summary.onHoldNet, 450)
  assert.equal(summary.pendingDisbursementNet, 1080)
  assert.equal(summary.releasedNet, 720)
  assert.equal(summary.paidOutNet, 820)
  assert.equal(summary.availableNet, 620)
  assert.equal(summary.refundedNet, 270)
  assert.equal(summary.legacyReleasedCount, 0)
})

test('resolveEscrowDisbursementState marks legacy released rows without disbursements', () => {
  assert.equal(resolveEscrowDisbursementState({ status: 'released' }, null), 'legacy_manual')
  assert.equal(resolveEscrowDisbursementState({ status: 'escrowed' }, { status: 'submitted' }), 'submitted')
})

test('buildSellerWalletSummary does not double-count payout_release ledger rows in paidOutNet', () => {
  const escrows = [
    { id: 'e1', status: 'released', gross_amount: 800, commission_amount: 80, net_amount: 720, currency: 'PHP' },
  ]
  const disbursements = [{ escrow_id: 'e1', amount_php: 720, status: 'succeeded' }]
  const ledger = [
    { entry_type: 'payout_release', amount_php: 720 },
    { entry_type: 'withdrawal', amount_php: 100 },
  ]

  const summary = buildSellerWalletSummary(escrows, disbursements, ledger)

  assert.equal(summary.releasedNet, 720)
  assert.equal(summary.paidOutNet, 820)
  assert.equal(summary.payoutReleaseLedgerNet, 720)
  assert.equal(summary.availableNet, 620)
})

test('isPaymongoDisbursementEnabled reads env flag', () => {
  const previous = process.env.PAYMONGO_DISBURSEMENT_ENABLED
  process.env.PAYMONGO_DISBURSEMENT_ENABLED = 'true'
  assert.equal(isPaymongoDisbursementEnabled(), true)
  process.env.PAYMONGO_DISBURSEMENT_ENABLED = previous
})
