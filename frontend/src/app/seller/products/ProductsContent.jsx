'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import Image from 'next/image'
import { TbPhoto, TbSearch } from 'react-icons/tb'
import styles from './products.module.css'
import { fetchSellerTemplate } from '@/lib/seller-template/client'
import {
  listMySellerListings,
  createSellerListing,
  updateSellerListing,
  deleteSellerListing,
} from '@/lib/seller-listings/client'

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

const FALLBACK_IMAGE = '/sample/about-us/hero-welcome-flowers.png'

function asInputValue(value) {
  if (value == null) return ''
  if (typeof value === 'number') return String(value)
  return String(value)
}

function getTemplateDefaults(fields) {
  return (fields || []).reduce((acc, field) => {
    if (field.type === 'select') {
      const first = Array.isArray(field.options) ? field.options[0] : ''
      acc[field.id] = first || ''
    } else {
      acc[field.id] = ''
    }
    return acc
  }, {})
}

function sanitizeImageUrlsForPersistence(urls) {
  const safe = (Array.isArray(urls) ? urls : []).filter(
    (url) => typeof url === 'string' && url.trim() && !url.startsWith('blob:'),
  )
  return safe.length ? safe : [FALLBACK_IMAGE]
}

function normalizeListingRowToProduct(row) {
  const dynamicValues =
    row?.dynamic_values && typeof row.dynamic_values === 'object' ? row.dynamic_values : {}
  const imageUrls = Array.isArray(row?.image_urls) ? row.image_urls : []

  const listingName = dynamicValues.listing_name || row.listing_name || 'Untitled listing'
  const category = dynamicValues.category || row.category || 'Service'
  const description = dynamicValues.description || ''
  const location = dynamicValues.location || row.location || 'N/A'
  const basePriceRaw = dynamicValues.base_price ?? row.base_price ?? 0
  const basePrice = Number(basePriceRaw) || 0
  const status = dynamicValues.status || row.status || 'draft'
  const availability = dynamicValues.availability || 'Available'
  const kind = dynamicValues.kind || 'service'
  const primaryImage = imageUrls[0] || FALLBACK_IMAGE

  return {
    id: row.id,
    templateId: row.template_id || null,
    name: listingName,
    kind,
    category,
    startingPrice: basePrice,
    city: location,
    status,
    availability,
    description,
    longDescription: description,
    image: primaryImage,
    gallery: imageUrls.length ? imageUrls : [FALLBACK_IMAGE],
    dynamicValues,
  }
}

