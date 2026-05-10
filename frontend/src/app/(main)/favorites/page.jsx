'use client'

import { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useFavorites } from '@/contexts/FavoritesContext'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import { formatPhpAmount } from '@/lib/cart/formatPhp'
import styles from './favorites.module.css'

// ─── Sort options ─────────────────────────────────────────────────────────────

const SORT_OPTIONS = [
  { value: 'newest',     label: 'Recently Saved' },
  { value: 'price-asc',  label: 'Price: Low–High' },
  { value: 'price-desc', label: 'Price: High–Low' },
  { value: 'rating',     label: 'Highest Rated' },
]

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function FavoritesPage() {
  const { user, authLoading, isBuyer } = useAuth()
  const { items: favorites, loading, removeFavorite, restoreFavorite } = useFavorites()
  const toast = useToast()
  const [sortBy, setSortBy] = useState('newest')
  const [removingId, setRemovingId] = useState(null)
  const [currentPage, setCurrentPage] = useState(1)

  const ITEMS_PER_PAGE = 15 // 3 columns × 5 rows

  const sorted = useMemo(() => {
    const list = [...favorites]
    list.sort((a, b) => {
      if (sortBy === 'price-asc') return a.price - b.price
      if (sortBy === 'price-desc') return b.price - a.price
      if (sortBy === 'rating') return b.provider.rating - a.provider.rating
      return new Date(b.savedAt) - new Date(a.savedAt)
    })
    return list
  }, [favorites, sortBy])

  const totalPages = Math.ceil(sorted.length / ITEMS_PER_PAGE)
  const paginated = sorted.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)

  useEffect(() => {
    setCurrentPage(1)
  }, [sortBy, favorites.length])

  function handlePageChange(page) {
    setCurrentPage(page)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function handleRemove(id) {
    const item = favorites.find((f) => f.id === id)
    setRemovingId(id)
    const { error } = await removeFavorite(id)
    setRemovingId(null)
    if (error) {
      toast.error(error.message || 'Could not remove from favorites.')
      return
    }
    if (item) {
      toast.success(
        `${item.name} removed from favorites.`,
        6000,
        {
          actionLabel: 'Undo',
          onAction: async () => {
            const { error: undoErr } = await restoreFavorite(item)
            if (undoErr) {
              toast.error(undoErr.message || 'Could not restore favorite.')
            }
          },
        },
      )
    }
  }

  const isEmpty = favorites.length === 0
  const showLoading = authLoading || (Boolean(user) && isBuyer && loading)

  if (showLoading) {
    return (
      <section className={styles.page}>
        <div className={styles.content}>
          <p style={{ fontFamily: 'Lato, sans-serif', color: 'rgba(16,40,32,0.55)', padding: '2rem 0' }}>
            Loading favorites…
          </p>
        </div>
      </section>
    )
  }

  if (!user) {
    return (
      <section className={styles.page}>
        <div className={styles.content}>
          <div className={styles.emptySection}>
            <div className={styles.emptyIconWrap} aria-hidden>
              <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
            </div>
            <h2 className={styles.emptyTitle}>Sign in to view favorites</h2>
            <p className={styles.emptySub}>Save listings you care about and access them on any device.</p>
            <Link href={`/buyer/login?redirect=${encodeURIComponent('/favorites')}`} className={styles.emptyLink}>
              Sign in
            </Link>
          </div>
        </div>
      </section>
    )
  }

  if (!isBuyer) {
    return (
      <section className={styles.page}>
        <div className={styles.content}>
          <div className={styles.emptySection}>
            <h2 className={styles.emptyTitle}>Buyer account required</h2>
            <p className={styles.emptySub}>Use a buyer account to save services to your favorites.</p>
            <Link href={`/buyer/login?redirect=${encodeURIComponent('/favorites')}`} className={styles.emptyLink}>
              Sign in as buyer
            </Link>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className={styles.page}>

      <div className={styles.content}>

        {isEmpty ? (
          /* ── Empty State ── */
          <div className={styles.emptySection}>
            <div className={styles.emptyIconWrap} aria-hidden>
              <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
            </div>
            <h2 className={styles.emptyTitle}>No favorites yet</h2>
            <p className={styles.emptySub}>Save services you love to find them here later.</p>
            <Link href="/shop" className={styles.emptyLink}>
              Browse services
              <svg viewBox="0 0 10 10" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: 6 }}>
                <path d="M2 5h6M6 2l3 3-3 3" />
              </svg>
            </Link>
          </div>
        ) : (
          <>
            {/* ── Toolbar ── */}
            <div className={styles.toolbar}>
              <div className={styles.resultsIndicator}>
                <span className={styles.resultsIndicatorText}>Showing </span>
                <span className={styles.resultsIndicatorNum}>{favorites.length}</span>
                <span className={styles.resultsIndicatorText}> saved item{favorites.length !== 1 ? 's' : ''}</span>
              </div>
              <div className={styles.sortWrap}>
                <span className={styles.sortLabel}>Sort by</span>
                <div className={styles.sortSelectWrap}>
                  <select
                    className={styles.sortSelect}
                    value={sortBy}
                    onChange={(e) => { setSortBy(e.target.value); setCurrentPage(1) }}
                  >
                    {SORT_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* ── Grid ── */}
            <div className={styles.grid}>
              {paginated.map((item) => (
                <FavoriteCard
                  key={item.id}
                  item={item}
                  isRemoving={removingId === item.id}
                  onRemove={handleRemove}
                  styles={styles}
                />
              ))}
            </div>

            {/* ── Pagination ── */}
            {totalPages > 1 && (
              <div className={styles.pagination}>
                <button
                  className={styles.pageBtn}
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  aria-label="Previous page"
                >
                  <svg viewBox="0 0 10 10" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6.5 1.5L3 5l3.5 3.5" />
                  </svg>
                </button>

                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    className={`${styles.pageBtn} ${page === currentPage ? styles.pageBtnActive : ''}`}
                    onClick={() => handlePageChange(page)}
                    aria-label={`Page ${page}`}
                    aria-current={page === currentPage ? 'page' : undefined}
                  >
                    {page}
                  </button>
                ))}

                <button
                  className={styles.pageBtn}
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  aria-label="Next page"
                >
                  <svg viewBox="0 0 10 10" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3.5 1.5L7 5l-3.5 3.5" />
                  </svg>
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  )
}

