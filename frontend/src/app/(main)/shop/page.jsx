'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useState, useMemo, useEffect, useCallback } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { SERVICES, CATEGORIES, PROVIDERS, getServiceById } from '@/data/shopSampleData'
import { useDebouncedEffect } from '@/shared/hooks'
import { readString, replaceUrlQuery } from '@/lib/url/queryParams'
import {
  fetchActiveShopListings,
  getListingProviderLogoUrl,
  mergeShopListings,
} from '@/lib/shop-listings/client'
import { buildCartPayloadFromListing } from '@/lib/cart/fromListing'
import { assertListingReadyForCart } from '@/lib/cart/bookNow'
import { useCart } from '@/contexts/CartContext'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import { formatPhpAmount } from '@/lib/cart/formatPhp'
import { isUuidLike } from '@/lib/uuidLike'
import styles from './shop.module.css'

/** API `pairs` segment and `aggregatesByPair` lookup key for listing-scoped ratings. */
function providerServiceAggPairSegments(listing) {
  const sellerId = String(listing?.providerId ?? '').trim()
  const serviceId = String(listing?.serviceId ?? '').trim()
  const lid = String(listing?.id ?? '').trim()
  if (!sellerId || !serviceId) return null
  if (isUuidLike(lid)) return { api: `${sellerId}|${serviceId}|${lid}`, lookup: `${sellerId}::${serviceId}::${lid}` }
  return { api: `${sellerId}|${serviceId}`, lookup: `${sellerId}::${serviceId}` }
}

function listingMatchesSearch(listing, needle) {
  if (!needle) return true
  const n = needle.toLowerCase()
  const service = getServiceById(listing.serviceId)
  const chunks = [
    listing.name,
    listing.description,
    listing.whoThisIsFor,
    listing.importantNotes,
    listing.categoryLabel,
    listing.listingKindLabel,
    listing.coverage,
    listing.duration,
    listing.provider?.name,
    listing.provider?.location,
    service?.name,
    service?.description,
    ...(Array.isArray(listing.inclusions) ? listing.inclusions : []),
    ...(Array.isArray(listing.sellerPackageOptions) ? listing.sellerPackageOptions : []),
  ]
  return chunks.some((s) => typeof s === 'string' && s.toLowerCase().includes(n))
}

function listingMatchesLocation(listing, needle) {
  if (!needle) return true
  const n = needle.toLowerCase()
  const provider =
    listing.provider ?? PROVIDERS.find((p) => String(p.id) === String(listing.providerId))
  return typeof provider?.location === 'string' && provider.location.toLowerCase().includes(n)
}

function ShopProviderCircleThumb({ provider, wrapClassName, imgClassName }) {
  const url = getListingProviderLogoUrl(provider)
  return (
    <div className={wrapClassName}>
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element -- Supabase/storage URL from RPC
        <img src={url} alt="" className={imgClassName} />
      ) : (
        (provider?.name || '?').charAt(0)
      )}
    </div>
  )
}

const SHOP_PAGE_SKELETON_CARD_KEYS = ['c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7', 'c8', 'c9']

/**
 * Skeleton layout mirroring sidebar filters + toolbar + listing card grid (seller-profile style).
 */
