'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { FiExternalLink, FiRotateCcw } from 'react-icons/fi'
import styles from './listings.module.css'
import { listSellerListingsForAdmin, parseListingDynamicValues } from '@/lib/seller-listings/client'
import { getShopHrefForSellerListingRow } from '@/lib/shop-listings/client'
import { Dropdown } from '@/components/ui'

const STATUS_FILTER_OPTIONS = [
  { value: 'all', label: 'All statuses', color: 'slate' },
  { value: 'draft', label: 'Draft', color: 'slate' },
  { value: 'active', label: 'Active', color: 'green' },
  { value: 'inactive', label: 'Inactive', color: 'slate' },
  { value: 'archived', label: 'Archived', color: 'red' },
]

const KIND_FILTER_OPTIONS = [
  { value: 'all', label: 'All kinds', color: 'slate' },
  { value: 'service', label: 'Service', color: 'slate' },
  { value: 'package', label: 'Package', color: 'slate' },
  { value: 'product', label: 'Product', color: 'slate' },
  { value: 'other', label: 'Other / unset', color: 'slate' },
]

const Icon = {
  Search: () => (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
      <path d="M18 18l3.5 3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
}

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

function formatDateShort(iso) {
  if (!iso) return '—'
  try {
    const d = new Date(iso)
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(d)
  } catch {
    return '—'
  }
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

export default function AdminListingsPage() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [kindFilter, setKindFilter] = useState('all')
  const [rows, setRows] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

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
    return () => {
      mounted = false
    }
  }, [])

  const filtered = useMemo(() => {
    return rows.filter((row) => {
      const status = String(row.status || '').toLowerCase()
      if (statusFilter !== 'all' && status !== statusFilter) return false

      const kk = kindKeyFromRow(row)
      if (kindFilter !== 'all' && kk !== kindFilter) return false

      if (!search.trim()) return true
      const q = search.trim().toLowerCase()
      const name = String(row.listing_name || '').toLowerCase()
      const seller = String(row.seller_business_name || '').toLowerCase()
      const id = String(row.id || '').toLowerCase()
      return name.includes(q) || seller.includes(q) || id.includes(q)
    })
  }, [rows, search, statusFilter, kindFilter])

  const hasFilters =
    Boolean(search.trim()) || statusFilter !== 'all' || kindFilter !== 'all'

  const clearFilters = () => {
    setSearch('')
    setStatusFilter('all')
    setKindFilter('all')
  }

  return (
    <div className={styles.pageRoot}>
      <section className={styles.tablePanel}>
        <div className={styles.toolbar}>
          <div className={styles.toolbarRow}>
            <div className={styles.toolbarControls}>
              <div className={styles.toolbarSearchWrap}>
                <Icon.Search />
                <input
                  className={styles.toolbarSearchInput}
                  type="search"
                  placeholder="Search title, seller, or listing ID…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  autoComplete="off"
                />
              </div>

              <Dropdown
                value={statusFilter}
                onChange={setStatusFilter}
                ariaLabel="Listing status"
                options={STATUS_FILTER_OPTIONS}
                placeholder="All statuses"
              />

              <Dropdown
                value={kindFilter}
                onChange={setKindFilter}
                ariaLabel="Listing kind"
                options={KIND_FILTER_OPTIONS}
                placeholder="All kinds"
              />
            </div>

            <button
              type="button"
              className={styles.toolbarClearAll}
              onClick={clearFilters}
              disabled={!hasFilters}
            >
              <FiRotateCcw className={styles.toolbarClearIcon} aria-hidden />
              Clear All
            </button>
          </div>
        </div>

        <div className={styles.tableWrap}>
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
                <>
                  {' '}
                  <span className={styles.errorDetail}>({error})</span>
                </>
              ) : null}
            </p>
          )}

          {!isLoading && !error && filtered.length > 0 && (
            <table className={styles.table}>
              <colgroup>
                <col className={styles.colListing} />
                <col className={styles.colSeller} />
                <col className={styles.colKind} />
                <col className={styles.colPrice} />
                <col className={styles.colStatus} />
                <col className={styles.colUpdated} />
                <col className={styles.colActions} />
              </colgroup>
              <thead>
                <tr>
                  <th>Listing</th>
                  <th>Seller</th>
                  <th>Kind</th>
                  <th>Price</th>
                  <th>Status</th>
                  <th>Updated</th>
                  <th>Shop</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => {
                  const urls = Array.isArray(row.image_urls) ? row.image_urls : []
                  const thumb = urls.find((u) => typeof u === 'string' && u.trim() && !u.startsWith('blob:'))
                  const shopHref = getShopHrefForSellerListingRow(row)
                  const sellerLabel = row.seller_business_name?.trim() || row.seller_email || '—'

                  return (
                    <tr key={row.id} className={styles.primaryRow}>
                      <td>
                        <div className={styles.listingCell}>
                          {thumb ? (
                            <img src={thumb} alt="" className={styles.thumb} />
                          ) : (
                            <div className={`${styles.thumb} ${styles.thumbPlaceholder}`} aria-hidden>
                              —
                            </div>
                          )}
                          <div className={styles.listingText}>
                            <p className={styles.listingName}>{row.listing_name || 'Untitled'}</p>
                            <p className={styles.listingId} title={row.id}>
                              {row.id}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className={styles.sellerName} title={sellerLabel}>
                          {sellerLabel}
                        </span>
                      </td>
                      <td>
                        <span className={styles.kindBadge}>{kindLabelFromRow(row)}</span>
                      </td>
                      <td>
                        <span className={styles.price}>{formatPrice(row.base_price)}</span>
                      </td>
                      <td>
                        <StatusBadge status={row.status} />
                      </td>
                      <td>
                        <span className={styles.meta}>{formatDateShort(row.updated_at)}</span>
                      </td>
                      <td>
                        {String(row.status || '').toLowerCase() === 'active' ? (
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
                          <span className={styles.meta}>—</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}

          {!isLoading && !error && filtered.length === 0 && (
            <div className={styles.emptyState}>
              <svg className={styles.emptyIcon} viewBox="0 0 48 48" fill="none">
                <rect x="8" y="12" width="32" height="26" rx="3" stroke="#cbd5e1" strokeWidth="2" />
                <path d="M8 20h32" stroke="#cbd5e1" strokeWidth="2" />
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
                <Link href="/admin/sellers" className={styles.clearBtn} style={{ textDecoration: 'none', display: 'inline-block' }}>
                  Go to Sellers
                </Link>
              )}
            </div>
          )}
        </div>

        {!isLoading && !error && (
          <div className={styles.tableFooter}>
            Showing <strong>{filtered.length}</strong> of <strong>{rows.length}</strong> listings
          </div>
        )}
      </section>
    </div>
  )
}
