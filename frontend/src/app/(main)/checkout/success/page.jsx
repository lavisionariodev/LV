"use client"

import Link from "next/link"
import { useSearchParams } from "next/navigation"
import styles from "../checkout.module.css"

export default function CheckoutSuccessPage() {
  const searchParams = useSearchParams()
  const paymentId = searchParams.get("payment")

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
              <h2 className={styles.successTitle}>You’re all set</h2>
              <p className={styles.successSubtitle}>
                We’ve received your payment. A coordinator will reach out to confirm schedule and arrangements.
              </p>
            </div>

            {paymentId && (
              <div className={styles.successMeta}>
                <span className={styles.successMetaLabel}>Reference</span>
                <span className={styles.successMetaValue}>{paymentId}</span>
              </div>
            )}

            <div className={styles.successSteps}>
              {[
                { title: "Provider notified", desc: "We’ll forward your booking details to the provider(s)." },
                { title: "Schedule confirmation", desc: "We’ll confirm your preferred date and service specifics." },
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

