'use client'

import Link from 'next/link'
import Image from 'next/image'
import { use, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getServiceById, LISTINGS, PROVIDERS, SERVICES, REVIEWS, getReviewsByServiceId } from '../data'
import { useCart } from '@/contexts/CartContext'
import { useAuth } from '@/contexts/AuthContext'
import styles from './detail.module.css'

export default function ServiceDetailPage({ params }) {
  const { id } = use(params)
  const service = getServiceById(id)
  const { addItem } = useCart()
  const { user, authLoading, isBuyer } = useAuth()
  const router = useRouter()
  const listingsForService = service ? LISTINGS.filter((l) => l.serviceId === service.id) : []
  const [selectedListingId, setSelectedListingId] = useState(listingsForService[0]?.id ?? '')
  const [quantity, setQuantity] = useState(1)
  const [addedMessage, setAddedMessage] = useState(false)
  const [addError, setAddError] = useState(null)

  useEffect(() => {
    setSelectedListingId(listingsForService[0]?.id ?? '')
  }, [id])

  const selectedListing = listingsForService.find((l) => l.id === selectedListingId)
  const provider = selectedListing ? PROVIDERS.find((p) => p.id === selectedListing.providerId) : null

  const handleAddToCart = async () => {
    if (!selectedListing || !service) return
    setAddError(null)

    if (!user) {
      const target = `/shop/${id}`
      router.push(`/buyer/login?redirect=${encodeURIComponent(target)}`)
      return
    }
    if (!isBuyer) {
      router.push(`/buyer/login?redirect=${encodeURIComponent(`/shop/${id}`)}`)
      return
    }

    const { error } = await addItem({
      id: selectedListing.id,
      name: selectedListing.name,
      img: service.image,
      price: selectedListing.price,
      description: provider
        ? `${provider.name} · ${selectedListing.inclusions?.[0] ?? ''}`
        : selectedListing.inclusions?.[0] ?? '',
      qty: quantity,
    })
    if (error) {
      setAddError(error.message || 'Could not add to cart')
      return
    }
    setAddedMessage(true)
    setTimeout(() => setAddedMessage(false), 2000)
  }

  if (!service) {
    return (
      <section className={styles.detailPage}>
        <div className={styles.content}>
          <div className={styles.notFound}>
            <h1 className={styles.notFoundTitle}>Service not found</h1>
            <p className={styles.notFoundText}>
              The service you are looking for does not exist or has been removed.
            </p>
            <Link href="/shop" className={styles.notFoundLink}>
              ← Back to Shop
            </Link>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className={styles.detailPage}>
      {/* Main content area */}
      <div className={styles.content}>
        <article className={styles.card}>
          {/* ── LEFT: Image gallery ── */}
          <div className={styles.galleryCol}>
            <div className={styles.mainImageWrap}>
              {/* Mobile back button */}
              <Link href="/shop" className={styles.mobileBackBtn} aria-label="Back to shop">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 12H5M12 5l-7 7 7 7"/>
                </svg>
              </Link>
              <Image
                src={service.image}
                alt={service.name}
                fill
                sizes="(max-width: 800px) 100vw, 480px"
                priority
                className={styles.mainImage}
              />
            </div>
            {/* Thumbnail strip — uses service.gallery if available, else repeats main image */}
            <div className={styles.thumbStrip}>
              {(service.gallery || [service.image, service.image, service.image, service.image]).map(
                (src, i) => (
                  <div
                    key={i}
                    className={`${styles.thumb} ${i === 0 ? styles.thumbActive : ''}`}
                  >
                    <Image
                      src={src}
                      alt={`${service.name} view ${i + 1}`}
                      fill
                      sizes="80px"
                      className={styles.thumbImg}
                    />
                  </div>
                ),
              )}
            </div>

            {/* ── Save + Share row ── */}
            <div className={styles.galleryMeta}>
              <button className={styles.btnSaveGallery} aria-label="Save to wishlist">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                </svg>
                Save
              </button>
              <div className={styles.shareRow}>
                <span className={styles.shareLabel}>Share</span>
                {/* Facebook */}
                <a href="#" className={styles.shareIcon} aria-label="Share on Facebook" target="_blank" rel="noopener noreferrer">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
                </a>
                {/* X / Twitter */}
                <a href="#" className={styles.shareIcon} aria-label="Share on X" target="_blank" rel="noopener noreferrer">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.747l7.73-8.835L1.254 2.25H8.08l4.253 5.622 5.911-5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                </a>
                {/* WhatsApp */}
                <a href="#" className={styles.shareIcon} aria-label="Share on WhatsApp" target="_blank" rel="noopener noreferrer">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/></svg>
                </a>
                {/* Pinterest */}
                <a href="#" className={styles.shareIcon} aria-label="Share on Pinterest" target="_blank" rel="noopener noreferrer">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.373 0 0 5.373 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738a.36.36 0 0 1 .083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.632-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0z"/></svg>
                </a>
                {/* Copy link */}
                <button className={styles.shareIcon} aria-label="Copy link">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                </button>
              </div>
            </div>
          </div>

          {/* ── RIGHT: Product details ── */}
          <div className={styles.body}>
            {/* Title */}
            <h2 className={styles.title}>{service.name}</h2>

            {/* Ratings row */}
            <div className={styles.ratingsRow}>
              <span className={styles.stars}>★★★★★</span>
              <span className={styles.ratingScore}>4.9</span>
              <span className={styles.ratingCount}>· 42 reviews</span>
              <span className={styles.stockBadge}>In Stock</span>
            </div>

            {/* Price */}
            <div className={styles.priceRow}>
              <span className={styles.price}>
                {selectedListing?.price != null
                  ? `₱${Number(selectedListing.price).toLocaleString()}`
                  : '₱ Contact for pricing'}
              </span>
              {service.priceNote && <span className={styles.priceNote}>{service.priceNote}</span>}
            </div>

            {/* Short description — 2–3 lines max */}
            <p className={styles.shortDesc}>
              {service.shortDescription ||
                `A thoughtfully curated memorial service that honors your loved one with grace, 
                 dignity, and compassion — guiding your family through every step of the process.`}
            </p>

            {/* Divider */}
            <hr className={styles.divider} />

            {/* Attributes table */}
            <dl className={styles.attributes}>
              <div className={styles.attrRow}>
                <dt className={styles.attrLabel}>Type</dt>
                <dd className={styles.attrValue}>{service.type || 'Funeral Package'}</dd>
              </div>
              <div className={styles.attrRow}>
                <dt className={styles.attrLabel}>Category</dt>
                <dd className={styles.attrValue}>{service.category || 'Memorial Service'}</dd>
              </div>
              <div className={styles.attrRow}>
                <dt className={styles.attrLabel}>Duration</dt>
                <dd className={styles.attrValue}>{service.duration || '3–5 Days'}</dd>
              </div>
              <div className={styles.attrRow}>
                <dt className={styles.attrLabel}>Coverage</dt>
                <dd className={styles.attrValue}>{service.coverage || 'Metro Manila'}</dd>
              </div>
            </dl>

            {/* Size / Quantity selectors */}
            <div className={styles.selectors}>
              <div className={styles.selectorGroup}>
                <label className={styles.selectorLabel}>Package</label>
                <select
                  className={styles.select}
                  value={selectedListingId}
                  onChange={(e) => setSelectedListingId(e.target.value)}
                >
                  {listingsForService.map((listing) => (
                    <option key={listing.id} value={listing.id}>
                      {listing.name}
                    </option>
                  ))}
                  {listingsForService.length === 0 && (
                    <option value="">Select package</option>
                  )}
                </select>
              </div>
              <div className={styles.selectorGroup}>
                <label className={styles.selectorLabel}>Quantity</label>
                <div className={styles.qtyControl}>
                  <button
                    className={styles.qtyBtn}
                    type="button"
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  >
                    −
                  </button>
                  <span className={styles.qtyValue}>{quantity}</span>
                  <button
                    className={styles.qtyBtn}
                    type="button"
                    onClick={() => setQuantity((q) => q + 1)}
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className={styles.actions}>
              <button className={styles.btnBookNow}>Book Now</button>
              <div className={styles.cartSaveRow}>
                <button
                  className={styles.btnAddToCart}
                  onClick={handleAddToCart}
                  disabled={!selectedListing || authLoading}
                >
                  {addedMessage ? 'Added to cart' : user && !isBuyer ? 'Log in as buyer to add to cart' : 'Add to Cart'}
                </button>
              </div>
            </div>
            {addError && (
              <p className={styles.tabText} style={{ color: 'var(--color-error, #b91c1c)', marginTop: '0.5rem' }}>
                {addError}
              </p>
            )}
          </div>
        </article>

        {/* ── PROVIDER CARD ── */}
        {provider && <ProviderCard provider={provider} styles={styles} />}

        {/* ── BELOW THE FOLD: Full description (tabbed) ── */}
        <FullDescriptionSection service={service} styles={styles} allServices={SERVICES} />

        {/* ── REVIEWS: Separate box ── */}
        <ReviewsSection reviews={getReviewsByServiceId(service.id)} styles={styles} />
      </div>

      {/* ── MOBILE STICKY ACTION BAR ── */}
      <div className={styles.mobileActionBar}>
        {/* Chat Now — opens provider chat if provider exists */}
        <button className={styles.mobileActionBarChat} aria-label="Chat Now">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
          Chat
        </button>
        <button
          className={styles.mobileActionBarCart}
          onClick={handleAddToCart}
          disabled={!selectedListing || authLoading}
        >
          {addedMessage ? '✓ Added' : 'Add to Cart'}
        </button>
        <button className={styles.mobileActionBarBook}>
          Book Now
        </button>
      </div>
    </section>
  )
}

/* ─── Tabbed full description below the fold ─── */
/* ─── Time-ago helper ─── */
function timeAgo(dateStr) {
  if (!dateStr) return null
  const now = new Date()
  const past = new Date(dateStr)
  const diffMs = now - past
  const diffMins = Math.floor(diffMs / 60000)
  if (diffMins < 1)  return { text: 'Active just now', isActive: true }
  if (diffMins < 60) return { text: `Active ${diffMins} min${diffMins !== 1 ? 's' : ''} ago`, isActive: true }
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return { text: `Active ${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`, isActive: false }
  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 7)  return { text: `Active ${diffDays} day${diffDays !== 1 ? 's' : ''} ago`, isActive: false }
  const diffWeeks = Math.floor(diffDays / 7)
  if (diffWeeks < 5) return { text: `Active ${diffWeeks} week${diffWeeks !== 1 ? 's' : ''} ago`, isActive: false }
  const diffMonths = Math.floor(diffDays / 30)
  return { text: `Active ${diffMonths} month${diffMonths !== 1 ? 's' : ''} ago`, isActive: false }
}

