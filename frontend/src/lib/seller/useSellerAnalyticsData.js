'use client'

import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase/client'
import { SELLER_ANALYTICS_ORDER_SELECT } from './sellerOrderAnalytics'

/**
 * Loads seller orders (analytics shape) + minimal listing rows for dashboard alerts.
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

      const orderChain = supabase
        .from('orders')
        .select(SELLER_ANALYTICS_ORDER_SELECT)
        .eq('seller_user_id', user.id)
        .order('created_at', { ascending: false })

      const listingChain = supabase
        .from('seller_listings')
        .select('id,approval_status')
        .eq('seller_user_id', user.id)

      const [orRes, liRes] = await Promise.all([
        orderChain.abortSignal?.(signal) ?? orderChain,
        listingChain.abortSignal?.(signal) ?? listingChain,
      ])

      if (signal?.aborted) return

      if (orRes.error) {
        setOrders([])
        setError(orRes.error.message || 'Could not load orders.')
      } else {
        setOrders(orRes.data || [])
      }

      if (liRes.error) {
        setListings([])
      } else {
        setListings(liRes.data || [])
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

    return () => {
      cancelled = true
      controller.abort()
    }
  }, [authLoading, user, isSeller, load])

  return { orders, listings, loading, error, reload: load }
}
