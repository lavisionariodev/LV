"use client"

import Link from "next/link"
import { useSearchParams } from "next/navigation"
import styles from "../checkout.module.css"
import { useCheckoutPaymentStatus } from "@/lib/checkout/useCheckoutPaymentStatus"

export default function CheckoutFailedPage() {
  const searchParams = useSearchParams()
  const paymentId = searchParams.get("payment")
  const { status, settled, loading, error } = useCheckoutPaymentStatus(paymentId)

  const pending = Boolean(paymentId) && loading
  const cancelled = !paymentId || (settled && status !== "paid")

  return (
    <main className={styles.checkoutPage}>
      <section className={styles.content}>
        <div className={styles.emptyState}>
          <h2 className={styles.emptyTitle}>
            {pending ? "Checking payment status" : "No charge was made"}
          </h2>
          {paymentId ? (
            <p className={styles.emptyText}>
              Reference: <strong>{paymentId}</strong>
            </p>
          ) : null}
          {error ? (
            <p className={styles.emptyText} style={{ maxWidth: 380, margin: "12px auto 0", lineHeight: 1.5 }}>
              {error}
            </p>
          ) : pending ? (
            <p className={styles.emptyText} style={{ maxWidth: 380, margin: "12px auto 0", lineHeight: 1.5 }}>
              If PayMongo is still open in another tab, finish or close it. We will update your purchases once the
              payment settles.
            </p>
          ) : cancelled ? (
            <p className={styles.emptyText} style={{ maxWidth: 380, margin: "12px auto 0", lineHeight: 1.5 }}>
              You can return to your cart to try again or review purchases for any pending payment.
            </p>
          ) : null}
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
