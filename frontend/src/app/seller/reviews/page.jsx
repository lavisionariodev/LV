'use client'

import { useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import {
  TbExternalLink,
  TbReceipt,
  TbSearch,
  TbStar,
  TbStarFilled,
} from 'react-icons/tb'
import styles from '../analytics/analytics.module.css'
import reviewStyles from './reviews.module.css'
import SellerPortalSelect from '../products/components/SellerPortalSelect'
import { shouldUseUnoptimizedAvatarSrc } from '@/shared/utils/avatarImage'

const RATING_FILTERS = [
  { id: 'all', label: 'All ratings' },
  { id: '5', label: '5 stars' },
  { id: '4', label: '4 stars' },
  { id: '3', label: '3 stars' },
  { id: '2', label: '2 stars' },
  { id: '1', label: '1 star' },
]

const REVIEW_SUMMARY_SOFT = [
  styles.summaryCardSoftAmber,
  styles.summaryCardSoftGreen,
  styles.summaryCardSoftIndigo,
  styles.summaryCardSoftBlue,
]

function SellerReviewsSkeleton() {
  return (
    <div
      className={styles.pageWrap}
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label="Loading buyer reviews"
    >
      <section className={reviewStyles.summaryStrip} aria-hidden>
        {REVIEW_SUMMARY_SOFT.map((soft, index) => (
          <article key={index} className={`${styles.summaryCard} ${soft}`}>
            <span className={`${styles.analyticsSkBar} ${styles.analyticsSkSummaryLabel}`} />
            <div className={styles.summaryValueRow}>
              <span className={`${styles.analyticsSkBar} ${styles.analyticsSkSummaryValue}`} />
            </div>
            <span className={`${styles.analyticsSkBar} ${styles.analyticsSkSummaryHint}`} />
          </article>
        ))}
      </section>

      <section className={styles.chartCard} aria-hidden>
        <div className={`${styles.chartHeader} ${reviewStyles.chartHeader}`}>
          <div className={styles.chartTitleGroup}>
            <span className={`${styles.analyticsSkBar} ${styles.analyticsSkChartHeadLine}`} />
            <span className={`${styles.analyticsSkBar} ${styles.analyticsSkChartHeadSub}`} />
          </div>
          <div className={`${reviewStyles.toolbar} ${reviewStyles.chartHeaderToolbar}`}>
            <span
              className={styles.analyticsSkBar}
              style={{ height: 38, width: 320, maxWidth: 360, borderRadius: 14, flexShrink: 1 }}
            />
            <span
              className={styles.analyticsSkBar}
              style={{ height: 42, width: 200, borderRadius: 14, flexShrink: 0 }}
            />
          </div>
        </div>

        <div className={reviewStyles.ratingFilters}>
          {Array.from({ length: 6 }, (_, index) => (
            <span
              key={index}
              className={styles.analyticsSkBar}
              style={{ height: 30, width: index === 0 ? 92 : 72, borderRadius: 999 }}
            />
          ))}
        </div>

        <div className={reviewStyles.distribution}>
          {Array.from({ length: 5 }, (_, index) => (
            <div key={index} className={reviewStyles.distributionRow}>
              <span className={styles.analyticsSkBar} style={{ height: 10, width: 28 }} />
              <span className={styles.analyticsSkBar} style={{ height: 8, width: '100%', borderRadius: 999 }} />
              <span className={styles.analyticsSkBar} style={{ height: 10, width: 20, marginLeft: 'auto' }} />
            </div>
          ))}
        </div>

        <div className={reviewStyles.reviewList}>
          {Array.from({ length: 3 }, (_, index) => (
            <article key={index} className={reviewStyles.reviewRow}>
              <div className={reviewStyles.reviewHead}>
                <div className={reviewStyles.reviewerBlock}>
                  <span className={styles.analyticsSkBar} style={{ width: 40, height: 40, borderRadius: 999 }} />
                  <div>
                    <span className={styles.analyticsSkBar} style={{ width: 140, height: 12, marginBottom: 8 }} />
                    <span className={styles.analyticsSkBar} style={{ width: 96, height: 10 }} />
                  </div>
                </div>
                <span className={styles.analyticsSkBar} style={{ width: 88, height: 14 }} />
              </div>
              <span className={styles.analyticsSkBar} style={{ width: '58%', height: 12, marginTop: 14 }} />
              <span className={styles.analyticsSkBar} style={{ width: '42%', height: 10, marginTop: 8 }} />
              <span className={styles.analyticsSkBar} style={{ width: '100%', height: 10, marginTop: 12 }} />
              <span className={styles.analyticsSkBar} style={{ width: '92%', height: 10, marginTop: 8 }} />
              <div className={reviewStyles.reviewActions}>
                <span className={styles.analyticsSkBar} style={{ width: 112, height: 32, borderRadius: 999 }} />
                <span className={styles.analyticsSkBar} style={{ width: 104, height: 32, borderRadius: 999 }} />
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}

function Stars({ rating }) {
  const rounded = Math.max(0, Math.min(5, Math.round(Number(rating) || 0)))
  return (
    <span className={reviewStyles.stars} aria-label={`${rounded} out of 5 stars`}>
      {Array.from({ length: 5 }, (_, i) =>
        i < rounded ? <TbStarFilled key={i} /> : <TbStar key={i} />,
      )}
    </span>
  )
}

function formatAverageRating(value) {
  const avg = Number(value)
  if (!Number.isFinite(avg)) return '—'
  return avg.toFixed(1)
}

function formatRelativeDate(dateIso) {
  const d = new Date(dateIso)
  if (Number.isNaN(d.getTime())) return '—'
  const now = Date.now()
  const diffMs = now - d.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  if (diffDays <= 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 30) return `${diffDays} days ago`
  if (diffDays < 365) {
    const months = Math.floor(diffDays / 30)
    return `${months} month${months === 1 ? '' : 's'} ago`
  }
  const years = Math.floor(diffDays / 365)
  return `${years} year${years === 1 ? '' : 's'} ago`
}

function reviewMatchesSearch(review, rawQuery) {
  const trimmed = String(rawQuery ?? '').trim()
  if (!trimmed) return true
  const tokens = trimmed.toLowerCase().split(/\s+/).filter(Boolean)
  if (tokens.length === 0) return true
  const hay = [
    review.reviewerName,
    review.service,
    review.serviceLabel,
    review.orderDisplayId,
    review.text,
  ]
    .map((x) => String(x ?? '').toLowerCase())
    .join(' ')
  return tokens.every((t) => hay.includes(t))
}


function RatingDistribution({ reviews }) {
  const counts = useMemo(() => {
    const next = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
    for (const review of reviews) {
      const rounded = Math.max(1, Math.min(5, Math.round(Number(review.rating) || 0)))
      next[rounded] += 1
    }
    return next
  }, [reviews])

  const total = reviews.length
  if (total === 0) return null

  return (
    <div className={reviewStyles.distribution} aria-label="Rating distribution">
      {[5, 4, 3, 2, 1].map((stars) => {
        const count = counts[stars]
        const width = total > 0 ? Math.max(4, Math.round((count / total) * 100)) : 0
        return (
          <div key={stars} className={reviewStyles.distributionRow}>
            <span className={reviewStyles.distributionLabel}>{stars}★</span>
            <span className={reviewStyles.distributionTrack} aria-hidden>
              <span className={reviewStyles.distributionFill} style={{ width: `${width}%` }} />
            </span>
            <span className={reviewStyles.distributionCount}>{count}</span>
          </div>
        )
      })}
    </div>
  )
}

function ReviewerAvatar({ review }) {
  const initials = String(review.reviewerInitials || review.reviewerName || 'B')
    .trim()
    .slice(0, 2)
    .toUpperCase()
  const avatarUrl = String(review.reviewerAvatarUrl ?? '').trim()

  if (avatarUrl) {
    return (
      <span className={reviewStyles.avatar}>
        <Image
          src={avatarUrl}
          alt=""
          width={40}
          height={40}
          className={reviewStyles.avatarImage}
          unoptimized={shouldUseUnoptimizedAvatarSrc(avatarUrl)}
        />
      </span>
    )
  }

  return (
    <span className={reviewStyles.avatar} aria-hidden>
      <span className={reviewStyles.avatarFallback}>{initials || 'B'}</span>
    </span>
  )
}

export default function SellerReviewsPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [aggregates, setAggregates] = useState({
    avgRating: null,
    reviewCount: 0,
    reviewsThisMonth: 0,
    topRatedListing: null,
  })
  const [reviews, setReviews] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [ratingFilter, setRatingFilter] = useState('all')
  const [serviceFilter, setServiceFilter] = useState('all')

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
        setAggregates(
          body?.aggregates || {
            avgRating: null,
            reviewCount: 0,
            reviewsThisMonth: 0,
            topRatedListing: null,
          },
        )
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

  const reviewCount = Number(aggregates?.reviewCount || 0)
  const averageLabel = useMemo(() => {
    if (reviewCount === 0) return 'No ratings yet'
    return formatAverageRating(aggregates?.avgRating)
  }, [aggregates?.avgRating, reviewCount])

  const countLabel = useMemo(() => {
    if (reviewCount === 0) return 'Reviews appear after completed bookings'
    return `${reviewCount} review${reviewCount === 1 ? '' : 's'} from buyers`
  }, [reviewCount])

  const reviewsThisMonth = Number(aggregates?.reviewsThisMonth ?? 0)
  const topRatedListing = aggregates?.topRatedListing ?? null

  const reviewsThisMonthHint = useMemo(() => {
    if (reviewCount === 0) return 'No reviews yet'
    return new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  }, [reviewCount])

  const topRatedValue = useMemo(() => {
    if (!topRatedListing) return '—'
    return topRatedListing.label
  }, [topRatedListing])

  const topRatedHint = useMemo(() => {
    if (!topRatedListing) return 'No listing ratings yet'
    return `${formatAverageRating(topRatedListing.avgRating)} average rating`
  }, [topRatedListing])

  const serviceOptions = useMemo(() => {
    const byId = new Map()
    for (const review of reviews) {
      const id = String(review.serviceId ?? '').trim()
      if (!id || byId.has(id)) continue
      byId.set(id, review.serviceLabel || id)
    }
    return [...byId.entries()].map(([id, label]) => ({ id, label }))
  }, [reviews])

  const serviceFilterOptions = useMemo(
    () => [
      { value: 'all', label: 'All services' },
      ...serviceOptions.map((option) => ({ value: option.id, label: option.label })),
    ],
    [serviceOptions],
  )

  const activeServiceFilter = useMemo(() => {
    if (serviceFilter === 'all') return 'all'
    return serviceOptions.some((option) => option.id === serviceFilter) ? serviceFilter : 'all'
  }, [serviceFilter, serviceOptions])

  const filteredReviews = useMemo(() => {
    return reviews.filter((review) => {
      if (!reviewMatchesSearch(review, searchQuery)) return false
      if (ratingFilter !== 'all' && Math.round(Number(review.rating) || 0) !== Number(ratingFilter)) {
        return false
      }
      if (activeServiceFilter !== 'all' && String(review.serviceId ?? '') !== activeServiceFilter) return false
      return true
    })
  }, [reviews, searchQuery, ratingFilter, activeServiceFilter])

  const trimmedQuery = searchQuery.trim()
  const showNoMatches =
    !loading && !error && reviews.length > 0 && filteredReviews.length === 0

  if (loading && !error) {
    return <SellerReviewsSkeleton />
  }

  return (
    <div className={styles.pageWrap}>
      <section className={reviewStyles.summaryStrip} aria-label="Review summary">
        <article className={`${styles.summaryCard} ${styles.summaryCardSoftAmber}`}>
          <p className={styles.summaryLabel}>Average rating</p>
          <div className={styles.summaryValueRow}>
            <p className={styles.summaryValue}>{averageLabel}</p>
          </div>
          <p className={styles.summaryHint}>Across all buyer ratings</p>
        </article>
        <article className={`${styles.summaryCard} ${styles.summaryCardSoftGreen}`}>
          <p className={styles.summaryLabel}>Total reviews</p>
          <div className={styles.summaryValueRow}>
            <p className={styles.summaryValue}>{reviewCount}</p>
          </div>
          <p className={styles.summaryHint}>{countLabel}</p>
        </article>
        <article className={`${styles.summaryCard} ${styles.summaryCardSoftIndigo}`}>
          <p className={styles.summaryLabel}>Reviews this month</p>
          <div className={styles.summaryValueRow}>
            <p className={styles.summaryValue}>{reviewsThisMonth}</p>
          </div>
          <p className={styles.summaryHint}>{reviewsThisMonthHint}</p>
        </article>
        <article className={`${styles.summaryCard} ${styles.summaryCardSoftBlue}`}>
          <p className={styles.summaryLabel}>Top rated listing</p>
          <div className={styles.summaryValueRow}>
            {topRatedListing?.shopHref ? (
              <Link
                href={topRatedListing.shopHref}
                className={`${styles.summaryValue} ${styles.summaryValueCompact} ${reviewStyles.summaryListingHint} ${reviewStyles.summaryListingLink}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                {topRatedValue}
              </Link>
            ) : (
              <p
                className={`${styles.summaryValue} ${styles.summaryValueCompact} ${reviewStyles.summaryListingHint}`}
              >
                {topRatedValue}
              </p>
            )}
          </div>
          <p className={styles.summaryHint}>{topRatedHint}</p>
        </article>
      </section>

      <section className={styles.chartCard} aria-label="Buyer reviews">
        <div className={`${styles.chartHeader} ${reviewStyles.chartHeader}`}>
          <div className={styles.chartTitleGroup}>
            <h2 className={styles.chartTitle}>Recent feedback</h2>
            <p className={styles.chartSubtitle}>
              {filteredReviews.length === reviews.length
                ? 'Newest reviews first'
                : `Showing ${filteredReviews.length} of ${reviews.length} reviews`}
            </p>
          </div>

          {!loading && !error && reviews.length > 0 ? (
            <div className={`${reviewStyles.toolbar} ${reviewStyles.chartHeaderToolbar}`} aria-label="Review filters">
              <form
                className={reviewStyles.searchWrap}
                role="search"
                onSubmit={(event) => {
                  event.preventDefault()
                }}
              >
                <TbSearch className={reviewStyles.searchIcon} size={18} aria-hidden />
                <input
                  type="search"
                  name="q"
                  className={reviewStyles.searchBox}
                  placeholder="Search buyer, listing, order ID, or review text"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  aria-label="Search reviews"
                  autoComplete="off"
                  spellCheck={false}
                />
              </form>

              <SellerPortalSelect
                label="Filter by service"
                value={activeServiceFilter}
                options={serviceFilterOptions}
                onChange={setServiceFilter}
                className={reviewStyles.serviceFilterSlot}
              />
            </div>
          ) : null}
        </div>

        {!loading && !error && reviews.length > 0 ? (
          <>
            <div className={reviewStyles.ratingFilters} aria-label="Filter by rating">
              {RATING_FILTERS.map((filter) => {
                const active = ratingFilter === filter.id
                return (
                  <button
                    key={filter.id}
                    type="button"
                    className={`${reviewStyles.ratingChip} ${active ? reviewStyles.ratingChipActive : ''}`}
                    onClick={() => setRatingFilter(filter.id)}
                    aria-pressed={active}
                  >
                    {filter.label}
                  </button>
                )
              })}
            </div>

            <RatingDistribution reviews={filteredReviews} />
          </>
        ) : null}

        {error ? <p className={styles.pageError}>{error}</p> : null}

        {!loading && !error && reviews.length === 0 ? (
          <p className={styles.chartEmpty}>
            No reviews yet. Reviews appear here after buyers rate completed orders.
          </p>
        ) : null}

        {showNoMatches ? (
          <p className={styles.chartEmpty}>
            {trimmedQuery
              ? 'No reviews match your search or filters. Try different keywords or clear a filter.'
              : 'No reviews match the selected filters.'}
          </p>
        ) : null}

        {!loading && !error && filteredReviews.length > 0 ? (
          <div className={reviewStyles.reviewList}>
            {filteredReviews.map((review) => (
              <article key={review.id} className={reviewStyles.reviewRow}>
                <div className={reviewStyles.reviewHead}>
                  <div className={reviewStyles.reviewerBlock}>
                    <ReviewerAvatar review={review} />
                    <div>
                      <p className={reviewStyles.reviewerName}>{review.reviewerName}</p>
                      <p className={reviewStyles.reviewMeta}>
                        <time dateTime={review.createdAt || undefined} title={review.date}>
                          {formatRelativeDate(review.createdAt)}
                        </time>
                        {review.edited ? <span className={reviewStyles.editedBadge}>Edited</span> : null}
                      </p>
                    </div>
                  </div>
                  <Stars rating={review.rating} />
                </div>

                <div className={reviewStyles.reviewContext} data-mobile-label="Service">
                  {review.service ? (
                    review.shopHref ? (
                      <Link
                        href={review.shopHref}
                        className={reviewStyles.listingLink}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {review.service}
                      </Link>
                    ) : (
                      <p className={reviewStyles.listingLabel}>{review.service}</p>
                    )
                  ) : null}
                  <p className={reviewStyles.serviceMeta}>
                    {review.serviceLabel}
                    {review.orderDisplayId ? ` · Order ${review.orderDisplayId}` : ''}
                  </p>
                </div>

                {review.text ? (
                  <p className={reviewStyles.reviewText} data-mobile-label="Feedback">
                    {review.text}
                  </p>
                ) : null}

                <div className={reviewStyles.reviewActions}>
                  {review.shopHref ? (
                    <Link
                      href={review.shopHref}
                      className={reviewStyles.reviewActionPrimary}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <TbExternalLink size={16} aria-hidden />
                      View listing
                    </Link>
                  ) : null}
                  {review.orderHref ? (
                    <Link href={review.orderHref} className={reviewStyles.reviewActionSecondary}>
                      <TbReceipt size={16} aria-hidden />
                      View order
                    </Link>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        ) : null}
      </section>
    </div>
  )
}
