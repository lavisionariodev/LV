'use client'

import { createContext, useContext, useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import {
  fetchCart,
  addItem as supabaseAddItem,
  updateQty as supabaseUpdateQty,
  removeItem as supabaseRemoveItem,
} from '@/lib/cart/supabaseCart'
import { useAuth } from '@/contexts/AuthContext'

/**
 * Cart context for the main site. Must be used within AuthProvider.
 * Only buyers get a loaded cart; seller/admin are treated as guests (empty cart, no add/update/remove).
 */
const CartContext = createContext(null)

export function CartProvider({ children }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState(null)
  const { user, authLoading, isBuyer } = useAuth()

  // Only buyers get cart on the main site; seller/admin auth does not grant cart access.
  const cartUser = isBuyer ? user : null

  const loadCart = useCallback(async (nextUser) => {
    if (nextUser?.id) {
      setUserId(nextUser.id)
      const { items: fetched, error } = await fetchCart(supabase, nextUser.id)
      if (!error) setItems(fetched)
      else setItems([])
    } else {
      setUserId(null)
      setItems([])
    }
  }, [])

  useEffect(() => {
    let mounted = true

    if (authLoading) {
      return
    }

    loadCart(cartUser).finally(() => {
      if (mounted) {
        setLoading(false)
      }
    })

    return () => {
      mounted = false
    }
  }, [authLoading, cartUser, loadCart])

  const addItem = useCallback(
    async (item) => {
      const { id, name, img, price, description, qty } = item
      const safeQty = Math.max(1, Number(qty) || 1)
      if (!userId) {
        return { error: new Error('User must be authenticated to add items to cart') }
      }
      const { error } = await supabaseAddItem(supabase, userId, {
        id,
        name,
        img,
        price,
        description,
        qty: safeQty,
      })
      if (error) return { error }
      const { items: next } = await fetchCart(supabase, userId)
      setItems(next)
      return { error: null }
    },
    [userId],
  )

  const updateQty = useCallback(
    async (productId, qty) => {
      if (!userId) {
        return { error: new Error('User must be authenticated to update cart quantities') }
      }
      const num = parseInt(qty, 10)
      const { error } = await supabaseUpdateQty(supabase, userId, productId, num)
      if (error) return { error }
      const { items: next } = await fetchCart(supabase, userId)
      setItems(next)
      return { error: null }
    },
    [userId],
  )

  const removeItem = useCallback(
    async (productId) => {
      if (!userId) {
        return { error: new Error('User must be authenticated to remove cart items') }
      }
      const { error } = await supabaseRemoveItem(supabase, userId, productId)
      if (error) return { error }
      const { items: next } = await fetchCart(supabase, userId)
      setItems(next)
      return { error: null }
    },
    [userId],
  )

  const cartCount = items.reduce((sum, i) => sum + (i.qty ?? 1), 0)

  const value = {
    items,
    loading,
    cartCount,
    addItem,
    updateQty,
    removeItem,
  }

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used within CartProvider')
  return ctx
}