export default function ProductsContent({ initialKind = 'all' }) {
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState(initialKind || 'all')
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [modalMode, setModalMode] = useState(null) // 'view' | 'edit' | 'create'
  const [editGallery, setEditGallery] = useState([])
  const [products, setProducts] = useState([])
  const [productPendingRemoval, setProductPendingRemoval] = useState(null)
  const fileInputRef = useRef(null)
  const [template, setTemplate] = useState(null)
  const [templateFields, setTemplateFields] = useState([])
  const [formValues, setFormValues] = useState({})
  const [formError, setFormError] = useState('')
  const [loadingData, setLoadingData] = useState(true)

  useEffect(() => {
    if (initialKind && TYPE_FILTERS.some((t) => t.id === initialKind)) {
      setTypeFilter(initialKind)
    }
  }, [initialKind])

  useEffect(() => {
    let mounted = true

    const load = async () => {
      setLoadingData(true)

      const [{ data: templateData }, { data: listingRows, error: listingError }] =
        await Promise.all([fetchSellerTemplate(), listMySellerListings()])

      if (!mounted) return

      if (templateData) {
        const sorted = [...(templateData.fields || [])].sort((a, b) => a.order - b.order)
        setTemplate(templateData)
        setTemplateFields(sorted)
      } else {
        setTemplateFields([])
      }

      if (listingError) {
        setProducts([])
      } else {
        const mapped = (listingRows || []).map(normalizeListingRowToProduct)
        setProducts(mapped)
      }

      setLoadingData(false)
    }

    load()
    return () => {
      mounted = false
    }
  }, [])

  const filteredProducts = useMemo(() => {
    let list = [...products]

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
  }, [products, typeFilter, searchQuery])

  const total = products.length
  const activeCount = products.filter((p) => p.status === 'active').length
  const inactiveCount = total - activeCount

  const handleOpenView = (product) => {
    setSelectedProduct(product)
    setModalMode('view')
  }

  const handleOpenEdit = (product) => {
    setSelectedProduct(product)
    setModalMode('edit')
    setEditGallery(product.gallery ?? [product.image].filter(Boolean))
    setFormError('')
    setFormValues({
      ...getTemplateDefaults(templateFields),
      ...(product.dynamicValues || {}),
    })
  }

  const handleOpenCreate = () => {
    setSelectedProduct({
      id: '',
      name: '',
      kind: typeFilter === 'all' ? 'service' : typeFilter,
      category: '',
      startingPrice: 0,
      city: '',
      status: 'draft',
      availability: 'Available',
      inclusions: [],
      image: FALLBACK_IMAGE,
      description: '',
      longDescription: '',
      gallery: [FALLBACK_IMAGE],
    })
    setModalMode('create')
    setEditGallery([])
    setFormError('')
    setFormValues(getTemplateDefaults(templateFields))
  }

  const handleCloseModal = () => {
    setSelectedProduct(null)
    setModalMode(null)
    setEditGallery([])
    setFormValues({})
    setFormError('')
  }

  const handleUploadClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click()
    }
  }

  const handleFilesSelected = (event) => {
    const files = Array.from(event.target.files || [])
    if (!files.length) return
    const newUrls = files.map((file) => URL.createObjectURL(file))
    setEditGallery((prev) => [...prev, ...newUrls])
  }

  const handleRemoveImage = (index) => {
    setEditGallery((prev) => prev.filter((_, i) => i !== index))
  }

  const handleRequestRemove = (product) => {
    setProductPendingRemoval(product)
  }

  const handleCancelRemove = () => {
    setProductPendingRemoval(null)
  }

  const handleConfirmRemove = async () => {
    if (!productPendingRemoval) return

    const { error } = await deleteSellerListing(productPendingRemoval.id)
    if (error) {
      setFormError(error)
      return
    }

    setProducts((prev) => prev.filter((p) => p.id !== productPendingRemoval.id))

    if (selectedProduct?.id === productPendingRemoval.id) {
      setSelectedProduct(null)
      setModalMode(null)
    }

    setProductPendingRemoval(null)
  }

  const getFieldValue = (fieldId) => formValues?.[fieldId]

  const setFieldValue = (fieldId, value) => {
    setFormValues((prev) => ({ ...prev, [fieldId]: value }))
  }

  const handleSaveProduct = async () => {
    if (!selectedProduct) return

    const missingRequired = templateFields.find(
      (field) => field.required && String(getFieldValue(field.id) ?? '').trim() === '',
    )
    if (missingRequired) {
      setFormError(`${missingRequired.label} is required.`)
      return
    }

    const dynamicValues = { ...formValues }
    const safeName = String(dynamicValues.listing_name || selectedProduct.name || '').trim() || 'Untitled listing'
    const safeCategory = String(dynamicValues.category || selectedProduct.category || '').trim() || 'Service'
    const safeLocation = String(dynamicValues.location || selectedProduct.city || '').trim() || 'N/A'
    const safeStatus = String(dynamicValues.status || selectedProduct.status || 'draft')
    const safePrice = Number(dynamicValues.base_price ?? selectedProduct.startingPrice ?? 0) || 0
    const safeDescription = String(dynamicValues.description || '').trim()
    const safeKind = String(dynamicValues.kind || selectedProduct.kind || 'service')
    const imageUrls = editGallery.length ? editGallery : selectedProduct.gallery || [FALLBACK_IMAGE]
    const persistedImageUrls = sanitizeImageUrlsForPersistence(imageUrls)

    const payload = {
      template_id: template?.id || null,
      listing_name: safeName,
      category: safeCategory,
      base_price: safePrice,
      location: safeLocation,
      status: safeStatus,
      dynamic_values: dynamicValues,
      image_urls: persistedImageUrls,
    }

    if (modalMode === 'create') {
      const { data, error } = await createSellerListing(payload)
      if (error || !data) {
        setFormError(error || 'Failed to save listing.')
        return
      }
      setProducts((prev) => [normalizeListingRowToProduct(data), ...prev])
    } else {
      const { data, error } = await updateSellerListing(selectedProduct.id, payload)
      if (error || !data) {
        setFormError(error || 'Failed to save listing.')
        return
      }
      setProducts((prev) =>
        prev.map((p) => (p.id === selectedProduct.id ? normalizeListingRowToProduct(data) : p)),
      )
    }

    handleCloseModal()
  }

  return (
    <div className={styles.pageWrap}>
      <section className={styles.filtersRow} aria-label="Search products">
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
        <button type="button" className={styles.addProductBtn} onClick={handleOpenCreate}>
          Add Product
        </button>
      </section>

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

      <section className={styles.productsSection} aria-label="Products list">
        {loadingData ? (
          <div className={styles.emptyState}>
            <p className={styles.emptyTitle}>Loading listings...</p>
          </div>
        ) : filteredProducts.length === 0 ? (
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

                <div className={styles.productImageWrap}>
                  <Image
                    src={product.image}
                    alt={product.name}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 960px) 50vw, 320px"
                    className={styles.productImage}
                  />
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
                  <button
                    type="button"
                    className={styles.productActionDanger}
                    onClick={() => handleRequestRemove(product)}
                  >
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
                  {modalMode === 'view'
                    ? 'Listing details'
                    : modalMode === 'create'
                      ? 'Add listing'
                      : 'Edit listing'}
                </p>
                <h2 className={styles.productModalTitle}>
                  {modalMode === 'create' ? 'New listing' : selectedProduct.name}
                </h2>
                <p className={styles.productModalSubtitle}>
                  {modalMode === 'create'
                    ? 'Fill in the listing details below'
                    : `${selectedProduct.category} · ${selectedProduct.city}`}
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
                <div className={styles.productPreviewRow}>
                  <div className={styles.productPreviewImageCol}>
                    <div className={styles.productModalImageWrap}>
                      <Image
                        src={selectedProduct.image}
                        alt={selectedProduct.name}
                        fill
                        sizes="(max-width: 800px) 100vw, 460px"
                        className={styles.productModalImage}
                      />
                    </div>
                  </div>

                  <div className={styles.productPreviewBody}>
                    <div className={styles.productPreviewHeaderRow}>
                      <div className={styles.productPreviewRatings}>
                        <span className={styles.productPreviewStars}>★★★★★</span>
                        <span className={styles.productPreviewRatingScore}>4.9</span>
                        <span className={styles.productPreviewRatingMeta}>· 42 reviews</span>
                      </div>
                      <span
                        className={`${styles.productPreviewStockBadge} ${
                          selectedProduct.status === 'active'
                            ? styles.productPreviewStockActive
                            : styles.productPreviewStockInactive
                        }`}
                      >
                        {selectedProduct.status === 'active' ? 'In stock' : 'Inactive'}
                      </span>
                    </div>

                    <div className={styles.productPreviewPriceRow}>
                      <span className={styles.productPreviewPrice}>
                        {formatPrice(selectedProduct.startingPrice)}
                      </span>
                    </div>

                    <p className={styles.productPreviewShortDesc}>
                      {selectedProduct.longDescription ||
                        selectedProduct.description ||
                        'A thoughtfully curated memorial service that honors your loved one with grace, dignity, and compassion — guiding your family through every step of the process.'}
                    </p>

                    <hr className={styles.productPreviewDivider} />

                    <div className={styles.productPreviewMetaGrid}>
                      <div className={styles.productPreviewMetaItem}>
                        <span className={styles.productPreviewMetaLabel}>Type</span>
                        <span className={styles.productPreviewMetaValue}>
                          {selectedProduct.type ||
                            (selectedProduct.kind === 'service' ? 'Funeral Service' : 'Package')}
                        </span>
                      </div>
                      <div className={styles.productPreviewMetaItem}>
                        <span className={styles.productPreviewMetaLabel}>Category</span>
                        <span className={styles.productPreviewMetaValue}>
                          {selectedProduct.detailCategory || selectedProduct.category}
                        </span>
                      </div>
                      <div className={styles.productPreviewMetaItem}>
                        <span className={styles.productPreviewMetaLabel}>Duration</span>
                        <span className={styles.productPreviewMetaValue}>
                          {selectedProduct.duration || '3–5 Days'}
                        </span>
                      </div>
                      <div className={styles.productPreviewMetaItem}>
                        <span className={styles.productPreviewMetaLabel}>Coverage</span>
                        <span className={styles.productPreviewMetaValue}>
                          {selectedProduct.coverage || 'Metro Manila'}
                        </span>
                      </div>
                    </div>

                    {selectedProduct.inclusions?.length ? (
                      <div className={styles.productPreviewInclusions}>
                        <h3 className={styles.productModalSectionTitle}>Key inclusions</h3>
                        <ul className={styles.productModalList}>
                          {selectedProduct.inclusions.map((inc, idx) => (
                            <li key={idx}>{inc}</li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : (
                <div className={styles.productModalForm}>
                  {formError ? (
                    <p className={styles.productModalSubtitle}>{formError}</p>
                  ) : null}
                  {!templateFields.length ? (
                    <p className={styles.productModalSubtitle}>
                      Admin has not configured the seller template yet.
                    </p>
                  ) : null}
                  <div className={styles.productModalFormGrid}>
                    {templateFields.map((field) => (
                      <label key={field.id} className={styles.productModalField}>
                        <span className={styles.productModalLabel}>
                          {field.label}
                          {field.required ? ' *' : ''}
                        </span>
                        {field.type === 'textarea' ? (
                          <textarea
                            className={styles.productModalTextarea}
                            value={asInputValue(getFieldValue(field.id))}
                            placeholder={field.placeholder || ''}
                            onChange={(e) => setFieldValue(field.id, e.target.value)}
                          />
                        ) : field.type === 'select' ? (
                          <select
                            className={styles.productModalInput}
                            value={asInputValue(getFieldValue(field.id))}
                            onChange={(e) => setFieldValue(field.id, e.target.value)}
                          >
                            <option value="">
                              {field.placeholder || `Select ${field.label.toLowerCase()}`}
                            </option>
                            {(Array.isArray(field.options) ? field.options : []).map((option) => (
                              <option key={option} value={option}>
                                {option}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <input
                            type={field.type || 'text'}
                            className={styles.productModalInput}
                            value={asInputValue(getFieldValue(field.id))}
                            placeholder={field.placeholder || ''}
                            onChange={(e) => setFieldValue(field.id, e.target.value)}
                          />
                        )}
                      </label>
                    ))}
                    <label className={styles.productModalField}>
                      <span className={styles.productModalLabel}>Images</span>
                      <div className={styles.productModalUploadRow}>
                        <div className={styles.productModalUploadList}>
                          {editGallery.map((src, idx) => (
                            <div key={idx} className={styles.productModalUploadPreview}>
                              <img
                                src={src}
                                alt={`${asInputValue(getFieldValue('listing_name')) || 'Listing'} ${idx + 1}`}
                              />
                              <button
                                type="button"
                                className={styles.productModalUploadRemove}
                                onClick={() => handleRemoveImage(idx)}
                                aria-label="Remove image"
                              >
                                ×
                              </button>
                            </div>
                          ))}
                        </div>
                        <button
                          type="button"
                          className={styles.productModalUploadBtn}
                          onClick={handleUploadClick}
                          aria-label="Upload images"
                          title="Upload images"
                        >
                          <TbPhoto size={18} />
                        </button>
                      </div>
                    </label>
                  </div>
                </div>
              )}
            </div>

            {(modalMode === 'edit' || modalMode === 'create') && (
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                style={{ display: 'none' }}
                onChange={handleFilesSelected}
              />
            )}

            <div className={styles.productModalFooter}>
              <button
                type="button"
                className={styles.productModalSecondary}
                onClick={handleCloseModal}
              >
                Close
              </button>
              {(modalMode === 'edit' || modalMode === 'create') && (
                <button
                  type="button"
                  className={styles.productModalPrimary}
                  onClick={handleSaveProduct}
                  disabled={!templateFields.length}
                >
                  {modalMode === 'create' ? 'Add product' : 'Save changes'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {productPendingRemoval && (
        <div
          className={styles.productModalOverlay}
          onClick={(e) => {
            if (e.target === e.currentTarget) handleCancelRemove()
          }}
          role="dialog"
          aria-modal="true"
        >
          <div className={styles.removeConfirmCard} onClick={(e) => e.stopPropagation()}>
            <h2 className={styles.removeConfirmTitle}>Remove listing?</h2>
            <p className={styles.removeConfirmText}>
              This will hide{' '}
              <span className={styles.removeConfirmName}>{productPendingRemoval.name}</span> from your
              products. You can add it again later if needed.
            </p>
            <div className={styles.removeConfirmActions}>
              <button
                type="button"
                className={styles.removeConfirmCancel}
                onClick={handleCancelRemove}
              >
                Cancel
              </button>
              <button
                type="button"
                className={styles.removeConfirmDelete}
                onClick={handleConfirmRemove}
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

