'use client'

import { useMemo, useState } from 'react'
import Image from 'next/image'
import styles from './shop.module.css'

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

const PRODUCTS = [
  {
    id: 1,
    name: 'Premium Service Package',
    category: 'Other',
    price: 2990,
    desc: 'A clean and complete service set for a smooth arrangement process.',
    img: '/sample/services/1.jpg',
  },
  {
    id: 2,
    name: 'Memorial Essentials',
    category: 'Other',
    price: 1990,
    desc: 'Basic essentials prepared with a simple, respectful presentation.',
    img: '/sample/services/2.jpg',
  },
  {
    id: 3,
    name: 'Family Comfort Set',
    category: 'For Home',
    price: 2490,
    desc: 'A practical set focused on comfort and support for the family.',
    img: '/sample/services/3.jpg',
  },
  {
    id: 4,
    name: 'Floral Tribute',
    category: 'Other',
    price: 1490,
    desc: 'A classic tribute option that feels neat and meaningful.',
    img: '/sample/services/4.jpg',
  },
  {
    id: 5,
    name: 'Music & Audio Support',
    category: 'For Music',
    price: 990,
    desc: 'Simple audio support to help with the program and background music.',
    img: '/sample/services/5.jpg',
  },
  {
    id: 6,
    name: 'Phone Assistance Kit',
    category: 'For Phone',
    price: 790,
    desc: 'Basic phone support tools for coordination and family communication.',
    img: '/sample/services/6.jpg',
  },
  {
    id: 7,
    name: 'Storage & Keepsake Box',
    category: 'For Storage',
    price: 690,
    desc: 'A small storage solution for documents and important keepsakes.',
    img: '/sample/services/7.jpg',
  },
  {
    id: 8,
    name: 'Candlelight Setup',
    category: 'For Home',
    price: 1290,
    desc: 'A warm, calm setup for a simple viewing atmosphere.',
    img: '/sample/services/8.jpg',
  },
  {
    id: 9,
    name: 'Printed Materials Bundle',
    category: 'Other',
    price: 890,
    desc: 'A ready-to-use bundle for printed details and basic announcements.',
    img: '/sample/services/9.jpg',
  },
  {
    id: 10,
    name: 'Home Viewing Add-on',
    category: 'For Home',
    price: 1590,
    desc: 'Extra support items for a cleaner, more organized home viewing.',
    img: '/sample/services/10.jpg',
  },
  {
    id: 11,
    name: 'Mobile Coordination Support',
    category: 'For Phone',
    price: 1090,
    desc: 'Light support kit for quick updates, coordination, and contact flow.',
    img: '/sample/services/11.jpg',
  },
  {
    id: 12,
    name: 'Secure Document Organizer',
    category: 'For Storage',
    price: 1190,
    desc: 'A neat organizer for papers, IDs, receipts, and important documents.',
    img: '/sample/services/12.jpg',
  },
]

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

                  {/* moved below (still inside cardTop) so it overlays */}
                  <span className={styles.pill}>{p.category}</span>
                </div>

                {/* BODY stays the same */}
                <div className={styles.cardBody}>
                  <h3 className={styles.name}>{p.name}</h3>
                  <p className={styles.desc}>{p.desc}</p>

                  <div className={styles.priceRow}>
                    <span className={styles.price}>
                      ₱{p.price.toLocaleString()}
                    </span>
                  </div>

                  <div className={styles.actions}>
                    <button className={styles.btnGhost} type="button">
                      <FiShoppingCart />
                      Add to Cart
                    </button>

                    <button className={styles.btnSolid} type="button">
                      <FiCreditCard />
                      Buy Now
                    </button>
                  </div>
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