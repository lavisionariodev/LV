'use client'

import { readEnum, readString, replaceUrlQuery } from '@/shared/utils'
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { FiExternalLink, FiRotateCcw } from 'react-icons/fi'
import { VscSettings } from 'react-icons/vsc'
import { LuSettings2 } from 'react-icons/lu'
import styles from '../listings.module.css'
import { listSellerListingsForAdmin } from '@/lib/seller-listings/client'
import { getShopHrefForSellerListingRow } from '@/lib/shop-listings/client'
import { formatPhpAmount } from '@/lib/cart/formatPhp'
import { Dropdown } from '@/components/ui'
import { useDebouncedEffect, useMediaQuery } from '@/shared/hooks'
import { TbX } from 'react-icons/tb'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
const APPROVED_STATUS_TABS = [
  { value: 'active', label: 'Active' },
  { value: 'archived', label: 'Archived' },
]

const KIND_FILTER_OPTIONS = [
  { value: 'all', label: 'All kinds' },
  { value: 'service', label: 'Service' },
  { value: 'package', label: 'Package' },
  { value: 'product', label: 'Product' },
  { value: 'other', label: 'Other / unset' },
]

const SORT_OPTIONS = [
  { value: 'updated', label: 'Sort: Default' },
  { value: 'price_asc', label: 'Sort: Price ↑' },
  { value: 'price_desc', label: 'Sort: Price ↓' },
  { value: 'name', label: 'Sort: Name' },
]

/** `seller_avatar_url` from listSellerListingsForAdmin (batch `profiles.avatar_url`). */
function SellerAvatarMark({ src, initialsSource, listingStyles: styleMod }) {
  const [failed, setFailed] = useState(false)
  const label = String(initialsSource ?? '?').trim() || '?'
  const url = typeof src === 'string' ? src.trim() : ''
  const showImg = url.length > 0 && !failed
  return (
    <span
      className={`${styleMod.sellerAvatar}${showImg ? ` ${styleMod.sellerAvatarHasImage}` : ''}`}
      title={label}
    >
      {showImg ? (
        <Image
          src={url}
          alt=""
          width={18}
          height={18}
          unoptimized
          className={styleMod.sellerAvatarImg}
          onError={() => setFailed(true)}
        />
      ) : (
        label.charAt(0).toUpperCase()
      )}
    </span>
  )
}

