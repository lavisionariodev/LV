'use client'

import { useCallback, useEffect, useState } from 'react'

/**
 * @returns {Promise<number | null>} Next count, or null when the request fails or has no count.
 */
async function loadAdminAttentionCount() {
  const res = await fetch('/api/admin/disputes/attention-count', {
    credentials: 'include',
    cache: 'no-store',
  })
  const body = await res.json().catch(() => null)
  if (res.ok && body?.count != null) {
    return Number(body.count) || 0
  }
  return null
}

/**
 * Hook that exposes the current admin attention count (open + under-review disputes)
 * with a manual `refresh()` function. Also listens for a window event so other
 * admin pages can ask the sidebar to refresh after saving a status change.
 *
 * Usage:
 *   const { count, refresh } = useAdminAttentionCount(variant === 'admin')
 *
 *   // Anywhere in admin pages:
 *   window.dispatchEvent(new Event('admin:disputes-changed'))
 */
export function useAdminAttentionCount(enabled = true) {
  const [count, setCount] = useState(0)

  const refresh = useCallback(async () => {
    if (!enabled) return
    try {
      const next = await loadAdminAttentionCount()
      if (next != null) setCount(next)
    } catch {
      // keep previous value on failure
    }
  }, [enabled])

  useEffect(() => {
    if (!enabled) return
    let cancelled = false

    ;(async () => {
      try {
        const next = await loadAdminAttentionCount()
        if (!cancelled && next != null) setCount(next)
      } catch {
        // keep previous value on failure
      }
    })()

    return () => {
      cancelled = true
    }
  }, [enabled])

  useEffect(() => {
    if (!enabled) return
    const handler = () => {
      void refresh()
    }
    window.addEventListener('admin:disputes-changed', handler)
    window.addEventListener('admin:attention-refresh', handler)
    return () => {
      window.removeEventListener('admin:disputes-changed', handler)
      window.removeEventListener('admin:attention-refresh', handler)
    }
  }, [enabled, refresh])

  return { count, refresh }
}
