'use client'

import { useState, useMemo, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { fetchActiveShopListings, mergeShopListings } from '@/lib/shop-listings/client'
import { fetchPublicSellerProfile, normalizeSellerSpecialties } from '@/lib/sellers/client'
import { isUuidLike } from '@/lib/uuidLike'
import { buildCartPayloadFromListing } from '@/lib/cart/fromListing'
import { assertListingReadyForCart } from '@/lib/cart/bookNow'
import { useCart } from '@/contexts/CartContext'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import ContactSellerModal from '@/components/ui/Modal/ContactSellerModal'
import styles from './seller-profile.module.css'

// ─── Sample Data ──────────────────────────────────────────────────────────────

const SAMPLE_SELLER = {
  id: 'seller-001',
  name: 'Sereno Memorial Services',
  handle: 'serenomemorial',
  location: 'Quezon City, Metro Manila',
  tagline:
    'Providing compassionate and dignified funeral services to grieving families across Metro Manila for over 20 years. We handle every detail with care so you can focus on remembering your loved one.',
  avatarUrl: null,
  bannerUrl: 'https://getwallpapers.com/wallpaper/full/4/c/f/289455.jpg',
  badge: 'Top Provider',
  rating: 4.9,
  reviewCount: 87,
  memberSince: 'Mar 2020',
  turnaround: '24 hours',
  specialties: ['Traditional Funeral Rites', 'Memorial Planning', 'Casket & Urn Selection', 'Embalming Services', 'Cremation', 'Lifestream / Online Wake'],
  extendedBio:
    'Sereno Memorial Services has been a trusted partner to Filipino families during their most difficult moments since 2003. Founded by the Sereno family, our team of licensed funeral directors and grief support staff are available around the clock. We believe every life deserves a meaningful farewell, and we work closely with each family to honour the unique story of their loved one — from traditional Catholic rites to contemporary celebration-of-life ceremonies.',
}

const SAMPLE_LISTINGS = [
  {
    id: 'lst-001',
    serviceId: 'memorial-planning',
    name: 'Full Funeral Package — Traditional',
    price: 45000,
    rating: 5.0,
    inStock: true,
    imageUrl: null,
    createdAt: '2024-11-10',
  },
  {
    id: 'lst-002',
    serviceId: 'memorial-planning',
    name: 'Cremation Package (with Urn)',
    price: 28000,
    rating: 4.9,
    inStock: true,
    imageUrl: null,
    createdAt: '2024-10-22',
  },
  {
    id: 'lst-003',
    serviceId: 'memorial-planning',
    name: 'Memorial Flower Arrangement',
    price: 3500,
    rating: 4.8,
    inStock: true,
    imageUrl: null,
    createdAt: '2024-09-15',
  },
  {
    id: 'lst-004',
    serviceId: 'memorial-planning',
    name: 'Lifestream / Online Wake Setup',
    price: 5000,
    rating: 4.7,
    inStock: false,
    imageUrl: null,
    createdAt: '2024-08-01',
  },
  {
    id: 'lst-005',
    serviceId: 'memorial-planning',
    name: 'Premium Hardwood Casket',
    price: 18000,
    rating: 4.9,
    inStock: true,
    imageUrl: null,
    createdAt: '2024-07-20',
  },
  {
    id: 'lst-006',
    serviceId: 'memorial-planning',
    name: 'Embalming & Preparation Service',
    price: 8500,
    rating: 5.0,
    inStock: true,
    imageUrl: null,
    createdAt: '2024-06-05',
  },
]

const SAMPLE_REVIEWS = [
  {
    id: 'rev-001',
    reviewerName: 'Angela Reyes',
    reviewerInitials: 'AR',
    rating: 5,
    date: 'March 2025',
    service: 'Full Funeral Package — Traditional',
    text: 'The team at Sereno handled everything with such grace and professionalism during an incredibly hard time for our family. Every detail was taken care of. We are deeply grateful.',
  },
  {
    id: 'rev-002',
    reviewerName: 'Marco dela Cruz',
    reviewerInitials: 'MD',
    rating: 5,
    date: 'February 2025',
    service: 'Cremation Package (with Urn)',
    text: 'They were available at midnight when we needed them most and guided us through every step calmly. The urn was beautiful and the entire process was handled with dignity.',
  },
  {
    id: 'rev-003',
    reviewerName: 'Sophia Tan',
    reviewerInitials: 'ST',
    rating: 4,
    date: 'January 2025',
    service: 'Lifestream / Online Wake Setup',
    text: 'The livestream setup allowed our relatives abroad to attend and grieve with us. There were minor technical hiccups at the start but the staff resolved them quickly.',
  },
  {
    id: 'rev-004',
    reviewerName: 'Jerome Villanueva',
    reviewerInitials: 'JV',
    rating: 5,
    date: 'December 2024',
    service: 'Memorial Flower Arrangement',
    text: 'The floral arrangements were tasteful and exactly what we envisioned for our father\'s wake. Delivered on time and arranged beautifully by the staff.',
  },
  {
    id: 'rev-005',
    reviewerName: 'Carmela Bautista',
    reviewerInitials: 'CB',
    rating: 5,
    date: 'November 2024',
    service: 'Embalming & Preparation Service',
    text: 'Our lola looked peaceful and well-cared for. The preparation was done with great respect. This gave our family so much comfort during the viewing.',
  },
]

/**
 * When `?seller=<uuid>` loads a real storefront, UI fields backed only by SAMPLE_* /
 * seeded reviews (nothing in DB yet — see docs below).
 */
/** Fields still SAMPLE_* / mock for `?seller=<uuid>` (real data comes via Supabase `get_active_shop_listings` only — no Next.js API route). */
export const MOCK_SELLER_PROFILE_FIELDS = /** @type {const} */ ([
  'bannerUrl',
  'badge',
  'rating',
  'reviewCount',
  'turnaround',
  'avatarUrl — profiles.avatar_url via `get_active_shop_listings.seller_avatar_url` (SECURITY DEFINER)',
  'Verified chip — always shown; not wired to sellers row',
  'reviews tab — SAMPLE_REVIEWS until order reviews ship',
  'listing.rating — per-card sort placeholder (not persisted per listing)',
  'specialties — sellers.specialties via RPC (`seller_specialties`); fallback to dedup listing package-option labels when empty',
  'Real from RPC (migration 078+ includes avatar): name, location, listings, sellers.username (@handle), tagline (`seller_tagline`), business_info about (`seller_business_info`), member since (`seller_business_started_at`), specialties (`seller_specialties`), seller_avatar_url',
  'No listings: same fields via `get_public_seller_profile` (active sellers only) when catalog has no rows for `?seller=`',
])

/**
 * Maps `get_public_seller_profile` row to the same `provider` shape as `mergeShopListings` uses
 * so `buildSellerViewModel` can reuse one code path.
 * @param {Record<string, unknown>|null|undefined} row
 */
function providerFromPublicSellerProfileRow(row) {
  if (!row || typeof row !== 'object') return null
  const id = row.seller_user_id ?? row.sellerUserId
  if (id == null) return null
  const loc = (typeof row.business_location === 'string' ? row.business_location : '').trim() || 'Philippines'
  const handleRaw = row.seller_username ?? row.sellerUsername
  const handle =
    typeof handleRaw === 'string' && handleRaw.trim() ? handleRaw.trim().toLowerCase() : null
  const bizInfoRaw = row.seller_business_info ?? row.sellerBusinessInfo
  const businessInfo =
    typeof bizInfoRaw === 'string' && bizInfoRaw.trim() ? bizInfoRaw.trim() : null
  const taglineRaw = row.seller_tagline ?? row.sellerTagline
  const tagline = typeof taglineRaw === 'string' && taglineRaw.trim() ? taglineRaw.trim() : null
  const specialtiesRaw = row.seller_specialties ?? row.sellerSpecialties
  const specialties =
    Array.isArray(specialtiesRaw) && specialtiesRaw.length > 0
      ? normalizeSellerSpecialties(specialtiesRaw)
      : []
  const avatarRaw = row.seller_avatar_url ?? row.sellerAvatarUrl
  const sellerAvatarUrl =
    typeof avatarRaw === 'string' && avatarRaw.trim() ? avatarRaw.trim() : null
  const socialLinks = row.seller_social_links ?? row.sellerSocialLinks ?? {}
  const name =
    typeof row.business_name === 'string' && row.business_name.trim()
      ? row.business_name.trim()
      : 'Verified seller'

  return {
    id: String(id),
    name,
    location: loc,
    handle,
    image: sellerAvatarUrl,
    avatarUrl: sellerAvatarUrl,
    rating: null,
    reviews: null,
    badge: null,
    joinedDate: row.seller_registered_at ?? row.sellerRegisteredAt ?? null,
    businessStartedAt: row.seller_business_started_at ?? row.sellerBusinessStartedAt ?? null,
    businessInfo,
    tagline,
    specialties,
    socialLinks,
  }
}

/** Short teaser for the bio card when business description is long; full text stays in About. */
function teaserFromBusinessDescription(full) {
  const t = String(full || '').trim()
  if (!t) return undefined
  if (t.length <= 380) return undefined
  const paras = t.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean)
  const block = paras[0] || t
  const oneLine = block.replace(/\s*\n\s*/g, ' ').trim()
  const max = 360
  if (oneLine.length <= max) return oneLine
  const cut = oneLine.slice(0, max)
  const sp = cut.lastIndexOf(' ')
  return `${(sp > 200 ? cut.slice(0, sp) : cut).trim()}…`
}

