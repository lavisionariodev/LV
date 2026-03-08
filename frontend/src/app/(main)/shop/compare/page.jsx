'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useMemo } from 'react'
import { LISTINGS, PROVIDERS, SERVICES } from '../data'
import shopStyles from '../shop.module.css'
import styles from './compare.module.css'

export default function ComparePage() {
  const searchParams = useSearchParams()
  const idsParam = searchParams.get('ids') || ''
  const compareIds = useMemo(() => {
    const raw = idsParam.split(',').map((s) => s.trim()).filter(Boolean)
    return [...new Set(raw)]
  }, [idsParam])

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

  const lowestPriceId = useMemo(() => {
    if (compareListings.length < 2) return null
    return compareListings.reduce((a, b) => (a.listing.price <= b.listing.price ? a : b)).listing?.id
  }, [compareListings])

  const highestRatedId = useMemo(() => {
    if (compareListings.length < 2) return null
    return compareListings.reduce((a, b) => ((a.provider?.rating ?? 0) >= (b.provider?.rating ?? 0) ? a : b)).listing?.id
  }, [compareListings])

  const mostPopularId = useMemo(() => {
    if (compareListings.length < 2) return null
    return compareListings.find((x) => x.listing.popular)?.listing?.id ?? null
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
        <header className={styles.header}>
          <Link href="/shop" className={styles.backLink}>
            ← Back to Shop
          </Link>
          <div>
            <h1 className={styles.title}>Service Comparison</h1>
            <p className={styles.subtitle}>Comparing {compareListings.length} services side by side</p>
          </div>
        </header>

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
          {mostPopularId && (
            <div className={shopStyles.compareHighlight}>
              <p className={shopStyles.highlightLabel}>Most Popular</p>
              <p className={shopStyles.highlightValue}>
                {compareListings.find((x) => x.listing.id === mostPopularId)?.listing.name}
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

        <div className={styles.tableCard}>
          <div className={shopStyles.compareTableWrap}>
          <table className={shopStyles.compareTable}>
            <thead>
              <tr>
                <th className={shopStyles.compareTableLabel} />
                {compareListings.map(({ listing, provider }) => (
                  <th key={listing.id} className={shopStyles.compareTableHead}>
                    <div className={shopStyles.compareColHeader}>
                      <div className={shopStyles.compareColAvatar}>{provider?.name.charAt(0)}</div>
                      <p className={shopStyles.compareColName}>{listing.name}</p>
                      <p className={shopStyles.compareColProvider}>{provider?.name}</p>
                      {listing.id === bestValueId && (
                        <span className={shopStyles.compareColBestBadge}>Best Value</span>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className={shopStyles.compareRow}>
                <td className={shopStyles.compareRowLabel}>Starting Price</td>
                {compareListings.map(({ listing }) => (
                  <td
                    key={listing.id}
                    className={`${shopStyles.compareRowCell}${listing.id === lowestPriceId ? ` ${shopStyles.compareCellHighlight}` : ''}`}
                  >
                    <span className={shopStyles.comparePriceVal}>
                      ₱{listing.price.toLocaleString('en-PH')}
                    </span>
                    {listing.id === lowestPriceId && (
                      <span className={shopStyles.compareCellTag}>Lowest</span>
                    )}
                  </td>
                ))}
              </tr>
              <tr className={shopStyles.compareRow}>
                <td className={shopStyles.compareRowLabel}>Provider Rating</td>
                {compareListings.map(({ listing, provider }) => (
                  <td
                    key={listing.id}
                    className={`${shopStyles.compareRowCell}${listing.id === highestRatedId ? ` ${shopStyles.compareCellHighlight}` : ''}`}
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
              <tr className={shopStyles.compareRow}>
                <td className={shopStyles.compareRowLabel}>Location</td>
                {compareListings.map(({ listing, provider }) => (
                  <td key={listing.id} className={shopStyles.compareRowCell}>
                    <span className={shopStyles.compareText}>{provider?.location}</span>
                  </td>
                ))}
              </tr>
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
              <tr className={shopStyles.compareRow}>
                <td className={shopStyles.compareRowLabel}>Popularity</td>
                {compareListings.map(({ listing }) => (
                  <td
                    key={listing.id}
                    className={`${shopStyles.compareRowCell}${listing.id === mostPopularId ? ` ${shopStyles.compareCellHighlight}` : ''}`}
                  >
                    {listing.popular ? (
                      <span className={shopStyles.comparePopularBadge}>Most Popular</span>
                    ) : (
                      <span className={shopStyles.compareText}>—</span>
                    )}
                  </td>
                ))}
              </tr>
              <tr className={shopStyles.compareRowActions}>
                <td className={shopStyles.compareRowLabel} />
                {compareListings.map(({ listing }) => (
                  <td key={listing.id} className={shopStyles.compareRowCell}>
                    <Link
                      href={`/shop/${listing.serviceId}`}
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
