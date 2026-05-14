import test from 'node:test'
import assert from 'node:assert/strict'
import { insertWalletLedgerEntry } from './walletLedger.js'

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

test('insertWalletLedgerEntry treats duplicate idempotency keys as success', async () => {
  const { client, inserted } = createMockSupabaseAdmin()
  const entry = {
    seller_user_id: 'seller-1',
    entry_type: 'withdrawal',
    amount_php: 100,
    currency: 'PHP',
    idempotency_key: 'withdrawal:payout_request:req-1',
    metadata: {},
  }

  const first = await insertWalletLedgerEntry(client, entry)
  const second = await insertWalletLedgerEntry(client, entry)

  assert.equal(first.ok, true)
  assert.equal(first.duplicate, false)
  assert.equal(second.ok, true)
  assert.equal(second.duplicate, true)
  assert.equal(inserted.length, 2)
})
