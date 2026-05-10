'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useMemo, useState, useEffect } from 'react'
import { PROVIDERS, SERVICES } from '@/data/shopSampleData'
import {
  fetchActiveShopListings,
  getListingProviderLogoUrl,
  mergeShopListings,
  stockAvailabilityLabel,
} from '@/lib/shop-listings/client'
import { formatPhpAmount } from '@/lib/cart/formatPhp'
import shopStyles from '../shop.module.css'
import styles from './compare.module.css'

const COMPARE_SKELETON_ROW_LABELS = [
  'Starting Price',
  'Provider Rating',
  'Location',
  'Inclusions',
  'Availability',
]

/**
 * Skeleton layout mirroring header → highlights strip → comparison table.
 */
function ComparePageLoading({ columnCount }) {
  const cols = Math.min(Math.max(columnCount, 2), 3)
  return (
    <section
      className={styles.page}
      aria-busy="true"
      aria-describedby="compare-page-loading-hint"
    >
      <div className={styles.content}>
        <p id="compare-page-loading-hint" role="status" className={shopStyles.visuallyHidden}>
          Loading comparison. Highlight summaries and a side-by-side table for your selected
          services will appear shortly.
        </p>

        <header className={styles.header} aria-hidden="true">
          <div className={`${shopStyles.shopSkeletonBlock} ${shopStyles.compareSkeletonHeaderLine}`} />
          <div className={`${shopStyles.shopSkeletonBlock} ${shopStyles.compareSkeletonSubtitle}`} />
        </header>

        <div className={styles.compareHighlightsSkeleton} aria-hidden="true">
          {[0, 1, 2].map((i) => (
            <div key={i}>
              <div
                className={`${shopStyles.shopSkeletonBlock} ${shopStyles.compareSkeletonHighlightLine1}`}
              />
              <div
                className={`${shopStyles.shopSkeletonBlock} ${shopStyles.compareSkeletonHighlightLine2}`}
              />
            </div>
          ))}
        </div>

        <div className={styles.tableWrapper}>
          <div className={styles.scrollHint}>
            <span className={styles.scrollHintInner}>
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                style={{ display: 'inline', verticalAlign: 'middle', marginRight: 5 }}
              >
                <path
                  d="M3 8h10M9 4l4 4-4 4"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Slide to compare
            </span>
          </div>
          <div className={styles.tableCard}>
            <div className={shopStyles.compareTableWrap}>
              <table className={shopStyles.compareTable}>
                <thead>
                  <tr>
                    <th className={shopStyles.compareTableLabel} />
                    {Array.from({ length: cols }, (_, i) => (
                      <th key={i} className={shopStyles.compareTableHead}>
                        <div className={shopStyles.compareColHeader}>
                          <div
                            className={`${shopStyles.shopSkeletonBlock} ${shopStyles.compareSkeletonThAvatar}`}
                          />
                          <div
                            className={`${shopStyles.shopSkeletonBlock} ${shopStyles.compareSkeletonThTitle}`}
                          />
                          <div
                            className={`${shopStyles.shopSkeletonBlock} ${shopStyles.compareSkeletonThSub}`}
                          />
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {COMPARE_SKELETON_ROW_LABELS.map((label) => (
                    <tr key={label} className={shopStyles.compareRow}>
                      <td className={shopStyles.compareRowLabel}>{label}</td>
                      {Array.from({ length: cols }, (_, i) => (
                        <td key={i} className={shopStyles.compareRowCell}>
                          {label === 'Inclusions' ? (
                            <div className={shopStyles.compareSkeletonInclusionStack}>
                              <div
                                className={`${shopStyles.shopSkeletonBlock} ${shopStyles.compareSkeletonCellWide}`}
                              />
                              <div
                                className={`${shopStyles.shopSkeletonBlock} ${shopStyles.compareSkeletonCellWide}`}
                              />
                              <div
                                className={`${shopStyles.shopSkeletonBlock} ${shopStyles.compareSkeletonCell}`}
                              />
                            </div>
                          ) : (
                            <div
                              className={`${shopStyles.shopSkeletonBlock} ${shopStyles.compareSkeletonCell}`}
                            />
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                  <tr className={shopStyles.compareRowActions}>
                    <td className={shopStyles.compareRowLabel} />
                    {Array.from({ length: cols }, (_, i) => (
                      <td key={i} className={shopStyles.compareRowCell}>
                        <div
                          className={`${shopStyles.shopSkeletonBlock} ${shopStyles.compareSkeletonCtaBar}`}
                        />
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <footer className={styles.footer} aria-hidden="true">
          <div className={`${shopStyles.shopSkeletonBlock} ${shopStyles.compareSkeletonFooterBtn}`} />
          <div className={`${shopStyles.shopSkeletonBlock} ${shopStyles.compareSkeletonFooterBtnPrimary}`} />
        </footer>
      </div>
    </section>
  )
}

export default function ComparePage() {
  const searchParams = useSearchParams()
  const [catalog, setCatalog] = useState(null)

  useEffect(() => {
    let cancelled = false
    fetchActiveShopListings({ bustCache: true })
      .then((rows) => {
        if (cancelled) return
        setCatalog(mergeShopListings(rows))
      })
      .catch(() => {
        if (!cancelled) setCatalog(mergeShopListings([]))
      })
    return () => {
      cancelled = true
    }
  }, [])

  const idsParam = searchParams.get('ids') || ''
  const compareIds = useMemo(() => {
    const raw = idsParam.split(',').map((s) => s.trim()).filter(Boolean)
    return [...new Set(raw)]
  }, [idsParam])

  const compareListings = useMemo(() => {
    if (!catalog) return []
    return compareIds
      .map((id) => {
        const listing = catalog.find((l) => String(l.id) === String(id))
        const provider = listing
          ? (listing.provider ?? PROVIDERS.find((p) => String(p.id) === String(listing.providerId)))
          : null
        const service = SERVICES.find((s) => s.id === listing?.serviceId)
        return { listing, provider, service }
      })
      .filter((x) => x.listing)
  }, [compareIds, catalog])

  const catalogLoading = catalog === null
  const compareSkeletonColumns = Math.min(Math.max(compareIds.length, 2), 3)

  const lowestPriceId = useMemo(() => {
    if (compareListings.length < 2) return null
    return compareListings.reduce((a, b) => (a.listing.price <= b.listing.price ? a : b)).listing?.id
  }, [compareListings])

  const highestRatedId = useMemo(() => {
    if (compareListings.length < 2) return null
    return compareListings.reduce((a, b) => ((a.provider?.rating ?? 0) >= (b.provider?.rating ?? 0) ? a : b)).listing?.id
  }, [compareListings])

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

  if (catalogLoading && compareIds.length >= 2) {
    return <ComparePageLoading columnCount={compareSkeletonColumns} />
  }

  if (compareListings.length < 2) {
    return (
      <section className={styles.page}>
        <div className={styles.content}>
          <div className={styles.empty}>
            <h1 className={styles.emptyTitle}>Compare services</h1>
            <p className={styles.emptyText}>
              Select at least 2 services on the shop page to compare them side by side.
            </p>
            <Link href="/shop" className={styles.backBtn}>
              ← Back to Shop
            </Link>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className={styles.page}>
      <div className={styles.content}>

        {/* ── Header ── */}
        <header className={styles.header}>
          <div>
            <h1 className={styles.title}>Service Comparison</h1>
            <p className={styles.subtitle}>
              Comparing {compareListings.length} services side by side
            </p>
          </div>
        </header>

        {/* ── Highlights strip ── */}
        <div className={styles.compareHighlights}>
          {lowestPriceId && (
            <div className={shopStyles.compareHighlight}>
              <p className={shopStyles.highlightLabel}>Lowest Price</p>
              <p className={shopStyles.highlightValue}>
                {compareListings.find((x) => x.listing.id === lowestPriceId)?.listing.name}
              </p>
            </div>
          )}
          {highestRatedId && (
            <div className={shopStyles.compareHighlight}>
              <p className={shopStyles.highlightLabel}>Highest Rated</p>
              <p className={shopStyles.highlightValue}>
                {compareListings.find((x) => x.listing.id === highestRatedId)?.listing.name}
              </p>
            </div>
          )}
          {bestValueId && (
            <div className={shopStyles.compareHighlight}>
              <p className={shopStyles.highlightLabel}>Best Value</p>
              <p className={shopStyles.highlightValue}>
                {compareListings.find((x) => x.listing.id === bestValueId)?.listing.name}
              </p>
            </div>
          )}
        </div>

        {/* ── Comparison table ── */}
        <div className={styles.tableWrapper}>
          <div className={styles.scrollHint}>
            <span className={styles.scrollHintInner}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" style={{display:'inline',verticalAlign:'middle',marginRight:5}}>
                <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Slide to compare
            </span>
          </div>
        <div className={styles.tableCard}>
          <div className={shopStyles.compareTableWrap}>
            <table className={shopStyles.compareTable}>
              <thead>
                <tr>
                  {/* Empty label column */}
                  <th className={shopStyles.compareTableLabel} />

                  {compareListings.map(({ listing, provider }) => {
                    const listingLogoUrl = getListingProviderLogoUrl(provider)
                    return (
                    <th key={listing.id} className={shopStyles.compareTableHead}>
                      <div className={shopStyles.compareColHeader}>
                        <div className={shopStyles.compareColAvatar}>
                          {listingLogoUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element -- storage URL from shop RPC
                            <img
                              src={listingLogoUrl}
                              alt=""
                              className={shopStyles.compareColAvatarImg}
                            />
                          ) : (
                            (provider?.name || '?').charAt(0)
                          )}
                        </div>
                        <p className={shopStyles.compareColName}>{listing.name}</p>
                        <p className={shopStyles.compareColProvider}>{provider?.name}</p>
                        {listing.id === bestValueId && (
                          <span className={shopStyles.compareColBestBadge}>Best Value</span>
                        )}
                      </div>
                    </th>
                    )
                  })}
                </tr>
              </thead>

              <tbody>
                {/* ── Price ── */}
                <tr className={shopStyles.compareRow}>
                  <td className={shopStyles.compareRowLabel}>Starting Price</td>
                  {compareListings.map(({ listing }) => (
                    <td
                      key={listing.id}
                      className={`${shopStyles.compareRowCell}${
                        listing.id === lowestPriceId ? ` ${shopStyles.compareCellHighlight}` : ''
                      }`}
                    >
                      <span className={shopStyles.comparePriceVal}>
                        {formatPhpAmount(listing.price)}
                      </span>
                      {listing.id === lowestPriceId && (
                        <span className={shopStyles.compareCellTag}>Lowest</span>
                      )}
                    </td>
                  ))}
                </tr>

                {/* ── Rating ── */}
                <tr className={shopStyles.compareRow}>
                  <td className={shopStyles.compareRowLabel}>Provider Rating</td>
                  {compareListings.map(({ listing, provider }) => (
                    <td
                      key={listing.id}
                      className={`${shopStyles.compareRowCell}${
                        listing.id === highestRatedId ? ` ${shopStyles.compareCellHighlight}` : ''
                      }`}
                    >
                      <div className={shopStyles.compareRating}>
                        <span className={shopStyles.compareRatingNum}>{provider?.rating}</span>
                        <span className={shopStyles.compareRatingMax}>/5</span>
                        <span className={shopStyles.compareRatingCount}>
                          ({provider?.reviews} reviews)
                        </span>
                      </div>
                      {listing.id === highestRatedId && (
                        <span className={shopStyles.compareCellTag}>Top Rated</span>
                      )}
                    </td>
                  ))}
                </tr>

                {/* ── Location ── */}
                <tr className={shopStyles.compareRow}>
                  <td className={shopStyles.compareRowLabel}>Location</td>
                  {compareListings.map(({ listing, provider }) => (
                    <td key={listing.id} className={shopStyles.compareRowCell}>
                      <span className={shopStyles.compareText}>{provider?.location}</span>
                    </td>
                  ))}
                </tr>

                {/* ── Inclusions ── */}
                <tr className={shopStyles.compareRow}>
                  <td className={shopStyles.compareRowLabel}>Inclusions</td>
                  {compareListings.map(({ listing }) => (
                    <td key={listing.id} className={shopStyles.compareRowCell}>
                      <ul className={shopStyles.compareInclusionList}>
                        {listing.inclusions.map((inc, i) => (
                          <li key={i} className={shopStyles.compareInclusionItem}>
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

                {/* ── Availability ── */}
                <tr className={shopStyles.compareRow}>
                  <td className={shopStyles.compareRowLabel}>Availability</td>
                  {compareListings.map(({ listing }) => (
                    <td key={listing.id} className={shopStyles.compareRowCell}>
                      <span className={shopStyles.compareText}>
                        {stockAvailabilityLabel(listing.inStock).text}
                      </span>
                    </td>
                  ))}
                </tr>

                {/* ── CTA row ── */}
                <tr className={shopStyles.compareRowActions}>
                  <td className={shopStyles.compareRowLabel} />
                  {compareListings.map(({ listing }) => (
                    <td key={listing.id} className={shopStyles.compareRowCell}>
                      <Link
                        href={`/shop/${listing.serviceId}?listing=${encodeURIComponent(listing.id)}`}
                        className={shopStyles.compareViewBtn}
                      >
                        View Details
                      </Link>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        </div>{/* end tableWrapper */}

        {/* ── Footer ── */}
        <footer className={styles.footer}>
          <Link href="/shop" className={styles.footerBtnSecondary}>
            Back to Shop
          </Link>
          <Link href="/shop" className={styles.footerBtnPrimary}>
            Compare different services
          </Link>
        </footer>

      </div>
    </section>
  )
}