import test from 'node:test'
import assert from 'node:assert/strict'
import { buildAggregatesByServiceId, toAvgRating } from './ratingsAggregatesServer.js'

test('buildAggregatesByServiceId averages ratings per service', () => {
  const rows = [
    { service_id: 'cremation', rating: 4 },
    { service_id: 'cremation', rating: 5 },
    { service_id: 'traditional-burial', rating: 3 },
  ]
  const result = buildAggregatesByServiceId(rows, ['cremation', 'traditional-burial', 'memorial-planning'])
  assert.equal(result.cremation.avgRating, toAvgRating(4.5))
  assert.equal(result.cremation.reviewCount, 2)
  assert.equal(result['traditional-burial'].avgRating, 3)
  assert.equal(result['memorial-planning'].reviewCount, 0)
})
