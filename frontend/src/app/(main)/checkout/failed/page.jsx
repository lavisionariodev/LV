"use client"

import Link from "next/link"
import { useSearchParams } from "next/navigation"
import styles from "../checkout.module.css"

export default function CheckoutFailedPage() {
  const searchParams = useSearchParams()
  const paymentId = searchParams.get("payment")

  return (
    <main className={styles.checkoutPage}>
      <section className={styles.content}>
        <div className={styles.emptyState}>
          <h2 className={styles.emptyTitle}>No charge was made</h2>
          {paymentId && (
            <p className={styles.emptyText}>
              Reference: <strong>{paymentId}</strong>
            </p>
          )}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
            <Link href="/cart" className={styles.primaryLink}>
              Back to cart
            </Link>
            <Link href="/shop" className={styles.primaryLink} style={{ background: "transparent", border: "1px solid rgba(16,40,32,0.18)", color: "rgba(16,40,32,0.8)" }}>
              Browse services
            </Link>
          </div>
        </div>
      </section>
    </main>
  )
}

