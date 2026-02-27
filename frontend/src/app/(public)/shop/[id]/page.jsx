'use client'

import Link from 'next/link'
import Image from 'next/image'
import { use, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getServiceById, LISTINGS, PROVIDERS } from '../data'
import { useCart } from '@/contexts/CartContext'
import { getUser } from '@/lib/auth/session'
import styles from './detail.module.css'

export default function ServiceDetailPage({ params }) {
  const { id } = use(params)
  const service = getServiceById(id)
  const { addItem } = useCart()
  const router = useRouter()
  const listingsForService = service ? LISTINGS.filter((l) => l.serviceId === service.id) : []
  const [selectedListingId, setSelectedListingId] = useState(listingsForService[0]?.id ?? '')
  const [quantity, setQuantity] = useState(1)
  const [addedMessage, setAddedMessage] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(null)

  useEffect(() => {
    setSelectedListingId(listingsForService[0]?.id ?? '')
  }, [id])

  const selectedListing = listingsForService.find((l) => l.id === selectedListingId)
  const provider = selectedListing ? PROVIDERS.find((p) => p.id === selectedListing.providerId) : null
  const handleAddToCart = async () => {
    if (!selectedListing || !service) return

    const currentUser = await getUser()
    if (!currentUser) {
      const target = `/shop/${id}`
      router.push(`/buyer/login?redirect=${encodeURIComponent(target)}`)
      return
    }

    await addItem({
      id: selectedListing.id,
      name: selectedListing.name,
      img: service.image,
      price: selectedListing.price,
      description: provider
        ? `${provider.name} · ${selectedListing.inclusions?.[0] ?? ''}`
        : selectedListing.inclusions?.[0] ?? '',
      qty: quantity,
    })
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
      {/* Hero / Breadcrumb */}
      <header className={styles.hero}>
        <div className={styles.heroOverlay} />
        <div className={styles.heroInner}>
          <h1 className={styles.heroTitle}>{service.name}</h1>
          <p className={styles.breadcrumb}>
            <Link href="/" className={styles.crumb}>
              Home
            </Link>
            <span className={styles.slash}>/</span>
            <Link href="/shop" className={styles.crumb}>
              Shop
            </Link>
            <span className={styles.slash}>/</span>
            <span className={styles.crumbActive}>{service.name}</span>
          </p>
        </div>
      </header>

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
            {/* Back link */}
            <Link href="/shop" className={styles.backLink}>
              ← Back to Shop
            </Link>

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
              <button
                className={styles.btnAddToCart}
                onClick={handleAddToCart}
                disabled={!selectedListing}
              >
                {addedMessage ? 'Added to cart' : 'Add to Cart'}
              </button>
              <button className={styles.btnSave} aria-label="Save">
                ♡ Save
              </button>
            </div>
          </div>
        </article>

        {/* ── BELOW THE FOLD: Full description (tabbed) ── */}
        <FullDescriptionSection service={service} styles={styles} />
      </div>
    </section>
  )
}

/* ─── Tabbed full description below the fold ─── */
function FullDescriptionSection({ service, styles }) {
  const [activeTab, setActiveTab] = useState('description')
  const [expanded, setExpanded] = useState(false)

  const tabs = [
    { id: 'description', label: "What's Included" },
    { id: 'who', label: 'Who This Is For' },
    { id: 'notes', label: 'Important Notes' },
    { id: 'similar', label: 'Similar Services' },
  ]

  return (
    <div className={styles.fullDesc}>
      {/* Tab nav */}
      <div className={styles.tabNav}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`${styles.tabBtn} ${activeTab === tab.id ? styles.tabActive : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content with expand/collapse */}
      <div className={styles.tabContent}>
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
                <li>✓ Full ceremony coordination</li>
                <li>✓ Dedicated funeral director</li>
                <li>✓ Chapel / venue use</li>
                <li>✓ Floral arrangements</li>
                <li>✓ Memorial programs printed</li>
                <li>✓ Metro Manila transport</li>
                <li>✓ Administrative assistance</li>
                <li>✓ Post-service documentation</li>
              </ul>
              {/* Specs table */}
              <table className={styles.specsTable}>
                <tbody>
                  <tr>
                    <td>Display</td>
                    <td>Full chapel setup, candle lighting</td>
                  </tr>
                  <tr>
                    <td>Transportation</td>
                    <td>Within Metro Manila (included)</td>
                  </tr>
                  <tr>
                    <td>Embalming</td>
                    <td>Up to 5 days standard</td>
                  </tr>
                  <tr>
                    <td>Coordinator</td>
                    <td>1 dedicated family coordinator</td>
                  </tr>
                  <tr>
                    <td>Programs</td>
                    <td>50 printed memorial booklets</td>
                  </tr>
                  <tr>
                    <td>Venue Capacity</td>
                    <td>Up to 120 guests</td>
                  </tr>
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

          {activeTab === 'similar' && (
            <p className={styles.tabText}>
              Browse our other memorial packages — from intimate private services to full traditional
              ceremonies — all crafted with the same care and compassion. Visit our{' '}
              <Link href="/shop" className={styles.inlineLink}>
                Shop page
              </Link>{' '}
              to explore more.
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
      </div>
    </div>
  )
}

