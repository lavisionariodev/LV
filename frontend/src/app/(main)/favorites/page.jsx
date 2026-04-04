'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import styles from './favorites.module.css'

// ─── Sample Favorites (hardcoded from data.js) ───────────────────────────────

const SAMPLE_FAVORITES = [
  {
    id: 'cremation-premium',
    name: 'Premium Cremation Package',
    serviceId: 'cremation',
    serviceLabel: 'Cremation Services',
    price: 38000,
    popular: true,
    inclusions: [
      'Death certificate processing',
      'Mahogany urn',
      '2-day chapel viewing',
      'Flower arrangement',
      'Embalming',
    ],
    image: '/sample/services/1.jpg',
    savedAt: '2025-06-12',
    provider: {
      name: 'Serenity Chapel',
      location: 'Manila, NCR',
      rating: 4.9,
      reviews: 124,
      badge: 'Top Rated',
      initial: 'S',
    },
  },
  {
    id: 'burial-full',
    name: 'Full Traditional Burial',
    serviceId: 'traditional-burial',
    serviceLabel: 'Traditional Burial',
    price: 95000,
    popular: true,
    inclusions: [
      'Premium casket',
      '5-day chapel viewing',
      'Full embalming',
      'Flower arrangement',
      'Hearse convoy',
      'Reception catering (50 pax)',
    ],
    image: '/sample/services/2.jpg',
    savedAt: '2025-06-10',
    provider: {
      name: 'Serenity Chapel',
      location: 'Manila, NCR',
      rating: 4.9,
      reviews: 124,
      badge: 'Top Rated',
      initial: 'S',
    },
  },
  {
    id: 'memorial-classic',
    name: 'Classic Memorial Service',
    serviceId: 'memorial-planning',
    serviceLabel: 'Memorial Planning',
    price: 32000,
    popular: true,
    inclusions: [
      'Venue (up to 80 guests)',
      'Custom AV tribute video',
      'Floral arrangements',
      'Memorial program',
      'Live music',
    ],
    image: '/sample/services/3.jpg',
    savedAt: '2025-06-08',
    provider: {
      name: 'Eternal Rest Services',
      location: 'Quezon City, NCR',
      rating: 4.7,
      reviews: 89,
      badge: 'Verified',
      initial: 'E',
    },
  },
  {
    id: 'cremation-eco',
    name: 'Eco Cremation',
    serviceId: 'cremation',
    serviceLabel: 'Cremation Services',
    price: 22000,
    popular: false,
    inclusions: [
      'Biodegradable urn',
      'Ash scattering ceremony',
      'Death certificate',
      'Memorial card printing',
    ],
    image: '/sample/services/1.jpg',
    savedAt: '2025-06-05',
    provider: {
      name: 'Compassion Care',
      location: 'Pasig, NCR',
      rating: 4.6,
      reviews: 57,
      badge: null,
      initial: 'C',
    },
  },
  {
    id: 'burial-deluxe',
    name: 'Deluxe Burial Service',
    serviceId: 'traditional-burial',
    serviceLabel: 'Traditional Burial',
    price: 120000,
    popular: false,
    inclusions: [
      'Mahogany casket',
      '7-day viewing',
      'Embalming + cosmetology',
      'Floral tributes',
      'Hearse + escort',
      'Catering (100 pax)',
      'Video tribute',
    ],
    image: '/sample/services/2.jpg',
    savedAt: '2025-06-01',
    provider: {
      name: 'Golden Lily Funerals',
      location: 'Makati, NCR',
      rating: 4.8,
      reviews: 203,
      badge: 'Premium',
      initial: 'G',
    },
  },
  {
    id: 'memorial-intimate',
    name: 'Intimate Memorial Gathering',
    serviceId: 'memorial-planning',
    serviceLabel: 'Memorial Planning',
    price: 15000,
    popular: false,
    inclusions: [
      'Venue (up to 30 guests)',
      'Photo display setup',
      'Memorial program booklets',
      'Sound system',
    ],
    image: '/sample/services/3.jpg',
    savedAt: '2025-05-28',
    provider: {
      name: 'Haven Memorial',
      location: 'Caloocan, NCR',
      rating: 4.5,
      reviews: 41,
      badge: 'Verified',
      initial: 'H',
    },
  },
]

// ─── Sort options ─────────────────────────────────────────────────────────────

