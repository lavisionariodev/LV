'use client'

import Link from 'next/link'
import Image from 'next/image'
import { use, useState, useEffect, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { getServiceById, CATEGORIES } from '@/data/shopSampleData'
import ContactSellerModal from '@/components/ui/Modal/ContactSellerModal'
import { getRecommendedSimilarServices, getDynamicServicesFromListings } from '@/lib/shop/similarServices'
import { fetchActiveShopListings, mergeShopListings, stockAvailabilityLabel } from '@/lib/shop-listings/client'
import { buildCartPayloadFromListing } from '@/lib/cart/fromListing'
import { assertListingReadyForCart, persistCartPayload } from '@/lib/cart/bookNow'
import { useCart } from '@/contexts/CartContext'
import { useFavorites } from '@/contexts/FavoritesContext'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import { formatPhpAmount } from '@/lib/cart/formatPhp'
import { isUuidLike } from '@/lib/uuidLike'
import { buildSellerContactOptions } from '@/lib/sellers/socialLinks'
import { FaFacebook, FaFacebookMessenger, FaWhatsapp, FaPhoneAlt, FaEnvelope } from 'react-icons/fa'
import styles from './detail.module.css'

export default function ServiceDetailPage({ params }) {
  const { id } = use(params)
  const service = getServiceById(id)
  const { addItem } = useCart()
  const { toggleFavorite, isFavorite } = useFavorites()
  const { user, authLoading, isBuyer } = useAuth()
  const toast = useToast()
  const router = useRouter()
  const searchParams = useSearchParams()
  const listingQuery = searchParams.get('listing')
  const [fullCatalog, setFullCatalog] = useState(null)

  useEffect(() => {
    let cancelled = false
    fetchActiveShopListings({ bustCache: true })
      .then((rows) => {
        if (cancelled) return
        setFullCatalog(mergeShopListings(rows))
      })
      .catch(() => {
        if (!cancelled) setFullCatalog(mergeShopListings([]))
      })
    return () => {
      cancelled = true
    }
  }, [])

  const catalogForChildren = fullCatalog ?? mergeShopListings([])

  const listingsForService = useMemo(() => {
    if (!service) return []
    return catalogForChildren.filter((l) => l.serviceId === service.id)
  }, [service, catalogForChildren])

  const [selectedListingId, setSelectedListingId] = useState('')
  const [buyerPackage, setBuyerPackage] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [addBusy, setAddBusy] = useState(false)
  const [bookBusy, setBookBusy] = useState(false)
  const [addError, setAddError] = useState(null)
  const [saveBusy, setSaveBusy] = useState(false)
  const [chatOpen, setChatOpen] = useState(false)
  const [isMobileView, setIsMobileView] = useState(false)

  useEffect(() => {
    const mql = window.matchMedia('(max-width: 860px)')
    const update = () => setIsMobileView(mql.matches)
    update()
    if (typeof mql.addEventListener === 'function') {
      mql.addEventListener('change', update)
      return () => mql.removeEventListener('change', update)
    }
    mql.addListener(update)
    return () => mql.removeListener(update)
  }, [])

  useEffect(() => {
    const ids = new Set(listingsForService.map((l) => String(l.id)))
    const q = listingQuery ? String(listingQuery) : ''
    if (q && ids.has(q)) {
      // eslint-disable-next-line
      setSelectedListingId(q)
      return
    }
    setSelectedListingId(listingsForService[0]?.id ?? '')
  }, [id, listingsForService, listingQuery])

  const selectedListing = listingsForService.find((l) => l.id === selectedListingId)
  const selectedProviderId = String(
    selectedListing?.provider?.id ?? selectedListing?.providerId ?? '',
  ).trim()
  const listingIdForScopedReviews =
    selectedListingId && isUuidLike(String(selectedListingId)) ? String(selectedListingId).trim() : ''

  const [serviceReviews, setServiceReviews] = useState([])

  useEffect(() => {
    let cancelled = false
    async function loadServiceReviews() {
      if (!service?.id || !selectedProviderId) {
        setServiceReviews([])
        return
      }
      try {
        const listingQs = listingIdForScopedReviews
          ? `&listingId=${encodeURIComponent(listingIdForScopedReviews)}`
          : ''
        const res = await fetch(
          `/api/services/${encodeURIComponent(service.id)}/reviews?sellerId=${encodeURIComponent(selectedProviderId)}${listingQs}`,
          { cache: 'no-store' },
        )
        const body = await res.json().catch(() => null)
        if (!res.ok) {
          throw new Error(typeof body?.error === 'string' ? body.error : 'Failed to load reviews.')
        }
        if (cancelled) return
        setServiceReviews(Array.isArray(body?.reviews) ? body.reviews : [])
      } catch {
        if (cancelled) return
        setServiceReviews([])
      }
    }

    loadServiceReviews()
    return () => {
      cancelled = true
    }
  }, [service?.id, selectedProviderId, listingIdForScopedReviews])

  /** Uploaded listing images only (no service/sample assets). */
  const listingGalleryUrls = useMemo(() => {
    if (!selectedListing) return []
    const urls = selectedListing.imageUrls
    if (Array.isArray(urls) && urls.length) {
      return [...new Set(urls.filter((u) => typeof u === 'string' && u.trim()))]
    }
    if (selectedListing.imageUrl) return [selectedListing.imageUrl]
    return []
  }, [selectedListing])

  const galleryKey = listingGalleryUrls.join('\0')
  const [galleryIndex, setGalleryIndex] = useState(0)
  useEffect(() => {
    // eslint-disable-next-line
    setGalleryIndex(0)
  }, [selectedListingId, galleryKey])

  useEffect(() => {
    // eslint-disable-next-line
    setQuantity(1)
  }, [selectedListingId])

  const mainGallerySrc =
    listingGalleryUrls.length > 0
      ? listingGalleryUrls[Math.min(galleryIndex, listingGalleryUrls.length - 1)]
      : null

  const shopCategoryLabel = CATEGORIES.find((c) => c.id === service.id)?.label ?? ''
  const attrType = selectedListing?.listingKindLabel?.trim() || '—'
  const attrCategory =
    selectedListing?.categoryLabel?.trim() || shopCategoryLabel || '—'
  const attrDuration = selectedListing?.duration?.trim() || '—'
  const attrCoverage = selectedListing?.coverage?.trim() || '—'
  const stockInfo = selectedListing ? stockAvailabilityLabel(selectedListing.inStock) : null

  const buyerPackageOptions = selectedListing?.sellerPackageOptions ?? []

  useEffect(() => {
    const listing = listingsForService.find((l) => l.id === selectedListingId)
    const opts = listing?.sellerPackageOptions ?? []
    if (opts.length === 0) {
      // eslint-disable-next-line
      setBuyerPackage('')
      return
    }
    setBuyerPackage((prev) => (prev && opts.includes(prev) ? prev : opts[0]))
  }, [selectedListingId, listingsForService])
  const provider = selectedListing ? selectedListing.provider ?? null : null

  const [providerAggregates, setProviderAggregates] = useState(null)
  const [providerAggLoaded, setProviderAggLoaded] = useState(false)
  const providerAggPairParam =
    provider?.id && service?.id
      ? listingIdForScopedReviews
        ? `${String(provider.id)}|${String(service.id)}|${listingIdForScopedReviews}`
        : `${String(provider.id)}|${String(service.id)}`
      : ''
  const providerAggLookupKey =
    provider?.id && service?.id
      ? listingIdForScopedReviews
        ? `${String(provider.id)}::${String(service.id)}::${listingIdForScopedReviews}`
        : `${String(provider.id)}::${String(service.id)}`
      : ''

  useEffect(() => {
    let cancelled = false
    async function loadProviderAgg() {
      if (!provider?.id || !service?.id) {
        setProviderAggregates(null)
        setProviderAggLoaded(true)
        return
      }
      setProviderAggLoaded(false)
      try {
        const res = await fetch(
          `/api/ratings/aggregates?pairs=${encodeURIComponent(providerAggPairParam)}`,
          { cache: 'no-store' },
        )
        const body = await res.json().catch(() => null)
        if (cancelled) return
        const agg = body?.aggregatesByPair?.[providerAggLookupKey] ?? null
        setProviderAggregates(agg)
      } catch {
        if (cancelled) return
        setProviderAggregates(null)
      } finally {
        if (!cancelled) setProviderAggLoaded(true)
      }
    }
    loadProviderAgg()
    return () => {
      cancelled = true
    }
  }, [provider?.id, service?.id, providerAggPairParam, providerAggLookupKey])

  useEffect(() => {
    function onVisible() {
      if (document.visibilityState !== 'visible') return
      if (!service?.id || !provider?.id) return
      const listingQs = listingIdForScopedReviews
        ? `&listingId=${encodeURIComponent(listingIdForScopedReviews)}`
        : ''
      fetch(
        `/api/services/${encodeURIComponent(service.id)}/reviews?sellerId=${encodeURIComponent(String(provider.id))}${listingQs}`,
        { cache: 'no-store' },
      )
        .then((res) => res.json().catch(() => null))
        .then((body) => {
          setServiceReviews(Array.isArray(body?.reviews) ? body.reviews : [])
        })
        .catch(() => {
          setServiceReviews([])
        })
      fetch(
        `/api/ratings/aggregates?pairs=${encodeURIComponent(providerAggPairParam)}`,
        {
        cache: 'no-store',
      },
      )
        .then((res) => res.json().catch(() => null))
        .then((body) => {
          const agg = body?.aggregatesByPair?.[providerAggLookupKey] ?? null
          setProviderAggregates(agg)
        })
        .catch(() => {
          setProviderAggregates(null)
        })
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [service?.id, provider?.id, listingIdForScopedReviews, providerAggPairParam, providerAggLookupKey])

  const providerWithAggregates = provider
    ? {
        ...provider,
        rating: providerAggregates ? providerAggregates.avgRating : null,
        reviews: providerAggregates ? providerAggregates.reviewCount : 0,
      }
    : null

  const pairReviewCount = Number(providerAggregates?.reviewCount ?? 0) || 0
  const pairAvgRating =
    providerAggregates?.avgRating != null ? Number(providerAggregates.avgRating) : null
  const hasPairReviews = providerAggLoaded && pairReviewCount > 0

  const pkgOptsForSave = selectedListing?.sellerPackageOptions ?? []
  const effectiveFavoritePkg = pkgOptsForSave.length > 0 ? String(buyerPackage || '').trim() : ''
  const savedToWishlist =
    Boolean(selectedListing) && isFavorite(selectedListing.id, effectiveFavoritePkg)

  const redirectToLogin = () => {
    const target =
      selectedListingId && selectedListing
        ? `/shop/${id}?listing=${encodeURIComponent(selectedListingId)}`
        : `/shop/${id}`
    router.push(`/buyer/login?redirect=${encodeURIComponent(target)}`)
  }

  const handleSaveToggle = async () => {
    if (!selectedListing || !service) return
    if (!user) {
      redirectToLogin()
      return
    }
    if (!isBuyer) {
      redirectToLogin()
      return
    }
    const pkgOpts = selectedListing.sellerPackageOptions ?? []
    if (pkgOpts.length > 0 && !String(buyerPackage || '').trim()) {
      toast.error('Please select a package before saving.')
      return
    }
    const wasSaved = savedToWishlist
    setSaveBusy(true)
    try {
      const { error } = await toggleFavorite(selectedListing, {
        serviceId: id,
        serviceLabel: service.name,
        packageOption: effectiveFavoritePkg,
      })
      if (error) {
        toast.error(error.message || 'Could not update favorites.')
        return
      }
      if (wasSaved) {
        toast.success('Removed from favorites.')
      } else {
        toast.success('Saved to favorites.')
      }
    } finally {
      setSaveBusy(false)
    }
  }

  const handleAddToCart = async () => {
    if (!selectedListing || !service) return
    if (addBusy || bookBusy) return
    setAddError(null)

    const gate = assertListingReadyForCart(selectedListing, buyerPackage, { user, isBuyer })
    if (!gate.ok) {
      if (gate.needLogin) {
        redirectToLogin()
        return
      }
      setAddError(gate.message)
      return
    }

    const { error: buildErr, payload } = buildCartPayloadFromListing(selectedListing, {
      quantity,
      buyerPackage,
      heroImage: mainGallerySrc || listingGalleryUrls[0] || '',
    })
    if (buildErr || !payload) {
      setAddError(buildErr || 'Could not add to cart')
      return
    }

    setAddBusy(true)
    try {
      const result = await persistCartPayload(addItem, payload, {
        fallbackMessage: 'Could not add to cart',
      })
      if (!result.ok) {
        setAddError(result.message)
        toast.error(result.message)
        return
      }
      toast.success('Added to cart')
    } finally {
      setAddBusy(false)
    }
  }

  const handleBookNow = async () => {
    if (!selectedListing || !service) return
    if (addBusy || bookBusy) return
    setAddError(null)

    const gate = assertListingReadyForCart(selectedListing, buyerPackage, { user, isBuyer })
    if (!gate.ok) {
      if (gate.needLogin) {
        redirectToLogin()
        return
      }
      setAddError(gate.message)
      return
    }

    const { error: buildErr, payload } = buildCartPayloadFromListing(selectedListing, {
      quantity,
      buyerPackage,
      heroImage: mainGallerySrc || listingGalleryUrls[0] || '',
    })
    if (buildErr || !payload) {
      setAddError(buildErr || 'Could not start booking')
      return
    }

    setBookBusy(true)
    try {
      const result = await persistCartPayload(addItem, payload, {
        router,
        next: 'checkout',
        fallbackMessage: 'Could not start booking',
      })
      if (!result.ok) {
        setAddError(result.message)
        toast.error(result.message)
      }
    } finally {
      setBookBusy(false)
    }
  }

  const cartActionsDisabled =
    !selectedListing ||
    authLoading ||
    addBusy ||
    bookBusy ||
    selectedListing.inStock === false ||
    (buyerPackageOptions.length > 0 && !String(buyerPackage || '').trim())

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

  if (fullCatalog === null) {
    return (
      <section
        className={styles.detailPage}
        aria-busy="true"
        aria-describedby="shop-detail-loading-hint"
      >
        <div className={styles.content}>
          <p id="shop-detail-loading-hint" role="status" className={styles.visuallyHidden}>
            Loading service listing. Gallery, pricing and actions, provider card, description tabs,
            and reviews will appear shortly.
          </p>
          <article className={`${styles.card} ${styles.detailSkeletonCard}`}>
            <div className={styles.galleryCol} aria-hidden="true">
              <div className={styles.mainImageWrap}>
                <div className={styles.detailSkeletonHero} />
              </div>
              <div className={styles.thumbStrip}>
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className={styles.detailSkeletonThumb} />
                ))}
              </div>
              <div className={styles.galleryMeta}>
                <div className={styles.detailSkeletonPill} />
                <div className={styles.detailSkeletonShareRow}>
                  <div className={styles.detailSkeletonDot} />
                  <div className={styles.detailSkeletonDot} />
                  <div className={styles.detailSkeletonDot} />
                  <div className={styles.detailSkeletonDot} />
                </div>
              </div>
            </div>
            <div className={styles.body} aria-hidden="true">
              <div className={styles.detailSkeletonTitle} />
              <div className={styles.detailSkeletonRatings} />
              <div className={styles.detailSkeletonPrice} />
              <div className={styles.detailSkeletonText} />
              <div className={styles.detailSkeletonTextShort} />
              <hr className={styles.divider} />
              <div className={styles.attributes}>
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className={styles.attrRow}>
                    <div className={styles.detailSkeletonAttrLabel} />
                    <div className={styles.detailSkeletonAttrValue} />
                  </div>
                ))}
              </div>
              <div className={styles.selectors}>
                <div className={styles.detailSkeletonSelect} />
                <div className={styles.detailSkeletonQty} />
              </div>
              <div className={styles.actions}>
                <div className={`${styles.detailSkeletonBtn} ${styles.detailSkeletonBtnPrimary}`} />
                <div className={`${styles.detailSkeletonBtn} ${styles.detailSkeletonBtnOutline}`} />
              </div>
            </div>
          </article>

          <div className={styles.providerCard} aria-hidden="true">
            <div className={styles.providerInfo}>
              <div className={styles.detailSkeletonProviderAvatar} />
              <div className={styles.providerMeta}>
                <div className={styles.detailSkeletonProviderNameBar} />
                <div className={styles.detailSkeletonProviderStatusBar} />
              </div>
              <div className={styles.providerActions}>
                <div className={styles.detailSkeletonProviderBtn} />
                <div
                  className={`${styles.detailSkeletonProviderBtn} ${styles.detailSkeletonProviderBtnWide}`}
                />
              </div>
            </div>
          </div>

          <div className={styles.fullDesc} aria-hidden="true">
            <div className={`${styles.tabNav} ${styles.detailSkeletonTabNavRow}`}>
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className={styles.detailSkeletonTabPill} />
              ))}
            </div>
            <div className={styles.tabContent}>
              <div className={`${styles.tabBody} ${styles.detailSkeletonTabBodyOpen}`}>
                <div className={styles.detailSkeletonText} />
                <div className={styles.detailSkeletonText} />
                <div className={styles.detailSkeletonText} />
                <div className={styles.detailSkeletonTextShort} />
              </div>
            </div>
          </div>

          <div className={styles.reviewsBox} aria-hidden="true">
            <div className={styles.detailSkeletonReviewsHeader}>
              <div className={styles.detailSkeletonReviewsTitle} />
              <div className={styles.detailSkeletonReviewsChip} />
            </div>
            {[0, 1, 2].map((i) => (
              <div key={i} className={styles.detailSkeletonReviewsRow}>
                <div className={styles.detailSkeletonReviewsAvatar} />
                <div className={styles.detailSkeletonReviewsBody}>
                  <div className={styles.detailSkeletonText} />
                  <div className={styles.detailSkeletonTextShort} />
                  <div className={styles.detailSkeletonReviewsMetaBar} />
                </div>
              </div>
            ))}
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
              {mainGallerySrc ? (
                <Image
                  src={mainGallerySrc}
                  alt={selectedListing?.name || service.name}
                  fill
                  sizes="(max-width: 800px) 100vw, 480px"
                  priority
                  className={styles.mainImage}
                />
              ) : (
                <div className={styles.mainImagePlaceholder} aria-hidden />
              )}
            </div>
            <div className={styles.thumbStrip}>
              {listingGalleryUrls.length > 0 ? (
                listingGalleryUrls.map((src, i) => (
                  <button
                    key={`${src}-${i}`}
                    type="button"
                    className={`${styles.thumb} ${i === galleryIndex ? styles.thumbActive : ''}`}
                    onClick={() => setGalleryIndex(i)}
                    aria-label={`Show image ${i + 1}`}
                    aria-pressed={i === galleryIndex}
                  >
                    <Image
                      src={src}
                      alt={`${selectedListing?.name || service.name} view ${i + 1}`}
                      fill
                      sizes="80px"
                      className={styles.thumbImg}
                    />
                  </button>
                ))
              ) : (
                <div className={`${styles.thumb} ${styles.thumbActive}`}>
                  <div className={styles.thumbPlaceholder} aria-hidden />
                </div>
              )}
            </div>

            {/* ── Save + Share row ── */}
            <div className={styles.galleryMeta}>
              <button
                type="button"
                className={`${styles.btnSaveGallery}${savedToWishlist ? ` ${styles.btnSaveGalleryActive}` : ''}`}
                aria-label={savedToWishlist ? 'Remove from saved' : 'Save to wishlist'}
                aria-pressed={savedToWishlist}
                disabled={!selectedListing || authLoading || saveBusy}
                onClick={handleSaveToggle}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill={savedToWishlist ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                </svg>
                {saveBusy ? '…' : savedToWishlist ? 'Saved' : 'Save'}
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
            <h2 className={styles.title}>{selectedListing?.name || service.name}</h2>

            {/* Ratings row */}
            <div className={styles.ratingsRow}>
              {!hasPairReviews ? (
                <span className={styles.ratingCount}>No reviews yet</span>
              ) : (
                <>
                  <StarRow
                    rating={pairAvgRating != null && Number.isFinite(pairAvgRating) ? pairAvgRating : 0}
                    styles={styles}
                    size={14}
                  />
                  <span className={styles.ratingScore}>
                    {pairAvgRating != null && Number.isFinite(pairAvgRating)
                      ? pairAvgRating.toFixed(1)
                      : '0.0'}
                  </span>
                  <span className={styles.ratingCount}>
                    · {pairReviewCount} seller reviews
                  </span>
                </>
              )}
              <span
                className={`${styles.stockBadge}${stockInfo && !stockInfo.inStock ? ` ${styles.stockBadgeOut}` : ''}`}
              >
                {stockInfo?.text ?? 'In Stock'}
              </span>
            </div>

            {/* Price */}
            <div className={styles.priceRow}>
              <span className={styles.price}>
                {selectedListing?.price != null
                  ? formatPhpAmount(selectedListing.price)
                  : '₱ Contact for pricing'}
              </span>
              {service.priceNote && <span className={styles.priceNote}>{service.priceNote}</span>}
            </div>

            {/* Short description — 2–3 lines max */}
            <p className={styles.shortDesc}>
              {selectedListing?.description?.trim() ||
                service.shortDescription ||
                `A thoughtfully curated memorial service that honors your loved one with grace, 
                 dignity, and compassion — guiding your family through every step of the process.`}
            </p>

            {/* Divider */}
            <hr className={styles.divider} />

            {/* Attributes table */}
            <dl className={styles.attributes}>
              <div className={styles.attrRow}>
                <dt className={styles.attrLabel}>Type</dt>
                <dd className={styles.attrValue}>{attrType}</dd>
              </div>
              <div className={styles.attrRow}>
                <dt className={styles.attrLabel}>Category</dt>
                <dd className={styles.attrValue}>{attrCategory}</dd>
              </div>
              <div className={styles.attrRow}>
                <dt className={styles.attrLabel}>Duration</dt>
                <dd className={styles.attrValue}>{attrDuration}</dd>
              </div>
              <div className={styles.attrRow}>
                <dt className={styles.attrLabel}>Coverage</dt>
                <dd className={styles.attrValue}>{attrCoverage}</dd>
              </div>
            </dl>

            {/* Size / Quantity selectors */}
            <div className={styles.selectors}>
              {buyerPackageOptions.length > 0 ? (
                <div className={styles.selectorGroup}>
                  <label className={styles.selectorLabel}>Package</label>
                  <select
                    className={styles.select}
                    value={buyerPackage}
                    onChange={(e) => setBuyerPackage(e.target.value)}
                  >
                    {buyerPackageOptions.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}
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
                    aria-label="Increase quantity"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className={styles.actions}>
              <button
                type="button"
                className={styles.btnBookNow}
                onClick={handleBookNow}
                disabled={cartActionsDisabled}
                aria-busy={bookBusy}
              >
                {bookBusy ? 'Booking…' : selectedListing?.inStock === false ? 'Out of Stock' : 'Book Now'}
              </button>
              <div className={styles.cartSaveRow}>
                <button
                  type="button"
                  className={styles.btnAddToCart}
                  onClick={handleAddToCart}
                  disabled={cartActionsDisabled}
                >
                  {addBusy ? 'Adding…' : selectedListing?.inStock === false ? 'Out of Stock' : 'Add to Cart'}
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
        {providerWithAggregates && (
          <ProviderCard
            key={String(providerWithAggregates.id)}
            provider={providerWithAggregates}
            styles={styles}
            allListings={catalogForChildren}
            chatOpen={chatOpen}
            setChatOpen={setChatOpen}
          />
        )}

        {/* ── BELOW THE FOLD: Full description (tabbed) ── */}
        <FullDescriptionSection
          service={service}
          selectedListing={selectedListing}
          styles={styles}
          allListings={catalogForChildren}
        />

        {/* ── REVIEWS: Separate box ── */}
        <ReviewsSection reviews={serviceReviews} styles={styles} />
      </div>

      {/* ── MOBILE STICKY ACTION BAR ── */}
      <div className={styles.mobileActionBar}>
        {/* Chat Now — opens provider chat if provider exists */}
        <button type="button" className={styles.mobileActionBarChat} aria-label="Chat Now" onClick={() => setChatOpen((o) => !o)}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
          Chat
        </button>
        <button
          type="button"
          className={styles.mobileActionBarBook}
          onClick={handleBookNow}
          disabled={cartActionsDisabled}
          aria-busy={bookBusy}
        >
          {bookBusy ? 'Booking…' : selectedListing?.inStock === false ? 'Out of Stock' : 'Book Now'}
        </button>
        <button
          type="button"
          className={styles.mobileActionBarCart}
          onClick={handleAddToCart}
          disabled={cartActionsDisabled}
        >
          {addBusy ? 'Adding…' : selectedListing?.inStock === false ? 'Out of Stock' : 'Add to Cart'}
        </button>
      </div>
      <ContactSellerModal
        open={Boolean(chatOpen && isMobileView && provider)}
        onClose={() => setChatOpen(false)}
        sellerName={provider?.name ?? ''}
        sellerAvatarUrl={provider?.image ?? ''}
        socialLinks={provider?.socialLinks ?? {}}
      />
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

/** Whole calendar days from `joinedDate` to `now` (non-negative). */
function fullDaysSince(joinedDate, now = new Date()) {
  const start = new Date(joinedDate)
  if (Number.isNaN(start.getTime())) return 0
  return Math.max(0, Math.floor((now - start) / (1000 * 60 * 60 * 24)))
}

/**
 * "Joined" label: days, weeks, months, or years (not years-only).
 * Under 7d → days; under 30d → weeks; under 365d → months; else years.
 */
function formatJoinedAgo(joinedDate, now = new Date()) {
  const d = fullDaysSince(joinedDate, now)
  if (d < 1) return 'Today'
  if (d < 7) return `${d} day${d !== 1 ? 's' : ''} ago`
  if (d < 30) {
    const w = Math.floor(d / 7)
    return `${w} week${w !== 1 ? 's' : ''} ago`
  }
  if (d < 365) {
    const m = Math.max(1, Math.floor(d / 30))
    return `${m} month${m !== 1 ? 's' : ''} ago`
  }
  const y = Math.floor(d / 365)
  return `${y} year${y !== 1 ? 's' : ''} ago`
}

/**
 * "In service" tenure: same tiers, no "ago" (e.g. "3 weeks", "2 months").
 */
function formatTenureLength(joinedDate, now = new Date()) {
  const d = fullDaysSince(joinedDate, now)
  if (d < 1) return 'Less than a day'
  if (d < 7) return `${d} day${d !== 1 ? 's' : ''}`
  if (d < 30) {
    const w = Math.floor(d / 7)
    return `${w} week${w !== 1 ? 's' : ''}`
  }
  if (d < 365) {
    const m = Math.max(1, Math.floor(d / 30))
    return `${m} month${m !== 1 ? 's' : ''}`
  }
  const y = Math.floor(d / 365)
  return `${y} year${y !== 1 ? 's' : ''}`
}



function FullDescriptionSection({ service, selectedListing, styles, allListings = [] }) {
  const [activeTab, setActiveTab] = useState('description')
  const [expanded, setExpanded] = useState(false)

  const dynamicServices = useMemo(() => getDynamicServicesFromListings(allListings), [allListings])

  const cheapestListingByServiceId = useMemo(() => {
    const map = new Map()
    for (const l of allListings || []) {
      const sid = l?.serviceId
      if (!sid) continue
      const priceNum = Number(l.price)
      if (!Number.isFinite(priceNum) || priceNum < 0) continue
      const existing = map.get(sid)
      if (!existing || priceNum < existing.priceNum) {
        map.set(sid, { listing: l, priceNum })
      }
    }
    return map
  }, [allListings])

  const similarServices = useMemo(
    () =>
      getRecommendedSimilarServices({
        currentServiceId: service.id,
        selectedListing,
        allServices: dynamicServices,
        allListings,
        limit: 3,
      }),
    [service.id, selectedListing, dynamicServices, allListings],
  )

  const tabs = useMemo(() => {
    const allTabs = [
      { id: 'description', label: "What's Included" },
      { id: 'who', label: 'Who This Is For' },
      { id: 'notes', label: 'Important Notes' },
    ]
    return similarServices.length > 0 ? [...allTabs, { id: 'similar', label: 'Similar Services' }] : allTabs
  }, [similarServices.length])

  const isSimilarTab = activeTab === 'similar'

  // Reset to first tab if current tab is hidden
  useEffect(() => {
    if (!tabs.find(t => t.id === activeTab)) {
      // eslint-disable-next-line
      setActiveTab('description')
    }
  }, [tabs, activeTab])

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
                    {selectedListing?.description?.trim() ? selectedListing.description.trim() : 'No description available.'}
                  </p>
                  {selectedListing?.inclusions?.length > 0 && (
                    <ul className={styles.featureGrid}>
                      {selectedListing.inclusions.map((item, idx) => (
                        <li key={idx}>{item}</li>
                      ))}
                    </ul>
                  )}
                </>
              )}
              {activeTab === 'who' && (
                <p className={styles.tabText}>
                  {selectedListing?.whoThisIsFor?.trim() || 'Information not provided.'}
                </p>
              )}
              {activeTab === 'notes' && (
                <p className={styles.tabText}>
                  {selectedListing?.importantNotes?.trim() || 'No additional notes.'}
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
                    const lowestListing = cheapestListingByServiceId.get(s.id)?.listing ?? null
                    const similarHref =
                      lowestListing != null
                        ? `/shop/${s.id}?listing=${encodeURIComponent(lowestListing.id)}`
                        : `/shop/${s.id}`
                    return (
                      <Link key={s.id} href={similarHref} className={styles.similarCard}>
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
                              From {formatPhpAmount(lowestListing.price)}
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
const REVIEWS_PER_PAGE = 5

function ReviewsSection({ reviews = [], styles }) {
  const [page, setPage]             = useState(1)
  const [starFilter, setStarFilter] = useState('all')   // 'all' | '5'|'4'|'3'|'2'|'1'
  const [mediaFilter, setMediaFilter] = useState('all') // 'all' | 'image' | 'video' | 'any'
  const [starOpen, setStarOpen]     = useState(false)
  const [mediaOpen, setMediaOpen]   = useState(false)

  const avgRating = reviews.length
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : null

  const imageCount  = reviews.filter((r) => r.images && r.images.length > 0).length
  const videoCount  = reviews.filter((r) => r.videos && r.videos.length > 0).length
  const attachCount = reviews.filter((r) =>
    (r.images && r.images.length > 0) || (r.videos && r.videos.length > 0)
  ).length

  // Apply filters
  const filtered = reviews.filter((r) => {
    if (starFilter !== 'all' && r.rating !== Number(starFilter)) return false
    if (mediaFilter === 'image') return r.images && r.images.length > 0
    if (mediaFilter === 'video') return r.videos && r.videos.length > 0
    if (mediaFilter === 'any')   return (r.images && r.images.length > 0) || (r.videos && r.videos.length > 0)
    return true
  })

  const totalPages = Math.ceil(filtered.length / REVIEWS_PER_PAGE)
  const paginated  = filtered.slice((page - 1) * REVIEWS_PER_PAGE, page * REVIEWS_PER_PAGE)

  const handlePage = (p) => {
    setPage(p)
    document.getElementById('reviews-box')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const pickStar = (val) => { setStarFilter(val); setStarOpen(false); setPage(1) }
  const pickMedia = (val) => { setMediaFilter(val); setMediaOpen(false); setPage(1) }

  const hasActiveFilter = starFilter !== 'all' || mediaFilter !== 'all'

  // Dropdown label helpers
  const starLabel = starFilter === 'all'
    ? 'All Ratings'
    : `${'★'.repeat(Number(starFilter))} ${starFilter} Star${starFilter !== '1' ? 's' : ''}`
  const mediaLabel = {
    all: 'All Reviews', image: 'With Images', video: 'With Videos', any: 'With Attachments',
  }[mediaFilter]

  return (
    <div className={styles.reviewsBox} id="reviews-box">
      {/* ── Header ── */}
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
              <span className={styles.reviewsScoreCount}>
                {reviews.length} service review{reviews.length !== 1 ? 's' : ''}
              </span>
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
          {/* ── Rating bars + dropdowns row ── */}
          <div className={styles.reviewsFilterArea}>
            {/* Clickable star bars */}
            <div className={styles.reviewsBars}>
              {[5, 4, 3, 2, 1].map((star) => {
                const count = reviews.filter((r) => r.rating === star).length
                const pct   = Math.round((count / reviews.length) * 100)
                const isActive = starFilter === String(star)
                return (
                  <button
                    key={star}
                    className={`${styles.reviewsBarRow} ${styles.reviewsBarRowBtn} ${isActive ? styles.reviewsBarRowActive : ''}`}
                    onClick={() => pickStar(isActive ? 'all' : String(star))}
                    aria-pressed={isActive}
                    aria-label={`Filter by ${star} stars`}
                  >
                    <span className={styles.reviewsBarLabel}>{star}</span>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="#E8A020" className={styles.reviewsBarStar}>
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                    </svg>
                    <div className={styles.reviewsBarTrack}>
                      <div className={styles.reviewsBarFill} style={{ width: `${pct}%` }} />
                    </div>
                    <span className={styles.reviewsBarCount}>{count}</span>
                  </button>
                )
              })}
            </div>

            {/* Dropdowns column */}
            <div className={styles.reviewsDropdownsCol}>
              <span className={styles.reviewsFilterLabel}>Filter by</span>

              {/* ── Star rating dropdown ── */}
              <div className={styles.reviewsDropdownWrap}>
                <button
                  className={`${styles.reviewsDropdownTrigger} ${starFilter !== 'all' ? styles.reviewsDropdownTriggerActive : ''}`}
                  onClick={() => { setStarOpen((o) => !o); setMediaOpen(false) }}
                  aria-haspopup="listbox"
                  aria-expanded={starOpen}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill={starFilter !== 'all' ? '#C6A96C' : 'none'} stroke={starFilter !== 'all' ? '#C6A96C' : 'currentColor'} strokeWidth="1.8">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                  </svg>
                  <span>{starLabel}</span>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={`${styles.reviewsDropdownChevron} ${starOpen ? styles.reviewsDropdownChevronOpen : ''}`}>
                    <polyline points="6 9 12 15 18 9"/>
                  </svg>
                </button>
                {starOpen && (
                  <>
                    <div className={styles.reviewsDropdownBackdrop} onClick={() => setStarOpen(false)} />
                    <ul className={styles.reviewsDropdownMenu} role="listbox">
                      {[
                        { val: 'all', label: 'All Ratings', count: reviews.length },
                        ...([5,4,3,2,1].map((s) => ({
                          val: String(s),
                          label: `${'★'.repeat(s)} ${s} Star${s !== 1 ? 's' : ''}`,
                          count: reviews.filter((r) => r.rating === s).length,
                        }))),
                      ].map(({ val, label, count }) => (
                        <li
                          key={val}
                          role="option"
                          aria-selected={starFilter === val}
                          className={`${styles.reviewsDropdownItem} ${starFilter === val ? styles.reviewsDropdownItemActive : ''} ${count === 0 ? styles.reviewsDropdownItemDisabled : ''}`}
                          onClick={() => count > 0 && pickStar(val)}
                        >
                          <span>{label}</span>
                          <span className={styles.reviewsDropdownCount}>{count}</span>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </div>

              {/* ── Media / attachment dropdown ── */}
              <div className={styles.reviewsDropdownWrap}>
                <button
                  className={`${styles.reviewsDropdownTrigger} ${mediaFilter !== 'all' ? styles.reviewsDropdownTriggerActive : ''}`}
                  onClick={() => { setMediaOpen((o) => !o); setStarOpen(false) }}
                  aria-haspopup="listbox"
                  aria-expanded={mediaOpen}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={mediaFilter !== 'all' ? '#C6A96C' : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
                  </svg>
                  <span>{mediaLabel}</span>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={`${styles.reviewsDropdownChevron} ${mediaOpen ? styles.reviewsDropdownChevronOpen : ''}`}>
                    <polyline points="6 9 12 15 18 9"/>
                  </svg>
                </button>
                {mediaOpen && (
                  <>
                    <div className={styles.reviewsDropdownBackdrop} onClick={() => setMediaOpen(false)} />
                    <ul className={styles.reviewsDropdownMenu} role="listbox">
                      {[
                        { val: 'all',   label: 'All Reviews',       icon: null,      count: reviews.length },
                        { val: 'any',   label: 'With Attachments',  icon: 'attach',  count: attachCount },
                        { val: 'image', label: 'With Images',        icon: 'image',   count: imageCount },
                        { val: 'video', label: 'With Videos',        icon: 'video',   count: videoCount },
                      ].map(({ val, label, icon, count }) => (
                        <li
                          key={val}
                          role="option"
                          aria-selected={mediaFilter === val}
                          className={`${styles.reviewsDropdownItem} ${mediaFilter === val ? styles.reviewsDropdownItemActive : ''} ${count === 0 ? styles.reviewsDropdownItemDisabled : ''}`}
                          onClick={() => count > 0 && pickMedia(val)}
                        >
                          <span className={styles.reviewsDropdownItemInner}>
                            {icon === 'attach' && (
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
                              </svg>
                            )}
                            {icon === 'image' && (
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
                              </svg>
                            )}
                            {icon === 'video' && (
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/>
                              </svg>
                            )}
                            {label}
                          </span>
                          <span className={styles.reviewsDropdownCount}>{count}</span>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </div>

              {/* Clear button */}
              {hasActiveFilter && (
                <button
                  className={styles.reviewsClearBtn}
                  onClick={() => { setStarFilter('all'); setMediaFilter('all'); setPage(1) }}
                >
                  ✕ Clear
                </button>
              )}
            </div>
          </div>

          {/* ── Active filter status ── */}
          {hasActiveFilter && (
            <p className={styles.reviewsFilterStatus}>
              Showing <strong>{filtered.length}</strong> of {reviews.length} review{reviews.length !== 1 ? 's' : ''}
              {starFilter !== 'all' && <> · {starFilter}★</>}
              {mediaFilter !== 'all' && <> · {mediaLabel.toLowerCase()}</>}
            </p>
          )}

          {filtered.length === 0 ? (
            <div className={styles.reviewsEmpty}>
              <p className={styles.reviewsEmptyTitle}>No reviews match this filter</p>
              <button
                className={styles.reviewsClearBtn}
                onClick={() => { setStarFilter('all'); setMediaFilter('all'); setPage(1) }}
              >
                ✕ Clear filters
              </button>
            </div>
          ) : (
            <>
              <div className={styles.reviewsList}>
                {paginated.map((review) => {
                  const hasImages = review.images && review.images.length > 0
                  const hasVideos = review.videos && review.videos.length > 0
                  return (
                    <div key={review.id} className={styles.reviewCard}>
                      <div className={styles.reviewHeader}>
                        <div className={styles.reviewAvatar}>{(review.author?.[0] || 'B').toUpperCase()}</div>
                        <div className={styles.reviewMeta}>
                          <span className={styles.reviewAuthor}>
                            {review.author}
                            {(hasImages || hasVideos) && (
                              <span className={styles.reviewAttachBadge} title="Includes attachments">
                                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
                                </svg>
                              </span>
                            )}
                          </span>
                          <span className={styles.reviewDate}>
                            {new Date(review.date).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })}
                          </span>
                        </div>
                        <StarRow rating={review.rating} styles={styles} size={13} />
                      </div>
                      {review.title && <p className={styles.reviewTitle}>{review.title}</p>}
                      <p className={styles.reviewBody}>{review.body}</p>

                      {/* ── Images ── */}
                      {hasImages && (
                        <div className={styles.reviewMedia}>
                          {review.images.map((src, i) => (
                            <a key={i} href={src} target="_blank" rel="noopener noreferrer" className={styles.reviewMediaThumb}>
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={src} alt={`Review image ${i + 1}`} className={styles.reviewMediaImg} />
                              <span className={styles.reviewMediaBadge}>
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                              </span>
                            </a>
                          ))}
                        </div>
                      )}

                      {/* ── Videos ── */}
                      {hasVideos && (
                        <div className={styles.reviewMedia}>
                          {review.videos.map((src, i) => (
                            <div key={i} className={styles.reviewMediaThumb}>
                              <video src={src} className={styles.reviewMediaImg} muted playsInline preload="metadata" />
                              <span className={`${styles.reviewMediaBadge} ${styles.reviewMediaBadgeVideo}`}>
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className={styles.pagination}>
                  <button className={`${styles.pageBtn} ${styles.pageBtnNav}`} onClick={() => handlePage(page - 1)} disabled={page === 1} aria-label="Previous page">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                    <button key={p} className={`${styles.pageBtn} ${p === page ? styles.pageBtnActive : ''}`} onClick={() => handlePage(p)} aria-label={`Page ${p}`} aria-current={p === page ? 'page' : undefined}>{p}</button>
                  ))}
                  <button className={`${styles.pageBtn} ${styles.pageBtnNav}`} onClick={() => handlePage(page + 1)} disabled={page === totalPages} aria-label="Next page">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
                  </button>
                  <span className={styles.pageInfo}>{(page - 1) * REVIEWS_PER_PAGE + 1}–{Math.min(page * REVIEWS_PER_PAGE, filtered.length)} of {filtered.length}</span>
                </div>
              )}
            </>
          )}
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
function iconForPlatform(platform) {
  if (platform === 'messenger') return <FaFacebookMessenger />
  if (platform === 'facebook') return <FaFacebook />
  if (platform === 'whatsapp') return <FaWhatsapp />
  if (platform === 'phone') return <FaPhoneAlt />
  if (platform === 'email') return <FaEnvelope />
  return null
}

function ProviderCard({ provider, styles, allListings = [], chatOpen, setChatOpen }) {
  const [chatOpenInternal, setChatOpenInternal] = useState(false)

  // Use external state if provided, otherwise use internal
  const effectiveChatOpen = chatOpen !== undefined ? chatOpen : chatOpenInternal
  const effectiveSetChatOpen = setChatOpen || setChatOpenInternal

  // ── Computed stats from real data ──
  const providerListings = allListings.filter((l) => String(l.providerId) === String(provider.id))
  const avgRating = provider.rating != null ? Number(provider.rating).toFixed(1) : null

  const reviewCount = provider.reviews != null ? Number(provider.reviews) : 0
  const serviceCount = providerListings.length || provider.products || 0

  // ── Time-dependent values: computed client-side only to avoid SSR hydration mismatch ──
  const [activeStatus, setActiveStatus] = useState(null)
  const [joinedText, setJoinedText] = useState(provider.joined ?? null)
  const [yearsInService, setYearsInService] = useState(provider.yearsInService ?? null)

  useEffect(() => {
    const now = new Date()

    // Active status
    if (provider.lastActive) {
      // eslint-disable-next-line
      setActiveStatus(timeAgo(provider.lastActive))
    } else if (provider.activeStatus) {
      setActiveStatus({ text: provider.activeStatus, isActive: false })
    } else {
      setActiveStatus(null)
    }

    // Joined = website signup (sellers.registered_at); In Service = business start (sellers.business_started_at)
    if (provider.joinedDate) {
      const joined = new Date(provider.joinedDate)
      setJoinedText(
        Number.isNaN(joined.getTime()) ? null : formatJoinedAgo(joined, now),
      )
    } else {
      setJoinedText(null)
    }

    if (provider.businessStartedAt) {
      const ops = new Date(provider.businessStartedAt)
      setYearsInService(
        Number.isNaN(ops.getTime()) ? null : formatTenureLength(ops, now),
      )
    } else {
      setYearsInService(null)
    }
  }, [
    provider.lastActive,
    provider.activeStatus,
    provider.joinedDate,
    provider.businessStartedAt,
    provider.id,
  ])

  const contacts = buildSellerContactOptions({ sellerName: provider.name, socialLinks: provider.socialLinks })

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
          {activeStatus && (
            <span className={`${styles.providerStatus} ${activeStatus.isActive ? styles.providerStatusActive : styles.providerStatusInactive}`}>
              <span className={`${styles.providerStatusDot} ${activeStatus.isActive ? styles.providerStatusDotActive : styles.providerStatusDotInactive}`} />
              {activeStatus.text}
            </span>
          )}
        </div>
        <div className={styles.providerActions}>
          {/* Chat Now */}
          <div className={styles.chatWrap}>
            <button
              className={styles.btnChatNow}
              onClick={() => effectiveSetChatOpen((o) => !o)}
              aria-expanded={effectiveChatOpen}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
              Chat Now
            </button>
            {effectiveChatOpen && (
              <>
                <div className={styles.chatBackdrop} onClick={() => effectiveSetChatOpen(false)} />
                <div className={styles.chatDropdown}>
                  <p className={styles.chatDropdownLabel}>Contact via</p>
                  {contacts.map((c) => (
                    <a
                      key={c.platform}
                      href={c.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.chatOption}
                      onClick={() => effectiveSetChatOpen(false)}
                    >
                      <span className={styles.chatOptionIcon}>{iconForPlatform(c.platform)}</span>
                      {c.label}
                    </a>
                  ))}
                </div>
              </>
            )}
          </div>
          {/* Visit Shop */}
          <Link
            href={
              isUuidLike(String(provider.id))
                ? `/seller-profile?seller=${encodeURIComponent(String(provider.id))}`
                : `/providers/${String(provider.id)}`
            }
            className={styles.btnVisitShop}
          >
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
        {/* Response Rate removed from UI */}
      </div>
    </div>
  )
}