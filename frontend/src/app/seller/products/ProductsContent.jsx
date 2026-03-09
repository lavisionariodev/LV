'use client'

import { useState, useMemo, useEffect } from 'react'
import { TbSearch } from 'react-icons/tb'
import styles from './products.module.css'

const MOCK_PRODUCTS = [
  {
    id: 'prod-1',
    name: 'Premium Cremation Package',
    kind: 'package',
    category: 'Cremation',
    startingPrice: 38000,
    city: 'Manila, NCR',
    status: 'active',
    availability: 'Available',
    inclusions: [
      'Death certificate processing',
      'Mahogany urn and memorial candle set',
      '2-day chapel viewing with floral décor',
    ],
  },
  {
    id: 'prod-2',
    name: 'Full Traditional Burial',
    kind: 'package',
    category: 'Burial',
    startingPrice: 95000,
    city: 'Manila, NCR',
    status: 'active',
    availability: 'Available',
    inclusions: [
      'Premium casket with full embalming',
      '5-day chapel viewing',
      'Hearse convoy and cemetery coordination',
    ],
  },
  {
    id: 'prod-3',
    name: 'Classic Memorial Service',
    kind: 'service',
    category: 'Memorial Service',
    startingPrice: 32000,
    city: 'Quezon City, NCR',
    status: 'active',
    availability: 'Weekdays only',
    inclusions: [
      'Venue for up to 80 guests',
      'Custom AV tribute and live music',
      'Memorial program and floral arrangements',
    ],
  },
  {
    id: 'prod-4',
    name: 'Direct Cremation',
    kind: 'service',
    category: 'Cremation',
    startingPrice: 18500,
    city: 'Quezon City, NCR',
    status: 'inactive',
    availability: 'Temporarily unavailable',
    inclusions: [
      'Standard urn and ash release permit',
      '1 viewing day',
      'Assistance with civil paperwork',
    ],
  },
  {
    id: 'prod-5',
    name: 'Standard Burial Package',
    kind: 'package',
    category: 'Burial',
    startingPrice: 55000,
    city: 'Pasig, NCR',
    status: 'active',
    availability: 'Available',
    inclusions: [
      'Wooden casket and 3-day viewing',
      'Embalming',
      'Hearse and cemetery coordination',
    ],
  },
  {
    id: 'prod-6',
    name: 'Intimate Memorial Gathering',
    kind: 'service',
    category: 'Memorial Service',
    startingPrice: 15000,
    city: 'Caloocan, NCR',
    status: 'active',
    availability: 'Evenings only',
    inclusions: [
      'Intimate venue for up to 30 guests',
      'Photo display setup',
      'Sound system and memorial program',
    ],
  },
]

function formatPrice(amount) {
  if (typeof amount !== 'number') return '—'
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    maximumFractionDigits: 0,
  }).format(amount)
}

const TYPE_FILTERS = [
  { id: 'all', label: 'All types' },
  { id: 'service', label: 'Services' },
  { id: 'package', label: 'Packages' },
]