function ShopPageLoading() {
  return (
    <div className={styles.shopLayout} aria-busy="true" aria-describedby="shop-page-loading-hint">
      <p id="shop-page-loading-hint" role="status" className={styles.visuallyHidden}>
        Loading shop. Categories, location search, service providers, and service cards will appear
        shortly.
      </p>

      <div className={styles.sideNavCol} aria-hidden="true">
        <aside className={styles.sideNav}>
          <div className={styles.sideNavHeader}>
            <span className={`${styles.shopSkeletonBlock} ${styles.shopSkeletonSideHeader}`} />
          </div>
          <div className={styles.sideNavScroll}>
            <nav className={styles.sideNavList}>
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <div
                  key={`cat-${i}`}
                  className={`${styles.shopSkeletonBlock} ${styles.shopSkeletonNavLine}`}
                />
              ))}
            </nav>
            <div className={styles.sideNavSection}>
              <div className={styles.sideNavHeader}>
                <span className={`${styles.shopSkeletonBlock} ${styles.shopSkeletonSideHeader}`} />
              </div>
              <div className={`${styles.shopSkeletonBlock} ${styles.shopSkeletonLocationBox}`} />
            </div>
            <div className={styles.sideNavSection}>
              <div className={styles.sideNavHeader}>
                <span className={`${styles.shopSkeletonBlock} ${styles.shopSkeletonSideHeader}`} />
              </div>
              {[0, 1, 2, 3, 4].map((i) => (
                <div key={`p-${i}`} className={styles.shopSkeletonProviderRow}>
                  <div
                    className={`${styles.shopSkeletonBlock} ${styles.shopSkeletonProviderAvatar}`}
                  />
                  <div className={styles.shopSkeletonProviderLines}>
                    <div
                      className={`${styles.shopSkeletonBlock} ${styles.shopSkeletonProviderLine1}`}
                    />
                    <div
                      className={`${styles.shopSkeletonBlock} ${styles.shopSkeletonProviderLine2}`}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>

      <div className={styles.shopMain} aria-hidden="true">
        <div className={styles.shopSkeletonToolbar}>
          <div className={`${styles.shopSkeletonBlock} ${styles.shopSkeletonResultsBar}`} />
          <div className={styles.shopSkeletonSortRow}>
            <div className={`${styles.shopSkeletonBlock} ${styles.shopSkeletonSortLabel}`} />
            <div className={`${styles.shopSkeletonBlock} ${styles.shopSkeletonSortField}`} />
          </div>
        </div>

        <div className={styles.grid}>
          {SHOP_PAGE_SKELETON_CARD_KEYS.map((k) => (
            <div key={k} className={`${styles.card} ${styles.listingCard}`}>
              <div className={styles.listingImageWrap}>
                <div className={`${styles.shopSkeletonBlock} ${styles.shopSkeletonCardImage}`} />
              </div>
              <div className={styles.shopSkeletonCardBody}>
                <div className={styles.shopSkeletonCardMetaRow}>
                  <div
                    className={`${styles.shopSkeletonBlock} ${styles.shopSkeletonCardAvatar}`}
                  />
                  <div className={styles.shopSkeletonCardMetaText}>
                    <div
                      className={`${styles.shopSkeletonBlock} ${styles.shopSkeletonCardLineA}`}
                    />
                    <div
                      className={`${styles.shopSkeletonBlock} ${styles.shopSkeletonCardLineB}`}
                    />
                  </div>
                </div>
              </div>
              <hr className={styles.shopSkeletonCardDivider} />
              <div className={styles.shopSkeletonTitlePriceRow}>
                <div className={`${styles.shopSkeletonBlock} ${styles.shopSkeletonCardTitle}`} />
                <div className={`${styles.shopSkeletonBlock} ${styles.shopSkeletonCardPrice}`} />
              </div>
              <div className={`${styles.shopSkeletonBlock} ${styles.shopSkeletonCardCta}`} />
            </div>
          ))}
        </div>

        <div className={styles.mobileGrid}>
          {SHOP_PAGE_SKELETON_CARD_KEYS.slice(0, 6).map((k) => (
            <div key={`m-${k}`} className={`${styles.card} ${styles.listingCard}`}>
              <div className={styles.listingImageWrap}>
                <div className={`${styles.shopSkeletonBlock} ${styles.shopSkeletonCardImage}`} />
              </div>
              <div className={styles.shopSkeletonCardBody}>
                <div className={styles.shopSkeletonCardMetaRow}>
                  <div
                    className={`${styles.shopSkeletonBlock} ${styles.shopSkeletonCardAvatar}`}
                  />
                  <div className={styles.shopSkeletonCardMetaText}>
                    <div
                      className={`${styles.shopSkeletonBlock} ${styles.shopSkeletonCardLineA}`}
                    />
                    <div
                      className={`${styles.shopSkeletonBlock} ${styles.shopSkeletonCardLineB}`}
                    />
                  </div>
                </div>
              </div>
              <hr className={styles.shopSkeletonCardDivider} />
              <div className={styles.shopSkeletonTitlePriceRow}>
                <div className={`${styles.shopSkeletonBlock} ${styles.shopSkeletonCardTitle}`} />
                <div className={`${styles.shopSkeletonBlock} ${styles.shopSkeletonCardPrice}`} />
              </div>
              <div className={`${styles.shopSkeletonBlock} ${styles.shopSkeletonCardCta}`} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function ShopPage() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [listings, setListings] = useState(() => mergeShopListings([]))
  const [activeCategory, setActiveCategory] = useState('all')
  const [sortBy, setSortBy] = useState('newest')
  const [compareIds, setCompareIds] = useState([])
  /** City/area filter — separate from navbar keyword search (`q`). */
  const [locationQuery, setLocationQuery] = useState(() => readString(searchParams, 'loc', ''))
  const [locationFocused, setLocationFocused] = useState(false)
  const [selectedProvider, setSelectedProvider] = useState(null)
  const [showFiltersModal, setShowFiltersModal] = useState(false)
  const [listingsLoading, setListingsLoading] = useState(true)
  const [providerAggregatesById, setProviderAggregatesById] = useState({})
  const [providerServiceAggregatesByPair, setProviderServiceAggregatesByPair] = useState({})
  const [currentPage, setCurrentPage] = useState(1)
  const ITEMS_PER_PAGE = 15 // 3 columns × 5 rows

  // Mobile-specific pagination: 2 columns × 5 rows = 10 items per page
  const [mobileCurrentPage, setMobileCurrentPage] = useState(1)
  const MOBILE_ITEMS_PER_PAGE = 10

  const resetPagination = useCallback(() => {
    setCurrentPage(1)
    setMobileCurrentPage(1)
  }, [])

  const setSortAndReset = useCallback((value) => {
    setSortBy(value)
    resetPagination()
  }, [resetPagination])

  const setCategoryAndReset = useCallback((value) => {
    setActiveCategory(value)
    resetPagination()
  }, [resetPagination])

  const setProviderAndReset = useCallback((value) => {
    setSelectedProvider(value)
    resetPagination()
  }, [resetPagination])

  const setLocationQueryAndReset = useCallback((value) => {
    setLocationQuery(value)
    setSelectedProvider(null)
    resetPagination()
  }, [resetPagination])

  const normalizeListings = useCallback(
    (rows) => {
      const normalizedListings = mergeShopListings(rows)
      setListings(normalizedListings)

      if (activeCategory !== 'all') {
        const activeServiceIds = new Set(
          normalizedListings.map((listing) => String(listing.serviceId).trim()).filter(Boolean),
        )
        if (!activeServiceIds.has(activeCategory)) {
          setCategoryAndReset('all')
        }
      }
    },
    [activeCategory, setCategoryAndReset],
  )

  useEffect(() => {
    let cancelled = false
    fetchActiveShopListings({ bustCache: true })
      .then((rows) => {
        if (cancelled) return
        normalizeListings(rows)
      })
      .catch(() => {
        if (!cancelled) normalizeListings([])
      })
      .finally(() => {
        if (!cancelled) setListingsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [normalizeListings])

  // After creating a listing in another tab, refetch so the grid is not stuck on a 45s cache.
  useEffect(() => {
    function onVisible() {
      if (document.visibilityState !== 'visible') return
      fetchActiveShopListings({ bustCache: true })
        .then((rows) => {
          normalizeListings(rows)
        })
        .catch(() => {
          normalizeListings([])
        })
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [normalizeListings])

  // Sync state ← URL (back/forward, shared links)
  // Keep the location filter in sync with the `loc` query param.
  useEffect(() => {
    const nextLoc = readString(searchParams, 'loc', '')
    if (nextLoc !== locationQuery) {
      queueMicrotask(() => setLocationQuery(nextLoc))
    }
  }, [searchParams, locationQuery])

  // Sync URL ← state (debounced typing in location fields — preserves `q` from navbar search)
  useDebouncedEffect(() => {
    replaceUrlQuery(router, pathname, searchParams, { loc: locationQuery })
  }, [locationQuery, router, pathname, searchParams], 300)

  const allProviders = useMemo(() => {
    const byId = new Map()
    listings.forEach((l) => {
      if (l.provider) byId.set(String(l.provider.id), l.provider)
    })
    return Array.from(byId.values())
  }, [listings])

  useEffect(() => {
    let cancelled = false
    async function loadRatingsAggregates() {
      const ids = [...new Set(allProviders.map((p) => String(p?.id ?? '').trim()).filter(Boolean))]
      const pairs = [
        ...new Set(
          listings
            .map((l) => providerServiceAggPairSegments(l)?.api ?? '')
            .filter(Boolean),
        ),
      ]
      if (ids.length === 0 && pairs.length === 0) {
        if (!cancelled) {
          setProviderAggregatesById({})
          setProviderServiceAggregatesByPair({})
        }
        return
      }
      try {
        const qs = new URLSearchParams()
        if (ids.length > 0) qs.set('ids', ids.join(','))
        if (pairs.length > 0) qs.set('pairs', pairs.join(','))
        const res = await fetch(`/api/ratings/aggregates?${qs.toString()}`, { cache: 'no-store' })
        const body = await res.json().catch(() => null)
        if (cancelled) return
        setProviderAggregatesById(
          body?.aggregatesBySellerId && typeof body.aggregatesBySellerId === 'object'
            ? body.aggregatesBySellerId
            : {},
        )
        setProviderServiceAggregatesByPair(
          body?.aggregatesByPair && typeof body.aggregatesByPair === 'object' ? body.aggregatesByPair : {},
        )
      } catch {
        if (cancelled) return
        setProviderAggregatesById({})
        setProviderServiceAggregatesByPair({})
      }
    }
    loadRatingsAggregates()
    return () => {
      cancelled = true
    }
  }, [allProviders, listings])

  const filteredListings = useMemo(() => {
    let list = [...listings]

    if (activeCategory !== 'all') {
      list = list.filter((l) => l.serviceId === activeCategory)
    }

    if (selectedProvider) {
      list = list.filter((l) => l.providerId === selectedProvider)
    }

    const keywordNeedle = readString(searchParams, 'q', '').trim().toLowerCase()
    if (keywordNeedle) {
      list = list.filter((l) => listingMatchesSearch(l, keywordNeedle))
    }

    const locationNeedle = locationQuery.trim().toLowerCase()
    if (locationNeedle) {
      list = list.filter((l) => listingMatchesLocation(l, locationNeedle))
    }

    if (sortBy === 'price-asc') list.sort((a, b) => a.price - b.price)
    else if (sortBy === 'price-desc') list.sort((a, b) => b.price - a.price)
    else if (sortBy === 'rating') {
      list.sort((a, b) => {
        const aPairKey = providerServiceAggPairSegments(a)?.lookup ?? ''
        const bPairKey = providerServiceAggPairSegments(b)?.lookup ?? ''
        const aPairAgg = providerServiceAggregatesByPair[aPairKey]
        const bPairAgg = providerServiceAggregatesByPair[bPairKey]
        const aRating = Number(aPairAgg?.avgRating ?? 0) || 0
        const bRating = Number(bPairAgg?.avgRating ?? 0) || 0
        return bRating - aRating
      })
    } else if (sortBy === 'newest') {
      list.sort((a, b) => {
        const ta = new Date(a.createdAt || 0).getTime()
        const tb = new Date(b.createdAt || 0).getTime()
        return tb - ta
      })
    } else if (sortBy === 'stock-desc') {
      list.sort((a, b) => (b.inStock ? 1 : 0) - (a.inStock ? 1 : 0))
    } else {
      list.sort((a, b) => {
        const ta = new Date(a.createdAt || 0).getTime()
        const tb = new Date(b.createdAt || 0).getTime()
        return tb - ta
      })
    }

    return list
  }, [listings, activeCategory, sortBy, selectedProvider, locationQuery, searchParams, providerServiceAggregatesByPair])

  const totalPages = Math.ceil(filteredListings.length / ITEMS_PER_PAGE)
  const paginatedListings = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE
    return filteredListings.slice(start, start + ITEMS_PER_PAGE)
  }, [filteredListings, currentPage])

  // Mobile-specific derived values — independent of desktop pagination
  const mobileTotalPages = Math.ceil(filteredListings.length / MOBILE_ITEMS_PER_PAGE)
  const mobilePaginatedListings = useMemo(() => {
    const start = (mobileCurrentPage - 1) * MOBILE_ITEMS_PER_PAGE
    return filteredListings.slice(start, start + MOBILE_ITEMS_PER_PAGE)
  }, [filteredListings, mobileCurrentPage])

  // Measure the real navbar height and expose it as a CSS variable so the
  // fixed sidebar can sit exactly below it on desktop, regardless of the
  // navbar's actual rendered height.
  useEffect(() => {
    function applyNavbarHeight() {
      const navbar = document.querySelector('nav, header, [class*="nav"], [class*="header"], [class*="Navbar"], [class*="Header"]')
      const height = navbar ? navbar.getBoundingClientRect().height : 0
      document.documentElement.style.setProperty('--navbar-height', `${height}px`)
    }
    applyNavbarHeight()
    window.addEventListener('resize', applyNavbarHeight)
    return () => window.removeEventListener('resize', applyNavbarHeight)
  }, [])

  // Derive unique locations from all providers
  const allLocations = useMemo(() => {
    const locs = allProviders.map((p) => p.location).filter(Boolean)
    return [...new Set(locs)].sort()
  }, [allProviders])

  // Providers filtered by active category and location query
  const filteredProviders = useMemo(() => {
    const providerIds = new Set()
    let scoped = [...listings]

    if (activeCategory !== 'all') {
      scoped = scoped.filter((l) => l.serviceId === activeCategory)
    }
    scoped.forEach((l) => providerIds.add(String(l.providerId)))

    let providers = allProviders.filter((p) => providerIds.has(String(p.id)))

    if (locationQuery.trim()) {
      const q = locationQuery.toLowerCase()
      providers = providers.filter((p) =>
        p.location?.toLowerCase().includes(q)
      )
    }

    return providers
  }, [listings, activeCategory, locationQuery, allProviders])

  const getProviderMetrics = useCallback(
    (provider) => {
      const agg = providerAggregatesById[String(provider?.id ?? '')] ?? null
      return {
        rating: agg?.avgRating != null ? Number(agg.avgRating).toFixed(1) : provider?.rating,
        reviews: agg?.reviewCount != null ? Number(agg.reviewCount) : provider?.reviews,
      }
    },
    [providerAggregatesById],
  )

  const availableCategories = useMemo(() => {
    const activeServiceIds = new Set(
      listings.map((l) => String(l.serviceId).trim()).filter(Boolean),
    )

    const categories = [
      { id: 'all', label: 'All Services' },
      ...CATEGORIES.filter((cat) => cat.id !== 'all' && activeServiceIds.has(cat.id)),
    ]

    const extraCategoryIds = [...activeServiceIds].filter(
      (id) => !categories.some((cat) => cat.id === id),
    )
    extraCategoryIds.forEach((id) => {
      const service = SERVICES.find((s) => s.id === id)
      categories.push({ id, label: service?.name ?? id.replace(/-/g, ' ') })
    })

    return categories
  }, [listings])

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
        {listingsLoading ? (
          <ShopPageLoading />
        ) : (
        <>
        {/* ── Mobile Sort + Filter Row ── */}
        <div className={styles.mobileSortRow}>
          {/* Filter button — sits first, visually distinct */}
          <button className={styles.mobileFilterBtn} onClick={() => setShowFiltersModal(true)}>
            <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <path d="M1 3h14M4 8h8M7 13h2" />
            </svg>
            <span className={styles.mobileFilterBtnLabel}>Filter</span>
            {(activeCategory !== 'all' || locationQuery || selectedProvider) && (
              <span className={styles.mobileFilterBadge}>
                {[activeCategory !== 'all', !!locationQuery, !!selectedProvider].filter(Boolean).length}
              </span>
            )}
          </button>

          {/* Divider */}
          <span className={styles.mobileSortDivider} aria-hidden="true" />

          {/* Sort pills */}
          {[
            { value: 'stock-desc', label: 'Availability' },
            { value: 'price-asc',  label: 'Price: Low–High' },
            { value: 'price-desc', label: 'Price: High–Low' },
            { value: 'rating',     label: 'Highest Rated' },
            { value: 'newest',     label: 'Newest' },
          ].map((opt) => (
            <button
              key={opt.value}
              className={`${styles.mobileSortPill}${sortBy === opt.value ? ` ${styles.mobileSortPillActive}` : ''}`}
              onClick={() => setSortAndReset(opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* ── Active category tag (below sort row) ── */}
        {activeCategory !== 'all' && (
          <div className={styles.mobileActiveCatRow}>
            <span className={styles.mobileActiveCat}>
              {availableCategories.find((c) => c.id === activeCategory)?.label}
              <button className={styles.mobileActiveCatClear} onClick={() => setCategoryAndReset('all')} aria-label="Clear category">
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
                    {availableCategories.map((cat) => (
                      <button
                        key={cat.id}
                        className={`${styles.filtersModalCatBtn}${activeCategory === cat.id ? ` ${styles.filtersModalCatBtnActive}` : ''}`}
                        onClick={() => setCategoryAndReset(cat.id)}
                      >
                        <span>{cat.label}</span>
                        {activeCategory === cat.id && (
                          <span className={styles.filtersModalCatCount}>
                            {cat.id === 'all' ? listings.length : filteredListings.length}
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
                      onChange={(e) => setLocationQueryAndReset(e.target.value)}
                      onFocus={() => setLocationFocused(true)}
                      onBlur={() => setLocationFocused(false)}
                      list="location-suggestions-modal"
                    />
                    {locationQuery && (
                      <button className={styles.locationClear} onClick={() => setLocationQueryAndReset('')} aria-label="Clear location">
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
                          onClick={() => setProviderAndReset(selectedProvider === provider.id ? null : provider.id)}
                        >
                          <ShopProviderCircleThumb
                            provider={provider}
                            wrapClassName={styles.providerItemAvatar}
                            imgClassName={styles.providerItemAvatarImg}
                          />
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
                              {getProviderMetrics(provider).rating}
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
                <button className={styles.filtersModalClear} onClick={() => { setCategoryAndReset('all'); setLocationQueryAndReset('') }}>
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
          <div className={styles.sideNavCol}>
          <aside className={styles.sideNav}>
            <div className={styles.sideNavHeader}>
              <span className={styles.sideNavTitle}>Categories</span>
            </div>
            <div className={styles.sideNavScroll}>
            <nav className={styles.sideNavList}>
              {availableCategories.map((cat) => (
                <button
                  key={cat.id}
                  className={`${styles.sideNavItem}${activeCategory === cat.id ? ` ${styles.sideNavItemActive}` : ''}`}
                  onClick={() => setCategoryAndReset(cat.id)}
                >
                  <span className={styles.sideNavLabel}>{cat.label}</span>
                  {activeCategory === cat.id && (
                    <span className={styles.sideNavCount}>
                      {cat.id === 'all' ? listings.length : filteredListings.length}
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
                    onChange={(e) => setLocationQueryAndReset(e.target.value)}
                    onFocus={() => setLocationFocused(true)}
                    onBlur={() => setLocationFocused(false)}
                    list="location-suggestions"
                  />
                  {locationQuery && (
                    <button
                      className={styles.locationClear}
                      onClick={() => setLocationQueryAndReset('')}
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
                      onClick={() => setProviderAndReset(selectedProvider === provider.id ? null : provider.id)}
                    >
                      <ShopProviderCircleThumb
                        provider={provider}
                        wrapClassName={styles.providerItemAvatar}
                        imgClassName={styles.providerItemAvatarImg}
                      />
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
                          {getProviderMetrics(provider).rating}
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
            </div>
          </aside>
          </div>

          {/* ── Main Content ── */}
          <div className={styles.shopMain}>

            {/* ── Search ── */}
            <div className={styles.toolbar}>
            {/* ── Results Indicator ── */}
            <div className={styles.resultsIndicator}>
              <span className={styles.resultsIndicatorText}>Showing </span>
              <span className={styles.resultsIndicatorNum}>{filteredListings.length}</span>
              <span className={styles.resultsIndicatorText}> result{filteredListings.length !== 1 ? 's' : ''}</span>
            </div>
              <div className={styles.sortWrap}>
                <span className={styles.sortLabel}>Sort by</span>
                <select className={styles.sortSelect} value={sortBy} onChange={(e) => setSortAndReset(e.target.value)}>
                  <option value="stock-desc">Availability (in stock first)</option>
                  <option value="price-asc">Price: Low to High</option>
                  <option value="price-desc">Price: High to Low</option>
                  <option value="rating">Highest Rated</option>
                  <option value="newest">Newest</option>
                </select>
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
                <button className={styles.emptyReset} onClick={() => { setCategoryAndReset('all'); setLocationQueryAndReset('') }}>
                  Reset all filters
                </button>
              </div>
            )}

            {/* ── Unified Product Grid ── */}
            {filteredListings.length > 0 && (
              <>
                {/* Desktop grid — hidden on mobile via CSS */}
                <div className={styles.grid}>
                  {paginatedListings.map((listing) => {
                    return (
                      <ListingCard
                        key={listing.id}
                        listing={listing}
                        styles={styles}
                        providerServiceAggregatesByPair={providerServiceAggregatesByPair}
                        inCompare={compareIds.includes(listing.id)}
                        onToggleCompare={toggleCompare}
                        compareDisabled={compareIds.length >= 3 && !compareIds.includes(listing.id)}
                      />
                    )
                  })}
                </div>

                {/* Desktop pagination — hidden on mobile via CSS */}
                {totalPages > 1 && (
                  <div className={`${styles.pagination} ${styles.desktopPagination}`}>
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

                {/* ── Mobile grid + inline pagination — hidden on tablet/desktop via CSS ── */}
                <div className={styles.mobileGrid}>
                  {mobilePaginatedListings.map((listing) => {
                    return (
                      <ListingCard
                        key={listing.id}
                        listing={listing}
                        styles={styles}
                        providerServiceAggregatesByPair={providerServiceAggregatesByPair}
                        inCompare={compareIds.includes(listing.id)}
                        onToggleCompare={toggleCompare}
                        compareDisabled={compareIds.length >= 3 && !compareIds.includes(listing.id)}
                      />
                    )
                  })}
                </div>

                {/* Mobile pagination — immediately after the grid, hidden on tablet/desktop */}
                {mobileTotalPages > 1 && (
                  <div className={styles.mobilePaginationBlock}>
                    {/* Results summary — space always reserved; visible only on last mobile page */}
                    <div className={`${styles.mobilePaginationResults}${mobileCurrentPage === mobileTotalPages ? ` ${styles.mobilePaginationResultsVisible}` : ''}`}>
                      <span className={styles.mobileResultsLabel}>Showing </span>
                      <span className={styles.mobileResultsNum}>{filteredListings.length}</span>
                      <span className={styles.mobileResultsLabel}> result{filteredListings.length !== 1 ? 's' : ''}</span>
                    </div>
                    <div className={styles.pagination}>
                      <button
                        className={`${styles.pageBtn} ${styles.pageBtnPrev}`}
                        onClick={() => { setMobileCurrentPage((p) => Math.max(1, p - 1)); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
                        disabled={mobileCurrentPage === 1}
                        aria-label="Previous page"
                      >
                        <svg viewBox="0 0 10 10" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M6 2L3 5l3 3" />
                        </svg>
                        Prev
                      </button>
                      <div className={styles.pageNumbers}>
                        {Array.from({ length: mobileTotalPages }, (_, i) => i + 1).map((page) => {
                          const isActive = page === mobileCurrentPage
                          const isNear = Math.abs(page - mobileCurrentPage) <= 1
                          const isEdge = page === 1 || page === mobileTotalPages
                          if (!isNear && !isEdge) {
                            if (page === 2 || page === mobileTotalPages - 1) {
                              return <span key={page} className={styles.pageEllipsis}>…</span>
                            }
                            return null
                          }
                          return (
                            <button
                              key={page}
                              className={`${styles.pageNumBtn}${isActive ? ` ${styles.pageNumBtnActive}` : ''}`}
                              onClick={() => { setMobileCurrentPage(page); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
                              aria-current={isActive ? 'page' : undefined}
                            >
                              {page}
                            </button>
                          )
                        })}
                      </div>
                      <button
                        className={`${styles.pageBtn} ${styles.pageBtnNext}`}
                        onClick={() => { setMobileCurrentPage((p) => Math.min(mobileTotalPages, p + 1)); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
                        disabled={mobileCurrentPage === mobileTotalPages}
                        aria-label="Next page"
                      >
                        Next
                        <svg viewBox="0 0 10 10" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M4 2l3 3-3 3" />
                        </svg>
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
        </>
        )}
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
                const listing = listings.find((l) => l.id === id)
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

function ListingCard({
  listing,
  styles,
  inCompare,
  onToggleCompare,
  compareDisabled,
  providerServiceAggregatesByPair = {},
}) {
  const provider = listing.provider ?? PROVIDERS.find((p) => p.id === listing.providerId)
  const pairKey = providerServiceAggPairSegments(listing)?.lookup ?? ''
  const providerServiceAgg = pairKey ? providerServiceAggregatesByPair[pairKey] ?? null : null
  const providerRating =
    providerServiceAgg?.avgRating != null
      ? Number(providerServiceAgg.avgRating).toFixed(1)
      : null
  const providerReviews =
    providerServiceAgg?.reviewCount != null
      ? Number(providerServiceAgg.reviewCount)
      : 0
  const { addItem } = useCart()
  const { user, authLoading, isBuyer } = useAuth()
  const router = useRouter()
  const toast = useToast()
  const [adding, setAdding] = useState(false)

  const redirectLoginPath = `/shop/${listing.serviceId}?listing=${encodeURIComponent(listing.id)}`
  const pkgOpts = listing.sellerPackageOptions ?? []
  const defaultPkg = pkgOpts.length > 0 ? pkgOpts[0] : ''

  const handleAddToCart = async (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (adding) return

    const gate = assertListingReadyForCart(listing, defaultPkg, { user, isBuyer })
    if (!gate.ok) {
      if (gate.needLogin) {
        router.push(`/buyer/login?redirect=${encodeURIComponent(redirectLoginPath)}`)
        return
      }
      toast.error(gate.message)
      return
    }

    const { error: buildErr, payload } = buildCartPayloadFromListing(listing, {
      quantity: 1,
      buyerPackage: defaultPkg,
    })
    if (buildErr || !payload) {
      toast.error(buildErr || 'Could not add to cart')
      return
    }

    setAdding(true)
    try {
      const { error } = await addItem(payload)
      if (error) toast.error(error.message || 'Could not add to cart')
      else toast.success('Added to cart')
    } finally {
      setAdding(false)
    }
  }

  return (
    <div className={`${styles.card} ${styles.listingCard}${inCompare ? ` ${styles.listingCardSelected}` : ''}`}>
      <Link
        href={`/shop/${listing.serviceId}?listing=${encodeURIComponent(listing.id)}`}
        className={styles.listingCardLink}
      >
        <div className={styles.listingImageWrap}>
          {listing.imageUrl || (listing.imageUrls && listing.imageUrls[0]) ? (
            <Image
              src={listing.imageUrl || listing.imageUrls[0]}
              alt={listing.name}
              width={400}
              height={250}
              className={styles.cardImage}
            />
          ) : (
            <div className={styles.listingImagePlaceholder} aria-hidden />
          )}
          {listing.inStock === false && (
            <span className={styles.outOfStockBadge}>Out of Stock</span>
          )}
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
            <ShopProviderCircleThumb
              provider={provider}
              wrapClassName={styles.providerAvatar}
              imgClassName={styles.providerAvatarImg}
            />
            <div className={styles.providerInfo}>
              <p className={styles.providerName}>{provider?.name}</p>
              <p className={styles.providerLocation}>
                <svg viewBox="0 0 12 14" width="9" height="9" fill="var(--color-gold-base, #B8962E)" style={{ marginRight: 3, flexShrink: 0, display: 'inline-block', verticalAlign: 'middle' }} aria-hidden>
                  <path d="M6 0a5 5 0 0 1 5 5c0 4.5-5 9-5 9S1 9.5 1 5a5 5 0 0 1 5-5z" />
                  <circle cx="6" cy="5" r="1.8" fill="white" />
                </svg>
                <span className={styles.providerLocationText} title={provider?.location || undefined}>
                  {provider?.location}
                </span>
            </p>
          </div>
          <div className={styles.ratingGroup}>
            <span className={styles.ratingStars}>
              <svg width="11" height="11" viewBox="0 0 12 12" fill="var(--color-gold-base, #B8962E)">
                <path d="M6 1l1.35 2.73L10.5 4.2l-2.25 2.19.53 3.1L6 7.9l-2.78 1.6.53-3.1L1.5 4.2l3.15-.47z" />
              </svg>
            </span>
            {providerRating ? <span className={styles.ratingNum}>{providerRating}</span> : null}
            <span className={styles.ratingReviews}>
              ({providerReviews ?? 0})
            </span>
          </div>
        </div>

        <div className={styles.listingDivider} />

        <div className={styles.listingTitleRow}>
          <h3 className={styles.cardTitle}>{listing.name}</h3>
          <div className={styles.priceBlock}>
            <span className={styles.priceLabel}>Starting at</span>
            <span className={styles.price}>{formatPhpAmount(listing.price)}</span>
          </div>
        </div>
        </div>
      </Link>

      <div className={styles.cardActions}>
        <button
          type="button"
          className={`${styles.cardCta} ${styles.ctaBtn}`}
          onClick={handleAddToCart}
          disabled={authLoading || adding || listing.inStock === false}
          aria-busy={adding}
        >
          <svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 6, flexShrink: 0 }}>
            <path d="M1 1h2l1.5 7.5h8l1.5-5H4.5" />
            <circle cx="7" cy="13.5" r="1" fill="currentColor" stroke="none" />
            <circle cx="12" cy="13.5" r="1" fill="currentColor" stroke="none" />
          </svg>
          {listing.inStock === false ? 'Out of Stock' : adding ? 'Adding…' : 'Add to Cart'}
        </button>
        <button
          type="button"
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