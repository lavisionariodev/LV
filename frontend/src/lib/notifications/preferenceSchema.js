export const SELLER_NOTIFICATION_BUCKETS = ['order', 'payment', 'listing', 'alert', 'system']

export const ADMIN_NOTIFICATION_BUCKETS = ['order', 'approval', 'alert', 'announcement']

export const NOTIFICATION_CHANNELS = ['push', 'email']

/** @returns {{ push: boolean, email: boolean }} */
export function defaultBucketChannels() {
  return { push: true, email: true }
}

/**
 * @param {unknown} row
 * @returns {{ push: boolean, email: boolean }}
 */
function normalizeBucketChannels(row) {
  const src = row && typeof row === 'object' ? row : {}
  return {
    push: src.push !== false,
    email: src.email !== false,
  }
}

/**
 * @param {readonly string[]} buckets
 * @param {unknown} raw
 * @param {Record<string, unknown> | null | undefined} [incoming]
 */
function mergePreferencesForBuckets(buckets, raw, incoming) {
  const src = raw && typeof raw === 'object' ? raw : {}
  const patch = incoming && typeof incoming === 'object' ? incoming : null
  /** @type {Record<string, { push: boolean, email: boolean }>} */
  const out = {}

  for (const bucket of buckets) {
    const base = normalizeBucketChannels(src[bucket])
    if (!patch || !patch[bucket] || typeof patch[bucket] !== 'object') {
      out[bucket] = base
      continue
    }
    const row = patch[bucket]
    out[bucket] = {
      push: row.push !== false,
      email: row.email !== false,
    }
  }

  return out
}

/** @param {unknown} raw @param {Record<string, unknown> | null | undefined} [incoming] */
export function mergeSellerNotificationPreferences(raw, incoming) {
  return mergePreferencesForBuckets(SELLER_NOTIFICATION_BUCKETS, raw, incoming)
}

/** @param {unknown} raw @param {Record<string, unknown> | null | undefined} [incoming] */
export function mergeAdminNotificationPreferences(raw, incoming) {
  return mergePreferencesForBuckets(ADMIN_NOTIFICATION_BUCKETS, raw, incoming)
}
