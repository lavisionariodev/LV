/**
 * Round to 2 decimal places (centavos) to avoid floating-point drift.
 */
export function roundPhpAmount(n) {
  const x = Number(n)
  if (!Number.isFinite(x)) return 0
  return Math.round(x * 100) / 100
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