const Icon = {
  Search: () => (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
      <path d="M18 18l3.5 3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
}

function getMainListingImageUrl(row) {
  const raw = row?.image_urls
  const list = Array.isArray(raw) ? raw : []
  const u = list.find((x) => typeof x === 'string' && x.trim() && !x.startsWith('blob:'))
  return u ? u.trim() : null
}

function kindKeyFromRow(row) {
  const k = typeof row.listing_kind === 'string' ? row.listing_kind.trim().toLowerCase() : ''
  if (k === 'service' || k === 'package' || k === 'product') return k
  return 'other'
}

function kindLabelFromRow(row) {
  const k = typeof row.listing_kind === 'string' ? row.listing_kind.trim().toLowerCase() : ''
  if (k === 'service') return 'Service'
  if (k === 'package') return 'Package'
  if (k === 'product') return 'Product'
  if (typeof row.listing_kind === 'string' && row.listing_kind.trim()) {
    const t = row.listing_kind.trim()
    return t.charAt(0).toUpperCase() + t.slice(1)
  }
  return '—'
}

function StatusBadge({ status }) {
  const s = String(status || 'draft').toLowerCase()
  const tone = styles[`status_${s}`] ? styles[`status_${s}`] : styles.status_draft
  return (
    <span className={`${styles.statusBadge} ${tone}`}>
      <span className={styles.statusDot} />
      {s}
    </span>
  )
}

function KindThumb({ kind }) {
  const colors = {
    service: '#f0fdf4',
    package: '#eff6ff',
    product: '#fdf4ff',
    other: '#fff7ed',
  }
  const bg = colors[kind] || colors.other

  const paths = {
    service: (
      <svg style={{ width: 22, height: 22, color: '#94a3b8' }} viewBox="0 0 24 24" fill="none">
        <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    ),
    package: (
      <svg style={{ width: 22, height: 22, color: '#94a3b8' }} viewBox="0 0 24 24" fill="none">
        <rect x="3" y="3" width="18" height="18" rx="3" stroke="currentColor" strokeWidth="1.5" />
        <path d="M3 9h18M9 9v12" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    ),
    product: (
      <svg style={{ width: 22, height: 22, color: '#94a3b8' }} viewBox="0 0 24 24" fill="none">
        <path d="M6 2l3 7H3l3-7zm12 0l3 7h-6l3-7zM3 9h18v3a9 9 0 01-18 0V9z" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    ),
  }

  return (
    <div className={styles.thumb} style={{ background: bg }}>
      {paths[kind] || (
        <svg style={{ width: 22, height: 22, color: '#94a3b8' }} viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" />
          <path d="M12 8v4l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      )}
    </div>
  )
}

function ListingThumb({ row, kind }) {
  const url = getMainListingImageUrl(row)
  const [imgFailed, setImgFailed] = useState(false)

  if (url && !imgFailed) {
    return (
      <div className={styles.thumb}>
        <Image
          src={url}
          alt=""
          width={72}
          height={72}
          unoptimized
          loading="lazy"
          onError={() => setImgFailed(true)}
        />
      </div>
    )
  }

  return <KindThumb kind={kind} />
}

function KindPill({ kind }) {
  const kindMap = {
    Service: styles.kindService,
    Package: styles.kindPackage,
    Product: styles.kindProduct,
  }
  const label = kind || '—'
  return (
    <span className={`${styles.kindPill} ${kindMap[label] || ''}`}>
      {label}
    </span>
  )
}

function BrowseMobileListingCard({ row }) {
  const kind = kindKeyFromRow(row)
  const shopHref = getShopHrefForSellerListingRow(row)
  const business = row.seller_business_name?.trim() || ''
  const email = row.seller_email?.trim() || ''
  const statusLabel = String(row.status || 'draft').toLowerCase()
  const kindLabel = kindLabelFromRow(row)
  const isActive = statusLabel === 'active'
  const approval = String(row.approval_status || 'draft').toLowerCase()
  const isShopVisible = isActive && approval === 'approved'

  return (
    <article className={`${styles.mobileCard} ${styles.browseMobileCard}`}>
      <div className={styles.mobileCardHeader}>
        <div className={styles.mobileCardHeaderMain}>
          <div className={styles.browseMobileThumbWrap}>
            <ListingThumb row={row} kind={kind} />
          </div>
          <div className={styles.mobileHeaderMain}>
            <p className={styles.mobileTitle}>{row.listing_name || 'Untitled'}</p>
          </div>
        </div>
      </div>

      <div className={styles.mobileCardSection} data-mobile-label="Price">
        <p className={styles.browseMobilePriceValue}>{formatPhpAmount(row.base_price)}</p>
      </div>

      <div className={styles.mobileCardSection} data-mobile-label="Seller">
        <div className={styles.mobileCardSellerRow}>
          <SellerAvatarMark
            src={row.seller_avatar_url}
            initialsSource={business || email || '?'}
            listingStyles={styles}
          />
          <div className={styles.browseMobileSellerText}>
            {business ? <p className={styles.browseMobileSellerName}>{business}</p> : null}
            {email ? <p className={styles.browseMobileSellerEmail}>{email}</p> : null}
            {!business && !email ? <p className={styles.browseMobileSellerName}>—</p> : null}
          </div>
        </div>
      </div>

      <div className={styles.mobileCardSection} data-mobile-label="Listing">
        <div className={styles.mobileCardStatusRow}>
          <div className={styles.mobileCardStatusItem}>
            <span className={styles.mobileCardStatusKey}>Status</span>
            <span
              className={`${styles.browseMobileMetaText} ${
                styles[`browseMobileStatus_${statusLabel}`] || styles.browseMobileStatus_draft
              }`}
            >
              {statusLabel}
            </span>
          </div>
          <div className={styles.mobileCardStatusItem}>
            <span className={styles.mobileCardStatusKey}>Kind</span>
            <span
              className={`${styles.browseMobileMetaText} ${
                styles[`browseMobileKind_${kind}`] || styles.browseMobileKind_other
              }`}
            >
              {kindLabel}
            </span>
          </div>
        </div>
      </div>

      <div className={styles.mobileCardFooter}>
        {isShopVisible ? (
          <a
            href={shopHref}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.mobileCardDetailsBtn}
          >
            View in shop
          </a>
        ) : (
          <span className={styles.browseMobileUnavailable}>Not visible in shop</span>
        )}
      </div>
    </article>
  )
}

function ListingCard({ row }) {
  const kind = kindKeyFromRow(row)
  const shopHref = getShopHrefForSellerListingRow(row)
  const business = row.seller_business_name?.trim() || ''
  const email = row.seller_email?.trim() || ''
  const sellerSubline =
    business && email
      ? `${business} · ${email}`
      : email || business || '—'
  const isActive = String(row.status || '').toLowerCase() === 'active'
  const approval = String(row.approval_status || 'draft').toLowerCase()
  const isShopVisible = isActive && approval === 'approved'

  return (
    <div className={styles.card}>
      <div className={styles.cardMain}>
        <ListingThumb row={row} kind={kind} />

        <div className={styles.cardBody}>
          <div className={styles.cardTitleRow}>
            <p className={styles.cardTitle}>{row.listing_name || 'Untitled'}</p>
          </div>
          <div className={styles.cardSellerRow}>
            <SellerAvatarMark
              src={row.seller_avatar_url}
              initialsSource={business || email || '?'}
              listingStyles={styles}
            />
            <p className={styles.cardSub}>{sellerSubline}</p>
          </div>
          <div className={styles.cardTags}>
            <span className={styles.cardTag}>{kindLabelFromRow(row)}</span>
            <span className={styles.cardTag} style={{ fontWeight: 700, color: '#0f172a' }}>
              {formatPhpAmount(row.base_price)}
            </span>
          </div>
        </div>

        <div className={styles.cardRight}>
          <StatusBadge status={row.status} />

          {isShopVisible ? (
            <a
              href={shopHref}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.viewLink}
            >
              View
              <FiExternalLink className={styles.viewLinkIcon} aria-hidden />
            </a>
          ) : (
            <span className={styles.metaItem} style={{ fontSize: 12 }}>—</span>
          )}
        </div>
      </div>
    </div>
  )
}

export default function AdminListingsBrowsePage() {
  const router = useRouter()
  const pathname = usePathname()
  const listingsPathClean = pathname?.split(/[?#]/)[0] || ''
  const isListingsApprovalsRoute = listingsPathClean.startsWith('/admin/listings/approvals')
  const searchParams = useSearchParams()
  const isMobile = useMediaQuery('(max-width: 860px)')
  const [search, setSearch] = useState(() => readString(searchParams, 'q', ''))
  const [statusTab, setStatusTab] = useState(() =>
    readEnum(searchParams, 'status', APPROVED_STATUS_TABS.map((t) => t.value), 'active')
  )
  const [kindFilter, setKindFilter] = useState(() =>
    readEnum(searchParams, 'kind', KIND_FILTER_OPTIONS.map((o) => o.value), 'all')
  )
  const [sortKey, setSortKey] = useState(() =>
    readEnum(searchParams, 'sort', SORT_OPTIONS.map((o) => o.value), 'updated')
  )
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [approvedRows, setApprovedRows] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  // Sync state <- URL (back/forward, shared links). Defer updates so this effect does not set state synchronously.
  useEffect(() => {
    const nextQ = readString(searchParams, 'q', '')
    const nextStatus = readEnum(searchParams, 'status', APPROVED_STATUS_TABS.map((t) => t.value), 'active')
    const nextKind = readEnum(searchParams, 'kind', KIND_FILTER_OPTIONS.map((o) => o.value), 'all')
    const nextSort = readEnum(searchParams, 'sort', SORT_OPTIONS.map((o) => o.value), 'updated')
    queueMicrotask(() => {
      setSearch((s) => (nextQ !== s ? nextQ : s))
      setStatusTab((t) => (nextStatus !== t ? nextStatus : t))
      setKindFilter((k) => (nextKind !== k ? nextKind : k))
      setSortKey((sk) => (nextSort !== sk ? nextSort : sk))
    })
  }, [searchParams])

  // Sync URL <- state (debounce search typing)
  useDebouncedEffect(() => {
    replaceUrlQuery(router, pathname, searchParams, {
      q: search,
      status: { value: statusTab, omitIf: 'active' },
      kind: { value: kindFilter, omitIf: 'all' },
      sort: { value: sortKey, omitIf: 'updated' },
    })
  }, [search, statusTab, kindFilter, sortKey, router, pathname, searchParams], 300)

  useEffect(() => {
    if (!isMobile || !filtersOpen) return

    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    function onKeyDown(e) {
      if (e.key === 'Escape') setFiltersOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)

    return () => {
      document.body.style.overflow = prevOverflow
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [filtersOpen, isMobile])

  useEffect(() => {
    let mounted = true
    async function load() {
      setError(null)
      setIsLoading(true)
      const res = await listSellerListingsForAdmin({
        statusIn: ['active', 'archived'],
        approvalStatusIn: ['approved'],
      })
      if (!mounted) return
      if (res.error) {
        setError(res.error)
        setApprovedRows(Array.isArray(res.data) ? res.data : [])
      } else {
        setApprovedRows(Array.isArray(res.data) ? res.data : [])
      }
      setIsLoading(false)
    }
    load()
    return () => {
      mounted = false
    }
  }, [])

  const statusCounts = useMemo(() => {
    const counts = { active: 0, archived: 0 }
    for (const r of approvedRows) {
      const s = String(r?.status || '').toLowerCase()
      if (s === 'active') counts.active += 1
      if (s === 'archived') counts.archived += 1
    }
    return counts
  }, [approvedRows])

  const approvedFiltered = useMemo(() => {
    let result = approvedRows.filter((row) => {
      const st = String(row.status || '').toLowerCase()
      if (st !== statusTab) return false

      const kk = kindKeyFromRow(row)
      if (kindFilter !== 'all' && kk !== kindFilter) return false

      if (!search.trim()) return true
      const q = search.trim().toLowerCase()
      const name = String(row.listing_name || '').toLowerCase()
      const seller = String(row.seller_business_name || '').toLowerCase()
      const sellerEmail = String(row.seller_email || '').toLowerCase()
      return (
        name.includes(q) ||
        seller.includes(q) ||
        sellerEmail.includes(q)
      )
    })

    const priceNum = (r) => {
      const n = Number(r?.base_price)
      return Number.isFinite(n) ? n : 0
    }
    if (sortKey === 'price_asc') {
      result = result.slice().sort((a, b) => priceNum(a) - priceNum(b))
    }
    if (sortKey === 'price_desc') {
      result = result.slice().sort((a, b) => priceNum(b) - priceNum(a))
    }
    if (sortKey === 'name') {
      result = result.slice().sort((a, b) =>
        (a.listing_name || '').localeCompare(b.listing_name || '', undefined, { sensitivity: 'base' }),
      )
    }
    if (sortKey === 'updated') {
      result = result.slice().sort(
        (a, b) => new Date(b.updated_at || 0) - new Date(a.updated_at || 0),
      )
    }

    return result
  }, [approvedRows, search, statusTab, kindFilter, sortKey])

  const hasFilters = Boolean(search.trim()) || kindFilter !== 'all'

  const clearFilters = () => {
    setSearch('')
    setKindFilter('all')
  }

  const clearAllMobile = () => {
    clearFilters()
    setSortKey('updated')
    setFiltersOpen(false)
  }

  const mobileHasFilters = hasFilters || sortKey !== 'updated'
  const activeFilterLabels = useMemo(() => {
    const labels = []
    if (sortKey !== 'updated') {
      labels.push((SORT_OPTIONS.find((o) => o.value === sortKey)?.label || sortKey).replace(/^Sort:\s*/i, ''))
    }
    if (kindFilter !== 'all') {
      labels.push(KIND_FILTER_OPTIONS.find((o) => o.value === kindFilter)?.label || kindFilter)
    }
    return labels
  }, [sortKey, kindFilter])

  return (
    <div className={`${styles.pageRoot} ${styles.browsePageRoot}`}>
      <nav className={styles.listingsMobileSwitch} aria-label="Listings navigation">
        <Link
          href="/admin/listings/browse"
          className={`${styles.listingsMobileSwitchLink} ${!isListingsApprovalsRoute ? styles.listingsMobileSwitchLinkActive : ''}`}
          aria-current={!isListingsApprovalsRoute ? 'page' : undefined}
        >
          Browse
        </Link>
        <Link
          href="/admin/listings/approvals"
          className={`${styles.listingsMobileSwitchLink} ${isListingsApprovalsRoute ? styles.listingsMobileSwitchLinkActive : ''}`}
          aria-current={isListingsApprovalsRoute ? 'page' : undefined}
        >
          Approvals
        </Link>
      </nav>

      <div className={styles.toolbar}>
        <div className={styles.toolbarTopRow}>
          <div className={styles.tabsStack}>
            <div className={styles.tabs}>
              {APPROVED_STATUS_TABS.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  className={`${styles.tab}${statusTab === value ? ` ${styles.active}` : ''}`}
                  onClick={() => setStatusTab(value)}
                >
                  {label}
                  <span className={styles.tabCount}>{statusCounts[value] ?? 0}</span>
                </button>
              ))}
            </div>
          </div>

          {!isMobile && (
            <div className={styles.sortWrap}>
              <Dropdown
                value={sortKey}
                onChange={setSortKey}
                ariaLabel="Sort listings"
                options={SORT_OPTIONS}
                placeholder="Sort"
                leadingIcon={<VscSettings />}
              />
            </div>
          )}
        </div>

        {isMobile ? (
          <div className={styles.mobileSearchSection}>
            <div className={`${styles.mobileSearchWrap}${mobileHasFilters ? ` ${styles.mobileSearchWrapActive}` : ''}`}>
              <span className={styles.mobileSearchIcon}>
                <Icon.Search />
              </span>
              <input
                aria-label="Search listings"
                className={styles.mobileSearchInput}
                type="search"
                placeholder="Search title, seller, or email…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                autoComplete="off"
              />
              {search.trim() ? (
                <button
                  type="button"
                  className={styles.mobileSearchClearBtn}
                  onClick={() => setSearch('')}
                  aria-label="Clear search"
                >
                  <TbX aria-hidden />
                </button>
              ) : null}
              <div className={styles.mobileSearchDivider} />
              <button
                type="button"
                className={styles.mobileFilterBtn}
                onClick={() => setFiltersOpen(true)}
                aria-haspopup="dialog"
                aria-expanded={filtersOpen}
                aria-label="Open filters"
              >
                <LuSettings2
                  aria-hidden
                  className={`${styles.mobileFilterIcon}${mobileHasFilters ? ` ${styles.mobileFilterIconActive}` : ''}`}
                />
              </button>
            </div>
            {activeFilterLabels.length > 0 && (
              <div className={styles.mobileActivePillsRow} aria-label="Active filters">
                {activeFilterLabels.map((label) => (
                  <div key={label} className={styles.mobileActivePill}>
                    <span className={styles.mobileActivePillLabel}>{label}</span>
                    <button
                      type="button"
                      className={styles.mobileActivePillClear}
                      onClick={() => {
                        const sortLabel = (SORT_OPTIONS.find((o) => o.value === sortKey)?.label || sortKey).replace(/^Sort:\s*/i, '')
                        const kindLabel = KIND_FILTER_OPTIONS.find((o) => o.value === kindFilter)?.label || kindFilter
                        if (label === sortLabel) setSortKey('updated')
                        if (label === kindLabel) setKindFilter('all')
                      }}
                      aria-label={`Clear ${label} filter`}
                    >
                      <TbX aria-hidden />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className={styles.filterRow}>
            <div className={styles.toolbarSearchWrap}>
              <Icon.Search />
              <input
                aria-label="Search listings"
                className={styles.toolbarSearchInput}
                type="search"
                placeholder="Search title, seller, or email…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                autoComplete="off"
              />
              {search.trim() ? (
                <button
                  type="button"
                  className={styles.toolbarSearchClearBtn}
                  onClick={() => setSearch('')}
                  aria-label="Clear search"
                >
                  <TbX aria-hidden />
                </button>
              ) : null}
            </div>

            <Dropdown
              value={kindFilter}
              onChange={setKindFilter}
              ariaLabel="Listing kind"
              options={KIND_FILTER_OPTIONS}
              placeholder="All kinds"
            />

            <button
              type="button"
              className={styles.toolbarClearAll}
              onClick={clearFilters}
              disabled={!hasFilters}
            >
              <FiRotateCcw className={styles.toolbarClearIcon} aria-hidden />
              Clear
            </button>
          </div>
        )}
      </div>

      {isMobile && filtersOpen && (
        <div
          className={styles.filterSheetOverlay}
          role="presentation"
          onClick={() => setFiltersOpen(false)}
        >
          <div
            className={styles.filterSheet}
            role="dialog"
            aria-modal="true"
            aria-label="Filters"
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.filterSheetHandle} aria-hidden />
            <div className={styles.filterSheetHeader}>
              <p className={styles.filterSheetTitle}>Filters</p>
              <button
                type="button"
                className={styles.filterSheetClose}
                onClick={() => setFiltersOpen(false)}
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <div className={styles.filterSheetBody}>
              <p className={styles.filterSheetLabel}>Sort</p>
              <div className={styles.filterOptions}>
                {SORT_OPTIONS.map((opt) => {
                  const active = opt.value === sortKey
                  const rawLabel = String(opt.label || '')
                  const displayLabel =
                    opt.value === 'updated'
                      ? rawLabel
                      : rawLabel.replace(/^Sort:\s*/i, '') || opt.label
                  const isDefault = opt.value === 'updated'
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      className={`${styles.filterOption} ${
                        active ? (isDefault ? styles.filterOptionActiveDefault : styles.filterOptionActive) : ''
                      }`}
                      onClick={() => {
                        setSortKey(opt.value)
                        setFiltersOpen(false)
                      }}
                      aria-pressed={active}
                    >
                      <span>{displayLabel}</span>
                      {active && <span className={styles.filterOptionCheck} aria-hidden />}
                    </button>
                  )
                })}
              </div>

              <p className={styles.filterSheetLabel}>Kind</p>
              <div className={styles.filterOptions}>
                {KIND_FILTER_OPTIONS.map((opt) => {
                  const active = opt.value === kindFilter
                  const isDefault = opt.value === 'all'
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      className={`${styles.filterOption} ${
                        active ? (isDefault ? styles.filterOptionActiveDefault : styles.filterOptionActive) : ''
                      }`}
                      onClick={() => {
                        setKindFilter(opt.value)
                        setFiltersOpen(false)
                      }}
                      aria-pressed={active}
                    >
                      <span>{opt.label}</span>
                      {active && <span className={styles.filterOptionCheck} aria-hidden />}
                    </button>
                  )
                })}
              </div>

              <div className={styles.filterSheetFooter}>
                <button
                  type="button"
                  className={styles.filterSheetClearAll}
                  onClick={clearAllMobile}
                  disabled={!mobileHasFilters}
                >
                  <FiRotateCcw className={styles.toolbarClearIcon} aria-hidden />
                  Clear all
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className={styles.cardList}>
        {isLoading && (
          <div role="status" aria-live="polite" aria-busy="true" aria-label="Loading approved listings" style={{ display: 'contents' }}>
            {Array.from({ length: 6 }).map((_, i) =>
              isMobile ? (
                <div key={`browse-sk-${i}`} className={`${styles.mobileCard} ${styles.browseMobileCard} ${styles.browseMobileCardSkeleton}`}>
                  <div className={styles.mobileCardHeader}>
                    <div className={styles.mobileCardHeaderMain}>
                      <span className={`${styles.listingsSkBar} ${styles.browseMobileSkThumb}`} aria-hidden />
                      <span className={`${styles.listingsSkBar} ${styles.browseMobileSkTitle}`} aria-hidden />
                    </div>
                  </div>
                  <div className={styles.mobileCardSection} data-mobile-label="Price">
                    <span className={`${styles.listingsSkBar} ${styles.browseMobileSkPrice}`} aria-hidden />
                  </div>
                  <div className={styles.mobileCardSection} data-mobile-label="Seller">
                    <span className={`${styles.listingsSkBar} ${styles.browseMobileSkLine}`} aria-hidden />
                  </div>
                  <div className={styles.mobileCardSection}>
                    <span className={`${styles.listingsSkBar} ${styles.browseMobileSkLine}`} style={{ width: '70%' }} aria-hidden />
                  </div>
                  <div className={styles.mobileCardFooter}>
                    <span className={`${styles.listingsSkBar} ${styles.browseMobileSkBtn}`} aria-hidden />
                  </div>
                </div>
              ) : (
                <div key={`browse-sk-${i}`} className={styles.card}>
                  <div className={styles.cardMain}>
                    <span className={`${styles.listingsSkBar} ${styles.listingsSkThumb}`} aria-hidden />
                    <div className={styles.cardBody}>
                      <span className={`${styles.listingsSkBar} ${styles.listingsSkTitle}`} aria-hidden />
                      <span className={`${styles.listingsSkBar} ${styles.listingsSkSub}`} aria-hidden />
                      <div className={styles.cardTags}>
                        <span className={`${styles.listingsSkBar} ${styles.listingsSkTag}`} aria-hidden />
                        <span className={`${styles.listingsSkBar} ${styles.listingsSkTag}`} style={{ width: 96 }} aria-hidden />
                      </div>
                    </div>
                    <div className={styles.cardRight}>
                      <span className={`${styles.listingsSkBar} ${styles.listingsSkTag}`} aria-hidden />
                      <span className={`${styles.listingsSkBar} ${styles.listingsSkTag}`} style={{ width: 56 }} aria-hidden />
                    </div>
                  </div>
                </div>
              ),
            )}
          </div>
        )}

        {error && !isLoading && (
          <p className={styles.loadError}>
            Could not load listings. Ensure migration 038 is applied and admins can read{' '}
            <code>seller_listings</code>.
            {typeof error === 'string' && error.trim() ? (
              <> <span className={styles.errorDetail}>({error})</span></>
            ) : null}
          </p>
        )}

        {!isLoading && !error && approvedFiltered.length > 0 &&
          approvedFiltered.map((row) =>
            isMobile ? (
              <BrowseMobileListingCard key={row.id} row={row} />
            ) : (
              <ListingCard key={row.id} row={row} />
            ),
          )}

        {!isLoading && !error && approvedFiltered.length === 0 && (
          <div className={`${styles.emptyState} ${styles.cardListEmptyState}`}>
            <svg className={styles.emptyIcon} viewBox="0 0 48 48" fill="none">
              <rect x="8" y="12" width="32" height="26" rx="3" stroke="currentColor" strokeWidth="2" />
              <path d="M8 20h32" stroke="currentColor" strokeWidth="2" />
            </svg>
            <p className={styles.emptyTitle}>No listings found</p>
            <p className={styles.emptyText}>
              {approvedRows.length === 0
                ? 'No seller listings in the database yet, or you may lack permission to read them.'
                : 'No listings match your current filters.'}
            </p>
            {hasFilters && (
              <button type="button" className={styles.clearBtn} onClick={clearFilters}>
                Clear filters
              </button>
            )}
            {approvedRows.length === 0 && !hasFilters && (
              <Link
                href="/admin/sellers"
                className={styles.clearBtn}
                style={{ textDecoration: 'none', display: 'inline-block' }}
              >
                Go to Sellers
              </Link>
            )}
          </div>
        )}
      </div>

      {!isLoading && !error && approvedFiltered.length > 0 && (
        <div className={styles.tableFooter}>
          Showing <strong>{approvedFiltered.length}</strong> of <strong>{approvedRows.length}</strong>{' '}
          approved listings
        </div>
      )}
    </div>
  )
}