export default function ProductsContent({ initialKind = 'all' }) {
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState(initialKind || 'all')
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [modalMode, setModalMode] = useState(null) // 'view' | 'edit'

  useEffect(() => {
    if (initialKind && TYPE_FILTERS.some((t) => t.id === initialKind)) {
      setTypeFilter(initialKind)
    }
  }, [initialKind])

  const filteredProducts = useMemo(() => {
    let list = [...MOCK_PRODUCTS]

    if (typeFilter !== 'all') {
      list = list.filter((p) => p.kind === typeFilter)
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q) ||
          p.city.toLowerCase().includes(q),
      )
    }

    return list
  }, [typeFilter, searchQuery])

  const total = MOCK_PRODUCTS.length
  const activeCount = MOCK_PRODUCTS.filter((p) => p.status === 'active').length
  const inactiveCount = total - activeCount

  const handleOpenView = (product) => {
    setSelectedProduct(product)
    setModalMode('view')
  }

  const handleOpenEdit = (product) => {
    setSelectedProduct(product)
    setModalMode('edit')
  }

  const handleCloseModal = () => {
    setSelectedProduct(null)
    setModalMode(null)
  }

  return (
    <div className={styles.pageWrap}>
      <header className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Products & services</h1>
        <p className={styles.pageSubtitle}>
          Manage the funeral services and packages that appear on your Lavisionario shop. Keep the
          most accurate pricing, availability, and status so buyers can book with confidence.
        </p>
      </header>

      <section className={styles.statsStrip} aria-label="Listing overview">
        <div className={styles.statCard}>
          <p className={styles.statLabel}>Total listings</p>
          <p className={styles.statValue}>{total}</p>
          <p className={styles.statHint}>Services &amp; packages</p>
        </div>
        <div className={styles.statCard}>
          <p className={styles.statLabel}>Active</p>
          <p className={styles.statValue}>{activeCount}</p>
          <p className={styles.statHint}>Visible to buyers</p>
        </div>
        <div className={styles.statCard}>
          <p className={styles.statLabel}>Inactive</p>
          <p className={styles.statValue}>{inactiveCount}</p>
          <p className={styles.statHint}>Hidden from shop</p>
        </div>
      </section>

      <section className={styles.filtersRow} aria-label="Filter products">
        <div className={styles.searchWrap}>
          <TbSearch className={styles.searchIcon} size={18} aria-hidden />
          <input
            type="search"
            className={styles.searchBox}
            placeholder="Search by name, category, or location"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Search products"
          />
        </div>

        <select
          className={styles.typeSelect}
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          aria-label="Filter by type"
        >
          {TYPE_FILTERS.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label}
            </option>
          ))}
        </select>
      </section>

      <section className={styles.productsSection} aria-label="Products list">
        {filteredProducts.length === 0 ? (
          <div className={styles.emptyState}>
            <p className={styles.emptyTitle}>No listings match your filters</p>
            <p className={styles.emptyText}>
              Adjust the search or type filter to see more of your services and packages.
            </p>
          </div>
        ) : (
          <div className={styles.productsGrid}>
            {filteredProducts.map((product) => (
              <article key={product.id} className={styles.productCard}>
                <div className={styles.productHeader}>
                  <div className={styles.productBadges}>
                    <span className={styles.productKindBadge}>
                      {product.kind === 'service' ? 'Service' : 'Package'}
                    </span>
                    <span className={styles.productCategoryBadge}>{product.category}</span>
                  </div>
                  <span
                    className={`${styles.statusPill} ${
                      product.status === 'active'
                        ? styles.statusPillActive
                        : styles.statusPillInactive
                    }`}
                  >
                    {product.status === 'active' ? 'Active' : 'Inactive'}
                  </span>
                </div>

                <h2 className={styles.productTitle}>{product.name}</h2>

                <div className={styles.productMeta}>
                  <p className={styles.productPrice}>
                    <span className={styles.productPriceLabel}>Starting at</span>{' '}
                    <span className={styles.productPriceValue}>
                      {formatPrice(product.startingPrice)}
                    </span>
                  </p>
                  <p className={styles.productLocation}>{product.city}</p>
                  <p className={styles.productAvailability}>{product.availability}</p>
                </div>

                <div className={styles.productActions}>
                  <button
                    type="button"
                    className={styles.productActionPrimary}
                    onClick={() => handleOpenEdit(product)}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className={styles.productActionGhost}
                    onClick={() => handleOpenView(product)}
                  >
                    View
                  </button>
                  <button type="button" className={styles.productActionDanger} onClick={() => {}}>
                    Remove
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {selectedProduct && modalMode && (
        <div
          className={styles.productModalOverlay}
          onClick={(e) => {
            if (e.target === e.currentTarget) handleCloseModal()
          }}
          role="dialog"
          aria-modal="true"
        >
          <div className={styles.productModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.productModalHeader}>
              <div>
                <p className={styles.productModalKicker}>
                  {modalMode === 'view' ? 'Listing details' : 'Edit listing'}
                </p>
                <h2 className={styles.productModalTitle}>{selectedProduct.name}</h2>
                <p className={styles.productModalSubtitle}>
                  {selectedProduct.category} · {selectedProduct.city}
                </p>
              </div>
              <button
                type="button"
                className={styles.productModalClose}
                onClick={handleCloseModal}
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <div className={styles.productModalBody}>
              {modalMode === 'view' ? (
                <div className={styles.productModalColumns}>
                  <div className={styles.productModalCol}>
                    <h3 className={styles.productModalSectionTitle}>Overview</h3>
                    <p className={styles.productModalText}>
                      This listing describes how the service or package appears on your public
                      Lavisionario shop. Use it to quickly review pricing, availability, and key
                      inclusions from the buyer&apos;s perspective.
                    </p>

                    {selectedProduct.inclusions?.length ? (
                      <>
                        <h3 className={styles.productModalSectionTitle}>Key inclusions</h3>
                        <ul className={styles.productModalList}>
                          {selectedProduct.inclusions.map((inc, idx) => (
                            <li key={idx}>{inc}</li>
                          ))}
                        </ul>
                      </>
                    ) : null}
                  </div>

                  <div className={styles.productModalCol}>
                    <h3 className={styles.productModalSectionTitle}>Listing details</h3>
                    <dl className={styles.productModalAttrs}>
                      <div className={styles.productModalAttrRow}>
                        <dt>Type</dt>
                        <dd>{selectedProduct.kind === 'service' ? 'Service' : 'Package'}</dd>
                      </div>
                      <div className={styles.productModalAttrRow}>
                        <dt>Category</dt>
                        <dd>{selectedProduct.category}</dd>
                      </div>
                      <div className={styles.productModalAttrRow}>
                        <dt>Location</dt>
                        <dd>{selectedProduct.city}</dd>
                      </div>
                      <div className={styles.productModalAttrRow}>
                        <dt>Availability</dt>
                        <dd>{selectedProduct.availability}</dd>
                      </div>
                      <div className={styles.productModalAttrRow}>
                        <dt>Status</dt>
                        <dd>
                          {selectedProduct.status === 'active' ? 'Active (visible in shop)' : 'Inactive (hidden)'}
                        </dd>
                      </div>
                      <div className={styles.productModalAttrRow}>
                        <dt>Starting price</dt>
                        <dd>{formatPrice(selectedProduct.startingPrice)}</dd>
                      </div>
                    </dl>
                  </div>
                </div>
              ) : (
                <div className={styles.productModalForm}>
                  <div className={styles.productModalFormGrid}>
                    <label className={styles.productModalField}>
                      <span className={styles.productModalLabel}>Listing name</span>
                      <input
                        type="text"
                        className={styles.productModalInput}
                        defaultValue={selectedProduct.name}
                      />
                    </label>
                    <label className={styles.productModalField}>
                      <span className={styles.productModalLabel}>Category</span>
                      <input
                        type="text"
                        className={styles.productModalInput}
                        defaultValue={selectedProduct.category}
                      />
                    </label>
                    <label className={styles.productModalField}>
                      <span className={styles.productModalLabel}>Starting price (PHP)</span>
                      <input
                        type="number"
                        className={styles.productModalInput}
                        defaultValue={selectedProduct.startingPrice}
                      />
                    </label>
                    <label className={styles.productModalField}>
                      <span className={styles.productModalLabel}>Location</span>
                      <input
                        type="text"
                        className={styles.productModalInput}
                        defaultValue={selectedProduct.city}
                      />
                    </label>
                    <label className={styles.productModalField}>
                      <span className={styles.productModalLabel}>Availability</span>
                      <input
                        type="text"
                        className={styles.productModalInput}
                        defaultValue={selectedProduct.availability}
                      />
                    </label>
                    <label className={styles.productModalField}>
                      <span className={styles.productModalLabel}>Status</span>
                      <select
                        className={styles.productModalSelect}
                        defaultValue={selectedProduct.status}
                      >
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                      </select>
                    </label>
                  </div>
                  <p className={styles.productModalNote}>
                    These controls are for layout only in this mock. In a full integration, changes
                    here would update your live listings.
                  </p>
                </div>
              )}
            </div>

            <div className={styles.productModalFooter}>
              <button
                type="button"
                className={styles.productModalSecondary}
                onClick={handleCloseModal}
              >
                Close
              </button>
              {modalMode === 'edit' && (
                <button
                  type="button"
                  className={styles.productModalPrimary}
                  onClick={handleCloseModal}
                >
                  Save changes
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

