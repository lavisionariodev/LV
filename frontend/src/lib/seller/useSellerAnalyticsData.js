'use client'

import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase/client'

/**
 * Loads seller orders (analytics shape) + minimal listing rows for dashboard alerts.
 * The server route centralizes the query shape so dashboard/analytics do not drift.
 */
export function useSellerAnalyticsData() {
  const { user, authLoading, isSeller } = useAuth()
  const [orders, setOrders] = useState([])
  const [listings, setListings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(
    async ({ signal } = {}) => {
      if (!user?.id || !isSeller) return

      setError('')

      const res = await fetch('/api/seller/orders/analytics', { cache: 'no-store', signal })
      const body = await res.json().catch(() => null)

      if (signal?.aborted) return

      if (!res.ok) {
        setOrders([])
        setListings([])
        setError(body?.error || 'Could not load orders.')
      } else {
        setOrders(Array.isArray(body?.orders) ? body.orders : [])
        setListings(Array.isArray(body?.listings) ? body.listings : [])
      }
    },
    [user, isSeller],
  )

  useEffect(() => {
    let cancelled = false

    if (authLoading) {
      return () => {
        cancelled = true
      }
    }

    if (!user?.id || !isSeller) {
      queueMicrotask(() => {
        if (cancelled) return
        setOrders([])
        setListings([])
        setLoading(false)
        setError('')
      })
      return () => {
        cancelled = true
      }
    }

    const controller = new AbortController()
    queueMicrotask(() => {
      if (cancelled) return
      setLoading(true)
      load({ signal: controller.signal }).finally(() => {
        if (!controller.signal.aborted && !cancelled) setLoading(false)
      })
    })

    const refresh = () => {
      load({ signal: controller.signal }).catch(() => {})
    }
    const channel = supabase
      .channel(`seller-analytics:${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders', filter: `seller_user_id=eq.${user.id}` },
        refresh,
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'seller_listings', filter: `seller_user_id=eq.${user.id}` },
        refresh,
      )
      .subscribe()

    return () => {
      cancelled = true
      controller.abort()
      supabase.removeChannel(channel)
    }
  }, [authLoading, user, isSeller, load])

  return { orders, listings, loading, error, reload: load }
}
