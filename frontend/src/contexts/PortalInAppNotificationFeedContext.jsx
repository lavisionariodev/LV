'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useInAppNotificationFeed } from '@/lib/notifications/useInAppNotificationFeed'

const PortalInAppNotificationFeedContext = createContext(null)

/**
 * Single in-app notification feed for admin/seller portals.
 * Keeps AppTopbar and portal notifications pages in sync for read/unread state.
 */
export function PortalInAppNotificationFeedProvider({ children }) {
  const { user, authLoading } = useAuth()
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    queueMicrotask(() => setHydrated(true))
  }, [])

  const enabled = hydrated && !authLoading && Boolean(user)

  const feed = useInAppNotificationFeed({ limit: 100, enabled })

  return (
    <PortalInAppNotificationFeedContext.Provider value={feed}>
      {children}
    </PortalInAppNotificationFeedContext.Provider>
  )
}

export function usePortalInAppNotificationFeed() {
  const ctx = useContext(PortalInAppNotificationFeedContext)
  if (!ctx) {
    throw new Error(
      'usePortalInAppNotificationFeed must be used within PortalInAppNotificationFeedProvider',
    )
  }
  return ctx
}
