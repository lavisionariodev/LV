'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { TbPlus, TbSearch, TbTrash } from 'react-icons/tb'
import styles from './products.module.css'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import {
  buildSellerListingPayload,
  ALLOWED_IMAGE_MIME,
  FALLBACK_IMAGE,
  findFirstMissingRequiredField,
  LISTING_IMAGE_ACCEPT,
  MAX_LISTING_IMAGES,
  listingRowToFormValues,
  normalizePackageOptionsFromDb,
  resolvePersistedImageUrls,
  SellerListingFileInput,
  SellerListingFormFields,
} from './SellerListingForm'
import {
  listMySellerListings,
  submitListingForReview,
  updateSellerListing,
  deleteSellerListing,
} from '@/lib/seller-listings/client'
import { getSellerByUserId } from '@/lib/sellers/client'
import { supabase } from '@/lib/supabase/client'
import { formatPhpAmount, roundPhpAmount } from '@/lib/cart/formatPhp'
import { hasPendingSellerChanges, mergePendingChangesIntoListingRow } from '@/lib/seller-listings/pendingChanges'
import { formatCount } from '@/shared/utils/formatCount'
import { useDebouncedEffect } from '@/shared/hooks'
import { readEnum, readString, replaceUrlQuery } from '@/lib/url/queryParams'

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

/** Buyer-facing kind label — matches shop listing mapping. */
function formatListingKindLabel(kind) {
  if (kind == null || typeof kind !== 'string') return ''
  const k = kind.trim().toLowerCase()
  if (k === 'service') return 'Service'
  if (k === 'package') return 'Package'
  const t = kind.trim()
  return t ? t.charAt(0).toUpperCase() + t.slice(1) : ''
}

const VIEW_MODAL_EMPTY = '—'

function coerceDisplayString(v) {
  if (v == null) return ''
  return String(v).trim()
}

/**
 * Client-side listing search: case-insensitive; every whitespace-separated token must appear
 * somewhere in the combined fields (AND). Avoids crashes on missing fields.
 */
function buildListingSearchHaystack(p) {
  if (!p) return ''
  const inc = Array.isArray(p.inclusions) ? p.inclusions.join(' ') : ''
  const pkg = Array.isArray(p.packageOptions) ? p.packageOptions.join(' ') : ''
  const parts = [
    p.name,
    p.category,
    p.city,
    p.coverage,
    p.duration,
    p.detailCategory,
    p.funeralCategory,
    p.description,
    p.longDescription,
    p.availability,
    p.listingKindLabel,
    p.kind,
    p.status,
    p.approvalStatus,
    p.stockStatus,
    inc,
    pkg,
    p.whoThisIsFor,
    p.importantNotes,
  ]
  return parts.map((x) => String(x ?? '').toLowerCase()).join(' ')
}

function listingMatchesSearchQuery(p, rawQuery) {
  const trimmed = String(rawQuery ?? '').trim()
  if (!trimmed) return true
  const hay = buildListingSearchHaystack(p)
  const tokens = trimmed.toLowerCase().split(/\s+/).filter(Boolean)
  if (tokens.length === 0) return true
  return tokens.every((t) => hay.includes(t))
}

function viewModalDurationText(p) {
  const s = coerceDisplayString(p?.duration)
  return s || VIEW_MODAL_EMPTY
}

function viewModalCoverageText(p) {
  const cityOk = coerceDisplayString(p?.city)
  const cityFallback = cityOk && cityOk !== 'N/A' ? cityOk : ''
  const s = coerceDisplayString(p?.coverage) || cityFallback
  return s || VIEW_MODAL_EMPTY
}

function viewModalCategoryLine(p) {
  const cat = coerceDisplayString(p?.category)
  const det = coerceDisplayString(p?.detailCategory)
  if (cat) return cat
  return det || VIEW_MODAL_EMPTY
}

