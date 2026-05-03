/**
 * Lightweight structured logs for Route Handlers. Never log secrets, raw card data,
 * or full webhook bodies — only safe metadata for debugging.
 *
 * @param {string} event dot-separated name, e.g. checkout.pay.start
 * @param {Record<string, unknown>} [fields]
 */
export function apiLog(event, fields = {}) {
  const line = JSON.stringify({
    ts: new Date().toISOString(),
    event,
    ...fields,
  })
  if (typeof process !== 'undefined' && process.stdout?.write) {
    process.stdout.write(`${line}\n`)
  }
}

/**
 * @param {unknown} err
 * @returns {string}
 */
export function errorMessage(err) {
  if (err && typeof err === 'object' && 'message' in err && typeof err.message === 'string') {
    return err.message.slice(0, 500)
  }
  return String(err).slice(0, 500)
}
