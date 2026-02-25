'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useState, useMemo } from 'react'
import { SERVICES, CATEGORIES, PROVIDERS, LISTINGS } from './data'
import styles from './services.module.css'

export default function ServicesPage() {
  const [activeCategory, setActiveCategory] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState('popular')
  const [compareIds, setCompareIds] = useState([])

  const filteredListings = useMemo(() => {
    let list = [...LISTINGS]

    if (activeCategory !== 'all') {
      list = list.filter((l) => l.serviceId === activeCategory)
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      list = list.filter((l) => {
        const provider = PROVIDERS.find((p) => p.id === l.providerId)
        return (
          l.name.toLowerCase().includes(q) ||
          provider?.name.toLowerCase().includes(q) ||
          l.inclusions.some((i) => i.toLowerCase().includes(q))
        )
      })
    }

    if (sortBy === 'price-asc') list.sort((a, b) => a.price - b.price)
    else if (sortBy === 'price-desc') list.sort((a, b) => b.price - a.price)
    else if (sortBy === 'rating') {
      list.sort((a, b) => {
        const pa = PROVIDERS.find((p) => p.id === a.providerId)
        const pb = PROVIDERS.find((p) => p.id === b.providerId)
        return (pb?.rating ?? 0) - (pa?.rating ?? 0)
      })
    } else {
      list.sort((a, b) => (b.popular ? 1 : 0) - (a.popular ? 1 : 0))
    }

    return list
  }, [activeCategory, searchQuery, sortBy])

  const grouped = useMemo(() => {
    if (activeCategory !== 'all' || searchQuery.trim()) return null
    const map = {}
    SERVICES.forEach((svc) => {
      const items = filteredListings.filter((l) => l.serviceId === svc.id)
      if (items.length) map[svc.id] = { service: svc, items }
    })
    return map
  }, [filteredListings, activeCategory, searchQuery])

  function toggleCompare(id) {
    setCompareIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : prev.length < 3 ? [...prev, id] : prev
    )
  }

  const isFiltered = activeCategory !== 'all' || !!searchQuery.trim()

  return (
    <section className={styles.servicesPage}>

      {/* ── Hero — unchanged ── */}
      <header className={styles.hero}>
        <div className={styles.heroOverlay} />
        <div className={styles.heroInner}>
          <h1 className={styles.heroTitle}>Our Services</h1>
          <p className={styles.breadcrumb}>
            <Link href="/" className={styles.crumb}>
              Home
            </Link>
            <span className={styles.slash}>/</span>
            <span className={styles.crumbActive}>Services</span>
          </p>
        </div>
      </header>

      <div className={styles.content}>

        {/* ── Intro — unchanged ── */}
        <div className={styles.intro}>
          <h2 className={styles.introTitle}>What we offer</h2>
          <p className={styles.introText}>
            We provide a range of funeral and memorial services to support you and your family with care and respect.
          </p>
        </div>

        {/* ── Search + Sort bar ── */}
        <div className={styles.toolbar}>
          <div className={styles.searchWrap}>
            <svg className={styles.searchIcon} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8">
              <circle cx="9" cy="9" r="6" />
              <path d="M15 15l3 3" strokeLinecap="round" />
            </svg>
            <input
              className={styles.searchInput}
              type="text"
              placeholder="Search services or providers…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button className={styles.searchClear} onClick={() => setSearchQuery('')} aria-label="Clear">
                ×
              </button>
            )}
          </div>
          <div className={styles.sortWrap}>
            <span className={styles.sortLabel}>Sort by</span>
            <select className={styles.sortSelect} value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
              <option value="popular">Most Popular</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
              <option value="rating">Highest Rated</option>
            </select>
          </div>
        </div>

        {/* ── Category pills ── */}
        <div className={styles.catRow}>
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              className={`${styles.catPill}${activeCategory === cat.id ? ` ${styles.catPillActive}` : ''}`}
              onClick={() => setActiveCategory(cat.id)}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* ── Compare bar ── */}
        {compareIds.length > 0 && (
          <div className={styles.compareBar}>
            <div className={styles.compareBarInner}>
              <span className={styles.compareBarLabel}>
                Comparing {compareIds.length} service{compareIds.length > 1 ? 's' : ''}
              </span>
              <div className={styles.compareChips}>
                {compareIds.map((id) => {
                  const listing = LISTINGS.find((l) => l.id === id)
                  return (
                    <span key={id} className={styles.compareChip}>
                      {listing?.name}
                      <button className={styles.compareChipRemove} onClick={() => toggleCompare(id)}>×</button>
                    </span>
                  )
                })}
              </div>
              {compareIds.length >= 2 && (
                <button className={styles.compareBarCta}>View Comparison</button>
              )}
              <button className={styles.compareBarClear} onClick={() => setCompareIds([])}>Clear all</button>
            </div>
          </div>
        )}

        {/* ── Results count ── */}
        {isFiltered && (
          <p className={styles.resultsCount}>
            {filteredListings.length} result{filteredListings.length !== 1 ? 's' : ''}
            {activeCategory !== 'all' ? ` in ${CATEGORIES.find((c) => c.id === activeCategory)?.label}` : ''}
            {searchQuery ? ` for "${searchQuery}"` : ''}
          </p>
        )}

        {/* ── Empty state ── */}
        {filteredListings.length === 0 && (
          <div className={styles.emptyState}>
            <p className={styles.emptyText}>No services match your search.</p>
            <button className={styles.emptyReset} onClick={() => { setSearchQuery(''); setActiveCategory('all') }}>
              Reset filters
            </button>
          </div>
        )}

        {/* ── GROUPED VIEW (default: all categories, no search) ── */}
        {grouped && filteredListings.length > 0 && (
          <div className={styles.groupedView}>
            {Object.values(grouped).map(({ service, items }) => (
              <div key={service.id} className={styles.serviceGroup}>
                <div className={styles.groupHeader}>
                  <div className={styles.groupHeaderLeft}>
                    <h3 className={styles.groupTitle}>{service.name}</h3>
                    <p className={styles.groupDesc}>{service.description}</p>
                  </div>
                  <div className={styles.groupHeaderRight}>
                    <span className={styles.groupCount}>{items.length} provider{items.length !== 1 ? 's' : ''}</span>
                    <Link href={`/services/${service.id}`} className={styles.groupViewAll}>
                      View all →
                    </Link>
                  </div>
                </div>

                <div className={styles.grid}>
                  {items.map((listing) => (
                    <ListingCard
                      key={listing.id}
                      listing={listing}
                      service={service}
                      styles={styles}
                      inCompare={compareIds.includes(listing.id)}
                      onToggleCompare={toggleCompare}
                      compareDisabled={compareIds.length >= 3 && !compareIds.includes(listing.id)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── FLAT VIEW (filtered / searched) ── */}
        {!grouped && filteredListings.length > 0 && (
          <div className={styles.grid}>
            {filteredListings.map((listing) => {
              const service = SERVICES.find((s) => s.id === listing.serviceId)
              return (
                <ListingCard
                  key={listing.id}
                  listing={listing}
                  service={service}
                  styles={styles}
                  inCompare={compareIds.includes(listing.id)}
                  onToggleCompare={toggleCompare}
                  compareDisabled={compareIds.length >= 3 && !compareIds.includes(listing.id)}
                />
              )
            })}
          </div>
        )}

      </div>
    </section>
  )
}

// ─── ListingCard ──────────────────────────────────────────────────────────────
// Reuses .card, .cardImage, .cardBody, .cardTitle, .cardDesc, .cardCta
// New marketplace elements use new classes defined in the CSS module

function ListingCard({ listing, service, styles, inCompare, onToggleCompare, compareDisabled }) {
  const provider = PROVIDERS.find((p) => p.id === listing.providerId)

  return (
    <div className={`${styles.card} ${styles.listingCard}`}>

      {/* Image wrapper with badge overlays */}
      <div className={styles.listingImageWrap}>
        <Image
          src={service?.image ?? '/sample/services/2.jpg'}
          alt={listing.name}
          width={400}
          height={250}
          className={styles.cardImage}
        />
        {listing.popular && <span className={styles.popularBadge}>Most Popular</span>}
        {provider?.badge && (
          <span className={`${styles.providerBadge} ${styles[`badge${provider.badge.replace(' ', '')}`]}`}>
            {provider.badge}
          </span>
        )}
      </div>

      {/* Body — reuses .cardBody */}
      <div className={`${styles.cardBody} ${styles.listingBody}`}>

        {/* Provider row */}
        <div className={styles.providerRow}>
          <div className={styles.providerAvatar}>{provider?.name.charAt(0)}</div>
          <div>
            <p className={styles.providerName}>{provider?.name}</p>
            <p className={styles.providerLocation}>
              <svg viewBox="0 0 12 14" width="9" height="9" fill="var(--color-gold-base, #B8962E)" style={{ marginRight: 3, flexShrink: 0, display: 'inline-block', verticalAlign: 'middle' }}>
                <path d="M6 0a5 5 0 0 1 5 5c0 4.5-5 9-5 9S1 9.5 1 5a5 5 0 0 1 5-5z" />
                <circle cx="6" cy="5" r="1.8" fill="white" />
              </svg>
              {provider?.location}
            </p>
          </div>
          <div className={styles.ratingGroup}>
            <span className={styles.ratingStars}>
              {[1, 2, 3, 4, 5].map((s) => (
                <svg key={s} width="11" height="11" viewBox="0 0 12 12"
                  fill={s <= Math.round(provider?.rating ?? 0) ? 'var(--color-gold-base, #B8962E)' : '#D5CCBC'}>
                  <path d="M6 1l1.35 2.73L10.5 4.2l-2.25 2.19.53 3.1L6 7.9l-2.78 1.6.53-3.1L1.5 4.2l3.15-.47z" />
                </svg>
              ))}
            </span>
            <span className={styles.ratingNum}>{provider?.rating}</span>
            <span className={styles.ratingReviews}>({provider?.reviews})</span>
          </div>
        </div>

        <div className={styles.listingDivider} />

        {/* Service name + price row */}
        <div className={styles.listingTitleRow}>
          {/* reuses .cardTitle */}
          <h3 className={styles.cardTitle}>{listing.name}</h3>
          <div className={styles.priceBlock}>
            <span className={styles.priceLabel}>Starting at</span>
            <span className={styles.price}>₱{listing.price.toLocaleString('en-PH')}</span>
          </div>
        </div>

        {/* Inclusions */}
        <ul className={styles.inclusions}>
          {listing.inclusions.slice(0, 4).map((inc, i) => (
            <li key={i} className={styles.inclusionItem}>
              <svg viewBox="0 0 12 12" width="11" height="11" fill="none"
                stroke="var(--color-gold-base, #B8962E)" strokeWidth="2" strokeLinecap="round"
                style={{ flexShrink: 0, marginTop: 1 }}>
                <path d="M2 6l3 3 5-5" />
              </svg>
              {inc}
            </li>
          ))}
          {listing.inclusions.length > 4 && (
            <li className={styles.inclusionMore}>+{listing.inclusions.length - 4} more inclusions</li>
          )}
        </ul>

        {/* Actions */}
        <div className={styles.cardActions}>
          {/* reuses .cardCta as base, extended via .ctaBtn */}
          <Link href={`/services/${listing.serviceId}`} className={`${styles.cardCta} ${styles.ctaBtn}`}>
            View details →
          </Link>
          <button
            className={`${styles.compareBtn}${inCompare ? ` ${styles.compareBtnActive}` : ''}`}
            onClick={() => onToggleCompare(listing.id)}
            disabled={compareDisabled}
          >
            {inCompare ? '✓ Added' : '+ Compare'}
          </button>
        </div>

      </div>
    </div>
  )
}