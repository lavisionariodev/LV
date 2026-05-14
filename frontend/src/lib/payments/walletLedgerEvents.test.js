import test from 'node:test'
import assert from 'node:assert/strict'
import {
  recordAdjustmentLedgerEntry,
  recordWithdrawalLedgerEntry,
} from './walletLedgerEvents.js'

function createMockSupabaseAdmin() {
  const inserted = []
  return {
    inserted,
    client: {
      from() {
        return {
          insert(entry) {
            inserted.push(entry)
            const duplicate = inserted.filter((row) => row.idempotency_key === entry.idempotency_key).length > 1
            return {
              select() {
                return {
                  async maybeSingle() {
                    if (duplicate) {
                      const error = new Error('duplicate key value violates unique constraint')
                      error.code = '23505'
                      return { data: null, error }
                    }
                    return { data: { id: `ledger-${inserted.length}` }, error: null }
                  },
                }
              },
            }
          },
        }
      },
    },
  }
}

test('recordWithdrawalLedgerEntry uses payout request idempotency key', async () => {
  const { client, inserted } = createMockSupabaseAdmin()
  await recordWithdrawalLedgerEntry(client, {
    payoutRequestId: 'req-1',
    sellerUserId: 'seller-1',
    amountPhp: 250,
    metadata: { reviewed_by: 'admin-1' },
  })

  assert.equal(inserted.length, 1)
  assert.equal(inserted[0].entry_type, 'withdrawal')
  assert.equal(inserted[0].idempotency_key, 'withdrawal:payout_request:req-1')
  assert.equal(inserted[0].amount_php, 250)
})

test('recordWithdrawalLedgerEntry is idempotent for the same payout request', async () => {
  const { client, inserted } = createMockSupabaseAdmin()
  const params = {
    payoutRequestId: 'req-2',
    sellerUserId: 'seller-1',
    amountPhp: 100,
  }

  await recordWithdrawalLedgerEntry(client, params)
  await recordWithdrawalLedgerEntry(client, params)

  assert.equal(inserted.length, 2)
  assert.equal(inserted[0].idempotency_key, inserted[1].idempotency_key)
})

test('recordAdjustmentLedgerEntry requires reason and idempotency key', async () => {
  const { client } = createMockSupabaseAdmin()
  const missingReason = await recordAdjustmentLedgerEntry(client, {
    sellerUserId: 'seller-1',
    amountPhp: -50,
    reason: '   ',
    adminUserId: 'admin-1',
    idempotencyKey: 'adjustment:1',
  })
  assert.equal(missingReason.ok, false)

  const missingKey = await recordAdjustmentLedgerEntry(client, {
    sellerUserId: 'seller-1',
    amountPhp: 50,
    reason: 'Manual correction',
    adminUserId: 'admin-1',
    idempotencyKey: '',
  })
  assert.equal(missingKey.ok, false)
})

test('recordAdjustmentLedgerEntry writes audit metadata', async () => {
  const { client, inserted } = createMockSupabaseAdmin()
  const result = await recordAdjustmentLedgerEntry(client, {
    sellerUserId: 'seller-1',
    amountPhp: 75,
    reason: 'Manual correction',
    adminUserId: 'admin-1',
    idempotencyKey: 'adjustment:req-1',
    metadata: { source: 'admin_ledger_adjustment' },
  })

  assert.equal(result.ok, true)
  assert.equal(inserted[0].entry_type, 'adjustment')
  assert.equal(inserted[0].metadata.reason, 'Manual correction')
  assert.equal(inserted[0].metadata.admin_user_id, 'admin-1')
})