function buildSellerViewModel(sellerUserId, shopRows, publicProfileRow) {
  const rows = shopRows ?? []
  const prov = rows[0]?.provider ?? providerFromPublicSellerProfileRow(publicProfileRow)
  const name = prov?.name || 'Seller'
  const rowAvatars = rows.flatMap((r) => {
    const u = r?.provider?.avatarUrl ?? r?.provider?.image
    return typeof u === 'string' && u.trim() ? [u.trim()] : []
  })
  const provAvatar =
    typeof prov?.avatarUrl === 'string' && prov.avatarUrl.trim()
      ? prov.avatarUrl.trim()
      : typeof prov?.image === 'string' && prov.image.trim()
        ? prov.image.trim()
        : null
  const avatarUrlResolved = [...new Set([...rowAvatars, provAvatar].filter(Boolean))][0] ?? null
  const location = (prov?.location || '').trim() || 'Philippines'
  const handleCandidate =
    [...new Set(rows.map((r) => r.provider?.handle).filter(Boolean))][0] ?? prov?.handle
  const handle = typeof handleCandidate === 'string' && handleCandidate.trim()
    ? handleCandidate.trim().toLowerCase()
    : undefined

  let memberSince = '—'
  const earliestBizStart = [
    ...new Set(rows.map((r) => r.provider?.businessStartedAt).filter(Boolean)),
    prov?.businessStartedAt,
  ]
    .filter(Boolean)
    .sort()[0]
  if (earliestBizStart) {
    const d = new Date(earliestBizStart)
    if (!Number.isNaN(d.getTime())) {
      memberSince = d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    }
  } else if (prov?.joinedDate) {
    const d = new Date(prov.joinedDate)
    if (!Number.isNaN(d.getTime())) {
      memberSince = d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    }
  }

  const specSet = new Set()
  for (const r of rows) {
    for (const o of r.sellerPackageOptions ?? []) {
      specSet.add(String(o).trim())
    }
  }
  const uniqSpecs = [...specSet].filter(Boolean)

  const specialtiesFromSeller = normalizeSellerSpecialties(prov?.specialties ?? [])

  const businessInfoCandidates = [
    ...new Set(rows.map((r) => (r.provider?.businessInfo ?? '').trim()).filter(Boolean)),
  ]
  const businessInfoFull =
    (businessInfoCandidates[0] ?? String(prov?.businessInfo ?? '').trim()) || ''

  /** About tab — full sellers.business_info from shop RPC */
  const extendedBio = businessInfoFull ? businessInfoFull : undefined

  const taglineCandidates = [...new Set(rows.map((r) => (r.provider?.tagline ?? '').trim()).filter(Boolean))]
  const taglineFromSeller =
    (taglineCandidates[0] ?? (typeof prov?.tagline === 'string' ? prov.tagline.trim() : '')) || ''
  /** Card under stats: sellers.tagline, or excerpt of business_info when tagline unset and text is very long */
  const tagline =
    taglineFromSeller ||
    (businessInfoFull ? teaserFromBusinessDescription(businessInfoFull) : undefined)

  return {
    id: sellerUserId,
    name,
    handle,
    location,
    avatarUrl: avatarUrlResolved,
    bannerUrl: SAMPLE_SELLER.bannerUrl,
    badge: SAMPLE_SELLER.badge,
    rating: SAMPLE_SELLER.rating,
    reviewCount: SAMPLE_SELLER.reviewCount,
    memberSince,
    turnaround: SAMPLE_SELLER.turnaround,
    specialties:
      specialtiesFromSeller.length > 0
        ? specialtiesFromSeller
        : uniqSpecs.length > 0
          ? uniqSpecs
          : [],
    tagline,
    extendedBio,
    socialLinks: prov?.socialLinks ?? {},
  }
}

