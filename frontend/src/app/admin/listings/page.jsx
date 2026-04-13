'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { FiExternalLink, FiRotateCcw } from 'react-icons/fi'
import { VscSettings } from 'react-icons/vsc'
import styles from './listings.module.css'
import { listSellerListingsForAdmin, parseListingDynamicValues } from '@/lib/seller-listings/client'
import { getShopHrefForSellerListingRow } from '@/lib/shop-listings/client'
import { Dropdown } from '@/components/ui'

/* ─── Filter options ─────────────────────────────────────── */

const STATUS_TABS = [
  { value: 'all',      label: 'All' },
  { value: 'active',   label: 'Active' },
  { value: 'draft',    label: 'Draft' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'archived', label: 'Archived' },
]

const KIND_FILTER_OPTIONS = [
  { value: 'all',     label: 'All kinds' },
  { value: 'service', label: 'Service' },
  { value: 'package', label: 'Package' },
  { value: 'product', label: 'Product' },
  { value: 'other',   label: 'Other / unset' },
]

const SORT_OPTIONS = [
  { value: 'updated',    label: 'Sort: Updated' },
  { value: 'price_asc',  label: 'Sort: Price ↑' },
  { value: 'price_desc', label: 'Sort: Price ↓' },
  { value: 'name',       label: 'Sort: Name' },
]

/* ─── Icons ──────────────────────────────────────────────── */

