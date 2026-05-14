"use client"

import Link from "next/link"
import { useSearchParams } from "next/navigation"
import styles from "../checkout.module.css"
import { useCheckoutPaymentStatus } from "@/lib/checkout/useCheckoutPaymentStatus"

export default function CheckoutSuccessPage() {
  const searchParams = useSearchParams()
  const paymentId = searchParams.get("payment")
  const { status, settled, loading, error } = useCheckoutPaymentStatus(paymentId)

  const confirming = Boolean(paymentId) && loading
  const confirmed = !paymentId || (settled && status === "paid")
  const failed = settled && status === "failed"

  return (
    <main className={styles.checkoutPage}>
      <section className={styles.content}>
        <div className={styles.successWrap}>
          <div className={styles.successCard}>
            <div className={styles.successBadge} aria-hidden="true">
              <svg viewBox="0 0 20 20" width="18" height="18" fill="none">
                <path
                  d="M16.5 6.2L8.6 14.1L3.6 9.2"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>

            <div className={styles.successHeader}>
              <h2 className={styles.successTitle}>
                {confirming ? "Confirming payment" : failed ? "Payment not completed" : "You’re all set"}
              </h2>
              <p className={styles.successSubtitle}>
                {error
                  ? error
                  : confirming
                    ? "We’re waiting for PayMongo to confirm your payment. This usually takes a few seconds."
                    : failed
                      ? "Your payment did not complete. You can retry from your purchases page."
                      : "We’ve received your payment. A coordinator will reach out to confirm schedule and arrangements."}
              </p>
            </div>

            {paymentId ? (
              <div className={styles.successMeta}>
                <span className={styles.successMetaLabel}>Reference</span>
                <span className={styles.successMetaValue}>{paymentId}</span>
              </div>
            ) : null}

            {confirmed && !failed ? (
              <div className={styles.successSteps}>
                {[
                  { title: "Provider notified", desc: "We’ll forward your booking details to the provider(s)." },
                  { title: "Provider confirmation", desc: "They’ll confirm your booking next; scheduling and specifics follow from there." },
                  { title: "Ready to manage", desc: "Track everything anytime from your purchases page." },
                ].map((s) => (
                  <div key={s.title} className={styles.successStep}>
                    <div className={styles.successStepDot} aria-hidden="true" />
                    <div className={styles.successStepBody}>
                      <p className={styles.successStepTitle}>{s.title}</p>
                      <p className={styles.successStepDesc}>{s.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}

            <div className={styles.successActions}>
              <Link href="/profile/purchases" className={styles.successPrimaryBtn}>
                View purchases
              </Link>
              <Link href="/shop" className={styles.successSecondaryBtn}>
                Continue browsing
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
