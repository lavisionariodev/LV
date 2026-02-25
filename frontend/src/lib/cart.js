const CART_STORAGE_KEY = 'sofia_cart'

/**
 * Cart item: { id: number, qty: number }
 * @typedef {{ id: number, qty: number }} CartItem
 */

/**
 * @returns {CartItem[]}
 */
export function getCart() {
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

/**
 * @param {CartItem[]} items
 */
export function setCart(items) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items))
    window.dispatchEvent(new Event('storage'))
  } catch (_) {}
}

/**
 * Add or update quantity for a product.
 * @param {number} productId
 * @param {number} [qty=1]
 */
export function addToCart(productId, qty = 1) {
  const items = getCart()
  const existing = items.find((i) => i.id === productId)
  const newQty = (existing?.qty ?? 0) + qty
  if (newQty <= 0) {
    setCart(items.filter((i) => i.id !== productId))
    return
  }
  if (existing) {
    existing.qty = newQty
  } else {
    items.push({ id: productId, qty: newQty })
  }
  setCart([...items])
}

/**
 * Set quantity for a product. Remove if qty <= 0.
 * @param {number} productId
 * @param {number} qty
 */
export function setCartItemQty(productId, qty) {
  if (qty <= 0) {
    setCart(getCart().filter((i) => i.id !== productId))
    return
  }
  const items = getCart()
  const existing = items.find((i) => i.id === productId)
  if (existing) {
    existing.qty = qty
    setCart([...items])
  } else {
    setCart([...items, { id: productId, qty }])
  }
}

/**
 * Remove item from cart.
 * @param {number} productId
 */
export function removeFromCart(productId) {
  setCart(getCart().filter((i) => i.id !== productId))
}
