'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useState, useEffect, useMemo } from 'react'
import { useCart } from '@/contexts/CartContext'
import { useAuth } from '@/contexts/AuthContext'
import styles from './cart.module.css'
import { formatPhpAmount } from '@/lib/cart/formatPhp'
import { useSiteContent } from '@/lib/siteContent/client'

/** Map Supabase cart line (CartContext) to table row fields for the UI. */
function mapCartItemToRow(item) {
  const desc = item.description || ''
  const parts = desc.split(' · ')
  const providerName = (parts[0] || '').trim() || 'Seller'
  const detailLine = parts.length > 1 ? parts.slice(1).join(' · ').trim() : ''
  return {
    id: item.id,
    name: item.name,
    description: detailLine,
    price: Number(item.price) || 0,
    qty: item.qty ?? 1,
    img: item.img,
    provider: providerName,
    providerInitial: providerName.charAt(0).toUpperCase(),
    rating: null,
    badge: null,
  }
}

// ─── Main Cart Page ──────────────────────────────────────────────────────────
export default function CartPage() {
  const { items: cartItems, loading: cartLoading, updateQty: cartUpdateQty, removeItem: cartRemoveItem } =
    useCart()
  const { authLoading, isBuyer, user } = useAuth()
  const { data: siteContent } = useSiteContent()
  const [mounted, setMounted] = useState(false)
  const [selected, setSelected] = useState(new Set())
  const [coupon, setCoupon] = useState('')
  const [couponApplied, setCouponApplied] = useState(false)
  const [qtyEdits, setQtyEdits] = useState({})

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    const ids = new Set(cartItems.map((i) => i.id))
    setSelected((prev) => {
      const filtered = [...prev].filter((id) => ids.has(id))
      if (filtered.length === prev.size && [...prev].every((id) => ids.has(id))) return prev
      return new Set(filtered)
    })
  }, [cartItems])

  const rows = useMemo(
    () =>
      cartItems.map((item) => {
        const base = mapCartItemToRow(item)
        return {
          ...base,
          subtotal: base.price * base.qty,
        }
      }),
    [cartItems],
  )

  const allSelected = rows.length > 0 && rows.every((r) => selected.has(r.id))
  const someSelected = selected.size > 0 && !allSelected

  const toggleAll = () => {
    if (allSelected) setSelected(new Set())
    else setSelected(new Set(rows.map((r) => r.id)))
  }

  const toggleItem = (id) => {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const updateQty = async (id, val) => {
    const num = Math.max(1, parseInt(val, 10) || 1)
    await cartUpdateQty(id, num)
  }

  const removeItem = async (id) => {
    await cartRemoveItem(id)
    setSelected((prev) => {
      const next = new Set(prev)
      next.delete(id)
      return next
    })
  }

  const removeSelected = async () => {
    const ids = [...selected]
    for (const id of ids) {
      await cartRemoveItem(id)
    }
    setSelected(new Set())
  }

  const activeRows = selected.size > 0 ? rows.filter((r) => selected.has(r.id)) : rows
  const subtotal = activeRows.reduce((sum, r) => sum + r.subtotal, 0)
  const discount = couponApplied ? Math.round(subtotal * 0.1) : 0
  const total = subtotal - discount
  const checkoutHref =
    selected.size > 0 ? `/checkout?items=${encodeURIComponent([...selected].join(","))}` : "/checkout"

  const isEmpty = rows.length === 0
  const showCartLoading = !authLoading && isBuyer && user && cartLoading

  if (!mounted) return null

  if (authLoading || showCartLoading) {
    return (
      <section className={styles.cartPage}>
        <header className={styles.hero}>
          <div className={styles.heroInner}>
            <h1 className={styles.heroTitle}>Your Cart</h1>
          </div>
        </header>
        <div className={styles.content}>
          <p style={{ fontFamily: 'Lato, sans-serif', color: 'rgba(16,40,32,0.55)', padding: '2rem 0' }}>
            Loading your cart…
          </p>
        </div>
      </section>
    )
  }

  return (
    <section className={styles.cartPage}>
      <div className={styles.printReceipt} aria-hidden>

        {/* ── Invoice Header ── */}
        <header className={styles.receiptHeader}>
          <div className={styles.receiptHeaderLeft}>
            <div className={styles.receiptBrand}>{siteContent?.systemName || 'La Visionario'}</div>
            <div className={styles.receiptBrandTagline}>Professional Services &amp; Packages</div>
            <div className={styles.receiptBrandContact}>
              <span>support@lavisionario.com</span>
              <span className={styles.receiptDot}>·</span>
              <span>www.lavisionario.com</span>
            </div>
          </div>
          <div className={styles.receiptHeaderRight}>
            <div className={styles.receiptInvoiceLabel}>INVOICE</div>
            <div className={styles.receiptMetaGrid}>
              <span className={styles.receiptMetaKey}>Invoice No.</span>
              <span className={styles.receiptMetaVal}>
                {`INV-${Date.now().toString().slice(-8)}`}
              </span>
              <span className={styles.receiptMetaKey}>Date</span>
              <span className={styles.receiptMetaVal}>
                {new Date().toLocaleDateString('en-PH', { dateStyle: 'medium' })}
              </span>
              <span className={styles.receiptMetaKey}>Time</span>
              <span className={styles.receiptMetaVal}>
                {new Date().toLocaleTimeString('en-PH', { timeStyle: 'short' })}
              </span>
              <span className={styles.receiptMetaKey}>Status</span>
              <span className={`${styles.receiptMetaVal} ${styles.receiptStatusBadge}`}>Pending</span>
            </div>
          </div>
        </header>

        {/* ── Bill To / Prepared By ── */}
        <div className={styles.receiptParties}>
          <div className={styles.receiptPartyBlock}>
            <div className={styles.receiptPartyLabel}>Bill To</div>
            <div className={styles.receiptPartyName}>{user?.user_metadata?.full_name || user?.email || 'Guest Customer'}</div>
            {user?.email && <div className={styles.receiptPartyDetail}>{user.email}</div>}
            <div className={styles.receiptPartyDetail}>Philippines</div>
          </div>
          <div className={styles.receiptPartyBlock}>
            <div className={styles.receiptPartyLabel}>Prepared By</div>
            <div className={styles.receiptPartyName}>{siteContent?.systemName || 'La Visionario'}</div>
            <div className={styles.receiptPartyDetail}>Sales &amp; Booking Team</div>
            <div className={styles.receiptPartyDetail}>Subject to verification</div>
          </div>
          <div className={styles.receiptPartyBlock}>
            <div className={styles.receiptPartyLabel}>Payment Method</div>
            <div className={styles.receiptPartyName}>To Be Arranged</div>
            <div className={styles.receiptPartyDetail}>GCash · Bank Transfer</div>
            <div className={styles.receiptPartyDetail}>Cash on Delivery</div>
          </div>
        </div>

        {/* ── Line Items ── */}
        <div className={styles.receiptBody}>
          <table className={styles.receiptTable}>
            <thead>
              <tr>
                <th className={styles.receiptThNo}>#</th>
                <th>Service / Package</th>
                <th className={styles.receiptThProvider}>Provider</th>
                <th className={styles.receiptThRight}>Unit Price</th>
                <th className={styles.receiptThRight}>Qty</th>
                <th className={styles.receiptThRight}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {activeRows.map((row, i) => (
                <tr key={row.id}>
                  <td className={styles.receiptTdNo}>{i + 1}</td>
                  <td>
                    <div className={styles.receiptItemName}>{row.name}</div>
                    {row.description && (
                      <div className={styles.receiptItemDesc}>{row.description}</div>
                    )}
                  </td>
                  <td className={styles.receiptTdProvider}>
                    {row.provider || '—'}
                  </td>
                  <td className={styles.receiptTdRight}>
                    {row.price > 0 ? formatPhpAmount(row.price) : 'TBA'}
                  </td>
                  <td className={styles.receiptTdRight}>{row.qty ?? 1}</td>
                  <td className={styles.receiptTdRight}>
                    {row.price > 0 ? formatPhpAmount((row.price || 0) * (row.qty || 1)) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* ── Totals ── */}
          <div className={styles.receiptTotalsWrap}>
            <div className={styles.receiptTotals}>
              <div className={styles.receiptTotalsRow}>
                <span>Subtotal</span>
                <span>{formatPhpAmount(subtotal)}</span>
              </div>
              {couponApplied && (
                <div className={`${styles.receiptTotalsRow} ${styles.receiptTotalsDiscount}`}>
                  <span>Discount (10% — Coupon Applied)</span>
                  <span>− {formatPhpAmount(discount)}</span>
                </div>
              )}
              <div className={styles.receiptTotalsRow}>
                <span>VAT / Tax</span>
                <span className={styles.receiptMuted}>Inclusive</span>
              </div>
              <div className={`${styles.receiptTotalsRow} ${styles.receiptTotalsRowStrong}`}>
                <span>Total Due</span>
                <span>{formatPhpAmount(total)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Notes & Footer ── */}
        <div className={styles.receiptNotes}>
          <div className={styles.receiptNoteBlock}>
            <div className={styles.receiptNoteLabel}>Notes</div>
            <div className={styles.receiptNoteText}>
              All bookings are subject to availability and confirmation by our sales team. A representative will contact you within 24 hours to finalize details.
            </div>
          </div>
          <div className={styles.receiptNoteBlock}>
            <div className={styles.receiptNoteLabel}>Terms</div>
            <div className={styles.receiptNoteText}>
              This is a cart summary only and does not constitute proof of payment or a confirmed booking.
            </div>
          </div>
        </div>

        <footer className={styles.receiptFooter}>
          <div className={styles.receiptFooterLeft}>
            <strong>{siteContent?.systemName || 'La Visionario'}</strong> — Thank you for your interest in our services.
          </div>
          <div className={styles.receiptFooterRight}>
            Printed: {new Date().toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' })}
          </div>
        </footer>

      </div>

      {/* ── Hero Header ── */}
      <header className={styles.hero}>
        <div className={styles.heroInner}>
          <nav className={styles.breadcrumb} aria-label="Breadcrumb">
            <Link href="/" className={styles.crumb}>Home</Link>
            <span className={styles.slash}>/</span>
            <Link href="/shop" className={styles.crumb}>Services</Link>
            <span className={styles.slash}>/</span>
            <span className={styles.crumbActive}>Shopping Cart</span>
          </nav>
          <h1 className={styles.heroTitle}>
            {isEmpty ? 'Your Cart' : `Your Cart (${rows.length} item${rows.length !== 1 ? 's' : ''})`}
          </h1>
        </div>
      </header>

      {/* ── Content ── */}
      <div className={styles.content}>

        {isEmpty ? (
          /* ── Empty State ── */
          <div className={styles.emptySection}>
            <div className={styles.emptyIcon}>
              <svg viewBox="0 0 48 48" width="44" height="44" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 6h4l5 22h22l4-16H13" />
                <circle cx="18" cy="38" r="2.5" fill="currentColor" stroke="none" />
                <circle cx="32" cy="38" r="2.5" fill="currentColor" stroke="none" />
              </svg>
            </div>
            <h2 className={styles.emptyTitle}>Your cart is empty</h2>
            <p className={styles.emptySub}>Add packages or services to see them here.</p>
            {!user && (
              <p className={styles.emptySub} style={{ marginTop: 8 }}>
                <Link href={`/buyer/login?redirect=${encodeURIComponent('/cart')}`} className={styles.emptyLink} style={{ display: 'inline' }}>
                  Sign in as a buyer
                </Link>{' '}
                to sync your cart across devices.
              </p>
            )}
            <Link href="/shop" className={styles.emptyLink}>Browse Services</Link>
          </div>
        ) : (
          <>
            {/* ── LEFT: Products Table ── */}
            <div className={styles.productsSection}>

              {/* Table Header */}
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
                <span>Service / Package</span>
                <span>Price</span>
                <span>Quantity</span>
                <span>Subtotal</span>
                <span />
              </div>

              {/* Bulk Action Bar */}
              {selected.size > 0 && (
                <div className={styles.bulkBar}>
                  <span className={styles.bulkCount}>
                    {selected.size} item{selected.size > 1 ? 's' : ''} selected
                  </span>
                  <button type="button" className={styles.bulkDeleteBtn} onClick={removeSelected}>
                    <svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M2 4h12M5 4V3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1M6 7v5M10 7v5M3 4l1 9h8l1-9" />
                    </svg>
                    Remove selected
                  </button>
                </div>
              )}

              {/* Item Rows */}
              {rows.map((row) => (
                <CartItemRow
                  key={row.id}
                  row={row}
                  isSelected={selected.has(row.id)}
                  onToggle={() => toggleItem(row.id)}
                  onUpdateQty={(val) => updateQty(row.id, val)}
                  onRemove={() => removeItem(row.id)}
                  qtyEdit={qtyEdits[row.id]}
                  onQtyEdit={(val) => setQtyEdits((prev) => ({ ...prev, [row.id]: val }))}
                  styles={styles}
                />
              ))}

              {/* Update Cart Footer */}
              <div className={styles.updateWrap}>
                <button
                  type="button"
                  className={styles.updateBtn}
                  onClick={async () => {
                    const entries = Object.entries(qtyEdits)
                    for (const [id, val] of entries) {
                      const num = parseInt(val, 10)
                      if (!isNaN(num) && num >= 1) await updateQty(id, num)
                    }
                    setQtyEdits({})
                  }}
                >
                  Update Cart
                </button>
              </div>

              {/* Coupon */}
              <div className={styles.couponSection}>
                <input
                  type="text"
                  className={styles.couponInput}
                  placeholder="Enter coupon code…"
                  value={coupon}
                  onChange={(e) => setCoupon(e.target.value)}
                  aria-label="Coupon code"
                />
                <button
                  type="button"
                  className={styles.applyCouponBtn}
                  onClick={() => {
                    if (coupon.trim().toLowerCase() === 'vision10') setCouponApplied(true)
                  }}
                >
                  Apply Coupon
                </button>
                {couponApplied && (
                  <span style={{ fontSize: 12, color: '#2d7a4f', fontFamily: 'Lato, sans-serif', fontWeight: 600 }}>
                    ✓ 10% discount applied
                  </span>
                )}
              </div>

              {/* Disclaimer */}
              <div className={styles.disclaimerSection}>
                <h4 className={styles.disclaimerTitle}>Note</h4>
                <p className={styles.disclaimerText}>
                  All orders are subject to verification by our sales team. A representative may reach out to confirm your booking date, service details, and other arrangements prior to final confirmation.
                </p>
              </div>
            </div>

            {/* ── RIGHT: Totals ── */}
            <aside className={styles.totalsSection}>
              <h2 className={styles.totalsTitle}>
                {selected.size > 0 ? 'Selected Totals' : 'Cart Totals'}
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
                    <td>{formatPhpAmount(subtotal)}</td>
                  </tr>
                  {couponApplied && (
                    <tr>
                      <th>Discount (10%)</th>
                      <td style={{ color: '#2d7a4f' }}>− {formatPhpAmount(discount)}</td>
                    </tr>
                  )}
                  <tr className={styles.totalRow}>
                    <th>Total</th>
                    <td>{formatPhpAmount(total)}</td>
                  </tr>
                </tbody>
              </table>

              <div className={styles.actions}>
                <button type="button" className={styles.printBtn} onClick={() => window.print()}>
                  <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 7 }}>
                    <rect x="3" y="1" width="10" height="7" rx="1" />
                    <path d="M3 9H1v5h14V9h-2" />
                    <rect x="3" y="11" width="10" height="4" rx="1" />
                    <circle cx="13" cy="11" r="0.6" fill="currentColor" stroke="none" />
                  </svg>
                  Print Invoice
                </button>
                <Link
                  href={checkoutHref}
                  className={styles.checkoutBtn}
                  style={{ textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, textDecoration: 'none' }}
                >
                  <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 1h2l1.5 7.5h8l1.5-5H4.5" />
                    <circle cx="7" cy="13.5" r="1" fill="currentColor" stroke="none" />
                    <circle cx="12" cy="13.5" r="1" fill="currentColor" stroke="none" />
                  </svg>
                  {selected.size > 0
                    ? `Book Now (${selected.size} item${selected.size > 1 ? 's' : ''})`
                    : 'Proceed to Checkout'}
                </Link>
                <Link
                  href="/shop"
                  style={{
                    textAlign: 'center',
                    display: 'block',
                    padding: '11px 20px',
                    border: '1.5px solid rgba(16,40,32,0.14)',
                    borderRadius: 4,
                    fontSize: 13,
                    fontWeight: 600,
                    fontFamily: 'Lato, sans-serif',
                    color: 'rgba(16,40,32,0.55)',
                    textDecoration: 'none',
                    transition: 'color 0.2s, border-color 0.2s',
                  }}
                >
                  Continue Browsing
                </Link>
              </div>

              {/* Trust badges */}
              <div style={{
                marginTop: 20,
                paddingTop: 18,
                borderTop: '1px solid rgba(16,40,32,0.07)',
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="var(--color-gold-base,#B8962E)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                    <path d="M8 1L2 4v4c0 3.3 2.5 6.4 6 7.3 3.5-.9 6-4 6-7.3V4L8 1z" />
                    <path d="M5.5 8l2 2 3-3" />
                  </svg>
                  <span style={{ fontSize: 12, color: '#888', fontFamily: 'Lato, sans-serif' }}>Secure &amp; verified booking</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="var(--color-gold-base,#B8962E)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                    <rect x="2" y="2" width="12" height="13" rx="1.5" />
                    <path d="M5 2V1M11 2V1M2 6h12" />
                    <path d="M5 9h1M8 9h1M11 9h1M5 12h1M8 12h1" />
                  </svg>
                  <span style={{ fontSize: 12, color: '#888', fontFamily: 'Lato, sans-serif' }}>Confirmation within 24 hours</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="var(--color-gold-base,#B8962E)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                    <path d="M14 10.7c0 .7-.6 1.3-1.3 1.3H4L1 15V3.3C1 2.6 1.6 2 2.3 2h10.4C13.4 2 14 2.6 14 3.3v7.4z" />
                  </svg>
                  <span style={{ fontSize: 12, color: '#888', fontFamily: 'Lato, sans-serif' }}>Dedicated concierge support</span>
                </div>
              </div>
            </aside>
          </>
        )}
      </div>
    </section>
  )
}

// ─── CartItemRow ─────────────────────────────────────────────────────────────
function CartItemRow({ row, isSelected, onToggle, onUpdateQty, onRemove, qtyEdit, onQtyEdit, styles }) {
  return (
    <div className={`${styles.itemRow} ${isSelected ? styles.itemRowSelected : ''}`}>

      {/* Checkbox */}
      <div className={styles.itemCheck}>
        <input
          type="checkbox"
          className={styles.checkbox}
          checked={isSelected}
          onChange={onToggle}
          aria-label={`Select ${row.name}`}
        />
      </div>

      {/* Product */}
      <div className={styles.itemProduct}>
        <div className={styles.thumbWrap}>
          {row.img && (row.img.startsWith('http') || row.img.startsWith('/')) ? (
            <Image
              src={row.img}
              alt=""
              width={76}
              height={76}
              className={styles.thumb}
              unoptimized={row.img.startsWith('blob:')}
            />
          ) : (
            <div
              className={styles.thumb}
              style={{
                background: 'linear-gradient(135deg, #EDE8E0 0%, #D5CCBC 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <span style={{
                fontSize: 22,
                fontFamily: 'Cormorant Garamond, serif',
                fontWeight: 600,
                color: 'var(--color-green, #102820)',
                opacity: 0.45,
                lineHeight: 1,
              }}>
                {row.providerInitial}
              </span>
            </div>
          )}
        </div>
        <div className={styles.productInfo}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 3, flexWrap: 'wrap' }}>
            {row.badge && (
              <span style={{
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: 0.5,
                textTransform: 'uppercase',
                color: 'var(--color-gold-base, #B8962E)',
                background: 'rgba(184,150,46,0.1)',
                border: '1px solid rgba(184,150,46,0.22)',
                borderRadius: 100,
                padding: '2px 8px',
                fontFamily: 'Lato, sans-serif',
                flexShrink: 0,
              }}>
                {row.badge}
              </span>
            )}
          </div>
          <h3 className={styles.productName}>{row.name}</h3>
          {row.description && (
            <p className={styles.productDesc}>{row.description}</p>
          )}
          {/* Provider mini row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
            <div style={{
              width: 20,
              height: 20,
              borderRadius: '50%',
              background: 'var(--color-green, #102820)',
              color: '#fff',
              fontSize: 10,
              fontWeight: 700,
              fontFamily: 'Cormorant Garamond, serif',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}>
              {row.providerInitial}
            </div>
            <span style={{ fontSize: 12, color: '#888', fontFamily: 'Lato, sans-serif' }}>{row.provider}</span>
            {row.rating != null && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 2, marginLeft: 4 }}>
              <svg width="10" height="10" viewBox="0 0 12 12" fill="var(--color-gold-base, #B8962E)">
                <path d="M6 1l1.35 2.73L10.5 4.2l-2.25 2.19.53 3.1L6 7.9l-2.78 1.6.53-3.1L1.5 4.2l3.15-.47z" />
              </svg>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-green, #102820)', fontFamily: 'Lato, sans-serif' }}>
                {row.rating}
              </span>
            </span>
            )}
          </div>
        </div>
      </div>

      {/* Price */}
      <div className={styles.itemPrice} data-label="Price">
        {row.price > 0
          ? formatPhpAmount(row.price)
          : <span className={styles.contactBadge}>Contact us</span>
        }
      </div>

      {/* Qty */}
      <div className={styles.itemQty} data-label="Qty">
        <div className={styles.qtyControl}>
          <button
            type="button"
            className={styles.qtyBtn}
            onClick={() => onUpdateQty(Math.max(1, (qtyEdit ?? row.qty) - 1))}
            aria-label="Decrease quantity"
          >−</button>
          <input
            type="number"
            min={1}
            className={styles.qtyInput}
            value={qtyEdit ?? row.qty}
            onChange={(e) => onQtyEdit(e.target.value === '' ? '' : parseInt(e.target.value, 10))}
            onBlur={(e) => {
              const num = parseInt(e.target.value, 10)
              if (!isNaN(num) && num >= 1) onUpdateQty(num)
              else onQtyEdit(undefined)
            }}
          />
          <button
            type="button"
            className={styles.qtyBtn}
            onClick={() => onUpdateQty((qtyEdit ?? row.qty) + 1)}
            aria-label="Increase quantity"
          >+</button>
        </div>
      </div>

      {/* Subtotal */}
      <div className={styles.itemSubtotal} data-label="Subtotal">
        {row.price > 0 ? formatPhpAmount(row.subtotal) : '—'}
      </div>

      {/* Remove */}
      <div className={styles.itemRemove}>
        <button
          type="button"
          className={styles.removeBtn}
          onClick={onRemove}
          aria-label={`Remove ${row.name}`}
        >
          <svg viewBox="0 0 14 14" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M2 2l10 10M12 2L2 12" />
          </svg>
        </button>
      </div>

    </div>
  )
}