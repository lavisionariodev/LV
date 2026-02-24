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
  FiChevronRight,
  FiMapPin,
} from 'react-icons/fi'

const LOGIN_URL = '/buyer/login?redirect=/shop'

const CATEGORY_ITEMS = [
  { key: 'All', label: 'All Products', icon: FiBox },
  { key: 'For Home', label: 'For Home', icon: FiHome, nested: true },
  { key: 'For Music', label: 'For Music', icon: FiMusic, nested: true },
  { key: 'For Phone', label: 'For Phone', icon: FiSmartphone, nested: true },
  { key: 'For Storage', label: 'For Storage', icon: FiHardDrive, nested: true },
  { key: 'Other', label: 'Other', icon: FiTag, nested: true },
]

const QUICK_FILTERS = [
  { key: 'New Arrival', label: 'New Arrival', icon: FiTag },
  { key: 'Best Seller', label: 'Best Seller', icon: FiStar },
  { key: 'On Discount', label: 'On Discount', icon: FiPercent },
]

// Mock seller data per product
const PRODUCT_SELLERS = {
  1: { name: 'St. Peter Lifestyle', slug: 'st-peter' },
  2: { name: 'St. Peter Lifestyle', slug: 'st-peter' },
  3: { name: 'Funeraria Nacional', slug: 'funeraria-nacional' },
  4: { name: 'St. Peter Lifestyle', slug: 'st-peter' },
  5: { name: 'Memoria Services', slug: 'memoria-services' },
  6: { name: 'Memoria Services', slug: 'memoria-services' },
  7: { name: 'Funeraria Nacional', slug: 'funeraria-nacional' },
  8: { name: 'Funeraria Nacional', slug: 'funeraria-nacional' },
  9: { name: 'St. Peter Lifestyle', slug: 'st-peter' },
  10: { name: 'Funeraria Nacional', slug: 'funeraria-nacional' },
  11: { name: 'Memoria Services', slug: 'memoria-services' },
  12: { name: 'St. Peter Lifestyle', slug: 'st-peter' },
}

// Category sections config for grouped display
const CATEGORY_SECTIONS = [
  { key: 'Other', label: 'General Services' },
  { key: 'For Home', label: 'Home Viewing' },
  { key: 'For Music', label: 'Music & Audio' },
  { key: 'For Phone', label: 'Phone & Communication' },
  { key: 'For Storage', label: 'Storage & Documents' },
]

const PREVIEW_COUNT = 3

