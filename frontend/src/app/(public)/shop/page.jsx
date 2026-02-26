'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useState, useMemo, useEffect } from 'react'
import { SERVICES, CATEGORIES, PROVIDERS, LISTINGS } from './data'
import styles from './shop.module.css'

export default function ShopPage() {
  const [activeCategory, setActiveCategory] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState('popular')
  const [compareIds, setCompareIds] = useState([])
  const [showCompareModal, setShowCompareModal] = useState(false)
  const [compareStep, setCompareStep] = useState('selecting') // 'selecting' | 'ready' | 'viewing'
  const [searchFocused, setSearchFocused] = useState(false)

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

  // Derive comparison data
  const compareListings = useMemo(() => {
    return compareIds
      .map((id) => {
        const listing = LISTINGS.find((l) => l.id === id)
        const provider = PROVIDERS.find((p) => p.id === listing?.providerId)
        const service = SERVICES.find((s) => s.id === listing?.serviceId)
        return { listing, provider, service }
      })
      .filter((x) => x.listing)
  }, [compareIds])

  function toggleCompare(id) {
    setCompareIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id)
      if (prev.length < 3) return [...prev, id]
      return prev
    })
  }

  function handleViewComparison() {
    if (compareIds.length >= 2) {
      setShowCompareModal(true)
    }
  }

  function closeCompareModal() {
    setShowCompareModal(false)
  }

  const isFiltered = activeCategory !== 'all' || !!searchQuery.trim()

  // Compute compare highlights
  const lowestPriceId = useMemo(() => {
    if (compareListings.length < 2) return null
    return compareListings.reduce((a, b) => (a.listing.price <= b.listing.price ? a : b)).listing?.id
  }, [compareListings])

  const highestRatedId = useMemo(() => {
    if (compareListings.length < 2) return null
    return compareListings.reduce((a, b) => ((a.provider?.rating ?? 0) >= (b.provider?.rating ?? 0) ? a : b))
      .listing?.id
  }, [compareListings])

  const mostPopularId = useMemo(() => {
    if (compareListings.length < 2) return null
    const pop = compareListings.find((x) => x.listing.popular)
    return pop?.listing?.id ?? null
  }, [compareListings])

  // Best value = highest inclusions per price ratio
  const bestValueId = useMemo(() => {
    if (compareListings.length < 2) return null
    return compareListings
      .reduce((a, b) => {
        const aScore = (a.listing.inclusions.length / a.listing.price) * (a.provider?.rating ?? 1)
        const bScore = (b.listing.inclusions.length / b.listing.price) * (b.provider?.rating ?? 1)
        return aScore >= bScore ? a : b
      })
      .listing?.id
  }, [compareListings])

  return (
    <section className={styles.servicesPage}>
      {/* ── Hero ── */}
      <header className={styles.hero}>
        <div className={styles.heroOverlay} />
        <div className={styles.heroInner}>
          <h1 className={styles.heroTitle}>Shop</h1>
          <p className={styles.breadcrumb}>
            <Link href="/" className={styles.crumb}>
              Home
            </Link>
            <span className={styles.slash}>/</span>
            <span className={styles.crumbActive}>Shop</span>
          </p>
        </div>
      </header>

      <div className={styles.content}>
        {/* ── Intro ── */}
        <div className={styles.intro}>
          <div className={styles.introRule} />
          <h2 className={styles.introTitle}>What We Offer</h2>
          <p className={styles.introText}>
            We provide a range of funeral and memorial services to support you and your family with care and respect.
          </p>
          <div className={styles.introRule} />
        </div>

        {/* ── Search + Sort bar ── */}
        <div className={styles.toolbar}>
          <div className={`${styles.searchWrap}${searchFocused ? ` ${styles.searchWrapFocused}` : ''}`}>
            <svg className={styles.searchIcon} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8">
              <circle cx="9" cy="9" r="6" />
              <path d="M15 15l3 3" strokeLinecap="round" />
            </svg>
            <input
              className={styles.searchInput}
              type="text"
              placeholder="Search services, providers, or inclusions…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
            />
            {searchQuery && (
              <button
                className={styles.searchClear}
                onClick={() => setSearchQuery('')}
                aria-label="Clear search"
              >
                <svg
                  viewBox="0 0 12 12"
                  width="12"
                  height="12"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                >
                  <path d="M2 2l8 8M10 2l-8 8" />
                </svg>
              </button>
            )}
          </div>
          <div className={styles.sortWrap}>
            <span className={styles.sortLabel}>Sort by</span>
            <select
              className={styles.sortSelect}
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
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
              {activeCategory === cat.id && cat.id !== 'all' && (
                <span className={styles.catPillCount}>{filteredListings.length}</span>
              )}
            </button>
          ))}
        </div>

        {/* ── Compare bar ── */}
        {compareIds.length > 0 && (
          <div className={`${styles.compareBar}${compareIds.length >= 2 ? ` ${styles.compareBarReady}` : ''}`}>
            <div className={styles.compareBarInner}>
              <div className={styles.compareBarLeft}>
                <div className={styles.compareBarIcon}>
                  <svg
                    viewBox="0 0 16 16"
                    width="14"
                    height="14"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                  >
                    <path d="M2 4h12M2 8h8M2 12h10" />
                  </svg>
                </div>
                <div>
                  <span className={styles.compareBarLabel}>
                    {compareIds.length < 2
                      ? `Select ${2 - compareIds.length} more to compare`
                      : `${compareIds.length} service${compareIds.length > 1 ? 's' : ''} ready to compare`}
                  </span>
                  <div className={styles.compareProgress}>
                    {[0, 1, 2].map((i) => (
                      <div
                        key={i}
                        className={`${styles.compareProgressDot}${
                          i < compareIds.length ? ` ${styles.compareProgressDotFilled}` : ''
                        }`}
                      />
                    ))}
                    <span className={styles.compareProgressHint}>max 3</span>
                  </div>
                </div>
              </div>

              <div className={styles.compareChips}>
                {compareIds.map((id) => {
                  const listing = LISTINGS.find((l) => l.id === id)
                  return (
                    <span key={id} className={styles.compareChip}>
                      <span className={styles.compareChipName}>{listing?.name}</span>
                      <button
                        className={styles.compareChipRemove}
                        onClick={() => toggleCompare(id)}
                        aria-label={`Remove ${listing?.name}`}
                      >
                        <svg
                          viewBox="0 0 10 10"
                          width="9"
                          height="9"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                        >
                          <path d="M2 2l6 6M8 2l-6 6" />
                        </svg>
                      </button>
                    </span>
                  )
                })}
              </div>

              <div className={styles.compareBarActions}>
                {compareIds.length >= 2 && (
                  <button className={styles.compareBarCta} onClick={handleViewComparison}>
                    Compare Now
                    <svg
                      viewBox="0 0 12 12"
                      width="10"
                      height="10"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      style={{ marginLeft: 5 }}
                    >
                      <path d="M2 6h8M7 3l3 3-3 3" />
                    </svg>
                  </button>
                )}
                <button className={styles.compareBarClear} onClick={() => setCompareIds([])}>
                  Clear all
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Results count + active filter pills ── */}
        {isFiltered && (
          <div className={styles.resultsBar}>
            <p className={styles.resultsCount}>
              <span className={styles.resultsNum}>{filteredListings.length}</span> result
              {filteredListings.length !== 1 ? 's' : ''}
              {activeCategory !== 'all' && (
                <span className={styles.resultsFilter}>
                  {' '}
                  in <strong>{CATEGORIES.find((c) => c.id === activeCategory)?.label}</strong>
                </span>
              )}
              {searchQuery && (
                <span className={styles.resultsFilter}>
                  {' '}
                  for <strong>"{searchQuery}"</strong>
                </span>
              )}
            </p>
            {(activeCategory !== 'all' || searchQuery) && (
              <button
                className={styles.resultsClearAll}
                onClick={() => {
                  setSearchQuery('')
                  setActiveCategory('all')
                }}
              >
                Clear filters
              </button>
            )}
          </div>
        )}

        {/* ── Empty state ── */}
        {filteredListings.length === 0 && (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>
              <svg
                viewBox="0 0 40 40"
                width="40"
                height="40"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
              >
                <circle cx="18" cy="18" r="10" />
                <path d="M26 26l8 8" />
                <path d="M14 18h8M18 14v8" opacity="0.3" />
              </svg>
            </div>
            <p className={styles.emptyTitle}>No services found</p>
            <p className={styles.emptyText}>
              Try adjusting your search or browsing a different category.
            </p>
            <button
              className={styles.emptyReset}
              onClick={() => {
                setSearchQuery('')
                setActiveCategory('all')
              }}
            >
              Reset all filters
            </button>
          </div>
        )}

        {/* ── GROUPED VIEW ── */}
        {grouped && filteredListings.length > 0 && (
          <div className={styles.groupedView}>
            {Object.values(grouped).map(({ service, items }) => (
              <div key={service.id} className={styles.serviceGroup}>
                <div className={styles.groupHeader}>
                  <div className={styles.groupHeaderLeft}>
                    <span className={styles.groupAccent} />
                    <div>
                      <h3 className={styles.groupTitle}>{service.name}</h3>
                      <p className={styles.groupDesc}>{service.description}</p>
                    </div>
                  </div>
                  <div className={styles.groupHeaderRight}>
                    <span className={styles.groupCount}>
                      {items.length} provider{items.length !== 1 ? 's' : ''}
                    </span>
                    <Link href={`/shop/${service.id}`} className={styles.groupViewAll}>
                      View all
                      <svg
                        viewBox="0 0 12 12"
                        width="10"
                        height="10"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        style={{ marginLeft: 4 }}
                      >
                        <path d="M2 6h8M7 3l3 3-3 3" />
                      </svg>
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

        {/* ── FLAT VIEW ── */}
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

      {/* ── Compare Modal ── */}
      {showCompareModal && (
        <div
          className={styles.modalOverlay}
          onClick={(e) => e.target === e.currentTarget && closeCompareModal()}
        >
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <div>
                <h2 className={styles.modalTitle}>Service Comparison</h2>
                <p className={styles.modalSubtitle}>
                  Comparing {compareListings.length} services side by side
                </p>
              </div>
              <button
                className={styles.modalClose}
                onClick={closeCompareModal}
                aria-label="Close"
              >
                <svg
                  viewBox="0 0 14 14"
                  width="14"
                  height="14"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                >
                  <path d="M2 2l10 10M12 2L2 12" />
                </svg>
              </button>
            </div>

            {/* Highlight badges */}
            <div className={styles.compareHighlights}>
              {lowestPriceId && (
                <div className={styles.compareHighlight}>
                  <span className={styles.highlightIcon}>💰</span>
                  <div>
                    <p className={styles.highlightLabel}>Lowest Price</p>
                    <p className={styles.highlightValue}>
                      {compareListings.find((x) => x.listing.id === lowestPriceId)?.listing.name}
                    </p>
                  </div>
                </div>
              )}
              {highestRatedId && (
                <div className={styles.compareHighlight}>
                  <span className={styles.highlightIcon}>⭐</span>
                  <div>
                    <p className={styles.highlightLabel}>Highest Rated</p>
                    <p className={styles.highlightValue}>
                      {compareListings.find((x) => x.listing.id === highestRatedId)?.listing.name}
                    </p>
                  </div>
                </div>
              )}
              {mostPopularId && (
                <div className={styles.compareHighlight}>
                  <span className={styles.highlightIcon}>🔥</span>
                  <div>
                    <p className={styles.highlightLabel}>Most Popular</p>
                    <p className={styles.highlightValue}>
                      {compareListings.find((x) => x.listing.id === mostPopularId)?.listing.name}
                    </p>
                  </div>
                </div>
              )}
              {bestValueId && (
                <div className={styles.compareHighlight}>
                  <span className={styles.highlightIcon}>✦</span>
                  <div>
                    <p className={styles.highlightLabel}>Best Value</p>
                    <p className={styles.highlightValue}>
                      {compareListings.find((x) => x.listing.id === bestValueId)?.listing.name}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Comparison table */}
            <div className={styles.compareTableWrap}>
              <table className={styles.compareTable}>
                <thead>
                  <tr>
                    <th className={styles.compareTableLabel} />
                    {compareListings.map(({ listing, provider }) => (
                      <th key={listing.id} className={styles.compareTableHead}>
                        <div className={styles.compareColHeader}>
                          <div className={styles.compareColAvatar}>{provider?.name.charAt(0)}</div>
                          <p className={styles.compareColName}>{listing.name}</p>
                          <p className={styles.compareColProvider}>{provider?.name}</p>
                          {listing.id === bestValueId && (
                            <span className={styles.compareColBestBadge}>Best Value</span>
                          )}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr className={styles.compareRow}>
                    <td className={styles.compareRowLabel}>Starting Price</td>
                    {compareListings.map(({ listing }) => (
                      <td
                        key={listing.id}
                        className={`${styles.compareRowCell}${
                          listing.id === lowestPriceId ? ` ${styles.compareCellHighlight}` : ''
                        }`}
                      >
                        <span className={styles.comparePriceVal}>
                          ₱{listing.price.toLocaleString('en-PH')}
                        </span>
                        {listing.id === lowestPriceId && (
                          <span className={styles.compareCellTag}>Lowest</span>
                        )}
                      </td>
                    ))}
                  </tr>
                  <tr className={styles.compareRow}>
                    <td className={styles.compareRowLabel}>Provider Rating</td>
                    {compareListings.map(({ listing, provider }) => (
                      <td
                        key={listing.id}
                        className={`${styles.compareRowCell}${
                          listing.id === highestRatedId ? ` ${styles.compareCellHighlight}` : ''
                        }`}
                      >
                        <div className={styles.compareRating}>
                          <span className={styles.compareRatingNum}>{provider?.rating}</span>
                          <span className={styles.compareRatingMax}>/5</span>
                          <span className={styles.compareRatingCount}>
                            ({provider?.reviews} reviews)
                          </span>
                        </div>
                        {listing.id === highestRatedId && (
                          <span className={styles.compareCellTag}>Top Rated</span>
                        )}
                      </td>
                    ))}
                  </tr>
                  <tr className={styles.compareRow}>
                    <td className={styles.compareRowLabel}>Location</td>
                    {compareListings.map(({ listing, provider }) => (
                      <td key={listing.id} className={styles.compareRowCell}>
                        <span className={styles.compareText}>{provider?.location}</span>
                      </td>
                    ))}
                  </tr>
                  <tr className={styles.compareRow}>
                    <td className={styles.compareRowLabel}>Inclusions</td>
                    {compareListings.map(({ listing }) => (
                      <td key={listing.id} className={styles.compareRowCell}>
                        <ul className={styles.compareInclusionList}>
                          {listing.inclusions.map((inc, i) => (
                            <li key={i} className={styles.compareInclusionItem}>
                              <svg
                                viewBox="0 0 10 10"
                                width="9"
                                height="9"
                                fill="none"
                                stroke="var(--color-gold-base, #B8962E)"
                                strokeWidth="2"
                                strokeLinecap="round"
                                style={{ flexShrink: 0, marginTop: 1 }}
                              >
                                <path d="M2 5l2 2 4-4" />
                              </svg>
                              {inc}
                            </li>
                          ))}
                        </ul>
                      </td>
                    ))}
                  </tr>
                  <tr className={styles.compareRow}>
                    <td className={styles.compareRowLabel}>Popularity</td>
                    {compareListings.map(({ listing }) => (
                      <td
                        key={listing.id}
                        className={`${styles.compareRowCell}${
                          listing.id === mostPopularId ? ` ${styles.compareCellHighlight}` : ''
                        }`}
                      >
                        {listing.popular ? (
                          <span className={styles.comparePopularBadge}>Most Popular</span>
                        ) : (
                          <span className={styles.compareText}>—</span>
                        )}
                      </td>
                    ))}
                  </tr>
                  <tr className={styles.compareRowActions}>
                    <td className={styles.compareRowLabel} />
                    {compareListings.map(({ listing }) => (
                      <td key={listing.id} className={styles.compareRowCell}>
                        <Link href={`/shop/${listing.serviceId}`} className={styles.compareViewBtn}>
                          View Details
                        </Link>
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>

            <div className={styles.modalFooter}>
              <button className={styles.modalDismiss} onClick={closeCompareModal}>
                Close
              </button>
              <button
                className={styles.modalClearCompare}
                onClick={() => {
                  setCompareIds([])
                  closeCompareModal()
                }}
              >
                Clear & Start Over
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

// ─── ListingCard ──────────────────────────────────────────────────────────────

function ListingCard({ listing, service, styles, inCompare, onToggleCompare, compareDisabled }) {
  const provider = PROVIDERS.find((p) => p.id === listing.providerId)

  return (
    <div
      className={`${styles.card} ${styles.listingCard}${
        inCompare ? ` ${styles.listingCardSelected}` : ''
      }`}
    >
      {/* Image wrapper */}
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
          <span
            className={`${styles.providerBadge} ${
              styles[`badge${provider.badge.replace(' ', '')}`]
            }`}
          >
            {provider.badge}
          </span>
        )}
        {inCompare && (
          <div className={styles.compareSelectedOverlay}>
            <span className={styles.compareSelectedCheck}>✓</span>
          </div>
        )}
      </div>

      {/* Body */}
      <div className={`${styles.cardBody} ${styles.listingBody}`}>
        {/* Provider row */}
        <div className={styles.providerRow}>
          <div className={styles.providerAvatar}>{provider?.name.charAt(0)}</div>
          <div className={styles.providerInfo}>
            <p className={styles.providerName}>{provider?.name}</p>
            <p className={styles.providerLocation}>
              <svg
                viewBox="0 0 12 14"
                width="9"
                height="9"
                fill="var(--color-gold-base, #B8962E)"
                style={{ marginRight: 3, flexShrink: 0, display: 'inline-block', verticalAlign: 'middle' }}
              >
                <path d="M6 0a5 5 0 0 1 5 5c0 4.5-5 9-5 9S1 9.5 1 5a5 5 0 0 1 5-5z" />
                <circle cx="6" cy="5" r="1.8" fill="white" />
              </svg>
              {provider?.location}
            </p>
          </div>
          <div className={styles.ratingGroup}>
            <span className={styles.ratingStars}>
              {[1, 2, 3, 4, 5].map((s) => (
                <svg
                  key={s}
                  width="11"
                  height="11"
                  viewBox="0 0 12 12"
                  fill={s <= Math.round(provider?.rating ?? 0) ? 'var(--color-gold-base, #B8962E)' : '#D5CCBC'}
                >
                  <path d="M6 1l1.35 2.73L10.5 4.2l-2.25 2.19.53 3.1L6 7.9l-2.78 1.6.53-3.1L1.5 4.2l3.15-.47z" />
                </svg>
              ))}
            </span>
            <span className={styles.ratingNum}>{provider?.rating}</span>
            <span className={styles.ratingReviews}>({provider?.reviews})</span>
          </div>
        </div>

        <div className={styles.listingDivider} />

        {/* Service name + price */}
        <div className={styles.listingTitleRow}>
          <h3 className={styles.cardTitle}>{listing.name}</h3>
          <div className={styles.priceBlock}>
            <span className={styles.priceLabel}>Starting at</span>
            <span className={styles.price}>
              ₱{listing.price.toLocaleString('en-PH')}
            </span>
          </div>
        </div>

        {/* Inclusions */}
        <ul className={styles.inclusions}>
          {listing.inclusions.slice(0, 4).map((inc, i) => (
            <li key={i} className={styles.inclusionItem}>
              <svg
                viewBox="0 0 12 12"
                width="11"
                height="11"
                fill="none"
                stroke="var(--color-gold-base, #B8962E)"
                strokeWidth="2"
                strokeLinecap="round"
                style={{ flexShrink: 0, marginTop: 1 }}
              >
                <path d="M2 6l3 3 5-5" />
              </svg>
              {inc}
            </li>
          ))}
          {listing.inclusions.length > 4 && (
            <li className={styles.inclusionMore}>
              +{listing.inclusions.length - 4} more inclusions
            </li>
          )}
        </ul>

        {/* Actions */}
        <div className={styles.cardActions}>
          <Link href={`/shop/${listing.serviceId}`} className={`${styles.cardCta} ${styles.ctaBtn}`}>
            View details
            <svg
              viewBox="0 0 12 12"
              width="9"
              height="9"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              style={{ marginLeft: 5 }}
            >
              <path d="M2 6h8M7 3l3 3-3 3" />
            </svg>
          </Link>
          <button
            className={`${styles.compareBtn}${inCompare ? ` ${styles.compareBtnActive}` : ''}${
              compareDisabled ? ` ${styles.compareBtnDisabled}` : ''
            }`}
            onClick={() => onToggleCompare(listing.id)}
            disabled={compareDisabled}
            title={
              compareDisabled
                ? 'Maximum 3 services can be compared at once'
                : inCompare
                ? 'Remove from comparison'
                : 'Add to comparison'
            }
          >
            {inCompare ? (
              <>
                <svg
                  viewBox="0 0 10 10"
                  width="9"
                  height="9"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  style={{ marginRight: 4 }}
                >
                  <path d="M2 5l2 2 4-4" />
                </svg>
                Added
              </>
            ) : (
              '+ Compare'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

