'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useInAppNotificationFeed } from '@/lib/notifications/useInAppNotificationFeed'

const BuyerInAppNotificationFeedContext = createContext(null)

/**
 * Single in-app notification feed for the public storefront (buyers).
 * Keeps `/profile/notifications` and `PublicNavbar` in sync for read/unread state.
 */
export function BuyerInAppNotificationFeedProvider({ children }) {
  const { user, isBuyer, authLoading } = useAuth()
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    queueMicrotask(() => setHydrated(true))
  }, [])

  const enabled = hydrated && !authLoading && Boolean(user) && isBuyer

  const feed = useInAppNotificationFeed({ limit: 100, enabled })

  return (
    <BuyerInAppNotificationFeedContext.Provider value={feed}>
      {children}
    </BuyerInAppNotificationFeedContext.Provider>
  )
}

export function useBuyerInAppNotificationFeed() {
  const ctx = useContext(BuyerInAppNotificationFeedContext)
  if (!ctx) {
    throw new Error('useBuyerInAppNotificationFeed must be used within BuyerInAppNotificationFeedProvider')
  }
  return ctx
}
