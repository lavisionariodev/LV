import { safeExternalHref } from '@/lib/url/safeExternalHref'

export const SELLER_SOCIAL_PLATFORMS = /** @type {const} */ ([
  'phone',
  'whatsapp',
  'email',
  'facebook',
  'messenger',
])

function digitsOnly(input) {
  return String(input || '').replace(/\D/g, '')
}

function normalizePhone(raw) {
  const t = String(raw || '').trim()
  if (!t) return ''
  const d = digitsOnly(t)
  return d ? t : ''
}

function normalizeEmail(raw) {
  const t = String(raw || '').trim()
  if (!t) return ''
  if (!/^\S+@\S+\.\S+$/.test(t)) return ''
  return t
}

function normalizeUrlOrBlank(raw) {
  const t = String(raw || '').trim()
  if (!t) return ''

  const lower = t.toLowerCase()
  if (lower.startsWith('http://') || lower.startsWith('https://')) {
    return t
  }
  // allow “facebook.com/...” or “www.facebook.com/...”
  if (lower.startsWith('www.')) return `https://${t}`
  if (lower.includes('.') && !lower.includes(' ')) return `https://${t}`
  return ''
}

function normalizeMessenger(raw) {
  const t = String(raw || '').trim()
  if (!t) return ''
  const lower = t.toLowerCase()
  if (lower.startsWith('http://') || lower.startsWith('https://')) return t
  // accept m.me/<page> or just <page>
  const cleaned = t.replace(/^@/, '').replace(/^m\.me\//i, '').trim()
  if (!cleaned) return ''
  return `https://m.me/${encodeURIComponent(cleaned)}`
}

/**
 * Normalizes whatever comes from DB/UI into a consistent object.
 * @param {unknown} raw
 */
export function normalizeSellerSocialLinks(raw) {
  const src = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {}
  const get = (k) => (Object.prototype.hasOwnProperty.call(src, k) ? src[k] : undefined)

  const phone = normalizePhone(get('phone'))
  const whatsapp = normalizePhone(get('whatsapp'))
  const email = normalizeEmail(get('email'))
  const facebook = normalizeUrlOrBlank(get('facebook'))
  const messenger = normalizeMessenger(get('messenger'))

  return {
    phone,
    whatsapp,
    email,
    facebook,
    messenger,
  }
}

/**
 * @param {ReturnType<typeof normalizeSellerSocialLinks>} normalized
 * @returns {{ [key: string]: string }} field -> error (only for enabled-but-invalid cases)
 */
export function validateSellerSocialLinks(normalized) {
  const errors = {}

  if (normalized.phone && !digitsOnly(normalized.phone)) {
    errors.phone = 'Phone number looks invalid.'
  }
  if (normalized.whatsapp && !digitsOnly(normalized.whatsapp)) {
    errors.whatsapp = 'WhatsApp number looks invalid.'
  }
  if (normalized.email && !/^\S+@\S+\.\S+$/.test(normalized.email)) {
    errors.email = 'Please enter a valid email.'
  }
  if (normalized.facebook && !safeExternalHref(normalized.facebook)) {
    errors.facebook = 'Please enter a valid Facebook link.'
  }
  if (normalized.messenger && !safeExternalHref(normalized.messenger)) {
    errors.messenger = 'Please enter a valid Messenger link or page name.'
  }

  return errors
}

/**
 * Build display options for the Contact modal.
 * Only includes channels that are actually present in sellerSocialLinks.
 *
 * @param {{ sellerName?: string, socialLinks?: unknown }} input
 */
export function buildSellerContactOptions(input) {
  const links = normalizeSellerSocialLinks(input?.socialLinks)
  const out = []

  if (links.messenger) {
    out.push({ platform: 'messenger', label: 'Messenger', href: safeExternalHref(links.messenger) })
  }
  if (links.facebook) {
    out.push({ platform: 'facebook', label: 'Facebook', href: safeExternalHref(links.facebook) })
  }
  if (links.whatsapp) {
    const digits = digitsOnly(links.whatsapp)
    out.push({ platform: 'whatsapp', label: 'WhatsApp', href: digits ? `https://wa.me/${digits}` : '' })
  }
  if (links.phone) {
    out.push({ platform: 'phone', label: 'Call / SMS', href: safeExternalHref(`tel:${links.phone}`) })
  }
  if (links.email) {
    out.push({ platform: 'email', label: 'Email', href: safeExternalHref(`mailto:${links.email}`) })
  }

  return out.filter((x) => x.href)
}

