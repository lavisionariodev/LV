import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  deliveryAddressFromProfile,
  formatDeliveryAddressForOrder,
  validateCheckoutContact,
  validateDeliveryAddress,
  validatePreferredScheduleDate,
} from './deliveryAddress.js'

describe('formatDeliveryAddressForOrder', () => {
  it('formats multiline PH-style address', () => {
    const text = formatDeliveryAddressForOrder({
      street: '123 Main St',
      unit: 'Unit 4B',
      barangay: 'San Antonio',
      city: 'Pasig',
      province: 'Metro Manila',
      zip: '1605',
      landmark: 'Near the church',
    })
    assert.match(text, /123 Main St, Unit 4B/)
    assert.match(text, /San Antonio/)
    assert.match(text, /Landmark: Near the church/)
  })
})

describe('validateDeliveryAddress', () => {
  it('requires street, city, and province', () => {
    assert.equal(validateDeliveryAddress({ street: '', city: 'M', province: 'P' }).ok, false)
    assert.equal(
      validateDeliveryAddress({ street: 'S', city: '', province: 'P', unit: '', barangay: '', zip: '', landmark: '' })
        .ok,
      false,
    )
    assert.equal(
      validateDeliveryAddress({
        street: 'S',
        city: 'C',
        province: 'P',
        unit: '',
        barangay: '',
        zip: '',
        landmark: '',
      }).ok,
      true,
    )
  })
})

describe('validatePreferredScheduleDate', () => {
  it('requires a date for booking checkout', () => {
    assert.equal(validatePreferredScheduleDate('').ok, false)
  })

  it('rejects past dates', () => {
    assert.equal(validatePreferredScheduleDate('2000-01-01').ok, false)
  })
})

describe('validateCheckoutContact', () => {
  const addr = {
    street: 'Main',
    unit: '',
    barangay: '',
    city: 'Pasig',
    province: 'Rizal',
    zip: '',
    landmark: '',
  }

  it('requires preferred date for booking lane', () => {
    const result = validateCheckoutContact({
      lane: 'booking',
      contactPhone: '09171234567',
      contactName: 'Buyer',
      deliveryAddress: addr,
      preferredDate: '',
    })
    assert.equal(result.ok, false)
    assert.equal(result.field, 'preferred_date')
  })

  it('allows product lane without preferred date', () => {
    const result = validateCheckoutContact({
      lane: 'product',
      contactPhone: '09171234567',
      contactName: 'Recipient',
      deliveryAddress: addr,
      preferredDate: '',
    })
    assert.equal(result.ok, true)
  })
})

describe('deliveryAddressFromProfile', () => {
  it('maps profile columns', () => {
    const addr = deliveryAddressFromProfile({
      address_street: 'Blk 1',
      address_city: 'Quezon City',
      address_province: 'NCR',
      address_zip: '1100',
    })
    assert.equal(addr.street, 'Blk 1')
    assert.equal(addr.city, 'Quezon City')
  })
})
