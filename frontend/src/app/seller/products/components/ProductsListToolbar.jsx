'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { TbChevronDown, TbSearch } from 'react-icons/tb'
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
  const [typeDropdownOpen, setTypeDropdownOpen] = useState(false)
  const typeDropdownRef = useRef(null)
  const selectedTypeLabel =
    typeOptions.find((option) => option.id === typeFilter)?.label ?? 'All types'

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (typeDropdownRef.current && !typeDropdownRef.current.contains(event.target)) {
        setTypeDropdownOpen(false)
      }
    }
    if (typeDropdownOpen) {
      document.addEventListener('click', handleClickOutside)
      return () => document.removeEventListener('click', handleClickOutside)
    }
  }, [typeDropdownOpen])

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
          className={`${styles.filterDropdownWrap} ${typeDropdownOpen ? styles.filterDropdownOpen : ''}`}
          ref={typeDropdownRef}
        >
          <button
            type="button"
            className={styles.filterDropdownTrigger}
            onClick={() => setTypeDropdownOpen((open) => !open)}
            aria-haspopup="listbox"
            aria-expanded={typeDropdownOpen}
            aria-label="Filter by listing type"
          >
            <span className={styles.filterDropdownLabel}>{selectedTypeLabel}</span>
            <TbChevronDown className={styles.filterDropdownChevron} size={18} aria-hidden />
          </button>
          {typeDropdownOpen ? (
            <div
              className={styles.filterDropdownPanel}
              role="listbox"
              aria-label="Listing type options"
            >
              {typeOptions.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  role="option"
                  aria-selected={typeFilter === option.id}
                  className={`${styles.filterDropdownOption} ${
                    typeFilter === option.id ? styles.filterDropdownOptionSelected : ''
                  }`}
                  onClick={() => {
                    onTypeFilterChange?.(option.id)
                    setTypeDropdownOpen(false)
                  }}
                >
                  {option.label}
                </button>
              ))}
            </div>
          ) : null}
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
