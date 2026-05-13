'use client'

import { useEffect, useMemo, useState } from 'react'
import { TbStar, TbStarFilled } from 'react-icons/tb'
import styles from './reviews.module.css'

function Stars({ rating }) {
  const rounded = Math.max(0, Math.min(5, Math.round(Number(rating) || 0)))
  return (
    <span className={styles.stars} aria-label={`${rounded} out of 5 stars`}>
      {Array.from({ length: 5 }, (_, i) =>
        i < rounded ? <TbStarFilled key={i} /> : <TbStar key={i} />,
      )}
    </span>
  )
}

export default function SellerReviewsPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [aggregates, setAggregates] = useState({ avgRating: null, reviewCount: 0 })
  const [reviews, setReviews] = useState([])

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError('')
      try {
        const res = await fetch('/api/seller/reviews', { cache: 'no-store' })
        const body = await res.json().catch(() => null)
        if (!res.ok) throw new Error(body?.error || 'Failed to load reviews.')
        if (cancelled) return
        setAggregates(body?.aggregates || { avgRating: null, reviewCount: 0 })
        setReviews(Array.isArray(body?.reviews) ? body.reviews : [])
      } catch (err) {
        if (!cancelled) setError(err?.message || 'Failed to load reviews.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  const summaryLabel = useMemo(() => {
    const count = Number(aggregates?.reviewCount || 0)
    if (count === 0) return 'No buyer reviews yet'
    const avg = aggregates?.avgRating
    return avg != null ? `${avg} average · ${count} review${count === 1 ? '' : 's'}` : `${count} review${count === 1 ? '' : 's'}`
  }, [aggregates])

  return (
    <div className={styles.pageWrap}>
      <section className={styles.summaryCard}>
        <h1 className={styles.title}>Buyer reviews</h1>
        <p className={styles.subtitle}>Read-only feedback from completed bookings on your listings.</p>
        <p className={styles.summaryValue}>{summaryLabel}</p>
      </section>

      {loading ? <p className={styles.stateText}>Loading reviews…</p> : null}
      {error ? <p className={styles.errorText}>{error}</p> : null}

      {!loading && !error && reviews.length === 0 ? (
        <section className={styles.emptyCard}>
          <p className={styles.emptyTitle}>No reviews yet</p>
          <p className={styles.emptyBody}>
            Reviews appear here after buyers rate completed orders. They also show on your public shop profile.
          </p>
        </section>
      ) : null}

      {!loading && !error && reviews.length > 0 ? (
        <section className={styles.listCard}>
          {reviews.map((review) => (
            <article key={review.id} className={styles.reviewRow}>
              <div className={styles.reviewHead}>
                <div>
                  <p className={styles.reviewerName}>{review.reviewerName}</p>
                  <p className={styles.reviewMeta}>
                    {review.date}
                    {review.service ? ` · ${review.service}` : ''}
                  </p>
                </div>
                <Stars rating={review.rating} />
              </div>
              {review.text ? <p className={styles.reviewText}>{review.text}</p> : null}
            </article>
          ))}
        </section>
      ) : null}
    </div>
  )
}