function normalizeListingRowToProduct(row) {
  const effective = mergePendingChangesIntoListingRow(row)
  const imageUrls = Array.isArray(effective?.image_urls) ? effective.image_urls : []

  const listingName = effective.listing_name || 'Untitled listing'
  const category = effective.category || 'Service'
  const description = effective.description || ''
  const areaRaw = coerceDisplayString(effective?.location) || ''
  const location = areaRaw || 'N/A'
  const basePrice = effective.base_price != null ? roundPhpAmount(effective.base_price) : 0
  const status = effective.status || 'draft'
  const kind =
    String(effective.listing_kind == null || effective.listing_kind === '' ? 'service' : effective.listing_kind)
      .trim()
      .toLowerCase() || 'service'
  const stock = effective.stock_status
  const availability =
    stock === 'Out of Stock' ? 'Out of Stock' : stock === 'In Stock' ? 'Available' : 'Available'
  const primaryImage = imageUrls[0] || FALLBACK_IMAGE

  const duration = coerceDisplayString(effective.duration)
  const funeralCategoryRaw = coerceDisplayString(effective.funeral_category)

  const rawInc = effective.inclusions
  let inclusions = []
  if (typeof rawInc === 'string' && rawInc.trim()) {
    inclusions = rawInc
      .split(/\n/)
      .map((x) => x.trim())
      .filter(Boolean)
  }

  return {
    id: row.id,
    name: listingName,
    kind,
    listingKindLabel: formatListingKindLabel(kind),
    category,
    coverage: areaRaw,
    duration,
    detailCategory: funeralCategoryRaw,
    startingPrice: basePrice,
    city: location,
    status,
    approvalStatus: row?.approval_status ?? row?.approvalStatus ?? 'draft',
    rejectionReason: row?.rejection_reason ?? row?.rejectionReason ?? null,
    submittedAt: row?.submitted_at ?? row?.submittedAt ?? null,
    reviewedAt: row?.reviewed_at ?? row?.reviewedAt ?? null,
    availability,
    description,
    longDescription: description,
    image: primaryImage,
    gallery: imageUrls.length ? imageUrls : [FALLBACK_IMAGE],
    inclusions,
    whoThisIsFor: coerceDisplayString(effective.who_this_is_for),
    importantNotes: coerceDisplayString(effective.important_notes),
    funeralCategory: funeralCategoryRaw,
    packageOptions: normalizePackageOptionsFromDb(effective.package_options),
    stockStatus: effective.stock_status ?? null,
    hasPendingUpdate: hasPendingSellerChanges(row),
    stagedRejectionReason: row?.staged_rejection_reason ?? row?.stagedRejectionReason ?? null,
  }
}

// ---------------------------------------------------------------------------
// Products list + view/edit modals
// ---------------------------------------------------------------------------

function isProductShopActive(p) {
  return p?.status === 'active' && p?.approvalStatus === 'approved'
}

function productStateLabel(p) {
  const approval = String(p?.approvalStatus || 'draft').toLowerCase()
  const status = String(p?.status || 'draft').toLowerCase()
  if (approval === 'pending') return 'Pending review'
  if (approval === 'rejected') return 'Rejected'
  if (status === 'archived') return 'Archived'
  if (approval === 'approved' && p?.hasPendingUpdate) return 'Changes pending review'
  if (isProductShopActive(p)) return 'Active'
  return 'Draft'
}

const TYPE_FILTERS = [
  { id: 'all', label: 'All types' },
  { id: 'service', label: 'Services' },
  { id: 'package', label: 'Packages' },
]

