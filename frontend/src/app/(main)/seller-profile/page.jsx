'use client'

import { useState, useMemo } from 'react'
import styles from './seller-profile.module.css'

// ─── Sample Data ──────────────────────────────────────────────────────────────

const SAMPLE_SELLER = {
  id: 'seller-001',
  name: 'Marigold Atelier',
  handle: 'marigoldatelier',
  location: 'Makati City, Metro Manila',
  bio: 'Crafting heirloom-quality floral arrangements and event styling for weddings, celebrations, and intimate gatherings.',
  avatarUrl: null,
  bannerUrl: null,
  badge: 'Top Seller',
  rating: 4.8,
  reviewCount: 124,
  memberSince: 'Jan 2022',
  responseRate: '98%',
  turnaround: '2–3 days',
  specialties: ['Wedding Florals', 'Centrepieces', 'Dried Arrangements', 'Event Styling', 'Bespoke Bouquets'],
  extendedBio:
    'Marigold Atelier was founded by florist Clarisse Santos with a vision of bringing garden-fresh beauty into life\'s most meaningful moments. Each arrangement is hand-crafted using sustainably sourced blooms from local Philippine farms. We believe that flowers are not just decoration — they are emotion made tangible.',
}

const SAMPLE_LISTINGS = [
  {
    id: 'lst-001',
    serviceId: 'svc-florals',
    name: 'Bridal Bouquet — Garden Style',
    price: 3800,
    rating: 4.9,
    inStock: true,
    imageUrl: null,
    createdAt: '2024-11-10',
  },
  {
    id: 'lst-002',
    serviceId: 'svc-florals',
    name: 'Reception Centrepiece (Round)',
    price: 2200,
    rating: 4.7,
    inStock: true,
    imageUrl: null,
    createdAt: '2024-10-22',
  },
  {
    id: 'lst-003',
    serviceId: 'svc-florals',
    name: 'Dried Pampas Arrangement',
    price: 1500,
    rating: 4.6,
    inStock: true,
    imageUrl: null,
    createdAt: '2024-09-15',
  },
  {
    id: 'lst-004',
    serviceId: 'svc-florals',
    name: 'Flower Crown — Fresh Blooms',
    price: 950,
    rating: 4.8,
    inStock: false,
    imageUrl: null,
    createdAt: '2024-08-01',
  },
  {
    id: 'lst-005',
    serviceId: 'svc-florals',
    name: 'Ceremony Arch Dressing',
    price: 12000,
    rating: 5.0,
    inStock: true,
    imageUrl: null,
    createdAt: '2024-07-20',
  },
  {
    id: 'lst-006',
    serviceId: 'svc-florals',
    name: 'Bud Vase Collection (Set of 5)',
    price: 1800,
    rating: 4.5,
    inStock: true,
    imageUrl: null,
    createdAt: '2024-06-05',
  },
]

