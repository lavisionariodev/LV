/**
 * Round to 2 decimal places (centavos) to avoid floating-point drift.
 */
export function roundPhpAmount(n) {
  const x = Number(n)
  if (!Number.isFinite(x)) return 0
  return Math.round(x * 100) / 100
}

/**
 * Parse a seller/buyer-entered peso string (commas allowed) using integer centavos math so values like
 * 20000 are not corrupted by IEEE-754 parsing or HTML number-input float quirks.
 *
 * @param {unknown} raw
 * @returns {number} finite amount, or NaN if empty/invalid
 */
export function parsePhpAmountInputString(raw) {
  let s = String(raw ?? '')
    .trim()
    .replace(/,/g, '')
  if (s === '') return NaN
  if (s.endsWith('.')) s = s.slice(0, -1)
  if (s === '' || s === '-') return NaN

  const neg = s.startsWith('-')
  const u = neg ? s.slice(1) : s
  if (u === '') return NaN

  if (!/^(\d+\.?\d*|\.\d+)$/.test(u)) return NaN

  let intStr
  let fracStr
  if (u.startsWith('.')) {
    intStr = '0'
    fracStr = u.slice(1).replace(/\D/g, '')
  } else {
    const dot = u.indexOf('.')
    if (dot === -1) {
      intStr = u
      fracStr = ''
    } else {
      intStr = u.slice(0, dot)
      fracStr = u.slice(dot + 1).replace(/\D/g, '')
    }
  }

  if (intStr !== '' && !/^\d+$/.test(intStr)) return NaN
  const whole = intStr === '' ? 0 : parseInt(intStr, 10)
  if (!Number.isFinite(whole)) return NaN

  const frac2 = (fracStr.slice(0, 2) + '00').slice(0, 2)
  const fracNum = frac2 === '' ? 0 : parseInt(frac2, 10)
  if (!Number.isFinite(fracNum)) return NaN

  const absCents = whole * 100 + fracNum
  const signedCents = neg ? -absCents : absCents
  return roundPhpAmount(signedCents / 100)
}

/**
 * Format a peso amount for display: whole amounts omit ".00"; fractional amounts show up to 2 decimals.
 *
 * @param {number|null|undefined} amount
 * @param {{ placeholder?: string }} [opts]
 * @returns {string}
 */
export function formatPhpAmount(amount, opts = {}) {
  const { placeholder = '—' } = opts
  if (amount == null || amount === '') return placeholder
  const n = roundPhpAmount(amount)
  if (!Number.isFinite(n)) return placeholder
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(n)
}

/**
 * Normalize a stored numeric price for seller form fields (no spurious ".02" from floats; trim unnecessary trailing zeros).
 *
 * @param {unknown} value
 * @returns {string}
 */
export function formatPhpInputString(value) {
  if (value == null || value === '') return ''
  const n = roundPhpAmount(Number(value))
  if (!Number.isFinite(n)) return ''
  const s = n.toFixed(2)
  return s.replace(/\.00$/, '').replace(/(\.\d)0$/, '$1')
}

/**
 * Whole-peso display for seller analytics and dashboards (no centavos).
 *
 * @param {number|null|undefined} amount
 * @param {{ placeholder?: string }} [opts]
 * @returns {string}
 */
export function formatPhpWholeAmount(amount, opts = {}) {
  const { placeholder = '—' } = opts
  if (amount == null || amount === '') return placeholder
  const n = roundPhpAmount(amount)
  if (!Number.isFinite(n)) return placeholder
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n)
}
