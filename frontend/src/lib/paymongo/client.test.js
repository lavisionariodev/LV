import test from 'node:test'
import assert from 'node:assert/strict'
import { phpToCentavos } from './client.js'

test('phpToCentavos rounds PHP to centavos', () => {
  assert.equal(phpToCentavos(10), 1000)
  assert.equal(phpToCentavos(10.5), 1050)
  assert.equal(phpToCentavos('12.34'), 1234)
  assert.equal(phpToCentavos(null), null)
})