// ─── FavoriteCard ─────────────────────────────────────────────────────────────

function FavoriteCard({ item, isRemoving, onRemove, styles }) {
  const { provider } = item

  return (
    <div className={`${styles.card}${isRemoving ? ` ${styles.cardRemoving}` : ''}`}>

      {/* ── Clickable area (image + body) — mirrors shop's listingCardLink ── */}
      <Link
        href={`/shop/${item.serviceId}?listing=${encodeURIComponent(item.listingId)}`}
        className={styles.cardLink}
      >

        {/* ── Image ── */}
        <div className={styles.listingImageWrap}>
          {item.image && (item.image.startsWith('http') || item.image.startsWith('/')) ? (
          <Image
            src={item.image}
            alt={item.name}
            width={400}
            height={220}
            className={styles.cardImage}
            unoptimized={item.image.startsWith('blob:')}
          />
          ) : (
            <div
              className={styles.cardImage}
              style={{
                minHeight: 220,
                background: 'linear-gradient(135deg, #EDE8E0 0%, #D5CCBC 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: 'Cormorant Garamond, serif',
                fontSize: 42,
                fontWeight: 600,
                color: 'var(--color-green, #102820)',
                opacity: 0.35,
              }}
              aria-hidden
            >
              {provider.initial}
            </div>
          )}
          {provider.badge && (
            <span className={`${styles.providerBadge} ${styles[`badge${provider.badge.replace(' ', '')}`]}`}>
              {provider.badge}
            </span>
          )}
          {/* Saved heart indicator — favorites-only */}
          <div className={styles.savedIndicator} aria-label="Saved">
            <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor" stroke="none">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
          </div>
        </div>

        {/* ── Body ── */}
        <div className={styles.cardBody}>

          {/* Provider row */}
          <div className={styles.providerRow}>
            <div className={styles.providerAvatar}>{provider.initial}</div>
            <div className={styles.providerInfo}>
              <p className={styles.providerName}>{provider.name}</p>
              <p className={styles.providerLocation}>
                <svg viewBox="0 0 12 14" width="9" height="9" fill="var(--color-gold-base, #B8962E)" style={{ marginRight: 3, flexShrink: 0, display: 'inline-block', verticalAlign: 'middle' }} aria-hidden>
                  <path d="M6 0a5 5 0 0 1 5 5c0 4.5-5 9-5 9S1 9.5 1 5a5 5 0 0 1 5-5z" />
                  <circle cx="6" cy="5" r="1.8" fill="white" />
                </svg>
                <span className={styles.providerLocationText} title={provider.location || undefined}>
                  {provider.location}
                </span>
              </p>
            </div>
            <div className={styles.ratingGroup}>
              <span className={styles.ratingStars}>
                <svg width="10" height="10" viewBox="0 0 12 12"
                  fill="var(--color-gold-base, #B8962E)">
                  <path d="M6 1l1.35 2.73L10.5 4.2l-2.25 2.19.53 3.1L6 7.9l-2.78 1.6.53-3.1L1.5 4.2l3.15-.47z" />
                </svg>
              </span>
              <span className={styles.ratingNum}>{provider.rating}</span>
              <span className={styles.ratingReviews}>({provider.reviews})</span>
            </div>
          </div>

          <div className={styles.listingDivider} />

          {/* Title + Price */}
          <div className={styles.listingTitleRow}>
            <h3 className={styles.cardTitle}>{item.name}</h3>
            <div className={styles.priceBlock}>
              <span className={styles.priceLabel}>Starting at</span>
              <span className={styles.price}>{formatPhpAmount(item.price)}</span>
            </div>
          </div>


        </div>
      </Link>

      {/* ── Card Actions — Remove (favorites-only) ── */}
      <div className={styles.cardActions}>
        <button
          className={styles.removeBtn}
          onClick={() => onRemove(item.id)}
          title="Remove from favorites"
          aria-label={`Remove ${item.name} from favorites`}
        >
          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
          Remove
        </button>
        <span className={styles.savedAt}>
          <svg viewBox="0 0 12 12" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 4, opacity: 0.5, flexShrink: 0 }}>
            <circle cx="6" cy="6" r="5" /><path d="M6 3.5v2.7l1.8 1.8" />
          </svg>
          {formatDate(item.savedAt)}
        </span>
      </div>

    </div>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(str) {
  const d = new Date(str)
  return d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })
}