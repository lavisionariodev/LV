'use client'

import { createContext, useContext, useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import {
  fetchFavorites as supabaseFetchFavorites,
  insertFavorite as supabaseInsertFavorite,
  deleteFavorite as supabaseDeleteFavorite,
  deleteFavoriteByListing as supabaseDeleteByListing,
} from '@/lib/favorites/supabaseFavorites'
import { buildFavoriteInsertFromListing } from '@/lib/favorites/fromListing'
import { useAuth } from '@/contexts/AuthContext'

const FavoritesContext = createContext(null)

/** Map UI snapshot (e.g. undo) back to DB insert columns. */
function uiItemToInsertRow(item) {
  return {
    listing_id: item.listingId,
    package_option: item.packageOption ?? '',
    listing_name: item.name,
    base_price: item.price != null ? Number(item.price) : null,
    image_url: item.image || null,
    service_id: item.serviceId,
    service_label: item.serviceLabel || null,
    business_name: item.provider?.name ?? null,
    business_location: item.provider?.location ?? null,
    seller_rating: item.provider?.rating != null ? Number(item.provider.rating) : null,
    seller_reviews: item.provider?.reviews != null ? Number(item.provider.reviews) : null,
    seller_badge: item.provider?.badge ?? null,
    popular: Boolean(item.popular),
  }
}

export function FavoritesProvider({ children }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState(null)
  const { user, authLoading, isBuyer } = useAuth()

  const favoritesUser = isBuyer ? user : null

  const loadFavorites = useCallback(async (nextUser) => {
    if (nextUser?.id) {
      setUserId(nextUser.id)
      const { items: fetched, error } = await supabaseFetchFavorites(supabase, nextUser.id)
      if (!error) setItems(fetched)
      else setItems([])
    } else {
      setUserId(null)
      setItems([])
    }
  }, [])

  useEffect(() => {
    let mounted = true
    if (authLoading) return
    loadFavorites(favoritesUser).finally(() => {
      if (mounted) setLoading(false)
    })
    return () => {
      mounted = false
    }
  }, [authLoading, favoritesUser, loadFavorites])

  const isFavorite = useCallback(
    (listingId, packageOption = '') => {
      const pkg = String(packageOption ?? '')
      const lid = String(listingId)
      return items.some(
        (f) => String(f.listingId) === lid && String(f.packageOption ?? '') === pkg,
      )
    },
    [items],
  )

  const addFavorite = useCallback(
    async (listing, { serviceId, serviceLabel, packageOption = '' } = {}) => {
      if (!userId || !listing) {
        return { error: new Error('You must be signed in to save favorites.') }
      }
      if (!serviceId) {
        return { error: new Error('Missing service category.') }
      }
      const row = buildFavoriteInsertFromListing(listing, {
        serviceId,
        serviceLabel,
        packageOption,
      })
      const { error } = await supabaseInsertFavorite(supabase, userId, row)
      if (error) return { error }
      const { items: next } = await supabaseFetchFavorites(supabase, userId)
      setItems(next)
      return { error: null }
    },
    [userId],
  )

  const removeFavorite = useCallback(
    async (favoriteRowId) => {
      if (!userId) {
        return { error: new Error('You must be signed in to manage favorites.') }
      }
      const { error } = await supabaseDeleteFavorite(supabase, userId, favoriteRowId)
      if (error) return { error }
      const { items: next } = await supabaseFetchFavorites(supabase, userId)
      setItems(next)
      return { error: null }
    },
    [userId],
  )

  const removeFavoriteByListing = useCallback(
    async (listingId, packageOption = '') => {
      if (!userId) {
        return { error: new Error('You must be signed in to manage favorites.') }
      }
      const { error } = await supabaseDeleteByListing(supabase, userId, listingId, packageOption)
      if (error) return { error }
      const { items: next } = await supabaseFetchFavorites(supabase, userId)
      setItems(next)
      return { error: null }
    },
    [userId],
  )

  const toggleFavorite = useCallback(
    async (listing, { serviceId, serviceLabel, packageOption = '' } = {}) => {
      if (!userId || !listing) {
        return { error: new Error('You must be signed in to save favorites.') }
      }
      const pkg = String(packageOption ?? '')
      const existing = items.find(
        (f) => String(f.listingId) === String(listing.id) && String(f.packageOption ?? '') === pkg,
      )
      if (existing) {
        return removeFavorite(existing.id)
      }
      return addFavorite(listing, { serviceId, serviceLabel, packageOption: pkg })
    },
    [userId, items, addFavorite, removeFavorite],
  )

  /** Restore a row after undo (same snapshot shape as items[]). */
  const restoreFavorite = useCallback(
    async (snapshot) => {
      if (!userId || !snapshot?.listingId) {
        return { error: new Error('You must be signed in to restore favorites.') }
      }
      const row = uiItemToInsertRow(snapshot)
      const { error } = await supabaseInsertFavorite(supabase, userId, row)
      if (error) return { error }
      const { items: next } = await supabaseFetchFavorites(supabase, userId)
      setItems(next)
      return { error: null }
    },
    [userId],
  )

  const favoriteCount = items.length

  const value = {
    items,
    loading,
    favoriteCount,
    isFavorite,
    addFavorite,
    removeFavorite,
    removeFavoriteByListing,
    toggleFavorite,
    restoreFavorite,
    reload: () => loadFavorites(favoritesUser),
  }

  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>
}

export function useFavorites() {
  const ctx = useContext(FavoritesContext)
  if (!ctx) throw new Error('useFavorites must be used within FavoritesProvider')
  return ctx
}
