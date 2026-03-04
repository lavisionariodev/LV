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

const CartContext = createContext(null)

export function CartProvider({ children }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState(null)
  const { user, authLoading } = useAuth()

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

    loadCart(user).finally(() => {
      if (mounted) {
        setLoading(false)
      }
    })

    return () => {
      mounted = false
    }
  }, [authLoading, user, loadCart])

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

  const setItemsOverride = useCallback((newItems) => {
    setItems(Array.isArray(newItems) ? newItems : [])
  }, [])

  const cartCount = items.reduce((sum, i) => sum + (i.qty ?? 1), 0)

  const value = {
    items,
    loading,
    cartCount,
    addItem,
    updateQty,
    removeItem,
    setItems: setItemsOverride,
    refreshCart: () => loadCart(user),
  }

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used within CartProvider')
  return ctx
}