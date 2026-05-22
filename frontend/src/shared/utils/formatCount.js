/**
 * formatCount(value, options?)
 *
 * Compact number formatter for stat cards and badges.
 *
 * Mobile (default):  compacts at 1,000+
 *   e.g.  999  → "999"   1000 → "1k"   10500 → "10.5k"   368000 → "368k"   1200000 → "1.2M"
 *
 * Desktop ({ desktop: true }):  only compacts at 1,000,000+
 *   e.g.  999  → "999"   1000 → "1,000"   368000 → "368,000"   1200000 → "1.2M"
 *
 * Already-formatted strings (e.g. "6.7k", "₱18.4k", "1.2M") are passed through as-is.
 */
export function formatCount(value, { desktop = false } = {}) {
  if (value == null) return '0'

  // Pass through already-formatted strings (non-plain-numeric)
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) return '0'
    if (!/^[-+]?\d+(\.\d+)?$/.test(trimmed)) return trimmed
  }

  const n = Number(value)
  if (!Number.isFinite(n)) return String(value)

  const sign = n < 0 ? '-' : ''
  const abs = Math.abs(n)

  // ── Desktop mode: full digits below 1M, compact at 1M+ ──────────────────
  if (desktop) {
    if (abs < 1_000_000) {
      return sign + Math.round(abs).toLocaleString('en-US')
    }
    // 1M+ — fall through to compact logic below
  } else {
    // ── Mobile mode: compact at 1k+ ─────────────────────────────────────
    if (abs < 1000) {
      return sign + String(Math.round(abs))
    }
  }

  // Shared compact logic (mobile: 1k+, desktop: 1M+)
  const units = abs >= 1_000_000 ? { div: 1_000_000, suffix: 'M' } : { div: 1000, suffix: 'k' }
  const scaled = abs / units.div

  let decimals = scaled < 10 ? 1 : 0
  let rounded = Number(scaled.toFixed(decimals))

  // e.g. 9.99k → 10k (avoid "10.0k")
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

/**
 * formatPHPMobile(value)
 *
 * Compact peso formatter for mobile stat card values.
 * Takes a raw number and prepends the ₱ sign using mobile compact rules.
 *
 * e.g.  58510 → "₱58.5k"   368380 → "₱368k"   1200000 → "₱1.2M"
 *
 * Usage (inside a component that tracks isMobile):
 *   value={isMobile ? formatPHPMobile(summary.pendingAmt) : formatPHP(summary.pendingAmt)}
 */
export function formatPHPMobile(value) {
  if (value == null || !Number.isFinite(Number(value))) return '₱0'
  return `\u20B1${formatCount(Number(value))}`
}

/**
 * Compact peso formatter for desktop stat values.
 * Full digits below 1M; compact at 1M+ (e.g. ₱1.2M, ₱10M).
 */
export function formatPHPDesktop(value) {
  if (value == null || !Number.isFinite(Number(value))) return '₱0'
  return `\u20B1${formatCount(Number(value), { desktop: true })}`
}