export default function ProductsContent({ initialKind = 'all' }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const allowedKinds = TYPE_FILTERS.map((t) => t.id)
  const defaultKind = allowedKinds.includes(initialKind) ? initialKind : 'all'
  const [searchQuery, setSearchQuery] = useState(() => readString(searchParams, 'q', ''))
  const [typeFilter, setTypeFilter] = useState(() => readEnum(searchParams, 'kind', allowedKinds, defaultKind))
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [modalMode, setModalMode] = useState(null) // 'view' | 'edit'
  const [editGallery, setEditGallery] = useState([])
  const [pendingImageFiles, setPendingImageFiles] = useState([])
  const [products, setProducts] = useState([])
  const [productPendingRemoval, setProductPendingRemoval] = useState(null)
  const [removeInProgress, setRemoveInProgress] = useState(false)
  const [removeError, setRemoveError] = useState(null)
  const [archiveBusyId, setArchiveBusyId] = useState(null)
  const fileInputRef = useRef(null)
  const [formValues, setFormValues] = useState({})
  const [formError, setFormError] = useState('')
  const [loadingData, setLoadingData] = useState(true)
  /** `sellers.status` — shop only shows listings when this is `active`. */
  const [sellerAccountStatus, setSellerAccountStatus] = useState(null)

  useEffect(() => {
    if (initialKind && TYPE_FILTERS.some((t) => t.id === initialKind)) {
      queueMicrotask(() => setTypeFilter(initialKind))
    }
  }, [initialKind])

  // Sync state <- URL (back/forward, shared links)
  useEffect(() => {
    const nextQ = readString(searchParams, 'q', '')
    const nextKind = readEnum(searchParams, 'kind', allowedKinds, defaultKind)
    queueMicrotask(() => {
      if (nextQ !== searchQuery) setSearchQuery(nextQ)
      if (nextKind !== typeFilter) setTypeFilter(nextKind)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  // Sync URL <- state (debounce typing)
  useDebouncedEffect(() => {
    replaceUrlQuery(router, pathname, searchParams, {
      q: searchQuery,
      kind: { value: typeFilter, omitIf: defaultKind },
    })
  }, [searchQuery, typeFilter, router, pathname, searchParams], 300)

  useEffect(() => {
    let mounted = true
    let channel = null

    const load = async () => {
      setLoadingData(true)

      const [{ data: listingRows, error: listingError }, authRes] = await Promise.all([
        listMySellerListings(),
        supabase.auth.getUser(),
      ])

      if (!mounted) return

      const uid = authRes.data?.user?.id
      if (uid) {
        const sellerRow = await getSellerByUserId(uid)
        if (mounted) setSellerAccountStatus(sellerRow?.status ?? null)
      } else if (mounted) {
        setSellerAccountStatus(null)
      }

      if (listingError) {
        setProducts([])
      } else {
        const mapped = (listingRows || []).map(normalizeListingRowToProduct)
        setProducts(mapped)
      }

      setLoadingData(false)
    }

    const setup = async () => {
      await load()
      const { data: authRes } = await supabase.auth.getUser()
      const uid = authRes?.user?.id
      if (!uid || !mounted) return

      channel = supabase
        .channel(`seller-products:${uid}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'seller_listings', filter: `seller_user_id=eq.${uid}` },
          () => {
            load()
          },
        )
        .subscribe()
    }

    setup()

    const onFocus = () => {
      if (document.visibilityState === 'visible') load()
    }
    window.addEventListener('focus', onFocus)

    return () => {
      mounted = false
      window.removeEventListener('focus', onFocus)
      if (channel) supabase.removeChannel(channel)
    }
  }, [])

  const filteredProducts = useMemo(() => {
    let list = [...products]

    if (typeFilter !== 'all') {
      list = list.filter((p) => p.kind === typeFilter)
    }

    if (searchQuery.trim()) {
      list = list.filter((p) => listingMatchesSearchQuery(p, searchQuery))
    }

    return list
  }, [products, typeFilter, searchQuery])

  const total = products.length
  const activeCount = products.filter((p) => isProductShopActive(p)).length
  const pendingCount = products.filter((p) => String(p?.approvalStatus || '').toLowerCase() === 'pending').length
  const draftCount = products.filter((p) => productStateLabel(p) === 'Draft').length

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
    setFormValues(listingRowToFormValues(product))
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
    if (editGallery.length >= MAX_LISTING_IMAGES) {
      setFormError(`Maximum ${MAX_LISTING_IMAGES} images. Remove one to add more.`)
      return
    }
    setFormError('')
    if (fileInputRef.current) {
      fileInputRef.current.click()
    }
  }

  const handleFilesSelected = (event) => {
    const files = Array.from(event.target.files || [])
    event.target.value = ''
    if (!files.length) return

    const room = Math.max(0, MAX_LISTING_IMAGES - editGallery.length)
    const validFiles = files.filter((file) => ALLOWED_IMAGE_MIME.has(file.type))
    const invalidCount = files.length - validFiles.length
    const toAdd = validFiles.slice(0, room)
    const droppedForLimit = validFiles.length - toAdd.length

    if (room <= 0) {
      setFormError(`Maximum ${MAX_LISTING_IMAGES} images. Remove one to add more.`)
      return
    }

    if (!toAdd.length) {
      setFormError(
        invalidCount > 0
          ? 'No images added — only JPEG, PNG, WebP, or GIF are allowed.'
          : `Maximum ${MAX_LISTING_IMAGES} images. Remove one to add more.`,
      )
      return
    }

    const notes = []
    if (invalidCount > 0) {
      notes.push(
        invalidCount === 1
          ? '1 file was skipped — only JPEG, PNG, WebP, or GIF are allowed.'
          : `${invalidCount} files were skipped — only JPEG, PNG, WebP, or GIF are allowed.`,
      )
    }
    if (droppedForLimit > 0) {
      notes.push(
        `Only ${toAdd.length} more image${toAdd.length !== 1 ? 's' : ''} fit (${MAX_LISTING_IMAGES} maximum per listing).`,
      )
    }

    const entries = toAdd.map((file) => ({ url: URL.createObjectURL(file), file }))
    setPendingImageFiles((prev) => [...prev, ...toAdd])
    setEditGallery((prev) => [...prev, ...entries])
    setFormError(notes.join(' '))
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
    setRemoveError(null)
    handleCloseModal()
    setProductPendingRemoval(product)
  }

  const handleCancelRemove = () => {
    if (removeInProgress) return
    setRemoveError(null)
    setProductPendingRemoval(null)
  }

  const handleConfirmRemove = async () => {
    if (!productPendingRemoval || removeInProgress) return

    setRemoveError(null)
    setRemoveInProgress(true)
    try {
      const id = productPendingRemoval.id
      const { error } = await deleteSellerListing(id)
      if (error) {
        setRemoveError(error)
        return
      }

      setProducts((prev) => prev.filter((p) => p.id !== id))

      if (selectedProduct?.id === id) {
        setSelectedProduct(null)
        setModalMode(null)
      }

      setProductPendingRemoval(null)
    } finally {
      setRemoveInProgress(false)
    }
  }

  const getFieldValue = (fieldId) => formValues?.[fieldId]

  const setFieldValue = (fieldId, value) => {
    setFormValues((prev) => ({ ...prev, [fieldId]: value }))
    setFormError('')
  }

  const handleSaveProduct = async () => {
    if (!selectedProduct) return

    const missingRequired = findFirstMissingRequiredField(formValues, editGallery)
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

  const handleSubmitForReview = async (product) => {
    if (!product?.id) return
    const { data, error } = await submitListingForReview(product.id)
    if (error || !data) {
      setFormError(error || 'Failed to submit listing for review.')
      return
    }
    setProducts((prev) =>
      prev.map((p) => (p.id === product.id ? normalizeListingRowToProduct(data) : p)),
    )
    if (selectedProduct?.id === product.id) {
      setSelectedProduct(normalizeListingRowToProduct(data))
    }
    setModalMode('view')
  }

  const handleToggleArchive = async (product, nextStatus) => {
    if (!product?.id) return
    if (archiveBusyId) return
    setFormError('')
    setArchiveBusyId(product.id)
    try {
      const { data, error } = await updateSellerListing(product.id, { status: nextStatus })
      if (error || !data) {
        setFormError(error || 'Failed to update listing status.')
        return
      }
      const mapped = normalizeListingRowToProduct(data)
      setProducts((prev) => prev.map((p) => (p.id === product.id ? mapped : p)))
      setSelectedProduct((prev) => (prev?.id === product.id ? mapped : prev))
    } finally {
      setArchiveBusyId(null)
    }
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
        <form
          className={styles.searchWrap}
          role="search"
          onSubmit={(e) => {
            e.preventDefault()
          }}
        >
          <TbSearch className={styles.searchIcon} size={18} aria-hidden />
          <input
            type="search"
            name="q"
            className={styles.searchBox}
            placeholder="Search by name, category, area, description, duration…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Search listings by text"
            autoComplete="off"
            spellCheck={false}
          />
        </form>
        <Link href="/seller/products/new-listing" className={styles.addListingMobile}>
          <TbPlus size={18} aria-hidden />
          Add New Listing
        </Link>
      </section>

      <section className={styles.statsStrip} aria-label="Listing overview">
        <div className={styles.statCard}>
          <p className={styles.statLabel}>Total listings</p>
          <p className={styles.statValue}>{formatCount(total)}</p>
          <p className={styles.statHint}>Services &amp; packages</p>
        </div>
        <div className={styles.statCard}>
          <p className={styles.statLabel}>Active</p>
          <p className={styles.statValue}>{formatCount(activeCount)}</p>
          <p className={styles.statHint}>Visible to buyers</p>
        </div>
        <div className={styles.statCard}>
          <p className={styles.statLabel}>Draft</p>
          <p className={styles.statValue}>{formatCount(draftCount)}</p>
          <p className={styles.statHint}>Not submitted</p>
        </div>
        <div className={styles.statCard}>
          <p className={styles.statLabel}>Pending</p>
          <p className={styles.statValue}>{formatCount(pendingCount)}</p>
          <p className={styles.statHint}>Under review</p>
        </div>
      </section>

      <section className={styles.productsSection} aria-label="Products list">
        {loadingData ? (
          <div
            className={styles.catalogSkGrid}
            role="status"
            aria-live="polite"
            aria-busy="true"
            aria-label="Loading listings"
          >
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={`listing-sk-${i}`} className={styles.catalogSkCard} aria-hidden>
                <div className={styles.skeletonBlock} style={{ height: 148, borderRadius: 0 }} />
                <div className={styles.catalogSkLines}>
                  <div className={`${styles.skeletonLine} ${styles.skeletonTitle}`} />
                  <div className={`${styles.skeletonLine} ${styles.skeletonMedium}`} />
                  <div className={`${styles.skeletonLine} ${styles.skeletonShort}`} />
                </div>
              </div>
            ))}
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
                      isProductShopActive(product)
                        ? styles.statusPillActive
                        : styles.statusPillInactive
                    }`}
                  >
                    {productStateLabel(product)}
                  </span>
                </div>

                {product.approvalStatus && product.approvalStatus !== 'approved' ? (
                  <div className={styles.productMeta} style={{ marginTop: 6 }}>
                    <p style={{ margin: 0, fontSize: 12, color: '#475569' }}>
                      Approval: <strong>{product.approvalStatus === 'pending' ? 'Pending review' : product.approvalStatus}</strong>
                      {product.approvalStatus === 'rejected' && product.rejectionReason ? (
                        <> · <span title={product.rejectionReason}>Rejected</span></>
                      ) : null}
                    </p>
                  </div>
                ) : null}

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
                      {formatPhpAmount(product.startingPrice)}
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
                    aria-haspopup="dialog"
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
              {modalMode === 'view' && selectedProduct?.hasPendingUpdate ? (
                <div className={styles.shopVisibilityBanner} role="status" style={{ marginBottom: 16 }}>
                  <strong>Review pending:</strong> Your latest edits are waiting for an administrator. The
                  public shop still shows your last approved details until those changes are approved.
                </div>
              ) : null}
              {modalMode === 'view' && selectedProduct?.stagedRejectionReason ? (
                <div
                  className={styles.shopVisibilityBanner}
                  role="status"
                  style={{
                    marginBottom: 16,
                    borderColor: '#fecaca',
                    background: '#fef2f2',
                  }}
                >
                  <strong>Staged update not approved:</strong> {selectedProduct.stagedRejectionReason}
                </div>
              ) : null}
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
                    <div
                      className={`${styles.productPreviewHeaderRow} ${styles.productPreviewHeaderRowEnd}`}
                    >
                      <span
                        className={`${styles.productPreviewStockBadge} ${
                          isProductShopActive(selectedProduct)
                            ? styles.productPreviewStockActive
                            : styles.productPreviewStockInactive
                        }`}
                      >
                        {productStateLabel(selectedProduct)}
                      </span>
                      {selectedProduct.approvalStatus ? (
                        <span
                          className={styles.productPreviewStockBadge}
                          style={{
                            marginLeft: 8,
                            background:
                              selectedProduct.approvalStatus === 'approved'
                                ? '#ecfdf5'
                                : selectedProduct.approvalStatus === 'pending'
                                  ? '#fffbeb'
                                  : selectedProduct.approvalStatus === 'rejected'
                                    ? '#fef2f2'
                                    : '#f1f5f9',
                            borderColor:
                              selectedProduct.approvalStatus === 'approved'
                                ? '#a7f3d0'
                                : selectedProduct.approvalStatus === 'pending'
                                  ? '#fde68a'
                                  : selectedProduct.approvalStatus === 'rejected'
                                    ? '#fecaca'
                                    : '#cbd5e1',
                            color:
                              selectedProduct.approvalStatus === 'approved'
                                ? '#065f46'
                                : selectedProduct.approvalStatus === 'pending'
                                  ? '#92400e'
                                  : selectedProduct.approvalStatus === 'rejected'
                                    ? '#991b1b'
                                    : '#334155',
                          }}
                          title={
                            selectedProduct.approvalStatus === 'rejected'
                              ? selectedProduct.rejectionReason || 'Rejected'
                              : undefined
                          }
                        >
                          {selectedProduct.approvalStatus === 'pending'
                            ? 'Pending review'
                            : selectedProduct.approvalStatus === 'approved'
                              ? 'Approved'
                              : selectedProduct.approvalStatus === 'rejected'
                                ? 'Rejected'
                                : 'Draft'}
                        </span>
                      ) : null}
                    </div>

                    <div className={styles.productPreviewPriceRow}>
                      <span className={styles.productPreviewPrice}>
                        {formatPhpAmount(selectedProduct.startingPrice)}
                      </span>
                    </div>

                    {(selectedProduct.longDescription || selectedProduct.description)?.trim() ? (
                      <p className={styles.productPreviewShortDesc}>
                        {selectedProduct.longDescription || selectedProduct.description}
                      </p>
                    ) : null}

                    <hr className={styles.productPreviewDivider} />

                    <div className={styles.productPreviewMetaGrid}>
                      <div className={styles.productPreviewMetaItem}>
                        <span className={styles.productPreviewMetaLabel}>Type</span>
                        <span className={styles.productPreviewMetaValue}>
                          {selectedProduct.listingKindLabel || VIEW_MODAL_EMPTY}
                        </span>
                      </div>
                      <div className={styles.productPreviewMetaItem}>
                        <span className={styles.productPreviewMetaLabel}>Category</span>
                        <span className={styles.productPreviewMetaValue}>
                          {viewModalCategoryLine(selectedProduct)}
                        </span>
                      </div>
                      <div className={styles.productPreviewMetaItem}>
                        <span className={styles.productPreviewMetaLabel}>Duration</span>
                        <span className={styles.productPreviewMetaValue}>
                          {viewModalDurationText(selectedProduct)}
                        </span>
                      </div>
                      <div className={styles.productPreviewMetaItem}>
                        <span className={styles.productPreviewMetaLabel}>Coverage</span>
                        <span className={styles.productPreviewMetaValue}>
                          {viewModalCoverageText(selectedProduct)}
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

                    {coerceDisplayString(selectedProduct.whoThisIsFor) ? (
                      <div className={styles.productPreviewInclusions}>
                        <h3 className={styles.productModalSectionTitle}>Who this is for</h3>
                        <p className={styles.productModalText} style={{ whiteSpace: 'pre-wrap' }}>
                          {selectedProduct.whoThisIsFor}
                        </p>
                      </div>
                    ) : null}

                    {coerceDisplayString(selectedProduct.importantNotes) ? (
                      <div className={styles.productPreviewInclusions}>
                        <h3 className={styles.productModalSectionTitle}>Important notes</h3>
                        <p className={styles.productModalText} style={{ whiteSpace: 'pre-wrap' }}>
                          {selectedProduct.importantNotes}
                        </p>
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : (
                <>
                  <SellerListingFormFields
                    formError={formError}
                    getFieldValue={getFieldValue}
                    setFieldValue={setFieldValue}
                    editGallery={editGallery}
                    onUploadClick={handleUploadClick}
                    onRemoveImage={handleRemoveImage}
                    imageUploadSubtitle={`(${editGallery.length}/${MAX_LISTING_IMAGES})`}
                  />
                  <SellerListingFileInput
                    fileInputRef={fileInputRef}
                    onFilesSelected={handleFilesSelected}
                    accept={LISTING_IMAGE_ACCEPT}
                  />
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
              {modalMode === 'view' &&
                selectedProduct &&
                selectedProduct.approvalStatus === 'approved' && (
                  selectedProduct.status === 'archived' ? (
                    <button
                      type="button"
                      className={styles.productModalSecondary}
                      onClick={() => handleToggleArchive(selectedProduct, 'active')}
                      disabled={archiveBusyId === selectedProduct.id}
                    >
                      {archiveBusyId === selectedProduct.id ? 'Updating…' : 'Unarchive'}
                    </button>
                  ) : (
                    <button
                      type="button"
                      className={styles.productModalSecondary}
                      onClick={() => handleToggleArchive(selectedProduct, 'archived')}
                      disabled={archiveBusyId === selectedProduct.id}
                    >
                      {archiveBusyId === selectedProduct.id ? 'Updating…' : 'Archive'}
                    </button>
                  )
                )}
              {modalMode === 'view' &&
                selectedProduct &&
                (selectedProduct.approvalStatus === 'draft' ||
                  selectedProduct.approvalStatus === 'rejected') && (
                  <button
                    type="button"
                    className={styles.productModalPrimary}
                    onClick={() => handleSubmitForReview(selectedProduct)}
                  >
                    Submit for review
                  </button>
                )}
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
          className={styles.removeConfirmOverlay}
          onClick={(e) => {
            if (removeInProgress) return
            if (e.target === e.currentTarget) handleCancelRemove()
          }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="remove-listing-confirm-title"
          aria-describedby="remove-listing-confirm-desc"
        >
          <div className={styles.removeConfirmCard} onClick={(e) => e.stopPropagation()}>
            <div className={styles.removeConfirmCardBody}>
              <div className={styles.removeConfirmHeader}>
                <div className={styles.removeConfirmIconBadge} aria-hidden>
                  <TbTrash size={16} strokeWidth={1.65} />
                </div>
                <h2 id="remove-listing-confirm-title" className={styles.removeConfirmTitle}>
                  Remove listing?
                </h2>
              </div>
              <p id="remove-listing-confirm-desc" className={styles.removeConfirmText}>
                This listing will be removed from your products. You can add it again later if needed.
              </p>
              {removeError ? (
                <p className={styles.removeConfirmError} role="alert">
                  {removeError}
                </p>
              ) : null}
            </div>
            <div className={styles.removeConfirmFooter}>
              <div className={styles.removeConfirmActions}>
                <button
                  type="button"
                  className={styles.removeConfirmCancel}
                  onClick={handleCancelRemove}
                  disabled={removeInProgress}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className={styles.removeConfirmDelete}
                  onClick={handleConfirmRemove}
                  disabled={removeInProgress}
                >
                  {removeInProgress ? 'Removing…' : 'Yes, remove'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