function FullDescriptionSection({ service, styles, allServices = [] }) {
  const [activeTab, setActiveTab] = useState('description')
  const [expanded, setExpanded] = useState(false)

  // Similar = other services (exclude current)
  const similarServices = allServices.filter((s) => s.id !== service.id).slice(0, 3)

  const tabs = [
    { id: 'description', label: "What's Included" },
    { id: 'who',         label: 'Who This Is For' },
    { id: 'notes',       label: 'Important Notes' },
    { id: 'similar',     label: 'Similar Services' },
  ]

  const isSimilarTab = activeTab === 'similar'

  return (
    <div className={styles.fullDesc}>
      {/* Tab nav */}
      <div className={styles.tabNav}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`${styles.tabBtn} ${activeTab === tab.id ? styles.tabActive : ''}`}
            onClick={() => { setActiveTab(tab.id); setExpanded(false) }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className={styles.tabContent}>
        {!isSimilarTab ? (
          <>
            <div className={`${styles.tabBody} ${expanded ? styles.tabBodyExpanded : ''}`}>
              {activeTab === 'description' && (
                <>
                  <p className={styles.tabText}>
                    This package includes full coordination of the memorial ceremony, a dedicated funeral
                    director to guide your family, preparation and dignified care of the deceased, use of our
                    chapel or designated venue, floral arrangement selections, printed memorial programs, and
                    post-service assistance with documentation.
                  </p>
                  <ul className={styles.featureGrid}>
                    <li>Full ceremony coordination</li>
                    <li>Dedicated funeral director</li>
                    <li>Chapel / venue use</li>
                    <li>Floral arrangements</li>
                    <li>Memorial programs printed</li>
                    <li>Metro Manila transport</li>
                    <li>Administrative assistance</li>
                    <li>Post-service documentation</li>
                  </ul>
                  <table className={styles.specsTable}>
                    <tbody>
                      <tr><td>Display</td><td>Full chapel setup, candle lighting</td></tr>
                      <tr><td>Transportation</td><td>Within Metro Manila (included)</td></tr>
                      <tr><td>Embalming</td><td>Up to 5 days standard</td></tr>
                      <tr><td>Coordinator</td><td>1 dedicated family coordinator</td></tr>
                      <tr><td>Programs</td><td>50 printed memorial booklets</td></tr>
                      <tr><td>Venue Capacity</td><td>Up to 120 guests</td></tr>
                    </tbody>
                  </table>
                </>
              )}
              {activeTab === 'who' && (
                <p className={styles.tabText}>
                  This service is for families who wish to arrange a traditional or contemporary funeral
                  ceremony for a recently departed loved one. Suitable for individuals of any faith or
                  cultural background — our team is experienced in accommodating religious rites, cultural
                  customs, and personal preferences to ensure the service truly honors the individual.
                </p>
              )}
              {activeTab === 'notes' && (
                <p className={styles.tabText}>
                  Prices are indicative and may vary depending on specific requests, chosen add-ons, or
                  venue requirements outside our standard facilities. Out-of-town transport, embalming beyond
                  5 days, and premium casket upgrades are billed separately. All arrangements are subject to
                  availability. A dedicated coordinator will be assigned upon booking.
                </p>
              )}
              {!expanded && <div className={styles.tabFade} />}
            </div>
            <button
              className={styles.seeMoreBtn}
              onClick={() => setExpanded((prev) => !prev)}
              aria-expanded={expanded}
            >
              {expanded ? 'See Less ↑' : 'Read More ↓'}
            </button>
          </>
        ) : (
          /* ── Similar Services tab — no expand/collapse ── */
          <div className={styles.similarWrap}>
            {similarServices.length === 0 ? (
              <p className={styles.tabText}>No other services available at this time.</p>
            ) : (
              <>
                <div className={styles.similarGrid}>
                  {similarServices.map((s) => {
                    const lowestListing = LISTINGS
                      .filter((l) => l.serviceId === s.id)
                      .sort((a, b) => a.price - b.price)[0]
                    return (
                      <Link key={s.id} href={`/shop/${s.id}`} className={styles.similarCard}>
                        <div className={styles.similarImgWrap}>
                          <Image
                            src={s.image}
                            alt={s.name}
                            fill
                            sizes="240px"
                            style={{ objectFit: 'cover' }}
                          />
                        </div>
                        <div className={styles.similarBody}>
                          <p className={styles.similarName}>{s.name}</p>
                          <p className={styles.similarDesc}>{s.description}</p>
                          {lowestListing && (
                            <p className={styles.similarPrice}>
                              From ₱{Number(lowestListing.price).toLocaleString()}
                            </p>
                          )}
                        </div>
                      </Link>
                    )
                  })}
                </div>
                <Link href="/shop" className={styles.similarBrowseBtn}>
                  Browse All Services →
                </Link>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

/* ─── Reviews — separate box ─── */
function ReviewsSection({ reviews = [], styles }) {
  const avgRating = reviews.length
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : null

  return (
    <div className={styles.reviewsBox}>
      <div className={styles.reviewsSectionHeader}>
        <h3 className={styles.reviewsSectionTitle}>
          Customer Reviews
          {reviews.length > 0 && (
            <span className={styles.reviewsSectionCount}>{reviews.length}</span>
          )}
        </h3>
        {avgRating && (
          <div className={styles.reviewsScore}>
            <span className={styles.reviewsScoreNum}>{avgRating}</span>
            <div className={styles.reviewsScoreMeta}>
              <StarRow rating={parseFloat(avgRating)} styles={styles} size={15} />
              <span className={styles.reviewsScoreCount}>{reviews.length} review{reviews.length !== 1 ? 's' : ''}</span>
            </div>
          </div>
        )}
      </div>

      {reviews.length === 0 ? (
        <div className={styles.reviewsEmpty}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={styles.reviewsEmptyIcon}>
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
          <p className={styles.reviewsEmptyTitle}>No reviews yet</p>
          <p className={styles.reviewsEmptyText}>Be the first to share your experience with this service.</p>
        </div>
      ) : (
        <>
          <div className={styles.reviewsBars}>
            {[5, 4, 3, 2, 1].map((star) => {
              const count = reviews.filter((r) => r.rating === star).length
              const pct = Math.round((count / reviews.length) * 100)
              return (
                <div key={star} className={styles.reviewsBarRow}>
                  <span className={styles.reviewsBarLabel}>{star}</span>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="#E8A020" className={styles.reviewsBarStar}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                  <div className={styles.reviewsBarTrack}>
                    <div className={styles.reviewsBarFill} style={{ width: `${pct}%` }} />
                  </div>
                  <span className={styles.reviewsBarCount}>{count}</span>
                </div>
              )
            })}
          </div>
          <div className={styles.reviewsList}>
            {reviews.map((review) => (
              <div key={review.id} className={styles.reviewCard}>
                <div className={styles.reviewHeader}>
                  <div className={styles.reviewAvatar}>{review.author[0].toUpperCase()}</div>
                  <div className={styles.reviewMeta}>
                    <span className={styles.reviewAuthor}>{review.author}</span>
                    <span className={styles.reviewDate}>
                      {new Date(review.date).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })}
                    </span>
                  </div>
                  <StarRow rating={review.rating} styles={styles} size={13} />
                </div>
                {review.title && <p className={styles.reviewTitle}>{review.title}</p>}
                <p className={styles.reviewBody}>{review.body}</p>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

/* ─── Star renderer ─── */
function StarRow({ rating, styles, size = 14 }) {
  return (
    <div className={styles.starRow} aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((s) => {
        const filled = rating >= s
        const half = !filled && rating >= s - 0.5
        return (
          <svg key={s} width={size} height={size} viewBox="0 0 24 24" fill={filled || half ? '#E8A020' : 'none'} stroke="#E8A020" strokeWidth="1.5">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
          </svg>
        )
      })}
    </div>
  )
}
/* ─── Provider card with chat options ─── */
function ProviderCard({ provider, styles }) {
  const [chatOpen, setChatOpen] = useState(false)

  // ── Computed stats from real data ──
  const providerListings = LISTINGS.filter((l) => l.providerId === provider.id)
  const providerReviews  = REVIEWS.filter((r)  => r.providerId === provider.id)

  const avgRating = providerReviews.length
    ? (providerReviews.reduce((sum, r) => sum + r.rating, 0) / providerReviews.length).toFixed(1)
    : provider.rating != null ? provider.rating.toFixed(1) : null

  const reviewCount = providerReviews.length || provider.reviews || 0
  const serviceCount = providerListings.length || provider.products || 0

  // joined: prefer provider.joinedDate (ISO), fallback to provider.joined (string label)
  const joinedText = (() => {
    if (provider.joinedDate) {
      const joined = new Date(provider.joinedDate)
      const now = new Date()
      const diffMs = now - joined
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
      const diffMonths = Math.floor(diffDays / 30)
      const diffYears = Math.floor(diffDays / 365)
      if (diffYears >= 1) return `${diffYears} year${diffYears !== 1 ? 's' : ''} ago`
      if (diffMonths >= 1) return `${diffMonths} month${diffMonths !== 1 ? 's' : ''} ago`
      return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`
    }
    return provider.joined ?? null
  })()

  const yearsInService = (() => {
    if (provider.joinedDate) {
      const years = Math.floor((new Date() - new Date(provider.joinedDate)) / (1000 * 60 * 60 * 24 * 365))
      if (years < 1) return '< 1 year'
      return `${years} year${years !== 1 ? 's' : ''}`
    }
    return provider.yearsInService ?? null
  })()

  const phoneSvg = (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.35 2 2 0 0 1 3.58 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.56a16 16 0 0 0 6.29 6.29l1.62-1.62a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
  )
  const whatsappSvg = (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
  )
  const facebookSvg = (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
  )
  const instagramSvg = (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>
  )
  const emailSvg = (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
  )

  const contacts = []
  if (provider.phone) {
    contacts.push({ label: 'Call / SMS', svgIcon: phoneSvg, href: `tel:${provider.phone}` })
    contacts.push({ label: 'WhatsApp', svgIcon: whatsappSvg, href: `https://wa.me/${provider.phone.replace(/\D/g, '')}` })
  }
  if (provider.facebook) {
    contacts.push({ label: 'Facebook', svgIcon: facebookSvg, href: provider.facebook })
  }
  if (provider.instagram) {
    contacts.push({ label: 'Instagram', svgIcon: instagramSvg, href: provider.instagram })
  }
  if (provider.email) {
    contacts.push({ label: 'Email', svgIcon: emailSvg, href: `mailto:${provider.email}` })
  }
  if (contacts.length === 0) {
    contacts.push({ label: 'Contact Provider', svgIcon: emailSvg, href: '#' })
  }

  return (
    <div className={styles.providerCard}>
      {/* Left: avatar + name + action buttons */}
      <div className={styles.providerInfo}>
        <div className={styles.providerAvatar}>
          {provider.image ? (
            <Image
              src={provider.image}
              alt={provider.name}
              fill
              sizes="52px"
              style={{ objectFit: 'cover' }}
            />
          ) : (
            <span className={styles.providerAvatarFallback}>
              {provider.name?.[0]?.toUpperCase() ?? '?'}
            </span>
          )}
        </div>
        <div className={styles.providerMeta}>
          <span className={styles.providerName}>{provider.name}</span>
          {(provider.lastActive || provider.activeStatus) && (() => {
            const ago = provider.lastActive ? timeAgo(provider.lastActive) : { text: provider.activeStatus, isActive: false }
            return (
              <span className={`${styles.providerStatus} ${ago.isActive ? styles.providerStatusActive : styles.providerStatusInactive}`}>
                <span className={`${styles.providerStatusDot} ${ago.isActive ? styles.providerStatusDotActive : styles.providerStatusDotInactive}`} />
                {ago.text}
              </span>
            )
          })()}
        </div>
        <div className={styles.providerActions}>
          {/* Chat Now */}
          <div className={styles.chatWrap}>
            <button
              className={styles.btnChatNow}
              onClick={() => setChatOpen((o) => !o)}
              aria-expanded={chatOpen}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
              Chat Now
            </button>
            {chatOpen && (
              <>
                <div className={styles.chatBackdrop} onClick={() => setChatOpen(false)} />
                <div className={styles.chatDropdown}>
                  <p className={styles.chatDropdownLabel}>Contact via</p>
                  {contacts.map((c) => (
                    <a
                      key={c.label}
                      href={c.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.chatOption}
                      onClick={() => setChatOpen(false)}
                    >
                      <span className={styles.chatOptionIcon}>{c.svgIcon}</span>
                      {c.label}
                    </a>
                  ))}
                </div>
              </>
            )}
          </div>
          {/* Visit Shop */}
          <Link href={`/providers/${provider.id}`} className={styles.btnVisitShop}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
              <polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
            View Shop
          </Link>
        </div>
      </div>

      {/* Divider */}
      <div className={styles.providerDivider} />

      {/* Right: stats grid */}
      <div className={styles.providerStats}>
        {avgRating != null && (
          <div className={styles.providerStat}>
            <span className={styles.providerStatLabel}>Rating</span>
            <span className={styles.providerStatValue}>
              ★ {avgRating}
              {reviewCount > 0 && (
                <span className={styles.providerStatSub}> ({reviewCount})</span>
              )}
            </span>
          </div>
        )}
        {serviceCount > 0 && (
          <div className={styles.providerStat}>
            <span className={styles.providerStatLabel}>Services</span>
            <span className={styles.providerStatValueNeutral}>{serviceCount}</span>
          </div>
        )}
        {joinedText && (
          <div className={styles.providerStat}>
            <span className={styles.providerStatLabel}>Joined</span>
            <span className={styles.providerStatValueNeutral}>{joinedText}</span>
          </div>
        )}
        {yearsInService && (
          <div className={styles.providerStat}>
            <span className={styles.providerStatLabel}>In Service</span>
            <span className={styles.providerStatValueNeutral}>{yearsInService}</span>
          </div>
        )}
        {provider.responseRate != null && (
          <div className={styles.providerStat}>
            <span className={styles.providerStatLabel}>Response Rate</span>
            <span className={styles.providerStatValueNeutral}>{provider.responseRate}</span>
          </div>
        )}
      </div>
    </div>
  )
}