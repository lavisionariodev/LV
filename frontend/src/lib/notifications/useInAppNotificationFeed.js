'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase/client'

/**
 * @param {string} iso
 */
export function relativeNotificationTime(iso) {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '—'
  const diffMs = Date.now() - date.getTime()
  const min = Math.floor(diffMs / 60000)
  if (min < 1) return 'Just now'
  if (min < 60) return `${min} min ago`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr} hour${hr > 1 ? 's' : ''} ago`
  const day = Math.floor(hr / 24)
  return `${day} day${day > 1 ? 's' : ''} ago`
}

/**
 * Shared in-app notification feed: `/api/notifications` + optional Supabase realtime refresh.
 *
 * @param {{ limit?: number, enableRealtime?: boolean, enabled?: boolean }} [opts]
 */
export function useInAppNotificationFeed(opts = {}) {
  const limit = Number.isFinite(opts.limit) ? Math.min(100, Math.max(1, opts.limit)) : 100
  const enableRealtime = opts.enableRealtime !== false
  const enabled = opts.enabled !== false

  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!enabled) {
      setNotifications([])
      setLoading(false)
      return
    }
    setLoading(true)
    const res = await fetch(`/api/notifications?limit=${limit}`, { cache: 'no-store' })
    const body = await res.json().catch(() => null)
    if (!res.ok) {
      setNotifications([])
      setLoading(false)
      return
    }
    setNotifications(Array.isArray(body?.notifications) ? body.notifications : [])
    setLoading(false)
  }, [enabled, limit])

  useEffect(() => {
    if (!enabled) {
      queueMicrotask(() => {
        setNotifications([])
        setLoading(false)
      })
      return
    }

    let cancelled = false
    let channel = null

    async function setup() {
      await load()
      if (cancelled || !enableRealtime) return

      const {
        data: { session },
      } = await supabase.auth.getSession()
      const uid = session?.user?.id
      if (!uid || cancelled) return

      channel = supabase
        .channel(`user_notifications_feed:${uid}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'user_notifications',
            filter: `user_id=eq.${uid}`,
          },
          () => {
            if (!cancelled) load()
          },
        )
        .subscribe()
    }

    setup()

    return () => {
      cancelled = true
      if (channel) supabase.removeChannel(channel)
    }
  }, [enabled, enableRealtime, load])

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.readAt).length,
    [notifications],
  )

  const unresolvedCount = useMemo(
    () => notifications.filter((n) => !n.resolvedAt).length,
    [notifications],
  )

  const markRead = useCallback(async (id) => {
    const sid = String(id).trim()
    if (!sid) return
    await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: sid }),
    })
    const nowIso = new Date().toISOString()
    setNotifications((prev) =>
      prev.map((r) => (String(r.id) === sid ? { ...r, readAt: nowIso } : r)),
    )
  }, [])

  const markAllRead = useCallback(async () => {
    await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ markAllRead: true }),
    })
    const nowIso = new Date().toISOString()
    setNotifications((prev) => prev.map((r) => ({ ...r, readAt: r.readAt || nowIso })))
  }, [])

  const resolveOne = useCallback(async (id) => {
    const sid = String(id).trim()
    if (!sid) return
    await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: sid, resolve: true }),
    })
    const nowIso = new Date().toISOString()
    setNotifications((prev) =>
      prev.map((r) =>
        String(r.id) === sid
          ? { ...r, readAt: r.readAt || nowIso, resolvedAt: r.resolvedAt || nowIso }
          : r,
      ),
    )
  }, [])

  const markAllResolved = useCallback(async () => {
    await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ markAllResolved: true }),
    })
    const nowIso = new Date().toISOString()
    setNotifications((prev) =>
      prev.map((r) => ({
        ...r,
        readAt: r.readAt || nowIso,
        resolvedAt: r.resolvedAt || nowIso,
      })),
    )
  }, [])

  const deleteOne = useCallback(async (id) => {
    const sid = String(id).trim()
    if (!sid) return
    await fetch(`/api/notifications?id=${encodeURIComponent(sid)}`, { method: 'DELETE' })
    setNotifications((prev) => prev.filter((r) => String(r.id) !== sid))
  }, [])

  const clearAll = useCallback(async () => {
    await fetch('/api/notifications', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clearAll: true }),
    })
    setNotifications([])
  }, [])

  const clearResolved = useCallback(async () => {
    await fetch('/api/notifications', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clearResolved: true }),
    })
    setNotifications((prev) => prev.filter((r) => !r.resolvedAt))
  }, [])

  return {
    notifications,
    loading,
    unreadCount,
    unresolvedCount,
    refresh: load,
    markRead,
    markAllRead,
    resolveOne,
    markAllResolved,
    deleteOne,
    clearAll,
    clearResolved,
  }
}
