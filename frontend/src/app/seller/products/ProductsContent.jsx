'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { TbPlus, TbSearch } from 'react-icons/tb'
import styles from './products.module.css'
import {
  buildSellerListingPayload,
  dynamicValuesToFormState,
  ensureBuiltInSellerTemplateFields,
  ensureStatusField,
  FALLBACK_IMAGE,
  findFirstMissingRequiredField,
  resolvePersistedImageUrls,
  SellerListingFileInput,
  SellerListingFormFields,
} from './SellerListingForm'
import { fetchSellerTemplate } from '@/lib/seller-template/client'
import { getOrderedSectionIds, mergeSectionConfig, sortTemplateFieldsForDisplay } from '@/lib/seller-template/sections'
import {
  listMySellerListings,
  updateSellerListing,
  deleteSellerListing,
} from '@/lib/seller-listings/client'
import { getSellerByUserId } from '@/lib/sellers/client'
import { supabase } from '@/lib/supabase/client'

// ---------------------------------------------------------------------------
// Listing form utilities (products list + edit modal)
// ---------------------------------------------------------------------------

function revokeLocalPreviewUrls(entries) {
  ;(Array.isArray(entries) ? entries : []).forEach((entry) => {
    if (entry?.url?.startsWith('blob:')) {
      URL.revokeObjectURL(entry.url)
    }
  })
}

function normalizeListingRowToProduct(row) {
  const dynamicValues =
    row?.dynamic_values && typeof row.dynamic_values === 'object' ? row.dynamic_values : {}
  const imageUrls = Array.isArray(row?.image_urls) ? row.image_urls : []

  const listingName = dynamicValues.listing_name || row.listing_name || 'Untitled listing'
  const category = dynamicValues.category || row.category || 'Service'
  const description = dynamicValues.description || ''
  const areaRaw =
    (typeof dynamicValues.coverage === 'string' && dynamicValues.coverage.trim()) ||
    (typeof dynamicValues.location === 'string' && dynamicValues.location.trim()) ||
    (typeof row.location === 'string' && row.location.trim()) ||
    ''
  const location = areaRaw || 'N/A'
  const basePriceRaw = dynamicValues.base_price ?? row.base_price ?? 0
  const basePrice = Number(basePriceRaw) || 0
  const status = dynamicValues.status || row.status || 'draft'
  const availability = dynamicValues.availability || 'Available'
  const kind = dynamicValues.kind || 'service'
  const primaryImage = imageUrls[0] || FALLBACK_IMAGE

  const rawInc = dynamicValues.inclusions
  let inclusions = []
  if (Array.isArray(rawInc)) {
    inclusions = rawInc.map((x) => String(x).trim()).filter(Boolean)
  } else if (typeof rawInc === 'string') {
    inclusions = rawInc
      .split(/\n/)
      .map((x) => x.trim())
      .filter(Boolean)
  }

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
    inclusions,
    whoThisIsFor: dynamicValues.who_this_is_for || '',
    importantNotes: dynamicValues.important_notes || '',
    funeralCategory: dynamicValues.funeral_category || '',
  }
}

