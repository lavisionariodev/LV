'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { getCart, setCartItemQty, removeFromCart } from '@/lib/cart'
import { getPackageById } from '@/app/(public)/packages/data'
import { getServiceById } from '@/app/(public)/services/data'
import styles from './cart.module.css'

function getProductById(id) {
  const pkg = getPackageById(id)
  if (pkg) {
    const priceMatch = pkg.price && String(pkg.price).match(/[\d,]+/)
    const price = priceMatch ? Number(priceMatch[0].replace(/,/g, '')) : 0
    return { id: pkg.id, name: pkg.name, img: pkg.image, price }
  }
  const svc = getServiceById(id)
  if (svc) return { id: svc.id, name: svc.name, img: svc.image, price: 0 }
  return null
}
import { FiX } from 'react-icons/fi'

function formatPrice(n) {
  return `₱${Number(n).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`
}

export default function CartPage() {
  const [cartItems, setCartItems] = useState([])
  const [coupon, setCoupon] = useState('')
  const [qtyEdits, setQtyEdits] = useState({})

  useEffect(() => {
    const sync = () => setCartItems(getCart())
    sync()
    window.addEventListener('storage', sync)
    return () => window.removeEventListener('storage', sync)
  }, [])

  const rows = cartItems
    .map(({ id, qty }) => {
      const product = getProductById(id)
      if (!product) return null
      return {
        id: product.id,
        name: product.name,
        img: product.img,
        price: product.price,
        qty,
        subtotal: product.price * qty,
      }
    })
    .filter(Boolean)

  const subtotal = rows.reduce((sum, r) => sum + r.subtotal, 0)
  const total = subtotal

  const handleUpdateQty = (productId, newQty) => {
    const num = parseInt(newQty, 10)
    if (Number.isNaN(num) || num < 1) return
    setCartItemQty(productId, num)
    setQtyEdits((prev) => ({ ...prev, [productId]: undefined }))
    setCartItems(getCart())
  }

  const handleRemove = (productId) => {
    removeFromCart(productId)
    setCartItems(getCart())
  }

  const handlePrintInvoice = () => {
    window.print()
  }

  const isEmpty = rows.length === 0

  return (
    <section className={styles.cartPage}>
      {/* HERO: breadcrumbs + page name */}
      <header className={styles.hero}>
        <div className={styles.heroOverlay} />
        <div className={styles.heroInner}>
          <h1 className={styles.heroTitle}>Cart</h1>
          <p className={styles.breadcrumb}>
            <Link href="/" className={styles.crumb}>
              Home
            </Link>
            <span className={styles.slash}>/</span>
            <span className={styles.crumbActive}>Cart</span>
          </p>
        </div>
      </header>

      <div className={styles.content}>
        {isEmpty ? (
          <div className={styles.emptySection}>
            <h2 className={styles.emptyTitle}>Your cart is empty</h2>
            <p className={styles.emptySub}>
              Add packages or services to see them here.
            </p>
            <Link href="/packages" className={styles.emptyLink}>
              Browse packages
            </Link>
          </div>
        ) : (
          <>
            {/* LEFT: Products table, coupon, disclaimer */}
            <div className={styles.productsSection}>
              <div className={styles.tableHeader}>
                <span>Product</span>
                <span>Price</span>
                <span>Quantity</span>
                <span>Subtotal</span>
              </div>
              <div className={styles.productsLabel}>Products</div>

              {rows.map((row) => (
                <div key={row.id} className={styles.itemRow}>
                  <div className={styles.itemProduct}>
                    <button
                      type="button"
                      className={styles.removeBtn}
                      onClick={() => handleRemove(row.id)}
                      aria-label={`Remove ${row.name} from cart`}
                    >
                      <FiX />
                    </button>
                    <div className={styles.thumbWrap}>
                      <Image
                        src={row.img}
                        alt=""
                        width={56}
                        height={56}
                        className={styles.thumb}
                      />
                    </div>
                    <h3 className={styles.productName}>{row.name}</h3>
                  </div>
                  <div className={styles.itemPrice}>
                    {formatPrice(row.price)}
                  </div>
                  <div className={styles.itemQty}>
                    <input
                      type="number"
                      min={1}
                      className={styles.qtyInput}
                      value={qtyEdits[row.id] ?? row.qty}
                      onChange={(e) =>
                        setQtyEdits((prev) => ({
                          ...prev,
                          [row.id]: e.target.value === '' ? '' : parseInt(e.target.value, 10),
                        }))
                      }
                      onBlur={(e) => {
                        const v = e.target.value
                        const num = parseInt(v, 10)
                        if (!Number.isNaN(num) && num >= 1)
                          handleUpdateQty(row.id, num)
                        else
                          setQtyEdits((prev) => ({ ...prev, [row.id]: undefined }))
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          const num = parseInt(qtyEdits[row.id] ?? row.qty, 10)
                          if (!Number.isNaN(num) && num >= 1)
                            handleUpdateQty(row.id, num)
                        }
                      }}
                    />
                  </div>
                  <div className={styles.itemSubtotal}>
                    {formatPrice(row.subtotal)}
                  </div>
                </div>
              ))}

              <div className={styles.updateWrap}>
                <button
                  type="button"
                  className={styles.updateBtn}
                  onClick={() => {
                    Object.entries(qtyEdits).forEach(([id, val]) => {
                      const num = parseInt(val, 10)
                      if (!Number.isNaN(num) && num >= 1)
                        setCartItemQty(Number(id), num)
                    })
                    setQtyEdits({})
                    setCartItems(getCart())
                  }}
                >
                  Update cart
                </button>
              </div>

              <div className={styles.couponSection}>
                <input
                  type="text"
                  className={styles.couponInput}
                  placeholder="Coupon"
                  value={coupon}
                  onChange={(e) => setCoupon(e.target.value)}
                  aria-label="Coupon code"
                />
                <button type="button" className={styles.applyCouponBtn}>
                  Apply coupon
                </button>
              </div>

              <div className={styles.disclaimerSection}>
                <h4 className={styles.disclaimerTitle}>Disclaimer</h4>
                <p className={styles.disclaimerText}>
                  Note: Please note that all orders will be verified by our sales
                  team. They may contact you to confirm details such as the order
                  placement, confirmed date, and the service you are availing.
                </p>
              </div>
            </div>

            {/* RIGHT: Cart totals + actions */}
            <aside className={styles.totalsSection}>
              <h2 className={styles.totalsTitle}>Cart totals</h2>
              <table className={styles.totalsTable}>
                <tbody>
                  <tr>
                    <th>Subtotal</th>
                    <td>{formatPrice(subtotal)}</td>
                  </tr>
                  <tr className={styles.totalRow}>
                    <th>Total</th>
                    <td>{formatPrice(total)}</td>
                  </tr>
                </tbody>
              </table>
              <div className={styles.actions}>
                <button
                  type="button"
                  className={styles.printBtn}
                  onClick={handlePrintInvoice}
                >
                  Print Invoice
                </button>
                <Link
                  href="/buyer/login?redirect=/cart"
                  className={styles.checkoutBtn}
                  style={{ textAlign: 'center', display: 'block', textDecoration: 'none' }}
                >
                  Proceed to checkout
                </Link>
              </div>
            </aside>
          </>
        )}
      </div>
    </section>
  )
}
