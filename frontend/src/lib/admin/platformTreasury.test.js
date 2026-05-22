import test from 'node:test'
import assert from 'node:assert/strict'
import {
  summarizeTreasuryFromEscrows,
  summarizeWithdrawalsForTreasury,
  computeSellerOwedWalletEstimate,
} from './platformTreasury.js'
import {
  sanitizeBillingRowForApi,
  settlementConfiguredSummary,
} from './platformBillingSettlement.js'

test('summarizeTreasuryFromEscrows sums commission and seller escrow for paid orders only', () => {
    const rows = [
      {
        commission_amount: 10,
        net_amount: 90,
        status: 'released',
        released_at: new Date().toISOString(),
        orders: { payment_status: 'paid' },
      },
      {
        commission_amount: 5,
        net_amount: 45,
        status: 'escrowed',
        orders: { payment_status: 'paid' },
      },
      {
        commission_amount: 100,
        net_amount: 900,
        status: 'released',
        orders: { payment_status: 'pending' },
      },
    ]
    const agg = summarizeTreasuryFromEscrows(rows)
    assert.equal(agg.commissionReleasedTotal, 10)
    assert.equal(agg.commissionPending, 5)
    assert.equal(agg.sellerOwedEscrow, 45)
    assert.equal(agg.releasedNetTotal, 90)
})

test('computeSellerOwedWalletEstimate floors at zero when withdrawals exceed released net', () => {
    assert.equal(
      computeSellerOwedWalletEstimate({ releasedNetTotal: 100, sellerWithdrawalsSucceeded: 150 }),
      0,
    )
})

test('computeSellerOwedWalletEstimate subtracts succeeded withdrawals from released net', () => {
    assert.equal(
      computeSellerOwedWalletEstimate({ releasedNetTotal: 500, sellerWithdrawalsSucceeded: 200 }),
      300,
    )
})

test('summarizeWithdrawalsForTreasury tracks succeeded and in-flight withdrawals', () => {
    const agg = summarizeWithdrawalsForTreasury([
      { amount_php: 50, status: 'succeeded' },
      { amount_php: 20, status: 'pending' },
      { amount_php: 10, status: 'submitted' },
    ])
    assert.equal(agg.sellerWithdrawalsSucceeded, 50)
    assert.equal(agg.sellerWithdrawalsInFlight, 30)
})

test('settlementConfiguredSummary reports bank settlement when configured', () => {
    const s = settlementConfiguredSummary({
      settlementMethod: 'bank',
      settlementAccountHolderName: 'Acme',
      settlementBankName: 'BDO Unibank',
      hasSettlementAccountNumber: true,
      maskedSettlementAccountNumber: '****1234',
    })
    assert.equal(s.configured, true)
    assert.match(s.label, /Bank/)
})

test('settlementConfiguredSummary reports not configured for empty manual', () => {
    const s = settlementConfiguredSummary({
      settlementMethod: 'manual',
      settlementNotes: '',
    })
    assert.equal(s.configured, false)
})

test('sanitizeBillingRowForApi masks settlement secrets in row payload', () => {
  const safe = sanitizeBillingRowForApi({
    id: 1,
    legal_name: 'Acme',
    settlement_account_number: '1234567890',
    settlement_gcash_number: '09171234567',
  })
  assert.equal(safe.legal_name, 'Acme')
  assert.equal(safe.settlement_account_number, '******7890')
  assert.equal(safe.settlement_gcash_number, '*******4567')
})