// ---------------------------------------------------------------------------
// Products list + view/edit modals
// ---------------------------------------------------------------------------

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
  const [editGallery, setEditGallery] = useState([])
  const [pendingImageFiles, setPendingImageFiles] = useState([])
  const [products, setProducts] = useState([])
  const [productPendingRemoval, setProductPendingRemoval] = useState(null)
  const fileInputRef = useRef(null)
  const [template, setTemplate] = useState(null)
  const [templateFields, setTemplateFields] = useState([])
  const [formValues, setFormValues] = useState({})
  const [formError, setFormError] = useState('')
  const [loadingData, setLoadingData] = useState(true)
  /** `sellers.status` — shop only shows listings when this is `active`. */
  const [sellerAccountStatus, setSellerAccountStatus] = useState(null)

  useEffect(() => {
    if (initialKind && TYPE_FILTERS.some((t) => t.id === initialKind)) {
      setTypeFilter(initialKind)
    }
  }, [initialKind])

  useEffect(() => {
    let mounted = true

    const load = async () => {
      setLoadingData(true)

      const [{ data: templateData }, { data: listingRows, error: listingError }, authRes] =
        await Promise.all([fetchSellerTemplate(), listMySellerListings(), supabase.auth.getUser()])

      if (!mounted) return

      const uid = authRes.data?.user?.id
      if (uid) {
        const sellerRow = await getSellerByUserId(uid)
        if (mounted) setSellerAccountStatus(sellerRow?.status ?? null)
      } else if (mounted) {
        setSellerAccountStatus(null)
      }

      if (templateData) {
        const mergedSec =
          templateData.sectionConfig || mergeSectionConfig(templateData.section_config)
        const orderIds = getOrderedSectionIds(mergedSec)
        const withBuiltins = ensureBuiltInSellerTemplateFields(
          [...(templateData.fields || [])],
          orderIds,
        )
        const sorted = ensureStatusField(
          sortTemplateFieldsForDisplay(withBuiltins, orderIds),
        )
        setTemplate(templateData)
        setTemplateFields(sorted)
      } else {
        const orderIds = getOrderedSectionIds(mergeSectionConfig(null))
        const withBuiltins = ensureBuiltInSellerTemplateFields([], orderIds)
        setTemplateFields(
          ensureStatusField(sortTemplateFieldsForDisplay(withBuiltins, orderIds)),
        )
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

  const templateSectionConfig = useMemo(() => {
    if (template?.sectionConfig?.length) return template.sectionConfig
    return mergeSectionConfig(template?.section_config)
  }, [template])

  const templateSectionIds = useMemo(
    () => getOrderedSectionIds(templateSectionConfig),
    [templateSectionConfig],
  )

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
    setEditGallery((product.gallery ?? [product.image].filter(Boolean)).map((url) => ({ url, file: null })))
    setPendingImageFiles([])
    setFormError('')
    setFormValues(dynamicValuesToFormState(product.dynamicValues, templateFields))
  }

  const handleCloseModal = () => {
    revokeLocalPreviewUrls(editGallery)
    setSelectedProduct(null)
    setModalMode(null)
    setEditGallery([])
    setPendingImageFiles([])
    setFormValues({})
    setFormError('')
  }

  useEffect(
    () => () => {
      revokeLocalPreviewUrls(editGallery)
    },
    [editGallery],
  )

  const handleUploadClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click()
    }
  }

  const handleFilesSelected = (event) => {
    const files = Array.from(event.target.files || [])
    if (!files.length) return
    const entries = files.map((file) => ({ url: URL.createObjectURL(file), file }))
    setPendingImageFiles((prev) => [...prev, ...files])
    setEditGallery((prev) => [...prev, ...entries])
  }

  const handleRemoveImage = (index) => {
    setEditGallery((prev) => {
      const target = prev[index]
      if (target?.url?.startsWith('blob:')) {
        URL.revokeObjectURL(target.url)
        setPendingImageFiles((files) => files.filter((file) => file !== target.file))
      }
      return prev.filter((_, i) => i !== index)
    })
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

    const missingRequired = findFirstMissingRequiredField(
      templateFields,
      getFieldValue,
      templateSectionIds,
    )
    if (missingRequired) {
      setFormError(`${missingRequired.label} is required.`)
      return
    }

    const { error: uploadErr, persistedImageUrls } = await resolvePersistedImageUrls(
      editGallery,
      pendingImageFiles,
    )
    if (uploadErr) {
      setFormError(uploadErr)
      return
    }

    const payload = buildSellerListingPayload({
      template,
      formValues,
      selectedProduct,
      persistedImageUrls,
    })

    const { data, error } = await updateSellerListing(selectedProduct.id, payload)
    if (error || !data) {
      setFormError(error || 'Failed to save listing.')
      return
    }
    setProducts((prev) =>
      prev.map((p) => (p.id === selectedProduct.id ? normalizeListingRowToProduct(data) : p)),
    )

    handleCloseModal()
  }

  return (
    <div className={styles.pageWrap}>
      {sellerAccountStatus && sellerAccountStatus !== 'active' ? (
        <div
          className={styles.shopVisibilityBanner}
          role="status"
          aria-live="polite"
        >
          {sellerAccountStatus === 'pending' ? (
            <>
              <strong>Shop visibility:</strong> your seller account is still{' '}
              <strong>pending approval</strong>. Listings will not appear on the public shop until an
              administrator sets your account to Active.
            </>
          ) : (
            <>
              <strong>Shop visibility:</strong> your seller account is <strong>{sellerAccountStatus}</strong>.
              Listings are hidden from the public shop until your account is Active.
            </>
          )}
        </div>
      ) : null}
      <section className={styles.filtersRow} aria-label="Search products">
        <div className={styles.searchWrap}>
          <TbSearch className={styles.searchIcon} size={18} aria-hidden />
          <input
            type="search"
            className={styles.searchBox}
            placeholder="Search by name, category, or area"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Search products"
          />
        </div>
        <Link href="/seller/products/new-listing" className={styles.addListingMobile}>
          <TbPlus size={18} aria-hidden />
          Add New Listing
        </Link>
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
              Adjust the search or type filter to see more of your services and packages, or{' '}
              <Link href="/seller/products/new-listing" className={styles.emptyStateLink}>
                Add New Listing
              </Link>
              .
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

                    {selectedProduct.whoThisIsFor?.trim() ? (
                      <div className={styles.productPreviewInclusions}>
                        <h3 className={styles.productModalSectionTitle}>Who this is for</h3>
                        <p className={styles.productModalSubtitle} style={{ whiteSpace: 'pre-wrap' }}>
                          {selectedProduct.whoThisIsFor}
                        </p>
                      </div>
                    ) : null}

                    {selectedProduct.importantNotes?.trim() ? (
                      <div className={styles.productPreviewInclusions}>
                        <h3 className={styles.productModalSectionTitle}>Important notes</h3>
                        <p className={styles.productModalSubtitle} style={{ whiteSpace: 'pre-wrap' }}>
                          {selectedProduct.importantNotes}
                        </p>
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : (
                <>
                  <SellerListingFormFields
                    templateFields={templateFields}
                    sectionConfig={templateSectionConfig}
                    formError={formError}
                    getFieldValue={getFieldValue}
                    setFieldValue={setFieldValue}
                    editGallery={editGallery}
                    onUploadClick={handleUploadClick}
                    onRemoveImage={handleRemoveImage}
                  />
                  <SellerListingFileInput fileInputRef={fileInputRef} onFilesSelected={handleFilesSelected} />
                </>
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
                  onClick={handleSaveProduct}
                >
                  Save changes
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