const Icon = {
  Search: () => (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
      <path d="M18 18l3.5 3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
}

/* ─── Main image (seller_listings.image_urls) or kind placeholder ─ */

function getMainListingImageUrl(row) {
  const raw = row?.image_urls
  const list = Array.isArray(raw) ? raw : []
  const u = list.find((x) => typeof x === 'string' && x.trim() && !x.startsWith('blob:'))
  return u ? u.trim() : null
}

function ListingThumb({ row, kind }) {
  const url = getMainListingImageUrl(row)
  const [imgFailed, setImgFailed] = useState(false)

  if (url && !imgFailed) {
    return (
      <div className={styles.thumb}>
        <img
          src={url}
          alt=""
          loading="lazy"
          decoding="async"
          onError={() => setImgFailed(true)}
        />
      </div>
    )
  }

  return <KindThumb kind={kind} />
}

const KindThumb = ({ kind }) => {
  const colors = {
    service: '#f0fdf4',
    package: '#eff6ff',
    product: '#fdf4ff',
    other:   '#fff7ed',
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

/* ─── Helpers ────────────────────────────────────────────── */

function kindKeyFromRow(row) {
  const dv = parseListingDynamicValues(row?.dynamic_values)
  const k = typeof dv.kind === 'string' ? dv.kind.trim().toLowerCase() : ''
  if (k === 'service' || k === 'package' || k === 'product') return k
  return 'other'
}

function kindLabelFromRow(row) {
  const dv = parseListingDynamicValues(row?.dynamic_values)
  const k = typeof dv.kind === 'string' ? dv.kind.trim().toLowerCase() : ''
  if (k === 'service') return 'Service'
  if (k === 'package') return 'Package'
  if (k === 'product') return 'Product'
  if (typeof dv.kind === 'string' && dv.kind.trim()) {
    const t = dv.kind.trim()
    return t.charAt(0).toUpperCase() + t.slice(1)
  }
  return '—'
}

function formatPrice(raw) {
  if (raw == null || raw === '') return '—'
  const n = Number(raw)
  if (!Number.isFinite(n)) return '—'
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(n)
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

/* ─── Listing card ───────────────────────────────────────── */

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

  return (
    <div className={styles.card}>
      {/* ── Top section ── */}
      <div className={styles.cardMain}>
        <ListingThumb row={row} kind={kind} />

        <div className={styles.cardBody}>
          <div className={styles.cardTitleRow}>
            <p className={styles.cardTitle}>{row.listing_name || 'Untitled'}</p>
          </div>
          <p className={styles.cardSub}>{sellerSubline}</p>
          <div className={styles.cardTags}>
            <span className={styles.cardTag}>{kindLabelFromRow(row)}</span>
            <span className={styles.cardTag} style={{ fontWeight: 700, color: '#0f172a' }}>
              {formatPrice(row.base_price)}
            </span>
          </div>
        </div>

        {/* ── Right: status + shop link (views/orders removed until backed by real columns/API) ── */}
        <div className={styles.cardRight}>
          <StatusBadge status={row.status} />

          {isActive ? (
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

/* ─── Page ───────────────────────────────────────────────── */

export default function AdminListingsPage() {
  const [search, setSearch]           = useState('')
  const [activeTab, setActiveTab]     = useState('all')
  const [kindFilter, setKindFilter]   = useState('all')
  const [sortKey, setSortKey]         = useState('updated')
  const [rows, setRows]               = useState([])
  const [isLoading, setIsLoading]     = useState(true)
  const [error, setError]             = useState(null)

  useEffect(() => {
    let mounted = true
    async function load() {
      setIsLoading(true)
      setError(null)
      const { data, error: loadError } = await listSellerListingsForAdmin()
      if (!mounted) return
      if (loadError) {
        setError(loadError)
        setRows([])
      } else {
        setRows(Array.isArray(data) ? data : [])
      }
      setIsLoading(false)
    }
    load()
    return () => { mounted = false }
  }, [])

  /* ── Tab counts ── */
  const tabCounts = useMemo(() => {
    const counts = { all: rows.length }
    STATUS_TABS.forEach(({ value }) => {
      if (value !== 'all')
        counts[value] = rows.filter(r => String(r.status || '').toLowerCase() === value).length
    })
    return counts
  }, [rows])

  /* ── Filtered + sorted ── */
  const filtered = useMemo(() => {
    let result = rows.filter((row) => {
      const status = String(row.status || '').toLowerCase()

      if (activeTab !== 'all' && status !== activeTab) return false

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
    // Sort
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
  }, [rows, search, activeTab, kindFilter, sortKey])

  const hasFilters =
    Boolean(search.trim()) || kindFilter !== 'all'

  const clearFilters = () => {
    setSearch('')
    setKindFilter('all')
  }

  return (
    <div className={styles.pageRoot}>
      {/* ── Toolbar ── */}
      <div className={styles.toolbar}>
        {/* Row 1: tabs + sort */}
        <div className={styles.toolbarTopRow}>
          <div className={styles.tabs}>
            {STATUS_TABS.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                className={`${styles.tab}${activeTab === value ? ` ${styles.active}` : ''}`}
                onClick={() => setActiveTab(value)}
              >
                {label}
                <span className={styles.tabCount}>{tabCounts[value] ?? 0}</span>
              </button>
            ))}
          </div>

          <div className={styles.sortWrap}>
            <Dropdown
              value={sortKey}
              onChange={setSortKey}
              ariaLabel="Sort listings"
              options={SORT_OPTIONS}
              placeholder="Sort: Updated"
              leadingIcon={<VscSettings />}
            />
          </div>
        </div>

        {/* Row 2: search + kind filter + clear */}
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
      </div>

      {/* ── Content ── */}
      <div className={styles.cardList}>
        {isLoading && (
          <div className={styles.loadingState}>
            <div className={styles.spinner} />
            <p>Loading listings…</p>
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

        {!isLoading && !error && filtered.length > 0 &&
          filtered.map((row) => <ListingCard key={row.id} row={row} />)
        }

        {!isLoading && !error && filtered.length === 0 && (
          <div className={styles.emptyState}>
            <svg className={styles.emptyIcon} viewBox="0 0 48 48" fill="none">
              <rect x="8" y="12" width="32" height="26" rx="3" stroke="currentColor" strokeWidth="2" />
              <path d="M8 20h32" stroke="currentColor" strokeWidth="2" />
            </svg>
            <p className={styles.emptyTitle}>No listings found</p>
            <p className={styles.emptyText}>
              {rows.length === 0
                ? 'No seller listings in the database yet, or you may lack permission to read them.'
                : 'No listings match your current filters.'}
            </p>
            {hasFilters && (
              <button type="button" className={styles.clearBtn} onClick={clearFilters}>
                Clear filters
              </button>
            )}
            {rows.length === 0 && !hasFilters && (
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

      {/* ── Footer ── */}
      {!isLoading && !error && (
        <div className={styles.tableFooter}>
          Showing <strong>{filtered.length}</strong> of <strong>{rows.length}</strong> listings
        </div>
      )}
    </div>
  )
}