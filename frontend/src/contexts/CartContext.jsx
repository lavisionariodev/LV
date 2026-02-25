'use client'

import { createContext, useContext, useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { getUser, onAuthStateChange } from '@/lib/auth/session'
import { fetchCart, addItem as supabaseAddItem, updateQty as supabaseUpdateQty, removeItem as supabaseRemoveItem } from '@/lib/cart/supabaseCart'

const CART_STORAGE_KEY = 'lavisionario_cart'

const CartContext = createContext(null)

function loadFromStorage() {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function saveToStorage(items) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items))
  } catch (_) {}
}

export function CartProvider({ children }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState(null)

  const loadCart = useCallback(async (user) => {
    if (user?.id) {
      setUserId(user.id)
      const { items: fetched, error } = await fetchCart(supabase, user.id)
      if (!error) setItems(fetched)
      else setItems([])
    } else {
      setUserId(null)
      setItems(loadFromStorage())
    }
  }, [])

  useEffect(() => {
    let mounted = true
    getUser().then((user) => {
      if (mounted) loadCart(user)
    }).finally(() => {
      if (mounted) setLoading(false)
    })
    const unsubscribe = onAuthStateChange(() => {
      getUser().then((user) => mounted && loadCart(user))
    })
    return () => {
      mounted = false
      unsubscribe()
    }
  }, [loadCart])

  const addItem = useCallback(async (item) => {
    const { id, name, img, price, description, qty } = item
    const safeQty = Math.max(1, Number(qty) || 1)
    if (userId) {
      const { error } = await supabaseAddItem(supabase, userId, { id, name, img, price, description, qty: safeQty })
      if (error) return { error }
      const { items: next } = await fetchCart(supabase, userId)
      setItems(next)
      return { error: null }
    }
    setItems((prev) => {
      const idx = prev.findIndex((i) => i.id === id)
      let next
      if (idx >= 0) {
        next = prev.slice()
        next[idx] = { ...next[idx], qty: next[idx].qty + safeQty }
      } else {
        next = [...prev, { id, name, img: img ?? '', price: price ?? 0, description: description ?? '', qty: safeQty }]
      }
      saveToStorage(next)
      return next
    })
    return { error: null }
  }, [userId])

  const updateQty = useCallback(async (productId, qty) => {
    const num = parseInt(qty, 10)
    if (userId) {
      const { error } = await supabaseUpdateQty(supabase, userId, productId, num)
      if (error) return { error }
      const { items: next } = await fetchCart(supabase, userId)
      setItems(next)
      return { error: null }
    }
    setItems((prev) => {
      if (num < 1) {
        const next = prev.filter((i) => i.id !== productId)
        saveToStorage(next)
        return next
      }
      const next = prev.map((i) => (i.id === productId ? { ...i, qty: num } : i))
      saveToStorage(next)
      return next
    })
    return { error: null }
  }, [userId])

  const removeItem = useCallback(async (productId) => {
    if (userId) {
      const { error } = await supabaseRemoveItem(supabase, userId, productId)
      if (error) return { error }
      const { items: next } = await fetchCart(supabase, userId)
      setItems(next)
      return { error: null }
    }
    setItems((prev) => {
      const next = prev.filter((i) => i.id !== productId)
      saveToStorage(next)
      return next
    })
    return { error: null }
  }, [userId])

  const setItemsOverride = useCallback((newItems) => {
    setItems(Array.isArray(newItems) ? newItems : [])
    if (!userId) saveToStorage(Array.isArray(newItems) ? newItems : [])
  }, [userId])

  const cartCount = items.reduce((sum, i) => sum + (i.qty ?? 1), 0)

  const value = {
    items,
    loading,
    cartCount,
    addItem,
    updateQty,
    removeItem,
    setItems: setItemsOverride,
    refreshCart: () => getUser().then(loadCart),
  }

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used within CartProvider')
  return ctx
}