export default function ShopPage() {
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState('All')
  const [activeQuick, setActiveQuick] = useState('')
  const [isCategoryOpen, setIsCategoryOpen] = useState(true)
  const [expandedSections, setExpandedSections] = useState({})

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

      const matchesQuick =
        !activeQuick ||
        (activeQuick === 'New Arrival' && p.id >= 9) ||
        (activeQuick === 'Best Seller' && [1, 3, 4, 8].includes(p.id)) ||
        (activeQuick === 'On Discount' && [6, 7, 9, 12].includes(p.id))

      return matchesSearch && matchesCategory && matchesQuick
    })
  }, [search, activeCategory, activeQuick])

  const toggleSection = (key) => {
    setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  // Group filtered products by category for "All" view
  const groupedProducts = useMemo(() => {
    if (activeCategory !== 'All') return null
    const groups = {}
    CATEGORY_SECTIONS.forEach(({ key }) => {
      groups[key] = filtered.filter((p) => p.category === key)
    })
    return groups
  }, [filtered, activeCategory])

  return (
    <section className={styles.shopPage}>
      {/* HERO */}
      <header className={styles.hero}>
        <div className={styles.heroOverlay} />
        <div className={styles.heroInner}>
          <span className={styles.heroEyebrow}>La Visionario</span>
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
              placeholder="Search products and services..."
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
          {/* CATEGORY FILTER */}
          <div className={styles.filterGroup}>
            <h3 className={styles.filterTitle}>Category</h3>

            <div
              className={`${styles.categorySelect} ${
                activeCategory === 'All' ? styles.categorySelectActive : ''
              }`}
            >
              <button
                type="button"
                className={styles.categoryMainBtn}
                onClick={() => setActiveCategory('All')}
              >
                <span className={styles.categorySelectLeft}>
                  <FiBox className={styles.categoryIcon} />
                  <span className={styles.categorySelectText}>All Products</span>
                </span>
              </button>

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
                  aria-label={isCategoryOpen ? 'Collapse categories' : 'Expand categories'}
                >
                  <FiChevronDown
                    className={`${styles.categoryChevron} ${
                      isCategoryOpen ? styles.chevOpen : ''
                    }`}
                  />
                </button>
              </span>
            </div>

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
                      className={`${styles.treeItem} ${isActive ? styles.treeItemActive : ''}`}
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
            <h3 className={styles.filterTitle}>Quick Filters</h3>
            {QUICK_FILTERS.map((f) => {
              const Icon = f.icon
              const isActive = activeQuick === f.key
              return (
                <button
                  key={f.key}
                  type="button"
                  className={`${styles.quickRow} ${isActive ? styles.quickRowActive : ''}`}
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

          {/* SELLER INFO PANEL */}
          <div className={styles.filterGroup}>
            <h3 className={styles.filterTitle}>Our Sellers</h3>
            <div className={styles.sellerList}>
              {[
                { name: 'St. Peter Lifestyle', slug: 'st-peter', count: 5 },
                { name: 'Funeraria Nacional', slug: 'funeraria-nacional', count: 4 },
                { name: 'Memoria Services', slug: 'memoria-services', count: 3 },
              ].map((seller) => (
                <Link
                  key={seller.slug}
                  href={`/shop/seller/${seller.slug}`}
                  className={styles.sellerRow}
                >
                  <span className={styles.sellerDot} />
                  <span className={styles.sellerRowName}>{seller.name}</span>
                  <span className={styles.sellerRowCount}>{seller.count}</span>
                </Link>
              ))}
            </div>
          </div>
        </aside>

        {/* RIGHT PRODUCTS */}
        <section className={styles.products}>
          {activeCategory === 'All' && !search && !activeQuick ? (
            // GROUPED VIEW by category
            CATEGORY_SECTIONS.map(({ key, label }) => {
              const sectionProducts = groupedProducts?.[key] ?? []
              if (sectionProducts.length === 0) return null
              const isExpanded = expandedSections[key]
              const displayProducts = isExpanded
                ? sectionProducts
                : sectionProducts.slice(0, PREVIEW_COUNT)

              return (
                <div key={key} className={styles.categorySection}>
                  <div className={styles.sectionHeader}>
                    <div className={styles.sectionHeaderLeft}>
                      <h2 className={styles.sectionTitle}>{label}</h2>
                      <span className={styles.sectionCount}>
                        {sectionProducts.length} items
                      </span>
                    </div>
                    {sectionProducts.length > PREVIEW_COUNT && (
                      <button
                        type="button"
                        className={styles.seeMoreBtn}
                        onClick={() => toggleSection(key)}
                      >
                        {isExpanded ? 'Show Less' : 'See All'}
                        <FiChevronRight
                          className={`${styles.seeMoreIcon} ${isExpanded ? styles.seeMoreIconOpen : ''}`}
                        />
                      </button>
                    )}
                  </div>

                  <div className={styles.grid}>
                    {displayProducts.map((p) => (
                      <ProductCard key={p.id} p={p} seller={PRODUCT_SELLERS[p.id]} />
                    ))}
                  </div>
                </div>
              )
            })
          ) : (
            // FLAT filtered view
            <>
              {filtered.length > 0 && (
                <div className={styles.filteredHeader}>
                  <span className={styles.filteredLabel}>
                    {filtered.length} result{filtered.length !== 1 ? 's' : ''}{' '}
                    {activeCategory !== 'All' ? `in ${activeCategory}` : ''}
                    {search ? ` for "${search}"` : ''}
                  </span>
                </div>
              )}
              <div className={styles.grid}>
                {filtered.map((p) => (
                  <ProductCard key={p.id} p={p} seller={PRODUCT_SELLERS[p.id]} />
                ))}
              </div>
            </>
          )}

          {filtered.length === 0 && (
            <div className={styles.empty}>
              <div className={styles.emptyIcon}>
                <FiSearch />
              </div>
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

// Extracted ProductCard component
function ProductCard({ p, seller }) {
  return (
    <article className={styles.card}>
      <Link href={`/shop/${p.id}`} className={styles.cardLink}>
        {/* IMAGE */}
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
          {/* Seller tag */}
          {seller && (
            <div className={styles.sellerTagWrap} onClick={(e) => e.preventDefault()}>
              <Link
                href={`/shop/seller/${seller.slug}`}
                className={styles.sellerTag}
                title={`View all products from ${seller.name}`}
                onClick={(e) => e.stopPropagation()}
              >
                <FiMapPin className={styles.sellerTagIcon} />
                <span>{seller.name}</span>
                <span className={styles.sellerTooltip}>{seller.name}</span>
              </Link>
            </div>
          )}

          <h3 className={styles.name}>{p.name}</h3>
          <p className={styles.desc}>{p.desc}</p>

          <div className={styles.priceRow}>
            <span className={styles.price}>₱{p.price.toLocaleString()}</span>
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
  )
}