const SORT_OPTIONS = [
  { value: 'newest',     label: 'Recently Saved' },
  { value: 'price-asc',  label: 'Price: Low–High' },
  { value: 'price-desc', label: 'Price: High–Low' },
  { value: 'rating',     label: 'Highest Rated' },
]

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function FavoritesPage() {
  const [favorites,  setFavorites]  = useState(SAMPLE_FAVORITES)
  const [sortBy,     setSortBy]     = useState('newest')
  const [removingId, setRemovingId] = useState(null)
  const [undoItem,   setUndoItem]   = useState(null)

  const sorted = [...favorites].sort((a, b) => {
    if (sortBy === 'price-asc')  return a.price - b.price
    if (sortBy === 'price-desc') return b.price - a.price
    if (sortBy === 'rating')     return b.provider.rating - a.provider.rating
    return new Date(b.savedAt) - new Date(a.savedAt)
  })

  function handleRemove(id) {
    const item = favorites.find((f) => f.id === id)
    setRemovingId(id)
    setTimeout(() => {
      setFavorites((prev) => prev.filter((f) => f.id !== id))
      setRemovingId(null)
      setUndoItem(item)
      setTimeout(() => setUndoItem(null), 5000)
    }, 320)
  }

  function handleUndo() {
    if (!undoItem) return
    setFavorites((prev) => {
      const exists = prev.find((f) => f.id === undoItem.id)
      if (exists) return prev
      return [undoItem, ...prev]
    })
    setUndoItem(null)
  }

  const isEmpty = favorites.length === 0

  return (
    <section className={styles.page}>

      {/* ── Content ── */}
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
                    onChange={(e) => setSortBy(e.target.value)}
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
              {sorted.map((item) => (
                <FavoriteCard
                  key={item.id}
                  item={item}
                  isRemoving={removingId === item.id}
                  onRemove={handleRemove}
                  styles={styles}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* ── Undo Toast ── */}
      {undoItem && (
        <div className={styles.undoToast} role="status">
          <span className={styles.undoToastText}>
            <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor" stroke="none" style={{ marginRight: 6, flexShrink: 0, opacity: 0.6 }}>
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
            <strong>{undoItem.name}</strong> removed from favorites
          </span>
          <button className={styles.undoBtn} onClick={handleUndo}>Undo</button>
        </div>
      )}
    </section>
  )
}

// ─── FavoriteCard ─────────────────────────────────────────────────────────────

function FavoriteCard({ item, isRemoving, onRemove, styles }) {
  const { provider } = item

  return (
    <div className={`${styles.card}${isRemoving ? ` ${styles.cardRemoving}` : ''}`}>
      <Link href={`/shop/${item.serviceId}`} className={styles.cardLink}>

        {/* ── Image ── */}
        <div className={styles.cardImageWrap}>
          <Image
            src={item.image}
            alt={item.name}
            width={400}
            height={250}
            className={styles.cardImage}
          />
          {item.popular && (
            <span className={styles.popularBadge}>Most Popular</span>
          )}
          {provider.badge && (
            <span className={`${styles.providerBadge} ${styles[`badge${provider.badge.replace(' ', '')}`]}`}>
              {provider.badge}
            </span>
          )}
          {/* Saved heart indicator */}
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
                <svg viewBox="0 0 12 14" width="9" height="9" fill="var(--color-gold-base, #B8962E)" style={{ marginRight: 3, flexShrink: 0, display: 'inline-block', verticalAlign: 'middle' }}>
                  <path d="M6 0a5 5 0 0 1 5 5c0 4.5-5 9-5 9S1 9.5 1 5a5 5 0 0 1 5-5z" />
                  <circle cx="6" cy="5" r="1.8" fill="white" />
                </svg>
                {provider.location}
              </p>
            </div>
            <div className={styles.ratingGroup}>
              <span className={styles.ratingStars}>
                {[1, 2, 3, 4, 5].map((s) => (
                  <svg key={s} width="11" height="11" viewBox="0 0 12 12"
                    fill={s <= Math.round(provider.rating) ? 'var(--color-gold-base, #B8962E)' : '#D5CCBC'}>
                    <path d="M6 1l1.35 2.73L10.5 4.2l-2.25 2.19.53 3.1L6 7.9l-2.78 1.6.53-3.1L1.5 4.2l3.15-.47z" />
                  </svg>
                ))}
              </span>
              <span className={styles.ratingNum}>{provider.rating}</span>
              <span className={styles.ratingReviews}>({provider.reviews})</span>
            </div>
          </div>

          <div className={styles.listingDivider} />

          {/* Title + Price */}
          <div className={styles.listingTitleRow}>
            <div className={styles.titleAndMeta}>
              <span className={styles.serviceTag}>{item.serviceLabel}</span>
              <h3 className={styles.cardTitle}>{item.name}</h3>
            </div>
            <div className={styles.priceBlock}>
              <span className={styles.priceLabel}>Starting at</span>
              <span className={styles.price}>₱{item.price.toLocaleString('en-PH')}</span>
            </div>
          </div>

        </div>
      </Link>

      {/* ── Card Actions ── */}
      <div className={styles.cardActions}>
        <span className={styles.savedAt}>
          <svg viewBox="0 0 12 12" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 4, opacity: 0.5 }}>
            <circle cx="6" cy="6" r="5" /><path d="M6 3.5v2.7l1.8 1.8" />
          </svg>
          Saved {formatDate(item.savedAt)}
        </span>
        <div className={styles.actionBtns}>
          <Link href={`/shop/${item.serviceId}`} className={styles.viewBtn}>
            View Details
          </Link>
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
        </div>
      </div>
    </div>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(str) {
  const d = new Date(str)
  return d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })
}