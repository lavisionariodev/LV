'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useState, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { SERVICES, CATEGORIES, PROVIDERS, LISTINGS } from './data'
import styles from './shop.module.css'

export default function ShopPage() {
  const router = useRouter()
  const [activeCategory, setActiveCategory] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState('popular')
  const [compareIds, setCompareIds] = useState([])
  const [searchFocused, setSearchFocused] = useState(false)
  const [locationQuery, setLocationQuery] = useState('')
  const [locationFocused, setLocationFocused] = useState(false)
  const [selectedProvider, setSelectedProvider] = useState(null)
  const [showFiltersModal, setShowFiltersModal] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const ITEMS_PER_PAGE = 15 // 3 columns × 5 rows

  const filteredListings = useMemo(() => {
    let list = [...LISTINGS]

    if (activeCategory !== 'all') {
      list = list.filter((l) => l.serviceId === activeCategory)
    }

    if (selectedProvider) {
      list = list.filter((l) => l.providerId === selectedProvider)
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
    } else if (sortBy === 'newest') {
      list.reverse()
    } else {
      list.sort((a, b) => (b.popular ? 1 : 0) - (a.popular ? 1 : 0))
    }

    return list
  }, [activeCategory, searchQuery, sortBy])

  const totalPages = Math.ceil(filteredListings.length / ITEMS_PER_PAGE)
  const paginatedListings = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE
    return filteredListings.slice(start, start + ITEMS_PER_PAGE)
  }, [filteredListings, currentPage])

  // Reset to page 1 whenever filters/search/sort change
  useEffect(() => { setCurrentPage(1) }, [activeCategory, searchQuery, sortBy, selectedProvider, locationQuery])

  // Derive unique locations from all providers
  const allLocations = useMemo(() => {
    const locs = PROVIDERS.map((p) => p.location).filter(Boolean)
    return [...new Set(locs)].sort()
  }, [])

  // Providers filtered by active category and location query
  const filteredProviders = useMemo(() => {
    let providerIds = new Set()
    let listings = [...LISTINGS]

    if (activeCategory !== 'all') {
      listings = listings.filter((l) => l.serviceId === activeCategory)
    }
    listings.forEach((l) => providerIds.add(l.providerId))

    let providers = PROVIDERS.filter((p) => providerIds.has(p.id))

    if (locationQuery.trim()) {
      const q = locationQuery.toLowerCase()
      providers = providers.filter((p) =>
        p.location?.toLowerCase().includes(q)
      )
    }

    return providers
  }, [activeCategory, locationQuery])

  function toggleCompare(id) {
    setCompareIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id)
      if (prev.length < 3) return [...prev, id]
      return prev
    })
  }

  function handleViewComparison() {
    if (compareIds.length >= 2) {
      router.push(`/shop/compare?ids=${compareIds.join(',')}`)
    }
  }

  return (
    <section className={styles.servicesPage}>

      <div className={styles.content}>
        {/* ── Mobile Filter + Search Row ── */}
        <div className={styles.mobileFilterBar}>
          <button className={styles.mobileFilterBtn} onClick={() => setShowFiltersModal(true)}>
            <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <path d="M1 3h14M4 8h8M7 13h2" />
            </svg>
            <span className={styles.mobileFilterBtnLabel}>Filters</span>
            {(activeCategory !== 'all' || locationQuery || selectedProvider) && (
              <span className={styles.mobileFilterBadge}>
                {[activeCategory !== 'all', !!locationQuery, !!selectedProvider].filter(Boolean).length}
              </span>
            )}
          </button>
          <div className={`${styles.mobileSearchWrap}${searchFocused ? ` ${styles.mobileSearchWrapFocused}` : ''}`}>
            <svg className={styles.mobileSearchIcon} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8">
              <circle cx="9" cy="9" r="6" />
              <path d="M15 15l3 3" strokeLinecap="round" />
            </svg>
            <input
              className={styles.mobileSearchInput}
              type="text"
              placeholder="Search…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
            />
            {searchQuery && (
              <button className={styles.mobileSearchClear} onClick={() => setSearchQuery('')} aria-label="Clear search">
                <svg viewBox="0 0 12 12" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M2 2l8 8M10 2l-8 8" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* ── Mobile Sort Row ── */}
        <div className={styles.mobileSortRow}>
          {[
            { value: 'popular',    label: 'Most Popular' },
            { value: 'price-asc',  label: 'Price: Low–High' },
            { value: 'price-desc', label: 'Price: High–Low' },
            { value: 'rating',     label: 'Highest Rated' },
            { value: 'newest',     label: 'Newest' },
          ].map((opt) => (
            <button
              key={opt.value}
              className={`${styles.mobileSortPill}${sortBy === opt.value ? ` ${styles.mobileSortPillActive}` : ''}`}
              onClick={() => setSortBy(opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* ── Active category tag (below sort row) ── */}
        {activeCategory !== 'all' && (
          <div className={styles.mobileActiveCatRow}>
            <span className={styles.mobileActiveCat}>
              {CATEGORIES.find(c => c.id === activeCategory)?.label}
              <button className={styles.mobileActiveCatClear} onClick={() => setActiveCategory('all')} aria-label="Clear category">
                <svg viewBox="0 0 10 10" width="8" height="8" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M2 2l6 6M8 2l-6 6" />
                </svg>
              </button>
            </span>
          </div>
        )}

        {/* ── Mobile Filters Modal ── */}
        {showFiltersModal && (
          <div className={styles.filtersModalOverlay} onClick={(e) => e.target === e.currentTarget && setShowFiltersModal(false)}>
            <div className={styles.filtersModal}>
              <div className={styles.filtersModalHeader}>
                <span className={styles.filtersModalTitle}>Filters</span>
                <button className={styles.filtersModalClose} onClick={() => setShowFiltersModal(false)} aria-label="Close filters">
                  <svg viewBox="0 0 14 14" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M2 2l10 10M12 2L2 12" />
                  </svg>
                </button>
              </div>

              <div className={styles.filtersModalBody}>
                {/* Categories */}
                <div className={styles.filtersModalSection}>
                  <p className={styles.filtersModalSectionTitle}>Categories</p>
                  <div className={styles.filtersModalCatList}>
                    {CATEGORIES.map((cat) => (
                      <button
                        key={cat.id}
                        className={`${styles.filtersModalCatBtn}${activeCategory === cat.id ? ` ${styles.filtersModalCatBtnActive}` : ''}`}
                        onClick={() => setActiveCategory(cat.id)}
                      >
                        <span>{cat.label}</span>
                        {activeCategory === cat.id && (
                          <span className={styles.filtersModalCatCount}>
                            {cat.id === 'all' ? LISTINGS.length : filteredListings.length}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Location */}
                <div className={styles.filtersModalSection}>
                  <p className={styles.filtersModalSectionTitle}>Search by Location</p>
                  <div className={`${styles.locationInputWrap}${locationFocused ? ` ${styles.locationInputFocused}` : ''}`}>
                    <svg className={styles.locationPinIcon} viewBox="0 0 14 18" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M7 1a6 6 0 0 1 6 6c0 5.25-6 10-6 10S1 12.25 1 7a6 6 0 0 1 6-6z" />
                      <circle cx="7" cy="7" r="2.2" />
                    </svg>
                    <input
                      className={styles.locationInput}
                      type="text"
                      placeholder="City or area…"
                      value={locationQuery}
                      onChange={(e) => { setLocationQuery(e.target.value); setSelectedProvider(null) }}
                      onFocus={() => setLocationFocused(true)}
                      onBlur={() => setLocationFocused(false)}
                      list="location-suggestions-modal"
                    />
                    {locationQuery && (
                      <button className={styles.locationClear} onClick={() => { setLocationQuery(''); setSelectedProvider(null) }} aria-label="Clear location">
                        <svg viewBox="0 0 10 10" width="9" height="9" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                          <path d="M2 2l6 6M8 2l-6 6" />
                        </svg>
                      </button>
                    )}
                  </div>
                  <datalist id="location-suggestions-modal">
                    {allLocations.map((loc) => <option key={loc} value={loc} />)}
                  </datalist>
                </div>

                {/* Providers */}
                <div className={styles.filtersModalSection}>
                  <p className={styles.filtersModalSectionTitle}>Service Providers <span className={styles.filtersModalProviderCount}>{filteredProviders.length}</span></p>
                  {filteredProviders.length === 0 ? (
                    <div className={styles.providerEmpty}>
                      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
                        <circle cx="11" cy="11" r="7" /><path d="M21 21l-4.35-4.35" />
                      </svg>
                      <span>No providers found</span>
                    </div>
                  ) : (
                    <div className={styles.providerList}>
                      {filteredProviders.map((provider) => (
                        <button
                          key={provider.id}
                          className={`${styles.providerItem}${selectedProvider === provider.id ? ` ${styles.providerItemActive}` : ''}`}
                          onClick={() => setSelectedProvider(selectedProvider === provider.id ? null : provider.id)}
                        >
                          <div className={styles.providerItemAvatar}>{provider.name.charAt(0)}</div>
                          <div className={styles.providerItemInfo}>
                            <span className={styles.providerItemName}>{provider.name}</span>
                            <span className={styles.providerItemLocation}>
                              <svg viewBox="0 0 10 13" width="8" height="8" fill="var(--color-gold-base,#B8962E)">
                                <path d="M5 0a4.5 4.5 0 0 1 4.5 4.5C9.5 8.5 5 12.5 5 12.5S.5 8.5.5 4.5A4.5 4.5 0 0 1 5 0z" />
                                <circle cx="5" cy="4.5" r="1.6" fill="white" />
                              </svg>
                              {provider.location}
                            </span>
                          </div>
                          <div className={styles.providerItemRight}>
                            <span className={styles.providerItemRating}>
                              <svg width="9" height="9" viewBox="0 0 12 12" fill="var(--color-gold-base,#B8962E)">
                                <path d="M6 1l1.35 2.73L10.5 4.2l-2.25 2.19.53 3.1L6 7.9l-2.78 1.6.53-3.1L1.5 4.2l3.15-.47z" />
                              </svg>
                              {provider.rating}
                            </span>
                            {provider.badge && <span className={styles.providerItemBadge}>{provider.badge}</span>}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className={styles.filtersModalFooter}>
                <button className={styles.filtersModalClear} onClick={() => { setActiveCategory('all'); setLocationQuery(''); setSelectedProvider(null) }}>
                  Clear all
                </button>
                <button className={styles.filtersModalApply} onClick={() => setShowFiltersModal(false)}>
                  Show {filteredListings.length} result{filteredListings.length !== 1 ? 's' : ''}
                </button>
              </div>
            </div>
          </div>
        )}

        <div className={styles.shopLayout}>

          {/* ── Side Navigation ── */}
          <aside className={styles.sideNav}>
            <div className={styles.sideNavHeader}>
              <span className={styles.sideNavTitle}>Categories</span>
            </div>
            <nav className={styles.sideNavList}>
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  className={`${styles.sideNavItem}${activeCategory === cat.id ? ` ${styles.sideNavItemActive}` : ''}`}
                  onClick={() => setActiveCategory(cat.id)}
                >
                  <span className={styles.sideNavLabel}>{cat.label}</span>
                  {activeCategory === cat.id && (
                    <span className={styles.sideNavCount}>
                      {cat.id === 'all' ? LISTINGS.length : filteredListings.length}
                    </span>
                  )}
                </button>
              ))}
            </nav>

            {/* ── Location Search ── */}
            <div className={styles.sideNavSection}>
              <div className={styles.sideNavHeader}>
                <span className={styles.sideNavTitle}>Search by Location</span>
              </div>
              <div className={styles.locationSearchWrap}>
                <div className={`${styles.locationInputWrap}${locationFocused ? ` ${styles.locationInputFocused}` : ''}`}>
                  <svg className={styles.locationPinIcon} viewBox="0 0 14 18" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M7 1a6 6 0 0 1 6 6c0 5.25-6 10-6 10S1 12.25 1 7a6 6 0 0 1 6-6z" />
                    <circle cx="7" cy="7" r="2.2" />
                  </svg>
                  <input
                    className={styles.locationInput}
                    type="text"
                    placeholder="City or area…"
                    value={locationQuery}
                    onChange={(e) => { setLocationQuery(e.target.value); setSelectedProvider(null) }}
                    onFocus={() => setLocationFocused(true)}
                    onBlur={() => setLocationFocused(false)}
                    list="location-suggestions"
                  />
                  {locationQuery && (
                    <button
                      className={styles.locationClear}
                      onClick={() => { setLocationQuery(''); setSelectedProvider(null) }}
                      aria-label="Clear location"
                    >
                      <svg viewBox="0 0 10 10" width="9" height="9" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <path d="M2 2l6 6M8 2l-6 6" />
                      </svg>
                    </button>
                  )}
                </div>
                <datalist id="location-suggestions">
                  {allLocations.map((loc) => <option key={loc} value={loc} />)}
                </datalist>
              </div>
            </div>

            {/* ── Providers List ── */}
            <div className={styles.sideNavSection}>
              <div className={styles.sideNavHeader} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className={styles.sideNavTitle}>Service Providers</span>
                <span className={styles.providerListCount}>{filteredProviders.length}</span>
              </div>
              {filteredProviders.length === 0 ? (
                <div className={styles.providerEmpty}>
                  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
                    <circle cx="11" cy="11" r="7" />
                    <path d="M21 21l-4.35-4.35" />
                  </svg>
                  <span>No providers found</span>
                </div>
              ) : (
                <div className={styles.providerList}>
                  {filteredProviders.map((provider) => (
                    <button
                      key={provider.id}
                      className={`${styles.providerItem}${selectedProvider === provider.id ? ` ${styles.providerItemActive}` : ''}`}
                      onClick={() => setSelectedProvider(selectedProvider === provider.id ? null : provider.id)}
                    >
                      <div className={styles.providerItemAvatar}>
                        {provider.name.charAt(0)}
                      </div>
                      <div className={styles.providerItemInfo}>
                        <span className={styles.providerItemName}>{provider.name}</span>
                        <span className={styles.providerItemLocation}>
                          <svg viewBox="0 0 10 13" width="8" height="8" fill="var(--color-gold-base,#B8962E)">
                            <path d="M5 0a4.5 4.5 0 0 1 4.5 4.5C9.5 8.5 5 12.5 5 12.5S.5 8.5.5 4.5A4.5 4.5 0 0 1 5 0z" />
                            <circle cx="5" cy="4.5" r="1.6" fill="white" />
                          </svg>
                          {provider.location}
                        </span>
                      </div>
                      <div className={styles.providerItemRight}>
                        <span className={styles.providerItemRating}>
                          <svg width="9" height="9" viewBox="0 0 12 12" fill="var(--color-gold-base,#B8962E)">
                            <path d="M6 1l1.35 2.73L10.5 4.2l-2.25 2.19.53 3.1L6 7.9l-2.78 1.6.53-3.1L1.5 4.2l3.15-.47z" />
                          </svg>
                          {provider.rating}
                        </span>
                        {provider.badge && (
                          <span className={styles.providerItemBadge}>{provider.badge}</span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </aside>

          {/* ── Main Content ── */}
          <div className={styles.shopMain}>

            {/* ── Search ── */}
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
                  <button className={styles.searchClear} onClick={() => setSearchQuery('')} aria-label="Clear search">
                    <svg viewBox="0 0 12 12" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <path d="M2 2l8 8M10 2l-8 8" />
                    </svg>
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
                  <option value="newest">Newest</option>
                </select>
              </div>
            </div>

            {/* ── Results row: count + sort ── */}
            <div className={styles.resultsBar}>
              <p className={styles.resultsCount}>
                <span className={styles.resultsNum}>{filteredListings.length}</span>{' '}
                result{filteredListings.length !== 1 ? 's' : ''}
                {activeCategory !== 'all' && (
                  <span className={styles.resultsFilter}>
                    {' '}in <strong>{CATEGORIES.find((c) => c.id === activeCategory)?.label}</strong>
                  </span>
                )}
                {searchQuery && (
                  <span className={styles.resultsFilter}>
                    {' '}for <strong>"{searchQuery}"</strong>
                  </span>
                )}
              </p>
              <div className={styles.resultsBarRight}>
                {(activeCategory !== 'all' || searchQuery || selectedProvider || locationQuery) && (
                  <button
                    className={styles.resultsClearAll}
                    onClick={() => { setSearchQuery(''); setActiveCategory('all'); setSelectedProvider(null); setLocationQuery('') }}
                  >
                    Clear filters
                  </button>
                )}
              </div>
            </div>

            {/* ── Compare tray (inline, single item hint) ── */}
            {compareIds.length === 1 && (
              <div className={styles.compareHintTray}>
                <div className={styles.compareHintInner}>
                  <div className={styles.compareHintDots}>
                    {[0, 1, 2].map((i) => (
                      <div key={i} className={`${styles.compareProgressDot}${i < compareIds.length ? ` ${styles.compareProgressDotFilled}` : ''}`} />
                    ))}
                  </div>
                  <span className={styles.compareHintText}>Select 1 more service to compare</span>
                  <button className={styles.compareBarClear} onClick={() => setCompareIds([])}>Clear</button>
                </div>
              </div>
            )}

            {/* ── Empty state ── */}
            {filteredListings.length === 0 && (
              <div className={styles.emptyState}>
                <div className={styles.emptyIcon}>
                  <svg viewBox="0 0 40 40" width="40" height="40" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
                    <circle cx="18" cy="18" r="10" />
                    <path d="M26 26l8 8" />
                    <path d="M14 18h8M18 14v8" opacity="0.3" />
                  </svg>
                </div>
                <p className={styles.emptyTitle}>No services found</p>
                <p className={styles.emptyText}>Try adjusting your search or browsing a different category.</p>
                <button className={styles.emptyReset} onClick={() => { setSearchQuery(''); setActiveCategory('all'); setSelectedProvider(null); setLocationQuery('') }}>
                  Reset all filters
                </button>
              </div>
            )}

            {/* ── Unified Product Grid ── */}
            {filteredListings.length > 0 && (
              <>
                <div className={styles.grid}>
                  {paginatedListings.map((listing) => {
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

                {totalPages > 1 && (
                  <div className={styles.pagination}>
                    <button
                      className={`${styles.pageBtn} ${styles.pageBtnPrev}`}
                      onClick={() => { setCurrentPage((p) => Math.max(1, p - 1)); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
                      disabled={currentPage === 1}
                      aria-label="Previous page"
                    >
                      <svg viewBox="0 0 10 10" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M6 2L3 5l3 3" />
                      </svg>
                      Prev
                    </button>

                    <div className={styles.pageNumbers}>
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                        const isActive = page === currentPage
                        const isNear = Math.abs(page - currentPage) <= 1
                        const isEdge = page === 1 || page === totalPages
                        if (!isNear && !isEdge) {
                          if (page === 2 || page === totalPages - 1) {
                            return <span key={page} className={styles.pageEllipsis}>…</span>
                          }
                          return null
                        }
                        return (
                          <button
                            key={page}
                            className={`${styles.pageNumBtn}${isActive ? ` ${styles.pageNumBtnActive}` : ''}`}
                            onClick={() => { setCurrentPage(page); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
                            aria-current={isActive ? 'page' : undefined}
                          >
                            {page}
                          </button>
                        )
                      })}
                    </div>

                    <button
                      className={`${styles.pageBtn} ${styles.pageBtnNext}`}
                      onClick={() => { setCurrentPage((p) => Math.min(totalPages, p + 1)); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
                      disabled={currentPage === totalPages}
                      aria-label="Next page"
                    >
                      Next
                      <svg viewBox="0 0 10 10" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M4 2l3 3-3 3" />
                      </svg>
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Floating Compare Popup (appears when 2+ selected) ── */}
      {compareIds.length >= 2 && (
        <div className={styles.compareFloatPopup} role="dialog" aria-label="Compare services">
          <div className={styles.compareFloatInner}>
            <div className={styles.compareFloatHeader}>
              <div className={styles.compareFloatIconWrap}>
                <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
                  <path d="M2 4h12M2 8h8M2 12h10" />
                </svg>
              </div>
              <div className={styles.compareFloatTitle}>
                <span className={styles.compareFloatCount}>{compareIds.length}</span>
                <span className={styles.compareFloatLabel}> service{compareIds.length > 1 ? 's' : ''} ready to compare</span>
              </div>
              <div className={styles.compareFloatProgress}>
                {[0, 1, 2].map((i) => (
                  <div key={i} className={`${styles.compareProgressDot}${i < compareIds.length ? ` ${styles.compareProgressDotFilled}` : ''}`} />
                ))}
                <span className={styles.compareProgressHint}>max 3</span>
              </div>
            </div>

            <div className={styles.compareFloatChips}>
              {compareIds.map((id) => {
                const listing = LISTINGS.find((l) => l.id === id)
                return (
                  <span key={id} className={styles.compareChip}>
                    <span className={styles.compareChipName}>{listing?.name}</span>
                    <button className={styles.compareChipRemove} onClick={() => toggleCompare(id)} aria-label={`Remove ${listing?.name}`}>
                      <svg viewBox="0 0 10 10" width="9" height="9" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                        <path d="M2 2l6 6M8 2l-6 6" />
                      </svg>
                    </button>
                  </span>
                )
              })}
            </div>

            <div className={styles.compareFloatActions}>
              <button className={styles.compareBarCta} onClick={handleViewComparison}>
                Compare Now
                <svg viewBox="0 0 12 12" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ marginLeft: 5 }}>
                  <path d="M2 6h8M7 3l3 3-3 3" />
                </svg>
              </button>
              <button className={styles.compareBarClear} onClick={() => setCompareIds([])}>Clear all</button>
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
    <div className={`${styles.card} ${styles.listingCard}${inCompare ? ` ${styles.listingCardSelected}` : ''}`}>
      <Link href={`/shop/${listing.serviceId}`} className={styles.listingCardLink}>
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
          {inCompare && (
            <div className={styles.compareSelectedOverlay}>
              <span className={styles.compareSelectedCheck}>✓</span>
            </div>
          )}
        </div>

        <div className={`${styles.cardBody} ${styles.listingBody}`}>
          <div className={styles.providerRow}>
            <div className={styles.providerAvatar}>{provider?.name.charAt(0)}</div>
            <div className={styles.providerInfo}>
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
                <svg key={s} width="11" height="11" viewBox="0 0 12 12" fill={s <= Math.round(provider?.rating ?? 0) ? 'var(--color-gold-base, #B8962E)' : '#D5CCBC'}>
                  <path d="M6 1l1.35 2.73L10.5 4.2l-2.25 2.19.53 3.1L6 7.9l-2.78 1.6.53-3.1L1.5 4.2l3.15-.47z" />
                </svg>
              ))}
            </span>
            <span className={styles.ratingNum}>{provider?.rating}</span>
            <span className={styles.ratingReviews}>({provider?.reviews})</span>
          </div>
        </div>

        <div className={styles.listingDivider} />

        <div className={styles.listingTitleRow}>
          <h3 className={styles.cardTitle}>{listing.name}</h3>
          <div className={styles.priceBlock}>
            <span className={styles.priceLabel}>Starting at</span>
            <span className={styles.price}>₱{listing.price.toLocaleString('en-PH')}</span>
          </div>
        </div>
        </div>
      </Link>

      <div className={styles.cardActions}>
        <button className={`${styles.cardCta} ${styles.ctaBtn}`} onClick={() => {}}>
            <svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 6, flexShrink: 0 }}>
              <path d="M1 1h2l1.5 7.5h8l1.5-5H4.5" />
              <circle cx="7" cy="13.5" r="1" fill="currentColor" stroke="none" />
              <circle cx="12" cy="13.5" r="1" fill="currentColor" stroke="none" />
            </svg>
            Add to Cart
          </button>
          <button
            className={`${styles.compareBtn}${inCompare ? ` ${styles.compareBtnActive}` : ''}${compareDisabled ? ` ${styles.compareBtnDisabled}` : ''}`}
            onClick={() => onToggleCompare(listing.id)}
            disabled={compareDisabled}
            title={compareDisabled ? 'Maximum 3 services can be compared at once' : inCompare ? 'Remove from comparison' : 'Add to comparison'}
          >
            {inCompare ? (
              <>
                <svg viewBox="0 0 10 10" width="9" height="9" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ marginRight: 4 }}>
                  <path d="M2 5l2 2 4-4" />
                </svg>
                Added
              </>
            ) : '+ Compare'}
          </button>
        </div>
      </div>
  )
}