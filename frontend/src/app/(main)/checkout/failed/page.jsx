"use client"

import Link from "next/link"
import { useSearchParams } from "next/navigation"
import styles from "../checkout.module.css"

export default function CheckoutFailedPage() {
  const searchParams = useSearchParams()
  const paymentId = searchParams.get("payment")
  const hint = searchParams.get("hint")

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
          {hint === "pending" && (
            <p className={styles.emptyText} style={{ maxWidth: 380, margin: "12px auto 0", lineHeight: 1.5 }}>
              Complete PayMongo in the other tab if it is open; then open{" "}
              <Link href="/profile/purchases" style={{ fontWeight: 600, color: "rgba(32,79,56,0.95)", textDecoration: "underline" }}>My purchases</Link>{" "}
              to refresh.
            </p>
          )}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center", marginTop: 18 }}>
            <Link href="/cart" className={styles.primaryLink}>
              Back to cart
            </Link>
            <Link href="/shop" className={styles.primaryLink} style={{ background: "transparent", border: "1px solid rgba(16,40,32,0.18)", color: "rgba(16,40,32,0.8)" }}>
              Browse services
            </Link>
            <Link href="/profile/purchases" className={styles.primaryLink} style={{ background: "transparent", border: "1px solid rgba(16,40,32,0.18)", color: "rgba(16,40,32,0.8)" }}>
              My purchases
            </Link>
          </div>
        </div>
      </section>
    </main>
  )
}