function listingsFromShopRows(shopRows) {
  const fallbackRating = SAMPLE_SELLER.rating
  return (shopRows ?? []).map((row) => ({
    id: row.id,
    serviceId: row.serviceId,
    name: row.name,
    price: row.price,
    rating: fallbackRating,
    inStock: row.inStock,
    imageUrl: row.imageUrl,
    imageUrls: row.imageUrls,
    createdAt: row.createdAt,
  }))
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatPhp(amount) {
  return '₱' + Number(amount).toLocaleString('en-PH', { minimumFractionDigits: 0 })
}

// ─── Star Helper ──────────────────────────────────────────────────────────────

function StarRow({ rating, size = 11 }) {
  return (
    <div className={styles.reviewStars}>
      {[1, 2, 3, 4, 5].map((s) => (
        <svg
          key={s}
          width={size}
          height={size}
          viewBox="0 0 12 12"
          fill={s <= Math.round(rating) ? '#E8A020' : '#ddd'}
        >
          <path d="M6 1l1.35 2.73L10.5 4.2l-2.25 2.19.53 3.1L6 7.9l-2.78 1.6.53-3.1L1.5 4.2l3.15-.47z" />
        </svg>
      ))}
    </div>
  )
}

// ─── Location Pin Icon ────────────────────────────────────────────────────────

function PinIcon() {
  return (
    <svg viewBox="0 0 12 14" width="10" height="10" fill="var(--color-gold-base, #B8962E)" style={{ flexShrink: 0 }}>
      <path d="M6 0a5 5 0 0 1 5 5c0 4.5-5 9-5 9S1 9.5 1 5a5 5 0 0 1 5-5z" />
      <circle cx="6" cy="5" r="1.8" fill="white" />
    </svg>
  )
}

// ─── Seller Profile Page ──────────────────────────────────────────────────────

/**
 * Presentational seller profile (tabs, listings grid, reviews, about).
 *
 * Props (all optional — falls back to SAMPLE_* constants when omitted):
 *   seller   – seller object
 *   listings – listing array
 *   reviews  – review array
 */
function SellerProfileView({
  seller   = SAMPLE_SELLER,
  listings = SAMPLE_LISTINGS,
  reviews  = SAMPLE_REVIEWS,
}) {
  const [activeTab, setActiveTab] = useState('listings')
  const [sortBy, setSortBy] = useState('newest')
  const [currentPage, setCurrentPage] = useState(1)
  const [searchQuery, setSearchQuery] = useState('')
  const [contactOpen, setContactOpen] = useState(false)
  const ITEMS_PER_PAGE = 9

  const sortedListings = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    const filtered = q
      ? listings.filter((l) => l.name?.toLowerCase().includes(q))
      : [...listings]
    if (sortBy === 'price-asc') filtered.sort((a, b) => a.price - b.price)
    else if (sortBy === 'price-desc') filtered.sort((a, b) => b.price - a.price)
    else if (sortBy === 'rating') filtered.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
    else filtered.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
    return filtered
  }, [listings, sortBy, searchQuery])

  const totalPages = Math.ceil(sortedListings.length / ITEMS_PER_PAGE)
  const paginatedListings = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE
    return sortedListings.slice(start, start + ITEMS_PER_PAGE)
  }, [sortedListings, currentPage])

  const distribution = useMemo(() => {
    const dist = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
    reviews.forEach((r) => { dist[Math.round(r.rating)] = (dist[Math.round(r.rating)] || 0) + 1 })
    return dist
  }, [reviews])

  function handleTabChange(tab) {
    setActiveTab(tab)
    setCurrentPage(1)
  }

  return (
    <section className={styles.profilePage}>
      <ContactSellerModal
        open={contactOpen}
        onClose={() => setContactOpen(false)}
        sellerName={seller?.name || 'Seller'}
        sellerAvatarUrl={seller?.avatarUrl || ''}
        socialLinks={seller?.socialLinks}
      />

      {/* ── Banner ── */}
      <div className={styles.banner}>
        {seller?.bannerUrl ? (
          <img src={seller.bannerUrl} alt={`${seller.name} banner`} className={styles.bannerImg} />
        ) : null}
        <div className={styles.bannerOverlay} />
      </div>

      <div className={styles.content}>

        {/* ── Identity Card ── */}
        <div className={styles.identityCard}>
          <div className={styles.avatarWrap}>
            <div className={styles.avatar}>
              {seller?.avatarUrl ? (
                <img src={seller.avatarUrl} alt={seller.name} width={80} height={80} className={styles.avatarImg} />
              ) : (
                (seller?.name || 'S').charAt(0).toUpperCase()
              )}
            </div>
          </div>

          <div className={styles.identityTop}>
            {/* Left — name, handle, location, badges */}
            <div className={styles.identityLeft}>
              <h1 className={styles.storeName}>{seller?.name || 'Seller Name'}</h1>
              <div className={styles.handleRow}>
                {seller?.handle && (
                  <span className={styles.handle}>@{seller.handle}</span>
                )}
                {seller?.badge && (
                  <span className={styles.badgeChip}>{seller.badge}</span>
                )}
                <span className={`${styles.badgeChip} ${styles.verifiedChip}`}>Verified</span>
              </div>
              <div className={styles.locationRow}>
                <PinIcon />
                <span>{seller?.location || 'Philippines'}</span>
              </div>
            </div>

            {/* Right — action buttons */}
            <div className={styles.actionButtons}>
              <button
                className={styles.btnMessage}
                type="button"
                onClick={() => setContactOpen(true)}
                aria-haspopup="dialog"
              >
                <svg viewBox="0 0 16 14" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 1H2a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h3l3 3 3-3h3a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1z" />
                </svg>
                Message
              </button>
              <button className={styles.btnInquire} type="button">
                <svg viewBox="0 0 14 14" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M7 1v6M4 4l3-3 3 3M1 9v2a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V9" />
                </svg>
                Inquire / Book
              </button>
            </div>
          </div>

          {/* Stats row */}
          <div className={styles.statsRow}>
            <div className={styles.statItem}>
              <div className={styles.statValue}>
                <svg width="14" height="14" viewBox="0 0 12 12" fill="#E8A020">
                  <path d="M6 1l1.35 2.73L10.5 4.2l-2.25 2.19.53 3.1L6 7.9l-2.78 1.6.53-3.1L1.5 4.2l3.15-.47z" />
                </svg>
                {seller?.rating ?? '—'}
              </div>
              <div className={styles.statLabel}>Rating</div>
            </div>
            <div className={styles.statItem}>
              <div className={styles.statValue}>{seller?.reviewCount ?? 0}</div>
              <div className={styles.statLabel}>Reviews</div>
            </div>
            <div className={styles.statItem}>
              <div className={styles.statValue}>{listings.length}</div>
              <div className={styles.statLabel}>Listings</div>
            </div>
            <div className={styles.statItem}>
              <div className={styles.statValue}>{seller?.memberSince ?? '—'}</div>
              <div className={styles.statLabel}>Member Since</div>
            </div>
          </div>
        </div>

        {/* ── Bio ── */}
        {seller?.tagline && (
          <div className={styles.bioCard}>
            <p className={styles.bioText}>{seller.tagline}</p>
          </div>
        )}

        {/* ── Tab Shell ── */}
        <div className={styles.tabShell}>

          {/* Tab Nav */}
          <div className={styles.tabNav} role="tablist">
            {[
              { key: 'listings', label: 'Listings', count: listings.length },
              { key: 'reviews',  label: 'Reviews',  count: reviews.length },
              { key: 'about',    label: 'About',     count: null },
            ].map(({ key, label, count }) => (
              <button
                key={key}
                role="tab"
                aria-selected={activeTab === key}
                className={`${styles.tabBtn}${activeTab === key ? ` ${styles.tabActive}` : ''}`}
                onClick={() => handleTabChange(key)}
                type="button"
              >
                {label}
                {count !== null && (
                  <span className={styles.tabCount}>{count}</span>
                )}
              </button>
            ))}
          </div>

          {/* ── Listings Tab ── */}
          {activeTab === 'listings' && (
            <div className={styles.tabContent} role="tabpanel">
              <div className={styles.listingsToolbar}>
                <div className={styles.searchWrap}>
                  <svg className={styles.searchIcon} viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="6.5" cy="6.5" r="5" />
                    <path d="M11 11l3.5 3.5" />
                  </svg>
                  <input
                    type="search"
                    className={styles.searchInput}
                    placeholder="Search listings…"
                    value={searchQuery}
                    onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1) }}
                    aria-label="Search listings"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      className={styles.searchClear}
                      onClick={() => { setSearchQuery(''); setCurrentPage(1) }}
                      aria-label="Clear search"
                    >
                      <svg viewBox="0 0 10 10" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <path d="M2 2l6 6M8 2L2 8" />
                      </svg>
                    </button>
                  )}
                </div>

                <div className={styles.sortWrap}>
                  <span className={styles.sortLabel}>Sort by</span>
                  <select
                    className={styles.sortSelect}
                    value={sortBy}
                    onChange={(e) => { setSortBy(e.target.value); setCurrentPage(1) }}
                    aria-label="Sort listings"
                  >
                    <option value="newest">Newest</option>
                    <option value="price-asc">Price: Low to High</option>
                    <option value="price-desc">Price: High to Low</option>
                    <option value="rating">Top Rated</option>
                  </select>
                </div>
              </div>

              {paginatedListings.length > 0 ? (
                <>
                  <div className={styles.grid}>
                    {paginatedListings.map((listing) => (
                      <ListingCard key={listing.id} listing={listing} styles={styles} />
                    ))}
                  </div>

                  {totalPages > 1 && (
                    <div className={styles.pagination}>
                      <button
                        className={styles.pageBtn}
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        aria-label="Previous page"
                      >
                        <svg viewBox="0 0 8 12" width="7" height="11" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                          <path d="M7 1L1 6l6 5" />
                        </svg>
                      </button>
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                        <button
                          key={p}
                          className={`${styles.pageBtn}${currentPage === p ? ` ${styles.pageBtnActive}` : ''}`}
                          onClick={() => setCurrentPage(p)}
                          aria-current={currentPage === p ? 'page' : undefined}
                        >
                          {p}
                        </button>
                      ))}
                      <button
                        className={styles.pageBtn}
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        aria-label="Next page"
                      >
                        <svg viewBox="0 0 8 12" width="7" height="11" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                          <path d="M1 1l6 5-6 5" />
                        </svg>
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <EmptyState
                  icon="listing"
                  title={searchQuery ? 'No results found' : 'No listings yet'}
                  text={searchQuery ? `No listings match "${searchQuery}". Try a different keyword.` : "This seller hasn't published any listings."}
                />
              )}
            </div>
          )}

          {/* ── Reviews Tab ── */}
          {activeTab === 'reviews' && (
            <div className={styles.tabContent} role="tabpanel">
              {reviews.length > 0 ? (
                <>
                  <div className={styles.reviewSummary}>
                    <div className={styles.reviewScore}>
                      <div className={styles.reviewScoreNum}>{seller?.rating ?? '—'}</div>
                      <StarRow rating={seller?.rating ?? 0} size={14} />
                      <div className={styles.reviewScoreLabel}>{reviews.length} reviews</div>
                    </div>

                    <div className={styles.reviewBars}>
                      {[5, 4, 3, 2, 1].map((star) => {
                        const count = distribution[star] || 0
                        const pct = reviews.length ? Math.round((count / reviews.length) * 100) : 0
                        return (
                          <div key={star} className={styles.reviewBarRow}>
                            <span className={styles.reviewBarLabel}>{star}★</span>
                            <div className={styles.reviewBarTrack}>
                              <div className={styles.reviewBarFill} style={{ width: `${pct}%` }} />
                            </div>
                            <span className={styles.reviewBarCount}>{count}</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  <div className={styles.reviewList}>
                    {reviews.map((review) => (
                      <div key={review.id} className={styles.reviewCard}>
                        <div className={styles.reviewHeader}>
                          <div className={styles.reviewerAvatar}>
                            {(review.reviewerInitials || review.reviewerName?.charAt(0) || 'A').toUpperCase()}
                          </div>
                          <div className={styles.reviewerInfo}>
                            <div className={styles.reviewerName}>{review.reviewerName}</div>
                            <div className={styles.reviewMeta}>
                              <StarRow rating={review.rating} size={10} />
                              <span className={styles.reviewDate}>{review.date}</span>
                              {review.service && (
                                <span className={styles.reviewService}>{review.service}</span>
                              )}
                            </div>
                          </div>
                        </div>
                        <p className={styles.reviewText}>{review.text}</p>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <EmptyState icon="star" title="No reviews yet" text="Be the first to review this seller after a purchase." />
              )}
            </div>
          )}

          {/* ── About Tab ── */}
          {activeTab === 'about' && (
            <div className={styles.tabContent} role="tabpanel">
              <div className={styles.aboutGrid}>

                {seller?.extendedBio && (
                  <div className={`${styles.aboutSection} ${styles.aboutSectionFull}`}>
                    <h2 className={styles.aboutHeading}>About the Seller</h2>
                    <p className={styles.aboutBio}>{seller.extendedBio}</p>
                  </div>
                )}

                <div className={styles.aboutSection}>
                  <h2 className={styles.aboutHeading}>Seller Details</h2>
                  <div className={styles.attrTable}>
                    <div className={styles.attrRow}>
                      <span className={styles.attrLabel}>Location</span>
                      <span className={styles.attrValue}>{seller?.location || '—'}</span>
                    </div>
                    <div className={styles.attrRow}>
                      <span className={styles.attrLabel}>Member Since</span>
                      <span className={styles.attrValue}>{seller?.memberSince || '—'}</span>
                    </div>
                    <div className={styles.attrRow}>
                      <span className={styles.attrLabel}>Avg. Turnaround</span>
                      <span className={styles.attrValue}>{seller?.turnaround || '—'}</span>
                    </div>
                    <div className={styles.attrRow}>
                      <span className={styles.attrLabel}>Total Reviews</span>
                      <span className={styles.attrValue}>{seller?.reviewCount ?? reviews.length}</span>
                    </div>
                  </div>
                </div>

                {seller?.specialties?.length > 0 && (
                  <div className={styles.aboutSection}>
                    <h2 className={styles.aboutHeading}>Specialties</h2>
                    <div className={styles.specialtiesList}>
                      {seller.specialties.map((s) => (
                        <span key={s} className={styles.specialtyPill}>
                          <svg viewBox="0 0 10 10" width="8" height="8" fill="none" stroke="var(--color-gold-base,#B8962E)" strokeWidth="1.8" strokeLinecap="round">
                            <path d="M2 5l2 2 4-4" />
                          </svg>
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

              </div>
            </div>
          )}

        </div>{/* end tabShell */}
      </div>{/* end content */}
    </section>
  )
}

const SKELETON_CARD_KEYS = ['s1', 's2', 's3', 's4', 's5', 's6', 's7', 's8', 's9']

/**
 * Skeleton layout mirroring banner → identity → tagline → listings tab (toolbar + grid).
 */
function SellerProfileLoading() {
  return (
    <section className={styles.profilePage} aria-busy="true" aria-describedby="seller-profile-loading-hint">
      <p id="seller-profile-loading-hint" role="status" className={styles.visuallyHidden}>
        Loading seller profile. Banner, shop details, and listings will appear in a moment.
      </p>
      <div className={styles.banner} aria-hidden>
        <div className={`${styles.skeletonBlock} ${styles.skeletonBannerPulse}`} />
        <div className={styles.bannerOverlay} />
      </div>

      <div className={styles.content}>
        <div className={styles.identityCard}>
          <div className={styles.avatarWrap}>
            <div className={`${styles.avatar} ${styles.skeletonAvatar}`} aria-hidden />
          </div>

          <div className={styles.identityTop}>
            <div className={styles.identityLeft}>
              <div className={`${styles.skeletonBlock} ${styles.skeletonTitle}`} />
              <div className={styles.handleRow} aria-hidden>
                <span className={`${styles.skeletonBlock} ${styles.skeletonChip}`} />
                <span className={`${styles.skeletonBlock} ${styles.skeletonChip} ${styles.skeletonChipWide}`} />
                <span className={`${styles.skeletonBlock} ${styles.skeletonChip}`} />
              </div>
              <div className={`${styles.skeletonBlock} ${styles.skeletonLocation}`} />
            </div>
            <div className={styles.actionButtons} aria-hidden>
              <div className={`${styles.skeletonBlock} ${styles.skeletonBtn}`} />
              <div className={`${styles.skeletonBlock} ${styles.skeletonBtn} ${styles.skeletonBtnWide}`} />
            </div>
          </div>

          <div className={styles.statsRow} aria-hidden>
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className={styles.statItem}>
                <div className={`${styles.skeletonBlock} ${styles.skeletonStatBar}`} />
                <div className={`${styles.skeletonBlock} ${styles.skeletonStatLabel}`} />
              </div>
            ))}
          </div>
        </div>

        <div className={styles.bioCard} aria-hidden>
          <div className={`${styles.skeletonBlock} ${styles.skeletonBioLine}`} />
          <div className={`${styles.skeletonBlock} ${styles.skeletonBioLine} ${styles.skeletonBioLineShort}`} />
        </div>

        <div className={styles.tabShell}>
          <div className={styles.skeletonTabNav}>
            <div className={`${styles.skeletonBlock} ${styles.skeletonTabPill}`} />
            <div className={`${styles.skeletonBlock} ${styles.skeletonTabPill}`} />
            <div className={`${styles.skeletonBlock} ${styles.skeletonTabPill}`} />
          </div>

          <div className={styles.tabContent}>
            <div className={styles.listingsToolbar} aria-hidden>
              <div className={styles.skeletonToolbarLeft}>
                <div className={`${styles.skeletonBlock} ${styles.skeletonSearch}`} />
              </div>
              <div className={styles.skeletonToolbarRight}>
                <div className={`${styles.skeletonBlock} ${styles.skeletonSortLabel}`} />
                <div className={`${styles.skeletonBlock} ${styles.skeletonSortSelect}`} />
              </div>
            </div>

            <div className={styles.grid}>
              {SKELETON_CARD_KEYS.map((k) => (
                <div key={k} className={`${styles.card} ${styles.skeletonCard}`}>
                  <div className={styles.cardImageWrap}>
                    <div className={styles.skeletonThumb} aria-hidden />
                  </div>
                  <div className={styles.skeletonCardBody}>
                    <hr className={styles.listingDivider} aria-hidden />
                    <div className={styles.skeletonCardTitleRow}>
                      <div className={`${styles.skeletonBlock} ${styles.skeletonCardLineTitle}`} />
                      <div className={`${styles.skeletonBlock} ${styles.skeletonCardLinePrice}`} />
                    </div>
                  </div>
                  <div className={styles.cardActions}>
                    <div className={`${styles.skeletonBlock} ${styles.skeletonCtaBar}`} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

/**
 * Loads `/seller-profile?seller=<uuid>` via `fetchActiveShopListings` → `get_active_shop_listings` (SECURITY DEFINER;
 * anon + authenticated). Sellers RLS stays closed to public reads; seller writes use `upsertSellerForUser` (settings/onboarding).
 * When the seller has no listing rows in that RPC, `get_public_seller_profile` still supplies shop fields for active sellers.
 * No dedicated Next.js `/api/**` route is required for this page.
 */
export default function SellerProfilePage() {
  const searchParams = useSearchParams()
  const sellerParam = searchParams.get('seller')?.trim()
  const realSellerId = isUuidLike(sellerParam) ? sellerParam : null

  /** All seller fetch state in one object so a single setState resets/updates atomically.
   *  This avoids calling multiple setStates synchronously in an effect body
   *  (react-hooks/set-state-in-effect). */
  const [sellerFetchState, setSellerFetchState] = useState({
    allShopListings: [],
    publicSellerProfile: null,
    sellerReviewsPayload: null,
    /** `user_id` the catalog + profile fetch completed for (loading until this matches `realSellerId`). */
    catalogLoadedSellerId: null,
  })

  const { allShopListings, publicSellerProfile, sellerReviewsPayload, catalogLoadedSellerId } =
    sellerFetchState

  const loading = Boolean(realSellerId) && catalogLoadedSellerId !== realSellerId

  useEffect(() => {
    if (!realSellerId) return
    let cancelled = false
    /** Avoid flashing the previous seller's listings while fetching for a new UUID.
     *  Single setState keeps this lint-clean (react-hooks/set-state-in-effect). */
    setSellerFetchState({
      allShopListings: [],
      publicSellerProfile: null,
      sellerReviewsPayload: null,
      catalogLoadedSellerId: null,
    })
    Promise.all([
      fetchActiveShopListings({ bustCache: true }).then((raw) => mergeShopListings(raw)),
      fetchPublicSellerProfile(realSellerId),
      fetch(`/api/seller/${encodeURIComponent(realSellerId)}/reviews`, { cache: 'no-store' })
        .then((r) => r.json())
        .catch(() => null),
    ])
      .then(([listings, profile, reviewsPayload]) => {
        if (cancelled) return
        setSellerFetchState({
          allShopListings: listings,
          publicSellerProfile: profile,
          sellerReviewsPayload: reviewsPayload,
          catalogLoadedSellerId: realSellerId,
        })
      })
      .catch(() => {
        if (cancelled) return
        setSellerFetchState({
          allShopListings: [],
          publicSellerProfile: null,
          sellerReviewsPayload: null,
          catalogLoadedSellerId: realSellerId,
        })
      })
    return () => {
      cancelled = true
    }
  }, [realSellerId])

  const shopRowsForSeller = useMemo(() => {
    if (!realSellerId) return []
    const id = String(realSellerId).toLowerCase()
    return allShopListings.filter((l) => String(l.providerId).toLowerCase() === id)
  }, [realSellerId, allShopListings])

  const resolved = useMemo(() => {
    if (!realSellerId) {
      return { seller: SAMPLE_SELLER, listings: SAMPLE_LISTINGS, reviews: SAMPLE_REVIEWS }
    }
    const aggregates = sellerReviewsPayload?.aggregates ?? {}
    const avgRating = aggregates?.avgRating ?? null
    const reviewCount = Number(aggregates?.reviewCount ?? 0) || 0
    return {
      seller: {
        ...buildSellerViewModel(realSellerId, shopRowsForSeller, publicSellerProfile),
        rating: avgRating,
        reviewCount,
      },
      listings: listingsFromShopRows(shopRowsForSeller),
      reviews: Array.isArray(sellerReviewsPayload?.reviews) ? sellerReviewsPayload.reviews : [],
    }
  }, [realSellerId, shopRowsForSeller, publicSellerProfile, sellerReviewsPayload])

  if (realSellerId && loading) {
    return <SellerProfileLoading />
  }

  return <SellerProfileView seller={resolved.seller} listings={resolved.listings} reviews={resolved.reviews} />
}

// ─── ListingCard ──────────────────────────────────────────────────────────────

function ListingCard({ listing, styles }) {
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

  const href = `/shop/${listing.serviceId}?listing=${encodeURIComponent(listing.id)}`

  return (
    <div className={styles.card}>
      <a href={href} className={styles.cardLink}>
        <div className={styles.cardImageWrap}>
          {listing.imageUrl || (listing.imageUrls && listing.imageUrls[0]) ? (
            <img
              src={listing.imageUrl || listing.imageUrls[0]}
              alt={listing.name}
              className={styles.cardImage}
              decoding="async"
            />
          ) : (
            <div className={styles.cardImagePlaceholder} aria-hidden />
          )}
          {listing.inStock === false && (
            <span className={styles.outOfStockBadge}>Out of Stock</span>
          )}
        </div>

        <div className={styles.cardBody}>
          <hr className={styles.listingDivider} />
          <div className={styles.listingTitleRow}>
            <h3 className={styles.cardTitle}>{listing.name}</h3>
            <div className={styles.priceBlock}>
              <span className={styles.priceLabel}>From</span>
              <span className={styles.price}>{formatPhp(listing.price)}</span>
            </div>
          </div>
        </div>
      </a>

      <div className={styles.cardActions}>
        <button
          type="button"
          className={styles.ctaBtn}
          onClick={handleAddToCart}
          disabled={authLoading || adding || listing.inStock === false}
          aria-busy={adding}
        >
          <svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 5, flexShrink: 0 }}>
            <path d="M1 1h2l1.5 7.5h8l1.5-5H4.5" />
            <circle cx="7" cy="13.5" r="1" fill="currentColor" stroke="none" />
            <circle cx="12" cy="13.5" r="1" fill="currentColor" stroke="none" />
          </svg>
          {listing.inStock === false ? 'Out of Stock' : adding ? 'Adding…' : 'Add to Cart'}
        </button>
      </div>
    </div>
  )
}

// ─── EmptyState ───────────────────────────────────────────────────────────────

function EmptyState({ icon, title, text }) {
  const icons = {
    listing: (
      <svg viewBox="0 0 20 20" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
        <rect x="3" y="3" width="14" height="14" rx="2" />
        <path d="M7 7h6M7 10h4" />
      </svg>
    ),
    star: (
      <svg viewBox="0 0 20 20" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
        <path d="M10 2l2.09 4.26L17 7.27l-3.5 3.41.83 4.82L10 13.27l-4.33 2.23.83-4.82L3 7.27l4.91-.71z" />
      </svg>
    ),
  }
  return (
    <div className={styles.emptyState}>
      <div className={styles.emptyIcon}>{icons[icon]}</div>
      <div className={styles.emptyTitle}>{title}</div>
      <p className={styles.emptyText}>{text}</p>
    </div>
  )
}