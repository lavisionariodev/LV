'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import styles from './cart.module.css'
import { FiX, FiTrash2, FiShoppingBag } from 'react-icons/fi'
import { useCart } from '@/contexts/CartContext'

function formatPrice(n) {
  return `₱${Number(n).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`
}

export default function CartPage() {
  const { items: cartItems, updateQty, removeItem } = useCart()
  const [coupon, setCoupon]       = useState('')
  const [qtyEdits, setQtyEdits]   = useState({})
  const [selected, setSelected]   = useState(new Set())

  const rows = cartItems.map((item) => ({
    ...item,
    subtotal: item.price * item.qty,
  }))

  // Derive totals based on selected items (or all if none selected)
  const activeRows = selected.size > 0 ? rows.filter((r) => selected.has(r.id)) : rows
  const subtotal   = activeRows.reduce((sum, r) => sum + r.subtotal, 0)
  const total      = subtotal

  // ── selection helpers ──────────────────────────────────────
  const allSelected  = rows.length > 0 && rows.every((r) => selected.has(r.id))
  const someSelected = selected.size > 0 && !allSelected

  const toggleAll = () => {
    if (allSelected) {
      setSelected(new Set())
    } else {
      setSelected(new Set(rows.map((r) => r.id)))
    }
  }

  const toggleItem = (id) => {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  // ── qty helpers ───────────────────────────────────────────
  const handleUpdateQty = (productId, newQty) => {
    const num = parseInt(newQty, 10)
    if (Number.isNaN(num) || num < 1) return
    updateQty(productId, num)
    setQtyEdits((prev) => ({ ...prev, [productId]: undefined }))
  }

  const handleRemove = (productId) => {
    removeItem(productId)
    setSelected((prev) => {
      const next = new Set(prev)
      next.delete(productId)
      return next
    })
  }

  const handleRemoveSelected = () => {
    selected.forEach((id) => removeItem(id))
    setSelected(new Set())
  }

  const handlePrintInvoice = () => window.print()

  const checkoutHref =
    selected.size > 0
      ? `/buyer/login?redirect=/cart&items=${[...selected].join(',')}`
      : `/buyer/login?redirect=/cart`

  const isEmpty = rows.length === 0

  return (
    <section className={styles.cartPage}>
      {/* HERO */}
      <header className={styles.hero}>
        <div className={styles.heroOverlay} />
        <div className={styles.heroInner}>
          <h1 className={styles.heroTitle}>Cart</h1>
          <p className={styles.breadcrumb}>
            <Link href="/" className={styles.crumb}>Home</Link>
            <span className={styles.slash}>/</span>
            <span className={styles.crumbActive}>Cart</span>
          </p>
        </div>
      </header>

      <div className={styles.content}>
        {isEmpty ? (
          <div className={styles.emptySection}>
            <div className={styles.emptyIcon}><FiShoppingBag /></div>
            <h2 className={styles.emptyTitle}>Your cart is empty</h2>
            <p className={styles.emptySub}>Add packages or services to see them here.</p>
            <Link href="/services" className={styles.emptyLink}>Browse services</Link>
          </div>
        ) : (
          <>
            {/* LEFT: Products table */}
            <div className={styles.productsSection}>
              {/* Table header */}
              <div className={styles.tableHeader}>
                <span className={styles.thCheck}>
                  <input
                    type="checkbox"
                    className={styles.checkbox}
                    checked={allSelected}
                    ref={(el) => { if (el) el.indeterminate = someSelected }}
                    onChange={toggleAll}
                    aria-label="Select all items"
                  />
                </span>
                <span>Product</span>
                <span>Price</span>
                <span>Quantity</span>
                <span>Subtotal</span>
                <span></span>
              </div>

              {/* Bulk action bar */}
              {selected.size > 0 && (
                <div className={styles.bulkBar}>
                  <span className={styles.bulkCount}>
                    {selected.size} item{selected.size > 1 ? 's' : ''} selected
                  </span>
                  <button
                    type="button"
                    className={styles.bulkDeleteBtn}
                    onClick={handleRemoveSelected}
                  >
                    <FiTrash2 />
                    Remove selected
                  </button>
                </div>
              )}

              {rows.map((row) => (
                <div
                  key={row.id}
                  className={`${styles.itemRow} ${selected.has(row.id) ? styles.itemRowSelected : ''}`}
                >
                  {/* Checkbox */}
                  <div className={styles.itemCheck}>
                    <input
                      type="checkbox"
                      className={styles.checkbox}
                      checked={selected.has(row.id)}
                      onChange={() => toggleItem(row.id)}
                      aria-label={`Select ${row.name}`}
                    />
                  </div>

                  {/* Product info */}
                  <div className={styles.itemProduct}>
                    <div className={styles.thumbWrap}>
                      <Image
                        src={row.img}
                        alt={row.name}
                        width={72}
                        height={72}
                        className={styles.thumb}
                      />
                    </div>
                    <div className={styles.productInfo}>
                      <h3 className={styles.productName}>{row.name}</h3>
                      {row.description && (
                        <p className={styles.productDesc}>{row.description}</p>
                      )}
                    </div>
                  </div>

                  {/* Price */}
                  <div className={styles.itemPrice} data-label="Price">
                    {row.price > 0
                      ? formatPrice(row.price)
                      : <span className={styles.contactBadge}>Contact us</span>}
                  </div>

                  {/* Qty */}
                  <div className={styles.itemQty} data-label="Qty">
                    <div className={styles.qtyControl}>
                      <button
                        type="button"
                        className={styles.qtyBtn}
                        onClick={() => {
                          const cur = qtyEdits[row.id] ?? row.qty
                          handleUpdateQty(row.id, Math.max(1, Number(cur) - 1))
                        }}
                        aria-label="Decrease quantity"
                      >−</button>
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
                          const num = parseInt(e.target.value, 10)
                          if (!Number.isNaN(num) && num >= 1) handleUpdateQty(row.id, num)
                          else setQtyEdits((prev) => ({ ...prev, [row.id]: undefined }))
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            const num = parseInt(qtyEdits[row.id] ?? row.qty, 10)
                            if (!Number.isNaN(num) && num >= 1) handleUpdateQty(row.id, num)
                          }
                        }}
                      />
                      <button
                        type="button"
                        className={styles.qtyBtn}
                        onClick={() => {
                          const cur = qtyEdits[row.id] ?? row.qty
                          handleUpdateQty(row.id, Number(cur) + 1)
                        }}
                        aria-label="Increase quantity"
                      >+</button>
                    </div>
                  </div>

                  {/* Subtotal */}
                  <div className={styles.itemSubtotal} data-label="Subtotal">
                    {row.price > 0 ? formatPrice(row.subtotal) : '—'}
                  </div>

                  {/* Remove */}
                  <div className={styles.itemRemove}>
                    <button
                      type="button"
                      className={styles.removeBtn}
                      onClick={() => handleRemove(row.id)}
                      aria-label={`Remove ${row.name} from cart`}
                    >
                      <FiX />
                    </button>
                  </div>
                </div>
              ))}

              {/* Update + coupon footer */}
              <div className={styles.updateWrap}>
                <button
                  type="button"
                  className={styles.updateBtn}
                  onClick={() => {
                    Object.entries(qtyEdits).forEach(([id, val]) => {
                      const num = parseInt(val, 10)
                      if (!Number.isNaN(num) && num >= 1) handleUpdateQty(id, num)
                    })
                    setQtyEdits({})
                  }}
                >
                  Update cart
                </button>
              </div>

              <div className={styles.couponSection}>
                <input
                  type="text"
                  className={styles.couponInput}
                  placeholder="Coupon code"
                  value={coupon}
                  onChange={(e) => setCoupon(e.target.value)}
                  aria-label="Coupon code"
                />
                <button type="button" className={styles.applyCouponBtn}>Apply coupon</button>
              </div>

              <div className={styles.disclaimerSection}>
                <h4 className={styles.disclaimerTitle}>Disclaimer</h4>
                <p className={styles.disclaimerText}>
                  Note: Please note that all orders will be verified by our sales team. They may
                  contact you to confirm details such as the order placement, confirmed date, and
                  the service you are availing.
                </p>
              </div>
            </div>

            {/* RIGHT: Totals */}
            <aside className={styles.totalsSection}>
              <h2 className={styles.totalsTitle}>
                {selected.size > 0 ? 'Selected totals' : 'Cart totals'}
              </h2>
              {selected.size > 0 && (
                <p className={styles.totalsNote}>
                  Showing totals for {selected.size} selected item{selected.size > 1 ? 's' : ''}
                </p>
              )}
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
                <button type="button" className={styles.printBtn} onClick={handlePrintInvoice}>
                  Print Invoice
                </button>
                <Link
                  href={checkoutHref}
                  className={`${styles.checkoutBtn} ${selected.size === 0 ? styles.checkoutBtnAll : ''}`}
                  style={{ textAlign: 'center', display: 'block', textDecoration: 'none' }}
                >
                  {selected.size > 0
                    ? `Book Now (${selected.size} item${selected.size > 1 ? 's' : ''})`
                    : 'Proceed to checkout'}
                </Link>
              </div>
            </aside>
          </>
        )}
      </div>
    </section>
  )
}