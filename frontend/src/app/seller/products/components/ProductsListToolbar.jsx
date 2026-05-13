'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { TbSearch } from 'react-icons/tb'
import { FiArchive } from 'react-icons/fi'
import { MdArrowBackIos } from 'react-icons/md'
import styles from '../products.module.css'

const ARCHIVE_PATH = '/seller/products/archive'
const CATALOG_PATH = '/seller/products/catalog'

export default function ProductsListToolbar({
  searchQuery = '',
  onSearchChange,
  searchPlaceholder = 'Search by name, category, area, description, duration…',
  searchSubmitHref = null,
  rightSlot = null,
  showTypeFilter = false,
  typeFilter = 'all',
  typeOptions = [],
  onTypeFilterChange,
}) {
  const pathname = usePathname()
  const router = useRouter()
  const onArchivePage = pathname === ARCHIVE_PATH

  const handleSubmit = (event) => {
    event.preventDefault()
    if (!searchSubmitHref) return
    const query = String(searchQuery || '').trim()
    const url = query
      ? `${searchSubmitHref}?q=${encodeURIComponent(query)}`
      : searchSubmitHref
    router.push(url)
  }

  return (
    <section className={styles.filtersRow} aria-label="Search products">
      {showTypeFilter && typeOptions.length > 0 ? (
        <div
          className={styles.filterButtonsWrap}
          role="group"
          aria-label="Filter by listing type"
        >
          {typeOptions.map((option) => {
            const selected = typeFilter === option.id
            return (
              <button
                key={option.id}
                type="button"
                className={`${styles.filterButton} ${selected ? styles.filterButtonActive : ''}`}
                aria-pressed={selected}
                onClick={() => onTypeFilterChange?.(option.id)}
              >
                {option.label}
              </button>
            )
          })}
        </div>
      ) : null}
      <form className={styles.searchWrap} role="search" onSubmit={handleSubmit}>
        <TbSearch className={styles.searchIcon} size={18} aria-hidden />
        <input
          type="search"
          name="q"
          className={styles.searchBox}
          placeholder={searchPlaceholder}
          value={searchQuery}
          onChange={(event) => onSearchChange?.(event.target.value)}
          aria-label="Search listings by text"
          autoComplete="off"
          spellCheck={false}
        />
      </form>
      {onArchivePage ? (
        <Link href={CATALOG_PATH} className={styles.archiveGoBackLink}>
          <MdArrowBackIos className={styles.archiveGoBackIcon} aria-hidden />
          Go back
        </Link>
      ) : (
        <Link href={ARCHIVE_PATH} className={styles.archivedLink}>
          <FiArchive size={16} aria-hidden />
          Archived
        </Link>
      )}
      {rightSlot}
    </section>
  )
}
