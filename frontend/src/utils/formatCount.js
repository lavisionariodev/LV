export function formatCount(value) {
  if (value == null) return '0'

  // Preserve already-formatted strings (e.g. "6.7k", "$18.4k", "1.2M")
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) return '0'
    if (!/^[-+]?\d+(\.\d+)?$/.test(trimmed)) return trimmed
  }

  const n = Number(value)
  if (!Number.isFinite(n)) return String(value)

  const sign = n < 0 ? '-' : ''
  const abs = Math.abs(n)

  if (abs < 1000) {
    // Keep 1–3 digits as-is (integer display).
    return sign + String(Math.round(abs))
  }

  const units = abs >= 1_000_000 ? { div: 1_000_000, suffix: 'M' } : { div: 1000, suffix: 'k' }
  const scaled = abs / units.div

  let decimals = scaled < 10 ? 1 : 0
  let rounded = Number(scaled.toFixed(decimals))

  // e.g. 9.99k -> 10k (avoid "10.0k")
  if (decimals === 1 && rounded >= 10) {
    decimals = 0
    rounded = Math.round(scaled)
  }

  const str =
    decimals === 1
      ? String(rounded).replace(/\.0$/, '')
      : String(Math.trunc(rounded))

  return `${sign}${str}${units.suffix}`
}

