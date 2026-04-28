'use client'

import { useEffect, useMemo, useState } from 'react'
import { FiRotateCcw } from 'react-icons/fi'
import { TbX } from 'react-icons/tb'
import { LuSettings2 } from 'react-icons/lu'
import styles from './buyers.module.css'
import { supabase } from '@/lib/supabase/client'
import { useDebouncedEffect, useMediaQuery } from '@/hooks'
import { Dropdown } from '@/components/ui'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { readEnum, readString, replaceUrlQuery } from '@/lib/url/queryParams'

const STATUS_FILTER_OPTIONS = [
  { value: 'all', label: 'All statuses', color: 'slate' },
  { value: 'active', label: 'Active', color: 'green' },
]

const Icon = {
  Search: () => (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
      <path d="M18 18l3.5 3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
}

function normalizeAvatarUrl(url) {
  if (url == null || typeof url !== 'string') return null
  const t = url.trim()
  return t.length ? t : null
}

function Avatar({ name, src }) {
  const [imgError, setImgError] = useState(false)
  const label = name || 'Buyer'
  const url = normalizeAvatarUrl(src)
  const showImg = url && !imgError

  if (showImg) {
    return (
      <img
        src={url}
        alt=""
        className={styles.avatar}
        onError={() => setImgError(true)}
      />
    )
  }

  return (
    <div className={`${styles.avatar} ${styles.avatarDefault}`} title={label} aria-hidden>
      <svg viewBox="0 0 24 24" fill="none" className={styles.avatarIcon}>
        <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.5" />
        <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    </div>
  )
}

export default function AdminBuyersPage() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const isMobile = useMediaQuery('(max-width: 640px)')
  const [search, setSearch] = useState(() => readString(searchParams, 'q', ''))
  const [statusFilter, setStatusFilter] = useState(() =>
    readEnum(searchParams, 'status', STATUS_FILTER_OPTIONS.map((o) => o.value), 'all')
  )
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [buyers, setBuyers] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedRows, setSelectedRows] = useState(() => new Set())

  // Sync state <- URL (back/forward, shared links)
  useEffect(() => {
    const nextQ = readString(searchParams, 'q', '')
    const nextStatus = readEnum(searchParams, 'status', STATUS_FILTER_OPTIONS.map((o) => o.value), 'all')
    if (nextQ !== search) setSearch(nextQ)
    if (nextStatus !== statusFilter) setStatusFilter(nextStatus)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  // Sync URL <- state (debounce search typing)
  useDebouncedEffect(() => {
    replaceUrlQuery(router, pathname, searchParams, {
      q: search,
      status: { value: statusFilter, omitIf: 'all' },
    })
  }, [search, statusFilter, router, pathname, searchParams], 300)

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

  // Desktop uses inline Dropdown (no modal / no outside-click handler needed).

  useEffect(() => {
    let isMounted = true

    async function loadBuyers() {
      setIsLoading(true)
      setError(null)

      const { data, error: loadError } = await supabase
        .from('users')
        .select(`
          id,
          email,
          role,
          created_at,
          profiles (
            full_name,
            avatar_url
          )
        `)
        .eq('role', 'buyer')
        .order('created_at', { ascending: false })

      if (!isMounted) return

      if (loadError) {
        console.error('Failed to load buyers from Supabase:', loadError.message)
        setError(loadError)
        setBuyers([])
        setIsLoading(false)
        return
      }

      const next = (data || []).map((row) => {
        const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles
        const name = profile?.full_name || row.email || '—'
        const joinedAt = row.created_at ? new Date(row.created_at).toISOString().slice(0, 10) : '—'

        return {
          id: row.id,
          name,
          email: row.email || '—',
          role: row.role || 'buyer',
          joinedAt,
          status: 'active',
          avatarUrl: normalizeAvatarUrl(profile?.avatar_url),
        }
      })

      setBuyers(next)
      setIsLoading(false)
    }

    loadBuyers()

    return () => {
      isMounted = false
    }
  }, [])

  const filtered = useMemo(() => {
    return buyers.filter((buyer) => {
      if (statusFilter !== 'all' && buyer.status !== statusFilter) return false
      if (!search.trim()) return true
      const q = search.trim().toLowerCase()
      return (
        buyer.name.toLowerCase().includes(q) ||
        buyer.email.toLowerCase().includes(q) ||
        buyer.id.toLowerCase().includes(q)
      )
    })
  }, [buyers, search, statusFilter])

  const hasFilters = Boolean(search.trim()) || statusFilter !== 'all'

  const clearFilters = () => {
    setSearch('')
    setStatusFilter('all')
  }

  const statusLabel =
    STATUS_FILTER_OPTIONS.find((o) => o.value === statusFilter)?.label ?? 'All statuses'
  const activeFilterLabel = statusFilter !== 'all' ? statusLabel : null

  return (
    <div className={styles.pageRoot}>
      <section className={styles.tablePanel}>
        <div className={styles.toolbar}>
          <div className={styles.toolbarRow}>
            <div className={styles.toolbarControls}>
              {isMobile ? (
                <div className={styles.mobileSearchSection}>
                  <div className={`${styles.mobileSearchWrap}${statusFilter !== 'all' ? ` ${styles.mobileSearchWrapActive}` : ''}`}>
                    <span className={styles.mobileSearchIcon}>
                      <Icon.Search />
                    </span>
                    <input
                      className={styles.mobileSearchInput}
                      type="search"
                      placeholder="Search name, email, or ID…"
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
                        className={`${styles.mobileFilterIcon}${statusFilter !== 'all' ? ` ${styles.mobileFilterIconActive}` : ''}`}
                      />
                    </button>
                  </div>
                  {activeFilterLabel && (
                    <div className={styles.mobileActivePillsRow} aria-label="Active filters">
                      <div className={styles.mobileActivePill}>
                        <span className={styles.mobileActivePillLabel}>{activeFilterLabel}</span>
                        <button
                          type="button"
                          className={styles.mobileActivePillClear}
                          onClick={() => setStatusFilter('all')}
                          aria-label="Clear filter"
                        >
                          <TbX aria-hidden />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <div className={styles.toolbarSearchWrap}>
                    <Icon.Search />
                    <input
                      className={styles.toolbarSearchInput}
                      type="search"
                      placeholder="Search name, email, or ID…"
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
                    value={statusFilter}
                    onChange={setStatusFilter}
                    ariaLabel="Buyer status"
                    options={STATUS_FILTER_OPTIONS}
                    placeholder="All statuses"
                  />
                </>
              )}
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
                <p className={styles.filterSheetTitle}>Filter</p>
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
                <p className={styles.filterSheetLabel}>Status</p>
                <div className={styles.filterOptions}>
                  {STATUS_FILTER_OPTIONS.map((opt) => {
                    const active = opt.value === statusFilter
                    const isDefault = opt.value === 'all'
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        className={`${styles.filterOption} ${
                          active ? (isDefault ? styles.filterOptionActiveDefault : styles.filterOptionActive) : ''
                        }`}
                        onClick={() => {
                          setStatusFilter(opt.value)
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
                    onClick={() => {
                      clearFilters()
                      setFiltersOpen(false)
                    }}
                    disabled={!hasFilters}
                  >
                    <FiRotateCcw className={styles.toolbarClearIcon} aria-hidden />
                    Clear All
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className={styles.tableWrap}>
          {isLoading && (
            <div className={styles.loadingState}>
              <div className={styles.spinner} />
              <p>Loading buyers…</p>
            </div>
          )}

          {error && !isLoading && (
            <p className={styles.loadError}>
              Could not load buyers from Supabase. Check RLS policies for `users` / `profiles`.
            </p>
          )}

          {!isLoading && !error && filtered.length > 0 && (
            <table className={styles.table}>
              <colgroup>
                <col className={styles.colCheck} />
                <col className={styles.colBuyer} />
                <col className={styles.colEmail} />
                <col className={styles.colJoined} />
                <col className={styles.colRole} />
                <col className={styles.colStatus} />
              </colgroup>
              <thead>
                <tr>
                  <th className={styles.checkboxCell}>
                    <input
                      type="checkbox"
                      className={styles.rowCheckbox}
                      checked={
                        filtered.length > 0 &&
                        filtered.every((b) => selectedRows.has(b.id))
                      }
                      onChange={(e) => {
                        setSelectedRows((prev) => {
                          const next = new Set(prev)
                          if (e.target.checked) {
                            filtered.forEach((b) => next.add(b.id))
                          } else {
                            filtered.forEach((b) => next.delete(b.id))
                          }
                          return next
                        })
                      }}
                      aria-label="Select all buyers in view"
                    />
                  </th>
                  <th>Buyer</th>
                  <th>Email</th>
                  <th>Joined</th>
                  <th>Role</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((buyer) => (
                  <tr key={buyer.id} className={styles.primaryRow}>
                    <td className={styles.checkboxCell}>
                      <input
                        type="checkbox"
                        className={styles.rowCheckbox}
                        checked={selectedRows.has(buyer.id)}
                        onChange={(e) => {
                          setSelectedRows((prev) => {
                            const next = new Set(prev)
                            if (e.target.checked) next.add(buyer.id)
                            else next.delete(buyer.id)
                            return next
                          })
                        }}
                        aria-label={`Select ${buyer.name}`}
                      />
                    </td>

                    <td>
                      <div className={styles.buyerCell}>
                        <Avatar name={buyer.name} src={buyer.avatarUrl} />
                        <div className={styles.buyerText}>
                          <p className={styles.buyerName}>{buyer.name}</p>
                          <span className={`${styles.email} ${styles.mobileEmailInline}`} title={buyer.email}>
                            {buyer.email}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td>
                      <span className={styles.email} title={buyer.email}>
                        {buyer.email}
                      </span>
                    </td>

                    <td>
                      <div className={styles.badgesRow}>
                        <span className={styles.meta}>{buyer.joinedAt}</span>
                        <span
                          className={`${styles.statusBadge} ${styles[`status_${buyer.status}`]} ${styles.mobileStatusInline}`}
                        >
                          <span className={styles.statusDot} />
                          {buyer.status}
                        </span>
                      </div>
                    </td>

                    <td>
                      <span className={styles.badge}>{buyer.role}</span>
                    </td>

                    <td>
                      <span className={`${styles.statusBadge} ${styles[`status_${buyer.status}`]}`}>
                        <span className={styles.statusDot} />
                        {buyer.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {!isLoading && !error && filtered.length === 0 && (
            <div className={styles.emptyState}>
              <svg className={styles.emptyIcon} viewBox="0 0 48 48" fill="none">
                <circle cx="22" cy="22" r="14" stroke="#cbd5e1" strokeWidth="2" />
                <path d="M32 32l8 8" stroke="#cbd5e1" strokeWidth="2" strokeLinecap="round" />
              </svg>
              <p className={styles.emptyTitle}>No buyers found</p>
              <p className={styles.emptyText}>No buyers match your current filters.</p>
              <button
                type="button"
                className={styles.clearBtn}
                onClick={() => { clearFilters() }}
              >
                Clear filters
              </button>
            </div>
          )}
        </div>

        {!isLoading && !error && filtered.length > 0 && (
          <div className={styles.tableFooter}>
            Showing <strong>{filtered.length}</strong> of <strong>{buyers.length}</strong> buyers
          </div>
        )}
      </section>
    </div>
  )
}