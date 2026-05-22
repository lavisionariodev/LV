/**
 * Persists checkout form + order context across PayMongo redirect (sessionStorage).
 */

export const CHECKOUT_DRAFT_STORAGE_KEY = 'lv_checkout_draft'

/** @typedef {{
 *   version: number
 *   savedAt: string
 *   productIds: string[]
 *   itemsParam: string | null
 *   orderIds: string[]
 *   paymentId: string | null
 *   lane: 'booking' | 'product'
 *   contact: {
 *     contactName: string
 *     contactEmail: string
 *     contactPhone: string
 *     deliveryAddress: import('./deliveryAddress').DeliveryAddress
 *     deceasedName: string
 *     dateOfDeath: string
 *     wakeDurationDays: string
 *     preferredDate: string
 *     notes: string
 *   }
 * }} CheckoutDraft
 */

/**
 * @param {Partial<CheckoutDraft> & Pick<CheckoutDraft, 'productIds' | 'lane' | 'contact'>} draft
 */
export function saveCheckoutDraft(draft) {
  if (typeof window === 'undefined') return
  try {
    /** @type {CheckoutDraft} */
    const payload = {
      version: 1,
      savedAt: new Date().toISOString(),
      productIds: draft.productIds ?? [],
      itemsParam: draft.itemsParam ?? null,
      orderIds: draft.orderIds ?? [],
      paymentId: draft.paymentId ?? null,
      lane: draft.lane === 'product' ? 'product' : 'booking',
      contact: draft.contact,
    }
    sessionStorage.setItem(CHECKOUT_DRAFT_STORAGE_KEY, JSON.stringify(payload))
  } catch {
    /* quota / private mode */
  }
}

/** @returns {CheckoutDraft | null} */
export function loadCheckoutDraft() {
  if (typeof window === 'undefined') return null
  try {
    const raw = sessionStorage.getItem(CHECKOUT_DRAFT_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed || parsed.version !== 1 || !parsed.contact) return null
    return parsed
  } catch {
    return null
  }
}

export function clearCheckoutDraft() {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.removeItem(CHECKOUT_DRAFT_STORAGE_KEY)
  } catch {
    /* ignore */
  }
}

/**
 * @param {CheckoutDraft['contact']} contact
 */
export function applyCheckoutDraftContact(contact) {
  if (!contact || typeof contact !== 'object') return {}
  return {
    contactName: String(contact.contactName ?? ''),
    contactEmail: String(contact.contactEmail ?? ''),
    contactPhone: String(contact.contactPhone ?? ''),
    deliveryAddress: contact.deliveryAddress ?? undefined,
    deceasedName: String(contact.deceasedName ?? ''),
    dateOfDeath: String(contact.dateOfDeath ?? ''),
    wakeDurationDays: String(contact.wakeDurationDays ?? ''),
    preferredDate: String(contact.preferredDate ?? ''),
    notes: String(contact.notes ?? ''),
  }
}
