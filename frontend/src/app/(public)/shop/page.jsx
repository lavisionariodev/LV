'use client'

import { useMemo, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import styles from './shop.module.css'
import { PRODUCTS } from './data'

import {
  FiSearch,
  FiChevronDown,
  FiBox,
  FiHome,
  FiMusic,
  FiSmartphone,
  FiHardDrive,
  FiTag,
  FiStar,
  FiPercent,
  FiShoppingCart,
  FiCreditCard,
} from 'react-icons/fi'

const LOGIN_URL = '/buyer/login?redirect=/shop'

const CATEGORY_ITEMS = [
  { key: 'All', label: 'All Product', icon: FiBox, count: 32 },
  { key: 'For Home', label: 'For Home', icon: FiHome, nested: true },
  { key: 'For Music', label: 'For Music', icon: FiMusic, nested: true },
  { key: 'For Phone', label: 'For Phone', icon: FiSmartphone, nested: true },
  { key: 'For Storage', label: 'For Storage', icon: FiHardDrive, nested: true },
]

const QUICK_FILTERS = [
  { key: 'New Arrival', label: 'New Arrival', icon: FiTag },
  { key: 'Best Seller', label: 'Best Seller', icon: FiStar },
  { key: 'On Discount', label: 'On Discount', icon: FiPercent },
]

export default function ShopPage() {
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState('All')
  const [activeQuick, setActiveQuick] = useState('') // New Arrival | Best Seller | On Discount

  // toggle state for nested categories
  const [isCategoryOpen, setIsCategoryOpen] = useState(true)

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()

    return PRODUCTS.filter((p) => {
      const matchesSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.desc.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q)

      const matchesCategory =
        activeCategory === 'All' ? true : p.category === activeCategory

      // simple mock quick-filter mapping
      const matchesQuick =
        !activeQuick ||
        (activeQuick === 'New Arrival' && p.id >= 9) ||
        (activeQuick === 'Best Seller' && [1, 3, 4, 8].includes(p.id)) ||
        (activeQuick === 'On Discount' && [6, 7, 9, 12].includes(p.id))

      return matchesSearch && matchesCategory && matchesQuick
    })
  }, [search, activeCategory, activeQuick])

  return (
    <section className={styles.shopPage}>
      {/* HERO */}
      <header className={styles.hero}>
        <div className={styles.heroOverlay} />
        <div className={styles.heroInner}>
          <h1 className={styles.heroTitle}>Shop</h1>

          <p className={styles.breadcrumb}>
            <span className={styles.crumb}>Home</span>
            <span className={styles.slash}>/</span>
            <span className={styles.crumbActive}>Shop</span>
          </p>
        </div>
      </header>

      {/* SEARCH BAR */}
      <div className={styles.searchWrap}>
        <div className={styles.searchInner}>
          <div className={styles.searchBox}>
            <FiSearch className={styles.searchIcon} />
            <input
              className={styles.searchInput}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search services..."
              aria-label="Search services"
            />
          </div>

          <button className={styles.searchBtn} type="button">
            Search
          </button>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className={styles.content}>
        {/* LEFT SIDEBAR */}
        <aside className={styles.sidebar}>
          <div className={styles.filterGroup}>
            <h3 className={styles.filterTitle}>Category</h3>

            {/* All Product row (same style, now supports open/close chevron) */}
            <div
              className={`${styles.categorySelect} ${
                activeCategory === 'All' ? styles.categorySelectActive : ''
              }`}
            >
              {/* left side: selects "All Product" */}
              <button
                type="button"
                className={styles.categoryMainBtn}
                onClick={() => setActiveCategory('All')}
              >
                <span className={styles.categorySelectLeft}>
                  <FiBox className={styles.categoryIcon} />
                  <span className={styles.categorySelectText}>All Product</span>
                </span>
              </button>

              {/* right side: badge + chevron toggle */}
              <span className={styles.categorySelectRight}>
                <span className={styles.badge}>32</span>

                <button
                  type="button"
                  className={styles.categoryToggleBtn}
                  onClick={(e) => {
                    e.stopPropagation()
                    setIsCategoryOpen((prev) => !prev)
                  }}
                  aria-expanded={isCategoryOpen}
                  aria-label={
                    isCategoryOpen ? 'Collapse categories' : 'Expand categories'
                  }
                >
                  <FiChevronDown
                    className={`${styles.categoryChevron} ${
                      isCategoryOpen ? styles.chevOpen : ''
                    }`}
                  />
                </button>
              </span>
            </div>

            {/* Nested category list (collapsible) */}
            <div
              className={`${styles.categoryTreeWrapper} ${
                isCategoryOpen ? styles.categoryTreeOpen : ''
              }`}
            >
              <div className={styles.categoryTree}>
                {CATEGORY_ITEMS.filter((c) => c.nested).map((item) => {
                  const Icon = item.icon
                  const isActive = activeCategory === item.key

                  return (
                    <button
                      key={item.key}
                      type="button"
                      className={`${styles.treeItem} ${
                        isActive ? styles.treeItemActive : ''
                      }`}
                      onClick={() => setActiveCategory(item.key)}
                    >
                      <span className={styles.treeLine} aria-hidden="true" />
                      <Icon className={styles.treeIcon} />
                      <span className={styles.treeText}>{item.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          {/* QUICK FILTERS */}
          <div className={styles.filterGroup}>
            {QUICK_FILTERS.map((f) => {
              const Icon = f.icon
              const isActive = activeQuick === f.key

              return (
                <button
                  key={f.key}
                  type="button"
                  className={`${styles.quickRow} ${
                    isActive ? styles.quickRowActive : ''
                  }`}
                  onClick={() => setActiveQuick(isActive ? '' : f.key)}
                >
                  <span className={styles.quickLeft}>
                    <Icon className={styles.quickIcon} />
                    <span className={styles.quickText}>{f.label}</span>
                  </span>
                  <FiChevronDown className={styles.quickChevron} />
                </button>
              )
            })}
          </div>
        </aside>

        {/* RIGHT PRODUCTS */}
        <section className={styles.products}>
          <div className={styles.grid}>
            {filtered.map((p) => (
              <article key={p.id} className={styles.card}>
                <Link href={`/shop/${p.id}`} className={styles.cardLink}>
                  {/* TOP: image edge-to-edge + pill overlay */}
                  <div className={styles.cardTop}>
                    <div className={styles.imageWrap}>
                      <Image
                        src={p.img}
                        alt={p.name}
                        width={900}
                        height={650}
                        className={styles.productImg}
                        priority={p.id <= 3}
                      />
                    </div>

                    <span className={styles.pill}>{p.category}</span>
                  </div>

                  {/* BODY */}
                  <div className={styles.cardBody}>
                    <h3 className={styles.name}>{p.name}</h3>
                    <p className={styles.desc}>{p.desc}</p>

                    <div className={styles.priceRow}>
                      <span className={styles.price}>
                        ₱{p.price.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </Link>

                <div className={styles.actionsWrap} role="group" aria-label="Product actions">
                  <Link href={LOGIN_URL} className={styles.btnGhost}>
                    <FiShoppingCart />
                    Add to Cart
                  </Link>
                  <Link href={LOGIN_URL} className={styles.btnSolid}>
                    <FiCreditCard />
                    Buy Now
                  </Link>
                </div>
              </article>
            ))}
          </div>

          {filtered.length === 0 && (
            <div className={styles.empty}>
              <h4 className={styles.emptyTitle}>No results found</h4>
              <p className={styles.emptySub}>
                Try a different keyword or choose another category.
              </p>
            </div>
          )}
        </section>
      </div>
    </section>
  )
}