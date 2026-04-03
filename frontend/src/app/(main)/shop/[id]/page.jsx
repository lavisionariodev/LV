'use client'

import Link from 'next/link'
import Image from 'next/image'
import { use, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getServiceById, LISTINGS, PROVIDERS, SERVICES, getReviewsByServiceId } from '../data'
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
                <button className={styles.btnSave} aria-label="Save">
                  ♡ Save
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
      </div>

      {/* Divider */}
      <div className={styles.providerDivider} />

      {/* Right: stats grid */}
      <div className={styles.providerStats}>
        {provider.ratings != null && (
          <div className={styles.providerStat}>
            <span className={styles.providerStatLabel}>Ratings</span>
            <span className={styles.providerStatValue}>{provider.ratings.toLocaleString()}</span>
          </div>
        )}
        {provider.responseRate != null && (
          <div className={styles.providerStat}>
            <span className={styles.providerStatLabel}>Response Rate</span>
            <span className={styles.providerStatValueNeutral}>{provider.responseRate}</span>
          </div>
        )}
        {provider.joined && (
          <div className={styles.providerStat}>
            <span className={styles.providerStatLabel}>Joined</span>
            <span className={styles.providerStatValue}>{provider.joined}</span>
          </div>
        )}
        {provider.products != null && (
          <div className={styles.providerStat}>
            <span className={styles.providerStatLabel}>Products</span>
            <span className={styles.providerStatValueNeutral}>{provider.products}</span>
          </div>
        )}
        {provider.responseTime && (
          <div className={styles.providerStat}>
            <span className={styles.providerStatLabel}>Response Time</span>
            <span className={styles.providerStatValueNeutral}>{provider.responseTime}</span>
          </div>
        )}
        {provider.followers != null && (
          <div className={styles.providerStat}>
            <span className={styles.providerStatLabel}>Followers</span>
            <span className={styles.providerStatValueNeutral}>{provider.followers.toLocaleString()}</span>
          </div>
        )}
      </div>
    </div>
  )
}