const SAMPLE_REVIEWS = [
  {
    id: 'rev-001',
    reviewerName: 'Angela Reyes',
    reviewerInitials: 'AR',
    rating: 5,
    date: 'March 2025',
    service: 'Bridal Bouquet — Garden Style',
    text: 'Absolutely stunning work. Clarisse captured exactly the romantic, lush aesthetic I had in mind. My bouquet was the most-photographed part of the whole day!',
  },
  {
    id: 'rev-002',
    reviewerName: 'Marco dela Cruz',
    reviewerInitials: 'MD',
    rating: 5,
    date: 'February 2025',
    service: 'Ceremony Arch Dressing',
    text: 'The arch was breathtaking. Every guest commented on it. Communication was smooth from inquiry to setup. Will definitely book again for our anniversary party.',
  },
  {
    id: 'rev-003',
    reviewerName: 'Sophia Tan',
    reviewerInitials: 'ST',
    rating: 4,
    date: 'January 2025',
    service: 'Reception Centrepiece (Round)',
    text: 'Beautiful centrepieces and very good value. Delivery was slightly delayed but Clarisse kept me updated throughout. Happy with the final result.',
  },
  {
    id: 'rev-004',
    reviewerName: 'Jerome Villanueva',
    reviewerInitials: 'JV',
    rating: 5,
    date: 'December 2024',
    service: 'Dried Pampas Arrangement',
    text: 'Ordered this as a gift and the recipient absolutely loved it. Packaging was secure and the arrangement arrived in perfect shape. 10/10.',
  },
  {
    id: 'rev-005',
    reviewerName: 'Carmela Bautista',
    reviewerInitials: 'CB',
    rating: 5,
    date: 'November 2024',
    service: 'Bud Vase Collection (Set of 5)',
    text: 'Such a charming set! Each vase had its own little character. They look gorgeous on my dining table. Very fast response to all my questions too.',
  },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatPhp(amount) {
  return '₱' + Number(amount).toLocaleString('en-PH', { minimumFractionDigits: 0 })
}

// ─── Star Helper ──────────────────────────────────────────────────────────────

function StarRow({ rating, size = 11 }) {
  return (
    <div className={styles.reviewStars}>
      {[1, 2, 3, 4, 5].map((s) => (
        <svg
          key={s}
          width={size}
          height={size}
          viewBox="0 0 12 12"
          fill={s <= Math.round(rating) ? '#E8A020' : '#ddd'}
        >
          <path d="M6 1l1.35 2.73L10.5 4.2l-2.25 2.19.53 3.1L6 7.9l-2.78 1.6.53-3.1L1.5 4.2l3.15-.47z" />
        </svg>
      ))}
    </div>
  )
}

// ─── Location Pin Icon ────────────────────────────────────────────────────────

function PinIcon() {
  return (
    <svg viewBox="0 0 12 14" width="10" height="10" fill="var(--color-gold-base, #B8962E)" style={{ flexShrink: 0 }}>
      <path d="M6 0a5 5 0 0 1 5 5c0 4.5-5 9-5 9S1 9.5 1 5a5 5 0 0 1 5-5z" />
      <circle cx="6" cy="5" r="1.8" fill="white" />
    </svg>
  )
}

// ─── Seller Profile Page ──────────────────────────────────────────────────────

/**
 * SellerProfilePage
 *
 * Props (all optional — falls back to SAMPLE_* constants when omitted):
 *   seller   – seller object
 *   listings – listing array
 *   reviews  – review array
 */
export default function SellerProfilePage({
  seller   = SAMPLE_SELLER,
  listings = SAMPLE_LISTINGS,
  reviews  = SAMPLE_REVIEWS,
}) {
  const [activeTab, setActiveTab] = useState('listings')
  const [sortBy, setSortBy] = useState('newest')
  const [currentPage, setCurrentPage] = useState(1)
  const ITEMS_PER_PAGE = 9

  const sortedListings = useMemo(() => {
    const list = [...listings]
    if (sortBy === 'price-asc') list.sort((a, b) => a.price - b.price)
    else if (sortBy === 'price-desc') list.sort((a, b) => b.price - a.price)
    else if (sortBy === 'rating') list.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
    else list.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
    return list
  }, [listings, sortBy])

  const totalPages = Math.ceil(sortedListings.length / ITEMS_PER_PAGE)
  const paginatedListings = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE
    return sortedListings.slice(start, start + ITEMS_PER_PAGE)
  }, [sortedListings, currentPage])

  const distribution = useMemo(() => {
    const dist = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
    reviews.forEach((r) => { dist[Math.round(r.rating)] = (dist[Math.round(r.rating)] || 0) + 1 })
    return dist
  }, [reviews])

  function handleTabChange(tab) {
    setActiveTab(tab)
    setCurrentPage(1)
  }

  return (
    <section className={styles.profilePage}>

      {/* ── Banner ── */}
      <div className={styles.banner}>
        {seller?.bannerUrl ? (
          <img src={seller.bannerUrl} alt={`${seller.name} banner`} className={styles.bannerImg} />
        ) : null}
        <div className={styles.bannerOverlay} />
      </div>

      <div className={styles.content}>

        {/* ── Identity Card ── */}
        <div className={styles.identityCard}>
          <div className={styles.avatarWrap}>
            <div className={styles.avatar}>
              {seller?.avatarUrl ? (
                <img src={seller.avatarUrl} alt={seller.name} width={80} height={80} className={styles.avatarImg} />
              ) : (
                (seller?.name || 'S').charAt(0).toUpperCase()
              )}
            </div>
          </div>

          <div className={styles.identityTop}>
            {/* Left — name, handle, location, badges */}
            <div className={styles.identityLeft}>
              <h1 className={styles.storeName}>{seller?.name || 'Seller Name'}</h1>
              <div className={styles.handleRow}>
                {seller?.handle && (
                  <span className={styles.handle}>@{seller.handle}</span>
                )}
                {seller?.badge && (
                  <span className={styles.badgeChip}>{seller.badge}</span>
                )}
                <span className={`${styles.badgeChip} ${styles.verifiedChip}`}>Verified</span>
              </div>
              <div className={styles.locationRow}>
                <PinIcon />
                <span>{seller?.location || 'Philippines'}</span>
              </div>
            </div>

            {/* Right — action buttons */}
            <div className={styles.actionButtons}>
              <button className={styles.btnMessage} type="button">
                <svg viewBox="0 0 16 14" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 1H2a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h3l3 3 3-3h3a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1z" />
                </svg>
                Message
              </button>
              <button className={styles.btnInquire} type="button">
                <svg viewBox="0 0 14 14" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M7 1v6M4 4l3-3 3 3M1 9v2a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V9" />
                </svg>
                Inquire / Book
              </button>
            </div>
          </div>

          {/* Stats row */}
          <div className={styles.statsRow}>
            <div className={styles.statItem}>
              <div className={styles.statValue}>
                <svg width="14" height="14" viewBox="0 0 12 12" fill="#E8A020">
                  <path d="M6 1l1.35 2.73L10.5 4.2l-2.25 2.19.53 3.1L6 7.9l-2.78 1.6.53-3.1L1.5 4.2l3.15-.47z" />
                </svg>
                {seller?.rating ?? '—'}
              </div>
              <div className={styles.statLabel}>Rating</div>
            </div>
            <div className={styles.statItem}>
              <div className={styles.statValue}>{seller?.reviewCount ?? 0}</div>
              <div className={styles.statLabel}>Reviews</div>
            </div>
            <div className={styles.statItem}>
              <div className={styles.statValue}>{listings.length}</div>
              <div className={styles.statLabel}>Listings</div>
            </div>
            <div className={styles.statItem}>
              <div className={styles.statValue}>{seller?.responseRate ?? '—'}</div>
              <div className={styles.statLabel}>Response Rate</div>
            </div>
            <div className={styles.statItem}>
              <div className={styles.statValue}>{seller?.memberSince ?? '—'}</div>
              <div className={styles.statLabel}>Member Since</div>
            </div>
          </div>
        </div>

        {/* ── Bio ── */}
        {seller?.bio && (
          <div className={styles.bioCard}>
            <p className={styles.bioText}>{seller.bio}</p>
          </div>
        )}

        {/* ── Tab Shell ── */}
        <div className={styles.tabShell}>

          {/* Tab Nav */}
          <div className={styles.tabNav} role="tablist">
            {[
              { key: 'listings', label: 'Listings', count: listings.length },
              { key: 'reviews',  label: 'Reviews',  count: reviews.length },
              { key: 'about',    label: 'About',     count: null },
            ].map(({ key, label, count }) => (
              <button
                key={key}
                role="tab"
                aria-selected={activeTab === key}
                className={`${styles.tabBtn}${activeTab === key ? ` ${styles.tabActive}` : ''}`}
                onClick={() => handleTabChange(key)}
                type="button"
              >
                {label}
                {count !== null && (
                  <span className={styles.tabCount}>{count}</span>
                )}
              </button>
            ))}
          </div>

          {/* ── Listings Tab ── */}
          {activeTab === 'listings' && (
            <div className={styles.tabContent} role="tabpanel">
              <div className={styles.listingsToolbar}>
                <p className={styles.listingsCount}>
                  <span className={styles.listingsCountNum}>{sortedListings.length}</span>
                  &nbsp;listing{sortedListings.length !== 1 ? 's' : ''}
                </p>
                <div className={styles.sortWrap}>
                  <span className={styles.sortLabel}>Sort by</span>
                  <select
                    className={styles.sortSelect}
                    value={sortBy}
                    onChange={(e) => { setSortBy(e.target.value); setCurrentPage(1) }}
                    aria-label="Sort listings"
                  >
                    <option value="newest">Newest</option>
                    <option value="price-asc">Price: Low to High</option>
                    <option value="price-desc">Price: High to Low</option>
                    <option value="rating">Top Rated</option>
                  </select>
                </div>
              </div>

              {paginatedListings.length > 0 ? (
                <>
                  <div className={styles.grid}>
                    {paginatedListings.map((listing) => (
                      <ListingCard key={listing.id} listing={listing} styles={styles} />
                    ))}
                  </div>

                  {totalPages > 1 && (
                    <div className={styles.pagination}>
                      <button
                        className={styles.pageBtn}
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        aria-label="Previous page"
                      >
                        <svg viewBox="0 0 8 12" width="7" height="11" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                          <path d="M7 1L1 6l6 5" />
                        </svg>
                      </button>
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                        <button
                          key={p}
                          className={`${styles.pageBtn}${currentPage === p ? ` ${styles.pageBtnActive}` : ''}`}
                          onClick={() => setCurrentPage(p)}
                          aria-current={currentPage === p ? 'page' : undefined}
                        >
                          {p}
                        </button>
                      ))}
                      <button
                        className={styles.pageBtn}
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        aria-label="Next page"
                      >
                        <svg viewBox="0 0 8 12" width="7" height="11" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                          <path d="M1 1l6 5-6 5" />
                        </svg>
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <EmptyState icon="listing" title="No listings yet" text="This seller hasn't published any listings." />
              )}
            </div>
          )}

          {/* ── Reviews Tab ── */}
          {activeTab === 'reviews' && (
            <div className={styles.tabContent} role="tabpanel">
              {reviews.length > 0 ? (
                <>
                  <div className={styles.reviewSummary}>
                    <div className={styles.reviewScore}>
                      <div className={styles.reviewScoreNum}>{seller?.rating ?? '—'}</div>
                      <StarRow rating={seller?.rating ?? 0} size={14} />
                      <div className={styles.reviewScoreLabel}>{reviews.length} reviews</div>
                    </div>

                    <div className={styles.reviewBars}>
                      {[5, 4, 3, 2, 1].map((star) => {
                        const count = distribution[star] || 0
                        const pct = reviews.length ? Math.round((count / reviews.length) * 100) : 0
                        return (
                          <div key={star} className={styles.reviewBarRow}>
                            <span className={styles.reviewBarLabel}>{star}★</span>
                            <div className={styles.reviewBarTrack}>
                              <div className={styles.reviewBarFill} style={{ width: `${pct}%` }} />
                            </div>
                            <span className={styles.reviewBarCount}>{count}</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  <div className={styles.reviewList}>
                    {reviews.map((review) => (
                      <div key={review.id} className={styles.reviewCard}>
                        <div className={styles.reviewHeader}>
                          <div className={styles.reviewerAvatar}>
                            {(review.reviewerInitials || review.reviewerName?.charAt(0) || 'A').toUpperCase()}
                          </div>
                          <div className={styles.reviewerInfo}>
                            <div className={styles.reviewerName}>{review.reviewerName}</div>
                            <div className={styles.reviewMeta}>
                              <StarRow rating={review.rating} size={10} />
                              <span className={styles.reviewDate}>{review.date}</span>
                              {review.service && (
                                <span className={styles.reviewService}>{review.service}</span>
                              )}
                            </div>
                          </div>
                        </div>
                        <p className={styles.reviewText}>{review.text}</p>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <EmptyState icon="star" title="No reviews yet" text="Be the first to review this seller after a purchase." />
              )}
            </div>
          )}

          {/* ── About Tab ── */}
          {activeTab === 'about' && (
            <div className={styles.tabContent} role="tabpanel">
              <div className={styles.aboutGrid}>

                {seller?.extendedBio && (
                  <div className={`${styles.aboutSection} ${styles.aboutSectionFull}`}>
                    <h2 className={styles.aboutHeading}>About the Seller</h2>
                    <p className={styles.aboutBio}>{seller.extendedBio}</p>
                  </div>
                )}

                <div className={styles.aboutSection}>
                  <h2 className={styles.aboutHeading}>Seller Details</h2>
                  <div className={styles.attrTable}>
                    <div className={styles.attrRow}>
                      <span className={styles.attrLabel}>Location</span>
                      <span className={styles.attrValue}>{seller?.location || '—'}</span>
                    </div>
                    <div className={styles.attrRow}>
                      <span className={styles.attrLabel}>Member Since</span>
                      <span className={styles.attrValue}>{seller?.memberSince || '—'}</span>
                    </div>
                    <div className={styles.attrRow}>
                      <span className={styles.attrLabel}>Response Rate</span>
                      <span className={styles.attrValue}>{seller?.responseRate || '—'}</span>
                    </div>
                    <div className={styles.attrRow}>
                      <span className={styles.attrLabel}>Avg. Turnaround</span>
                      <span className={styles.attrValue}>{seller?.turnaround || '—'}</span>
                    </div>
                    <div className={styles.attrRow}>
                      <span className={styles.attrLabel}>Total Reviews</span>
                      <span className={styles.attrValue}>{seller?.reviewCount ?? reviews.length}</span>
                    </div>
                  </div>
                </div>

                {seller?.specialties?.length > 0 && (
                  <div className={styles.aboutSection}>
                    <h2 className={styles.aboutHeading}>Specialties</h2>
                    <div className={styles.specialtiesList}>
                      {seller.specialties.map((s) => (
                        <span key={s} className={styles.specialtyPill}>
                          <svg viewBox="0 0 10 10" width="8" height="8" fill="none" stroke="var(--color-gold-base,#B8962E)" strokeWidth="1.8" strokeLinecap="round">
                            <path d="M2 5l2 2 4-4" />
                          </svg>
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

              </div>
            </div>
          )}

        </div>{/* end tabShell */}
      </div>{/* end content */}
    </section>
  )
}

// ─── ListingCard ──────────────────────────────────────────────────────────────

function ListingCard({ listing, styles }) {
  const [adding, setAdding] = useState(false)

  const handleAddToCart = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (listing.inStock === false) return
    setAdding(true)
    // Simulate async cart add
    setTimeout(() => setAdding(false), 800)
  }

  const href = `/shop/${listing.serviceId}?listing=${encodeURIComponent(listing.id)}`

  return (
    <div className={styles.card}>
      <a href={href} className={styles.cardLink}>
        <div className={styles.cardImageWrap}>
          {listing.imageUrl || (listing.imageUrls && listing.imageUrls[0]) ? (
            <img
              src={listing.imageUrl || listing.imageUrls[0]}
              alt={listing.name}
              width={400}
              height={200}
              className={styles.cardImage}
            />
          ) : (
            <div className={styles.cardImagePlaceholder} aria-hidden />
          )}
          {listing.inStock === false && (
            <span className={styles.outOfStockBadge}>Out of Stock</span>
          )}
        </div>

        <div className={styles.cardBody}>
          <hr className={styles.listingDivider} />
          <div className={styles.listingTitleRow}>
            <h3 className={styles.cardTitle}>{listing.name}</h3>
            <div className={styles.priceBlock}>
              <span className={styles.priceLabel}>From</span>
              <span className={styles.price}>{formatPhp(listing.price)}</span>
            </div>
          </div>
        </div>
      </a>

      <div className={styles.cardActions}>
        <button
          type="button"
          className={styles.ctaBtn}
          onClick={handleAddToCart}
          disabled={adding || listing.inStock === false}
          aria-busy={adding}
        >
          <svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 5, flexShrink: 0 }}>
            <path d="M1 1h2l1.5 7.5h8l1.5-5H4.5" />
            <circle cx="7" cy="13.5" r="1" fill="currentColor" stroke="none" />
            <circle cx="12" cy="13.5" r="1" fill="currentColor" stroke="none" />
          </svg>
          {listing.inStock === false ? 'Out of Stock' : adding ? 'Adding…' : 'Add to Cart'}
        </button>
      </div>
    </div>
  )
}

// ─── EmptyState ───────────────────────────────────────────────────────────────

function EmptyState({ icon, title, text }) {
  const icons = {
    listing: (
      <svg viewBox="0 0 20 20" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
        <rect x="3" y="3" width="14" height="14" rx="2" />
        <path d="M7 7h6M7 10h4" />
      </svg>
    ),
    star: (
      <svg viewBox="0 0 20 20" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
        <path d="M10 2l2.09 4.26L17 7.27l-3.5 3.41.83 4.82L10 13.27l-4.33 2.23.83-4.82L3 7.27l4.91-.71z" />
      </svg>
    ),
  }
  return (
    <div className={styles.emptyState}>
      <div className={styles.emptyIcon}>{icons[icon]}</div>
      <div className={styles.emptyTitle}>{title}</div>
      <p className={styles.emptyText}>{text}</p>
    </div>
  )
}