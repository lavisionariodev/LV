/**
 * Structured delivery address for product checkout (marketplace-style).
 * Stored on orders as a formatted multiline string in `service_location`.
 */

/** @typedef {{
 *   street: string
 *   unit: string
 *   barangay: string
 *   city: string
 *   province: string
 *   zip: string
 *   landmark: string
 * }} DeliveryAddress
 */

export function emptyDeliveryAddress() {
  return {
    street: '',
    unit: '',
    barangay: '',
    city: '',
    province: '',
    zip: '',
    landmark: '',
  }
}

/**
 * @param {Record<string, unknown> | null | undefined} profile
 * @returns {DeliveryAddress}
 */
export function deliveryAddressFromProfile(profile) {
  const empty = emptyDeliveryAddress()
  if (!profile || typeof profile !== 'object') return empty
  return {
    ...empty,
    street: String(profile.address_street ?? '').trim(),
    city: String(profile.address_city ?? '').trim(),
    province: String(profile.address_province ?? '').trim(),
    zip: String(profile.address_zip ?? '').trim(),
  }
}

/**
 * @param {DeliveryAddress} addr
 * @returns {string}
 */
export function formatDeliveryAddressForOrder(addr) {
  const a = addr || emptyDeliveryAddress()
  const lines = []

  const streetLine = [a.street, a.unit].filter(Boolean).join(', ')
  if (streetLine) lines.push(streetLine)

  const locality = [
    a.barangay,
    a.city,
    a.province,
    a.zip ? `ZIP ${a.zip}` : '',
  ]
    .filter(Boolean)
    .join(', ')
  if (locality) lines.push(locality)

  if (a.landmark.trim()) {
    lines.push(`Landmark: ${a.landmark.trim()}`)
  }

  return lines.join('\n').trim()
}

/**
 * @param {DeliveryAddress} addr
 * @returns {{ ok: true } | { ok: false, message: string, field?: string }}
 */
export function validateDeliveryAddress(addr) {
  const a = addr || emptyDeliveryAddress()
  if (!String(a.street || '').trim()) {
    return { ok: false, message: 'Please enter your street address.', field: 'street' }
  }
  if (!String(a.city || '').trim()) {
    return { ok: false, message: 'Please enter your city or municipality.', field: 'city' }
  }
  if (!String(a.province || '').trim()) {
    return { ok: false, message: 'Please enter your province.', field: 'province' }
  }
  return { ok: true }
}

/**
 * @param {string} dateStr YYYY-MM-DD from a date input
 * @returns {{ ok: true } | { ok: false, message: string, field: string }}
 */
export function validatePreferredScheduleDate(dateStr) {
  const s = String(dateStr ?? '').trim()
  if (!s) {
    return {
      ok: false,
      message: 'Please select your preferred schedule date before continuing.',
      field: 'preferred_date',
    }
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    return { ok: false, message: 'Please enter a valid schedule date.', field: 'preferred_date' }
  }
  const [y, m, d] = s.split('-').map((n) => Number(n))
  const picked = new Date(y, m - 1, d)
  if (
    picked.getFullYear() !== y ||
    picked.getMonth() !== m - 1 ||
    picked.getDate() !== d
  ) {
    return { ok: false, message: 'Please enter a valid schedule date.', field: 'preferred_date' }
  }
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  if (picked < today) {
    return {
      ok: false,
      message: 'Preferred schedule date cannot be in the past.',
      field: 'preferred_date',
    }
  }
  return { ok: true }
}

/**
 * Client-side checkout validation before create + PayMongo.
 * @param {{ lane: 'booking' | 'product', contactPhone: string, contactName: string, deliveryAddress: DeliveryAddress, preferredDate: string }} params
 */
export function validateCheckoutContact({
  lane,
  contactPhone,
  contactName,
  deliveryAddress,
  preferredDate,
}) {
  if (!String(contactPhone ?? '').trim()) {
    return { ok: false, message: 'Please add a contact number to continue.', field: 'contact_phone' }
  }

  const addressCheck = validateDeliveryAddress(deliveryAddress)
  if (!addressCheck.ok) return addressCheck

  const formattedLocation = formatDeliveryAddressForOrder(deliveryAddress)
  if (!formattedLocation) {
    return {
      ok: false,
      message: 'Please complete the address before continuing.',
      field: 'street',
    }
  }

  if (lane === 'product') {
    if (!String(contactName ?? '').trim()) {
      return {
        ok: false,
        message: 'Please enter the recipient name for delivery.',
        field: 'contact_name',
      }
    }
    return { ok: true }
  }

  if (!String(contactName ?? '').trim()) {
    return {
      ok: false,
      message: 'Please enter your name for this booking.',
      field: 'contact_name',
    }
  }

  const scheduleCheck = validatePreferredScheduleDate(preferredDate)
  if (!scheduleCheck.ok) return scheduleCheck

  return { ok: true }
}

/**
 * API validation (formatted contact payload from checkout create).
 * @param {{ lane: 'booking' | 'product', contact: Record<string, string> }} params
 */
export function validateCheckoutContactPayload({ lane, contact }) {
  const c = contact || {}
  if (!String(c.contact_phone ?? '').trim()) {
    return { ok: false, message: 'Please add a contact number to continue.' }
  }
  if (!String(c.service_location ?? '').trim()) {
    return {
      ok: false,
      message:
        lane === 'product'
          ? 'Please enter the full delivery address.'
          : 'Please enter the service location address.',
    }
  }
  if (lane === 'product') {
    if (!String(c.contact_name ?? '').trim()) {
      return { ok: false, message: 'Please enter the recipient name for delivery.' }
    }
    return { ok: true }
  }
  if (!String(c.contact_name ?? '').trim()) {
    return { ok: false, message: 'Please enter your name for this booking.' }
  }
  const scheduleCheck = validatePreferredScheduleDate(c.preferred_date)
  if (!scheduleCheck.ok) return scheduleCheck
  return { ok: true }
}
