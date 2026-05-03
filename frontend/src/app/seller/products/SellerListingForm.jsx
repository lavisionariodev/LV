'use client'

import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Check } from 'lucide-react'
import { TbBulb, TbPhoto } from 'react-icons/tb'
import {
  createSellerListing,
  submitListingForReview,
  uploadListingImages,
} from '@/lib/seller-listings/client'
import { getSellerByUserId } from '@/lib/sellers/client'
import { supabase } from '@/lib/supabase/client'
import styles from './products.module.css'
import loadingStyles from '@/components/ui/Load/NewListingLoadingState.module.css'
import { useMediaQuery } from '@/hooks'
import { normalizeStockStatusValue } from '@/lib/shop-listings/client'
import { formatPhpInputString, parsePhpAmountInputString } from '@/lib/cart/formatPhp'

/** Max images per listing (toolbar + upload strip). */
export const MAX_LISTING_IMAGES = 10

export const FALLBACK_IMAGE =
  'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 640 420%22%3E%3Crect width=%22640%22 height=%22420%22 fill=%22%23d1d5db%22/%3E%3Cpath d=%22M230 160h180a22 22 0 0 1 22 22v56a22 22 0 0 1-22 22H230a22 22 0 0 1-22-22v-56a22 22 0 0 1 22-22Zm18 28a16 16 0 1 0 0.1 0Zm-8 56 38-34 35 30 44-40 55 44H240Z%22 fill=%22%239ca3af%22/%3E%3C/svg%3E'

function NewListingLoadingState() {
  return (
    <div
      className={loadingStyles.loadingRoot}
      role="status"
      aria-busy="true"
      aria-live="polite"
    >
      <p className={loadingStyles.srOnly}>Preparing the listing form</p>
      <div className={loadingStyles.loadingStack} aria-hidden="true">
        <aside className={loadingStyles.loadingAside}>
          <div className={`${loadingStyles.skeletonCard} ${loadingStyles.skeletonCardStepper}`}>
            <div className={loadingStyles.skeletonStepperTrack}>
              <span className={loadingStyles.skeletonStepDot} />
              <span className={loadingStyles.skeletonStepLine} />
              <span className={loadingStyles.skeletonStepDot} />
              <span className={loadingStyles.skeletonStepLine} />
              <span className={loadingStyles.skeletonStepDot} />
            </div>
          </div>
          <div className={loadingStyles.skeletonCard}>
            <div className={`${loadingStyles.skeletonLine} ${loadingStyles.skeletonShort}`} />
            <div className={`${loadingStyles.skeletonLine} ${loadingStyles.skeletonNarrow}`} />
            <div className={`${loadingStyles.skeletonLine} ${loadingStyles.skeletonNarrow}`} />
          </div>
        </aside>
        <div className={loadingStyles.loadingMain}>
          <div className={`${loadingStyles.skeletonCard} ${loadingStyles.skeletonCardSection}`}>
            <div className={`${loadingStyles.skeletonLine} ${loadingStyles.skeletonTitle}`} />
            <div className={`${loadingStyles.skeletonLine} ${loadingStyles.skeletonMedium}`} />
            <div className={loadingStyles.skeletonBlock} />
            <div className={loadingStyles.skeletonBlock} />
            <div className={`${loadingStyles.skeletonLine} ${loadingStyles.skeletonShort}`} />
            <div className={loadingStyles.skeletonFooter}>
              <div className={loadingStyles.skeletonBtnGhost} />
              <div className={loadingStyles.skeletonBtnGhostWide} />
              <div className={loadingStyles.skeletonBtnPrimary} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

const LISTING_KIND_OPTIONS = [
  { value: 'service', label: 'Service' },
  { value: 'package', label: 'Package' },
]

const SHOP_CATEGORY_OPTIONS = [
  { value: 'memorial-planning', label: 'Memorial planning' },
  { value: 'cremation', label: 'Cremation' },
  { value: 'traditional-burial', label: 'Traditional burial' },
  { value: 'other', label: 'Other' },
]

const SHOP_CATEGORY_SLUGS = new Set(SHOP_CATEGORY_OPTIONS.map((o) => o.value))

function shopCategoryDisplayLabel(slug) {
  const s = String(slug ?? '').trim().toLowerCase()
  if (!s) return ''
  const row = SHOP_CATEGORY_OPTIONS.find((o) => o.value === s)
  return row?.label ?? ''
}

const STOCK_STATUS_OPTIONS = ['In Stock', 'Out of Stock']

export function normalizeStringListValue(raw) {
  if (raw == null) return []
  if (Array.isArray(raw)) return raw.map((x) => String(x ?? ''))
  if (typeof raw === 'string') {
    return raw.split(/\n/).map((s) => s)
  }
  return []
}

export function listingGalleryHasUserImages(gallery) {
  if (!Array.isArray(gallery) || gallery.length === 0) return false
  return gallery.some((entry) => {
    const url = entry?.url
    if (typeof url !== 'string' || !url.trim()) return false
    if (url === FALLBACK_IMAGE) return false
    if (url.startsWith('blob:')) return true
    if (url.startsWith('http://') || url.startsWith('https://')) return true
    return false
  })
}

export function filterPersistableImageUrls(urls) {
  return (Array.isArray(urls) ? urls : []).filter(
    (url) => typeof url === 'string' && url.trim() && !url.startsWith('blob:'),
  )
}

export function sanitizeImageUrlsForPersistence(urls) {
  const safe = filterPersistableImageUrls(urls)
  return safe.length ? safe : [FALLBACK_IMAGE]
}

export async function resolvePersistedImageUrls(editGallery, pendingImageFiles) {
  let persistedImageUrls = sanitizeImageUrlsForPersistence(editGallery.map((entry) => entry.url))
  const filesToUpload =
    Array.isArray(pendingImageFiles) && pendingImageFiles.length
      ? pendingImageFiles
      : (editGallery || []).map((e) => e.file).filter(Boolean)
  if (filesToUpload.length) {
    const { data: uploadedUrls, error: uploadError } = await uploadListingImages(filesToUpload)
    if (uploadError) {
      return { error: uploadError, persistedImageUrls: null }
    }
    const existingRemote = filterPersistableImageUrls(
      editGallery.filter((entry) => !entry.url.startsWith('blob:')).map((entry) => entry.url),
    )
    persistedImageUrls = [...existingRemote, ...(uploadedUrls || [])]
    if (!persistedImageUrls.length) persistedImageUrls = [FALLBACK_IMAGE]
  }
  return { error: null, persistedImageUrls }
}

export function asInputValue(value) {
  if (value == null) return ''
  if (typeof value === 'number') return String(value)
  return String(value)
}

export function getEmptyListingFormValues() {
  return {
    listing_name: '',
    description: '',
    funeral_category: 'memorial-planning',
    funeral_category_other: '',
    duration: '',
    location: '',
    kind: 'service',
    base_price: '',
    package_options: [],
    stock_status: 'In Stock',
    inclusions: '',
    who_this_is_for: '',
    important_notes: '',
  }
}

/**
 * Map saved listing row or product summary (from ProductsContent) to form state.
 */
export function listingRowToFormValues(source) {
  const empty = getEmptyListingFormValues()
  if (!source) return empty

  const pkgRaw = source.package_options ?? source.packageOptions
  let package_options = []
  if (Array.isArray(pkgRaw)) {
    package_options = pkgRaw.map((x) => String(x ?? ''))
  } else if (pkgRaw && typeof pkgRaw === 'object') {
    package_options = []
  }

  const inc = source.inclusions
  let inclusionsText = ''
  if (Array.isArray(inc)) {
    inclusionsText = inc.join('\n')
  } else if (typeof inc === 'string') {
    inclusionsText = inc
  } else if (typeof source.inclusions === 'string') {
    inclusionsText = source.inclusions
  }

  const loc =
    source.location ??
    source.coverage ??
    (source.city && source.city !== 'N/A' ? source.city : '') ??
    ''

  const fcRawOriginal = String(source.funeral_category ?? source.funeralCategory ?? '').trim()
  const rawFc = fcRawOriginal.toLowerCase()
  let funeral_category = 'memorial-planning'
  let funeral_category_other = ''
  if (!rawFc) {
    funeral_category = 'memorial-planning'
  } else if (SHOP_CATEGORY_SLUGS.has(rawFc)) {
    funeral_category = rawFc
    if (rawFc === 'other') {
      funeral_category_other = String(source.category ?? '').trim()
    }
  } else {
    funeral_category = 'other'
    funeral_category_other = fcRawOriginal
  }

  return {
    ...empty,
    listing_name: source.listing_name ?? source.name ?? '',
    description: source.description ?? '',
    funeral_category,
    funeral_category_other,
    duration: source.duration ?? '',
    location: String(loc || ''),
    kind: (source.listing_kind ?? source.kind ?? 'service').toLowerCase(),
    base_price:
      source.base_price != null
        ? formatPhpInputString(source.base_price)
        : source.startingPrice != null
          ? formatPhpInputString(source.startingPrice)
          : '',
    package_options,
    stock_status: normalizeStockStatusValue(source.stock_status ?? source.stockStatus) || 'In Stock',
    inclusions: inclusionsText,
    who_this_is_for: source.who_this_is_for ?? source.whoThisIsFor ?? '',
    important_notes: source.important_notes ?? source.importantNotes ?? '',
  }
}

export function buildSellerListingPayload({ formValues, selectedProduct, persistedImageUrls }) {
  const pkg = normalizeStringListValue(formValues.package_options)
    .map((s) => String(s).trim())
    .filter(Boolean)

  const stock = normalizeStockStatusValue(formValues.stock_status) || 'In Stock'
  const area = String(formValues.location ?? '').trim()
  const safeName = String(formValues.listing_name || selectedProduct?.name || '').trim() || 'Untitled listing'
  const fcSlug = String(formValues.funeral_category || '').trim().toLowerCase()
  const otherSpec = String(formValues.funeral_category_other ?? '').trim()
  const safeCategory =
    fcSlug === 'other'
      ? otherSpec || 'Other'
      : shopCategoryDisplayLabel(fcSlug) ||
        String(selectedProduct?.category || '').trim() ||
        'Service'
  const safeStatus = String(selectedProduct?.status || 'draft')
  const priceRaw = String(formValues.base_price ?? '').trim().replace(/,/g, '')
  const parsedPrice = parsePhpAmountInputString(priceRaw)
  const price = Number.isFinite(parsedPrice) ? parsedPrice : 0

  return {
    listing_name: safeName,
    category: safeCategory,
    funeral_category: fcSlug || null,
    description: String(formValues.description || '').trim() || null,
    duration: String(formValues.duration || '').trim() || null,
    location: area || 'N/A',
    listing_kind: String(formValues.kind || 'service').trim().toLowerCase() || 'service',
    base_price: price,
    package_options: pkg.length ? pkg : [],
    stock_status: stock,
    inclusions: String(formValues.inclusions || '').trim() || null,
    who_this_is_for: String(formValues.who_this_is_for || '').trim() || null,
    important_notes: String(formValues.important_notes || '').trim() || null,
    status: safeStatus,
    image_urls: persistedImageUrls,
  }
}

export function findFirstMissingRequiredField(formValues, editGallery = []) {
  if (!String(formValues?.listing_name || '').trim()) {
    return { id: 'listing_name', label: 'Listing name' }
  }
  if (String(formValues?.funeral_category || '').trim().toLowerCase() === 'other') {
    if (!String(formValues?.funeral_category_other || '').trim()) {
      return { id: 'funeral_category_other', label: 'Please specify your category' }
    }
  }
  if (!listingGalleryHasUserImages(editGallery)) {
    return { id: 'listing_images', label: 'Images' }
  }
  const rawPrice = String(formValues.base_price ?? '').trim().replace(/,/g, '')
  const parsedPrice = parsePhpAmountInputString(rawPrice)
  if (rawPrice === '' || !Number.isFinite(parsedPrice)) {
    return { id: 'base_price', label: 'Starting price' }
  }
  if (!String(formValues?.inclusions || '').trim()) {
    return { id: 'inclusions', label: "What's included" }
  }
  if (!String(formValues?.who_this_is_for || '').trim()) {
    return { id: 'who_this_is_for', label: 'Who this is for' }
  }
  if (!String(formValues?.important_notes || '').trim()) {
    return { id: 'important_notes', label: 'Important notes' }
  }
  return null
}

function computeFixedSectionCompletion(formValues, listingGallery) {
  const nameOk = String(formValues.listing_name || '').trim() !== ''
  const imagesOk = listingGalleryHasUserImages(listingGallery)
  const rawPrice = String(formValues.base_price ?? '').trim().replace(/,/g, '')
  const parsedPrice = parsePhpAmountInputString(rawPrice)
  const priceOk = rawPrice !== '' && Number.isFinite(parsedPrice) && parsedPrice >= 0
  const incOk = String(formValues.inclusions || '').trim() !== ''
  const whoOk = String(formValues.who_this_is_for || '').trim() !== ''
  const notesOk = String(formValues.important_notes || '').trim() !== ''
  return {
    basic: nameOk && imagesOk,
    sales: priceOk,
    others: incOk && whoOk && notesOk,
  }
}

function getActiveTipSectionId(completed, order) {
  for (const id of order) {
    if (!completed[id]) return id
  }
  return order[order.length - 1]
}

// --- ListingFormSelectControl --------------------------------------------------------------------

function ListingFormSelectControl({ label, value, options, onChange, placeholder }) {
  const isNarrow = useMediaQuery('(max-width: 640px)')
  const [sheetOpen, setSheetOpen] = useState(false)
  const [desktopOpen, setDesktopOpen] = useState(false)
  const desktopDropdownRef = useRef(null)
  const rawValue = asInputValue(value)
  const opts = Array.isArray(options) ? options : []
  const placeholderText = placeholder || 'Select'

  useEffect(() => {
    if (!sheetOpen) return
    const onKey = (e) => {
      if (e.key === 'Escape') setSheetOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [sheetOpen])

  useEffect(() => {
    if (!desktopOpen || isNarrow) return
    const handleClickOutside = (e) => {
      if (desktopDropdownRef.current && !desktopDropdownRef.current.contains(e.target)) {
        setDesktopOpen(false)
      }
    }
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [desktopOpen, isNarrow])

  useEffect(() => {
    if (!sheetOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [sheetOpen])

  if (!isNarrow) {
    const selectedLabel = opts.find((o) => o.value === rawValue)?.label || placeholderText
    return (
      <div
        className={`${styles.filterDropdownWrap} ${styles.modalDropdownWrap} ${
          desktopOpen ? styles.filterDropdownOpen : ''
        }`}
        ref={desktopDropdownRef}
      >
        <button
          type="button"
          className={styles.filterDropdownTrigger}
          onClick={() => setDesktopOpen((prev) => !prev)}
          aria-haspopup="listbox"
          aria-expanded={desktopOpen}
          aria-label={label}
        >
          <span className={styles.filterDropdownLabel}>{selectedLabel}</span>
          <span className={styles.filterDropdownChevron} aria-hidden>
            ▾
          </span>
        </button>
        {desktopOpen && (
          <div className={styles.filterDropdownPanel} role="listbox" aria-label={`${label} options`}>
            {opts.map((option) => (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={rawValue === option.value}
                className={`${styles.filterDropdownOption} ${
                  rawValue === option.value ? styles.filterDropdownOptionSelected : ''
                }`}
                onClick={() => {
                  onChange(option.value)
                  setDesktopOpen(false)
                }}
              >
                {option.label}
              </button>
            ))}
          </div>
        )}
      </div>
    )
  }

  const display = opts.find((o) => o.value === rawValue)?.label || placeholderText
  const sheet = sheetOpen ? (
    <div className={styles.listingFormSelectSheetRoot}>
      <button
        type="button"
        className={styles.listingFormSelectSheetBackdrop}
        onClick={() => setSheetOpen(false)}
        tabIndex={-1}
        aria-label="Dismiss"
      />
      <div
        className={styles.listingFormSelectSheet}
        role="dialog"
        aria-modal="true"
        aria-label={label}
      >
        <div className={styles.listingFormSelectSheetHeader}>
          <span className={styles.listingFormSelectSheetTitle}>{label}</span>
          <button
            type="button"
            className={styles.listingFormSelectSheetClose}
            onClick={() => setSheetOpen(false)}
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <div className={styles.listingFormSelectSheetList} role="listbox">
          {opts.map((opt) => (
            <button
              key={opt.value}
              type="button"
              role="option"
              aria-selected={rawValue === opt.value}
              className={`${styles.listingFormSelectSheetRow} ${
                rawValue === opt.value ? styles.listingFormSelectSheetRowActive : ''
              }`}
              onClick={() => {
                onChange(opt.value)
                setSheetOpen(false)
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  ) : null

  return (
    <>
      <button
        type="button"
        className={`${styles.listingFormSelect} ${styles.listingFormSelectTrigger}`}
        onClick={() => setSheetOpen(true)}
        aria-haspopup="listbox"
        aria-expanded={sheetOpen}
        aria-label={label}
      >
        <span className={styles.listingFormSelectTriggerLabel}>{display}</span>
        <span className={styles.listingFormSelectTriggerCaret} aria-hidden>
          ▾
        </span>
      </button>
      {typeof document !== 'undefined' && sheet ? createPortal(sheet, document.body) : null}
    </>
  )
}

export function ListingImageUploadTile({
  onClick,
  disabled = false,
  ariaLabel,
  title,
  subtitle,
}) {
  return (
    <button
      type="button"
      className={styles.productModalUploadAddTile}
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      title={title}
    >
      <span className={styles.productModalUploadAddIconWrap}>
        <TbPhoto className={styles.productModalUploadAddPhoto} size={26} aria-hidden />
      </span>
      <span className={styles.productModalUploadAddLabel}>Add</span>
      {subtitle != null && subtitle !== '' ? (
        <span className={styles.productModalUploadAddCount}>{subtitle}</span>
      ) : null}
    </button>
  )
}

export function SellerListingFormFields({
  formError,
  getFieldValue,
  setFieldValue,
  editGallery,
  onUploadClick,
  onRemoveImage,
  imageUploadSubtitle,
}) {
  const subtitle =
    imageUploadSubtitle != null && imageUploadSubtitle !== ''
      ? imageUploadSubtitle
      : `(${editGallery.length})`

  const items = normalizeStringListValue(getFieldValue('package_options'))

  const updatePackageAt = (index, value) => {
    const next = [...items]
    next[index] = value
    setFieldValue('package_options', next)
  }

  const removePackageAt = (index) => {
    setFieldValue(
      'package_options',
      items.filter((_, i) => i !== index),
    )
  }

  const addPackageRow = () => {
    setFieldValue('package_options', [...items, ''])
  }

  return (
    <div className={styles.listingFormFieldsRoot}>
      {formError ? <p className={styles.listingFormError}>{formError}</p> : null}

      <div className={styles.listingFormSectionStack}>
        <div className={styles.newListingCard}>
          <div className={styles.listingFormSection}>
            <h3 className={styles.listingFormSectionTitle}>Basic information</h3>
            <div className={styles.listingFormSectionCard}>
              <div className={styles.listingFormRow}>
                <div className={styles.listingFormLabelCol}>
                  <div className={styles.listingFormLabelText}>
                    <span className={styles.listingFormRequired}>*</span> Images
                  </div>
                  <div className={styles.listingFormSublabel}>JPG, PNG, WebP, or GIF · at least one image</div>
                </div>
                <div className={styles.listingFormControlCol}>
                  <div className={styles.productModalUploadRow}>
                    <div className={styles.productModalUploadList}>
                      {editGallery.map((entry, idx) => (
                        <div key={idx} className={styles.productModalUploadPreview}>
                          <img
                            src={entry.url}
                            alt={`${asInputValue(getFieldValue('listing_name')) || 'Listing'} ${idx + 1}`}
                          />
                          <button
                            type="button"
                            className={styles.productModalUploadRemove}
                            onClick={() => onRemoveImage(idx)}
                            aria-label="Remove image"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                    <ListingImageUploadTile
                      onClick={onUploadClick}
                      subtitle={subtitle}
                      aria-label="Upload images"
                      title="Add images"
                    />
                  </div>
                </div>
              </div>

              <div className={styles.listingFormRow}>
                <div className={styles.listingFormLabelCol}>
                  <div className={styles.listingFormLabelText}>
                    <span className={styles.listingFormRequired}>*</span> Listing name
                  </div>
                </div>
                <div className={styles.listingFormControlCol}>
                  <div className={`${styles.listingFormFieldWithCount} ${styles.listingFormFieldWithCountSingle}`}>
                    <input
                      type="text"
                      className={styles.listingFormInput}
                      value={asInputValue(getFieldValue('listing_name'))}
                      placeholder="e.g. Memorial package — standard"
                      onChange={(e) => setFieldValue('listing_name', e.target.value)}
                      maxLength={100}
                      aria-label="Listing name"
                    />
                    <span className={styles.listingFormCharCount} aria-live="polite">
                      {asInputValue(getFieldValue('listing_name')).length}/100
                    </span>
                  </div>
                </div>
              </div>

              <div className={styles.listingFormRow}>
                <div className={styles.listingFormLabelCol}>
                  <div className={styles.listingFormLabelText}>Listing type</div>
                </div>
                <div className={styles.listingFormControlCol}>
                  <ListingFormSelectControl
                    label="Listing type"
                    value={getFieldValue('kind')}
                    options={LISTING_KIND_OPTIONS}
                    onChange={(v) => setFieldValue('kind', v)}
                    placeholder="Type"
                  />
                </div>
              </div>

              <div className={styles.listingFormRow}>
                <div className={styles.listingFormLabelCol}>
                  <div className={styles.listingFormLabelText}>Description</div>
                </div>
                <div className={styles.listingFormControlCol}>
                  <div className={styles.listingFormTextareaShell}>
                    <div className={styles.listingFormTextareaToolbar}>
                      <div className={styles.listingFormTextareaToolbarLeft}>
                        <span className={styles.listingFormTextareaToolbarHint}>Up to 3,000 characters</span>
                      </div>
                      <span className={styles.listingFormTextareaToolbarCount} aria-live="polite">
                        {asInputValue(getFieldValue('description')).length}/3000
                      </span>
                    </div>
                    <textarea
                      className={styles.listingFormTextareaInShell}
                      value={asInputValue(getFieldValue('description'))}
                      placeholder="Describe what this listing offers"
                      onChange={(e) => setFieldValue('description', e.target.value)}
                      maxLength={3000}
                      aria-label="Description"
                    />
                  </div>
                </div>
              </div>

              <div className={styles.listingFormRow}>
                <div className={styles.listingFormLabelCol}>
                  <div className={styles.listingFormLabelText}>Shop category</div>
                  <div className={styles.listingFormSublabel}>
                    How your listing is grouped in the shop (routing and filters)
                  </div>
                </div>
                <div className={styles.listingFormControlCol}>
                  <ListingFormSelectControl
                    label="Shop category"
                    value={getFieldValue('funeral_category')}
                    options={SHOP_CATEGORY_OPTIONS}
                    onChange={(v) => {
                      setFieldValue('funeral_category', v)
                      if (v !== 'other') setFieldValue('funeral_category_other', '')
                    }}
                    placeholder="Select category"
                  />
                </div>
              </div>

              {String(getFieldValue('funeral_category') || '')
                .trim()
                .toLowerCase() === 'other' ? (
                <div className={styles.listingFormRow}>
                  <div className={styles.listingFormLabelCol}>
                    <div className={styles.listingFormLabelText}>
                      <span className={styles.listingFormRequired}>*</span> Please specify
                    </div>
                  </div>
                  <div className={styles.listingFormControlCol}>
                    <input
                      type="text"
                      className={styles.listingFormInput}
                      value={asInputValue(getFieldValue('funeral_category_other'))}
                      placeholder="Type your category"
                      onChange={(e) => setFieldValue('funeral_category_other', e.target.value)}
                      maxLength={200}
                      aria-label="Please specify shop category"
                      id="seller-listing-funeral-category-other"
                    />
                  </div>
                </div>
              ) : null}

              <div className={styles.listingFormRow}>
                <div className={styles.listingFormLabelCol}>
                  <div className={styles.listingFormLabelText}>Duration</div>
                </div>
                <div className={styles.listingFormControlCol}>
                  <input
                    type="text"
                    className={styles.listingFormInput}
                    value={asInputValue(getFieldValue('duration'))}
                    placeholder="e.g. 2 hours"
                    onChange={(e) => setFieldValue('duration', e.target.value)}
                    aria-label="Duration"
                  />
                </div>
              </div>

              <div className={styles.listingFormRow}>
                <div className={styles.listingFormLabelCol}>
                  <div className={styles.listingFormLabelText}>Location / Coverage</div>
                </div>
                <div className={styles.listingFormControlCol}>
                  <input
                    type="text"
                    className={styles.listingFormInput}
                    value={asInputValue(getFieldValue('location'))}
                    placeholder="Service area or city"
                    onChange={(e) => setFieldValue('location', e.target.value)}
                    aria-label="Location"
                  />
                </div>
              </div>

              <div className={styles.listingFormRow}>
                <div className={styles.listingFormLabelCol}>
                  <div className={styles.listingFormLabelText}>Package options</div>
                  <div className={styles.listingFormSublabel}>Buyer-facing labels</div>
                </div>
                <div className={styles.listingFormControlCol}>
                  <div className={styles.listingFormStringList}>
                    {items.map((val, idx) => (
                      <div key={idx} className={styles.listingFormStringListRow}>
                        <input
                          type="text"
                          className={styles.listingFormInput}
                          value={val}
                          placeholder="Option label"
                          onChange={(e) => updatePackageAt(idx, e.target.value)}
                          aria-label={`Package option ${idx + 1}`}
                        />
                        <button
                          type="button"
                          className={styles.listingFormStringListRemove}
                          onClick={() => removePackageAt(idx)}
                          aria-label={`Remove option ${idx + 1}`}
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                    <button type="button" className={styles.listingFormStringListAdd} onClick={addPackageRow}>
                      Add option
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className={styles.newListingCard}>
          <div className={styles.listingFormSection}>
            <h3 className={styles.listingFormSectionTitle}>Sales information</h3>
            <div className={styles.listingFormSectionCard}>
              <div className={styles.listingFormRow}>
                <div className={styles.listingFormLabelCol}>
                  <div className={styles.listingFormLabelText}>
                    <span className={styles.listingFormRequired}>*</span> Starting price (PHP)
                  </div>
                </div>
                <div className={styles.listingFormControlCol}>
                  <input
                    type="text"
                    inputMode="decimal"
                    autoComplete="off"
                    className={styles.listingFormInput}
                    value={asInputValue(getFieldValue('base_price'))}
                    placeholder="0"
                    onChange={(e) => setFieldValue('base_price', e.target.value)}
                    aria-label="Starting price"
                  />
                </div>
              </div>

              <div className={styles.listingFormRow}>
                <div className={styles.listingFormLabelCol}>
                  <div className={styles.listingFormLabelText}>Availability</div>
                </div>
                <div className={styles.listingFormControlCol}>
                  <ListingFormSelectControl
                    label="Availability"
                    value={getFieldValue('stock_status')}
                    options={STOCK_STATUS_OPTIONS.map((s) => ({ value: s, label: s }))}
                    onChange={(v) => setFieldValue('stock_status', v)}
                    placeholder="Availability"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className={styles.newListingCard}>
          <div className={styles.listingFormSection}>
            <h3 className={styles.listingFormSectionTitle}>Others</h3>
            <div className={styles.listingFormSectionCard}>
              <div className={styles.listingFormRow}>
                <div className={styles.listingFormLabelCol}>
                  <div className={styles.listingFormLabelText}>
                    <span className={styles.listingFormRequired}>*</span> What&apos;s included
                  </div>
                </div>
                <div className={styles.listingFormControlCol}>
                  <div className={styles.listingFormTextareaShell}>
                    <div className={styles.listingFormTextareaToolbar}>
                      <div className={styles.listingFormTextareaToolbarLeft}>
                        <span className={styles.listingFormTextareaToolbarHint}>Up to 3,000 characters</span>
                      </div>
                      <span className={styles.listingFormTextareaToolbarCount} aria-live="polite">
                        {asInputValue(getFieldValue('inclusions')).length}/3000
                      </span>
                    </div>
                    <textarea
                      className={styles.listingFormTextareaInShell}
                      value={asInputValue(getFieldValue('inclusions'))}
                      placeholder="One item per line"
                      onChange={(e) => setFieldValue('inclusions', e.target.value)}
                      maxLength={3000}
                      rows={4}
                      aria-label="What is included"
                    />
                  </div>
                </div>
              </div>

              <div className={styles.listingFormRow}>
                <div className={styles.listingFormLabelCol}>
                  <div className={styles.listingFormLabelText}>
                    <span className={styles.listingFormRequired}>*</span> Who this is for
                  </div>
                </div>
                <div className={styles.listingFormControlCol}>
                  <div className={styles.listingFormTextareaShell}>
                    <div className={styles.listingFormTextareaToolbar}>
                      <div className={styles.listingFormTextareaToolbarLeft}>
                        <span className={styles.listingFormTextareaToolbarHint}>Up to 3,000 characters</span>
                      </div>
                      <span className={styles.listingFormTextareaToolbarCount} aria-live="polite">
                        {asInputValue(getFieldValue('who_this_is_for')).length}/3000
                      </span>
                    </div>
                    <textarea
                      className={styles.listingFormTextareaInShell}
                      value={asInputValue(getFieldValue('who_this_is_for'))}
                      placeholder="Describe your audience"
                      onChange={(e) => setFieldValue('who_this_is_for', e.target.value)}
                      maxLength={3000}
                      rows={3}
                      aria-label="Who this is for"
                    />
                  </div>
                </div>
              </div>

              <div className={styles.listingFormRow}>
                <div className={styles.listingFormLabelCol}>
                  <div className={styles.listingFormLabelText}>
                    <span className={styles.listingFormRequired}>*</span> Important notes
                  </div>
                </div>
                <div className={styles.listingFormControlCol}>
                  <div className={styles.listingFormTextareaShell}>
                    <div className={styles.listingFormTextareaToolbar}>
                      <div className={styles.listingFormTextareaToolbarLeft}>
                        <span className={styles.listingFormTextareaToolbarHint}>Up to 3,000 characters</span>
                      </div>
                      <span className={styles.listingFormTextareaToolbarCount} aria-live="polite">
                        {asInputValue(getFieldValue('important_notes')).length}/3000
                      </span>
                    </div>
                    <textarea
                      className={styles.listingFormTextareaInShell}
                      value={asInputValue(getFieldValue('important_notes'))}
                      placeholder="Policies, disclaimers, or limitations"
                      onChange={(e) => setFieldValue('important_notes', e.target.value)}
                      maxLength={3000}
                      rows={3}
                      aria-label="Important notes"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export function SellerListingFileInput({ fileInputRef, onFilesSelected, accept = 'image/*' }) {
  return (
    <input
      ref={fileInputRef}
      type="file"
      accept={accept}
      multiple
      style={{ display: 'none' }}
      onChange={onFilesSelected}
    />
  )
}

// --- New listing page ---------------------------------------------------------------------------------

const ALLOWED_IMAGE_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])

const LISTING_IMAGE_ACCEPT = 'image/jpeg,image/png,image/webp,image/gif'

const STATIC_SECTIONS = [
  { id: 'basic', label: 'Basic information' },
  { id: 'sales', label: 'Sales information' },
  { id: 'others', label: 'Others' },
]

const FALLBACK_SECTION_TIPS = {
  basic: {
    title: 'Listing basics',
    body: 'Use clear photos and a descriptive name so buyers know what they get. Add package options for tiers or add-ons; category, duration, and coverage help them compare and find you in search.',
  },
  sales: {
    title: 'Pricing & options',
    body: 'Set a starting price buyers can trust. Stock drives availability on the shop.',
  },
  others: {
    title: 'Inclusions & policies',
    body: 'Spell out what is included, who the service is for, and any important notes or disclaimers. Clear expectations reduce questions later.',
  },
}

function revokeLocalPreviewUrls(entries) {
  ;(Array.isArray(entries) ? entries : []).forEach((entry) => {
    if (entry?.url?.startsWith('blob:')) {
      URL.revokeObjectURL(entry.url)
    }
  })
}

function NewListingProgressPanel({ sections, completed, activeId, tipTitle, tipBody }) {
  return (
    <aside className={styles.newListingAside} aria-label="Listing progress">
      <div className={styles.newListingStepper} role="group" aria-label="Section completion">
        <ol className={styles.newListingStepperList}>
          {sections.map((s) => {
            const isDone = completed[s.id]
            const isActive = !isDone && s.id === activeId
            return (
              <li
                key={s.id}
                className={`${styles.newListingStepItem} ${
                  isDone
                    ? styles.newListingStepItemDone
                    : isActive
                      ? styles.newListingStepItemActive
                      : styles.newListingStepItemTodo
                }`}
              >
                <div className={styles.newListingStepTrack}>
                  <div className={styles.newListingStepDotAlign}>
                    <span
                      className={
                        isDone
                          ? styles.newListingStepIconDone
                          : isActive
                            ? styles.newListingStepIconActive
                            : styles.newListingStepIconTodo
                      }
                      aria-hidden
                    >
                      {isDone ? (
                        <Check
                          aria-hidden
                          className={styles.newListingStepCheck}
                          size={11}
                          strokeWidth={2.25}
                        />
                      ) : null}
                    </span>
                  </div>
                  <span
                    className={`${styles.newListingStepLine} ${
                      isDone ? styles.newListingStepLineDone : ''
                    }`}
                    aria-hidden
                  />
                </div>
                <span
                  className={`${styles.newListingStepLabel} ${isActive ? styles.newListingStepLabelActive : ''}`}
                  aria-label={`${s.label}: ${isDone ? 'complete' : 'incomplete'}`}
                >
                  {s.label}
                </span>
              </li>
            )
          })}
        </ol>
      </div>

      <div className={styles.newListingTipCard}>
        <div className={styles.newListingTipCardHeader}>
          <span className={styles.newListingTipCardTitle}>{tipTitle}</span>
          <TbBulb size={18} className={styles.newListingTipCardIcon} aria-hidden />
        </div>
        <p className={styles.newListingTipCardBody}>{tipBody}</p>
      </div>
    </aside>
  )
}

export default function NewListingClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const fileInputRef = useRef(null)

  const [formValues, setFormValues] = useState(() => getEmptyListingFormValues())
  const [editGallery, setEditGallery] = useState([])
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)
  const [submitBusy, setSubmitBusy] = useState(false)
  const [loadingSeller, setLoadingSeller] = useState(true)
  const [sellerAccountStatus, setSellerAccountStatus] = useState(null)
  const [imageUploadNote, setImageUploadNote] = useState(null)
  const [toastMessage, setToastMessage] = useState('')
  const [toastType, setToastType] = useState('error')

  const sectionOrder = useMemo(() => STATIC_SECTIONS.map((s) => s.id), [])

  const sectionCompletion = useMemo(
    () => computeFixedSectionCompletion(formValues, editGallery),
    [formValues, editGallery],
  )

  const activeTipSectionId = useMemo(
    () => getActiveTipSectionId(sectionCompletion, sectionOrder),
    [sectionCompletion, sectionOrder],
  )

  const sidebarTip = useMemo(() => {
    const fb = FALLBACK_SECTION_TIPS[activeTipSectionId] || FALLBACK_SECTION_TIPS.basic
    return { title: fb.title, body: fb.body }
  }, [activeTipSectionId])

  useEffect(() => {
    if (!toastMessage) return
    const timer = window.setTimeout(() => setToastMessage(''), 3000)
    return () => window.clearTimeout(timer)
  }, [toastMessage])

  useEffect(() => {
    const k = searchParams.get('kind')
    if (k === 'service' || k === 'package') {
      setFormValues((prev) => ({ ...prev, kind: k }))
    }
  }, [searchParams])

  useEffect(() => {
    let mounted = true
    ;(async () => {
      setLoadingSeller(true)
      const { data: authRes } = await supabase.auth.getUser()
      const uid = authRes?.user?.id
      if (uid) {
        const sellerRow = await getSellerByUserId(uid)
        if (mounted) setSellerAccountStatus(sellerRow?.status ?? null)
      } else if (mounted) {
        setSellerAccountStatus(null)
      }
      if (mounted) setLoadingSeller(false)
    })()
    return () => {
      mounted = false
    }
  }, [])

  useEffect(
    () => () => {
      revokeLocalPreviewUrls(editGallery)
    },
    [editGallery],
  )

  const getFieldValue = useCallback((fieldId) => formValues?.[fieldId], [formValues])

  const setFieldValue = useCallback((fieldId, value) => {
    setFormValues((prev) => ({ ...prev, [fieldId]: value }))
    setFormError('')
  }, [])

  const atImageLimit = editGallery.length >= MAX_LISTING_IMAGES

  const handleUploadClick = () => {
    if (atImageLimit) {
      setImageUploadNote(`Maximum ${MAX_LISTING_IMAGES} images. Remove one to add more.`)
      return
    }
    setImageUploadNote(null)
    fileInputRef.current?.click()
  }

  const handleFilesSelected = (event) => {
    const files = Array.from(event.target.files || [])
    event.target.value = ''
    if (!files.length) return

    setFormError('')

    setEditGallery((prev) => {
      const room = Math.max(0, MAX_LISTING_IMAGES - prev.length)
      const validFiles = files.filter((f) => ALLOWED_IMAGE_MIME.has(f.type))
      const invalidCount = files.length - validFiles.length
      const toAdd = validFiles.slice(0, room)
      const droppedForLimit = validFiles.length - toAdd.length

      let note = null
      if (room <= 0) {
        note = `Maximum ${MAX_LISTING_IMAGES} images. Remove one to add more.`
      } else if (toAdd.length === 0) {
        if (invalidCount > 0) {
          note = 'No images added — only JPEG, PNG, WebP, or GIF are allowed.'
        }
      } else {
        const parts = []
        if (invalidCount > 0) {
          parts.push(
            invalidCount === 1
              ? '1 file was skipped — only JPEG, PNG, WebP, or GIF are allowed.'
              : `${invalidCount} files were skipped — only JPEG, PNG, WebP, or GIF are allowed.`,
          )
        }
        if (droppedForLimit > 0) {
          parts.push(
            `Only ${toAdd.length} more image${toAdd.length !== 1 ? 's' : ''} fit (${MAX_LISTING_IMAGES} maximum per listing).`,
          )
        }
        note = parts.length ? parts.join(' ') : null
      }

      queueMicrotask(() => setImageUploadNote(note))

      if (room <= 0 || !toAdd.length) return prev
      return [...prev, ...toAdd.map((file) => ({ url: URL.createObjectURL(file), file }))]
    })
  }

  const handleRemoveImage = (index) => {
    setImageUploadNote(null)
    setEditGallery((prev) => {
      const target = prev[index]
      if (target?.url?.startsWith('blob:')) {
        URL.revokeObjectURL(target.url)
      }
      return prev.filter((_, i) => i !== index)
    })
  }

  const validateBeforeSave = () => {
    const missing = findFirstMissingRequiredField(formValues, editGallery)
    if (missing) {
      const msg = `${missing.label} is required. Please complete the info.`
      setFormError(msg)
      setToastType('error')
      setToastMessage(msg)
      return { ok: false }
    }

    const rawPrice = String(formValues.base_price ?? '').trim().replace(/,/g, '')
    const parsedPrice = parsePhpAmountInputString(rawPrice)
    if (rawPrice !== '' && Number.isFinite(parsedPrice) && parsedPrice < 0) {
      const msg = 'Starting price cannot be negative.'
      setFormError(msg)
      setToastType('error')
      setToastMessage(msg)
      return { ok: false }
    }

    return { ok: true }
  }

  const saveListing = async ({ intent }) => {
    setFormError('')
    setToastMessage('')
    setToastType('error')

    if (intent === 'submit') {
      const { ok } = validateBeforeSave()
      if (!ok) return
    }

    const busySetter = intent === 'submit' ? setSubmitBusy : setSaving
    busySetter(true)
    const { error: uploadErr, persistedImageUrls } = await resolvePersistedImageUrls(editGallery, [])
    if (uploadErr) {
      setFormError(uploadErr)
      setToastType('error')
      setToastMessage(uploadErr)
      busySetter(false)
      return
    }

    const payload = buildSellerListingPayload({
      formValues,
      selectedProduct: null,
      persistedImageUrls,
    })

    payload.status = intent === 'submit' ? 'active' : 'draft'

    const { data, error } = await createSellerListing(payload)
    busySetter(false)

    if (error || !data) {
      const msg = error || 'Failed to save listing.'
      setFormError(msg)
      setToastType('error')
      setToastMessage(msg)
      return
    }

    if (intent === 'submit') {
      const { data: submitted, error: submitErr } = await submitListingForReview(data.id)
      if (submitErr || !submitted) {
        const msg = submitErr || 'Failed to submit listing for review.'
        setFormError(msg)
        setToastType('error')
        setToastMessage(msg)
        return
      }
    }

    setToastType('success')
    setToastMessage(
      intent === 'submit' ? 'Listing submitted for review.' : 'Draft saved successfully.',
    )
    await new Promise((resolve) => window.setTimeout(resolve, 950))
    router.push('/seller/products')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    await saveListing({ intent: 'draft' })
  }

  const loading = loadingSeller

  return (
    <div className={styles.newListingPage}>
      {toastMessage ? (
        <div
          className={`${styles.newListingToast} ${
            toastType === 'success' ? styles.newListingToastSuccess : ''
          }`}
          role={toastType === 'success' ? 'status' : 'alert'}
          aria-live={toastType === 'success' ? 'polite' : 'assertive'}
        >
          {toastMessage}
        </div>
      ) : null}
      {sellerAccountStatus && sellerAccountStatus !== 'active' ? (
        <div className={styles.shopVisibilityBanner} role="status" aria-live="polite">
          {sellerAccountStatus === 'pending' ? (
            <>
              <strong>Shop visibility:</strong> your seller account is still{' '}
              <strong>pending approval</strong>. Listings will not appear on the public shop until an
              administrator sets your account to Active.
            </>
          ) : (
            <>
              <strong>Shop visibility:</strong> your seller account is{' '}
              <strong>{sellerAccountStatus}</strong>. Listings are hidden from the public shop until your
              account is Active.
            </>
          )}
        </div>
      ) : null}

      {loading ? (
        <NewListingLoadingState />
      ) : (
        <div className={styles.newListingLayout}>
          <NewListingProgressPanel
            sections={STATIC_SECTIONS}
            completed={sectionCompletion}
            activeId={activeTipSectionId}
            tipTitle={sidebarTip.title}
            tipBody={sidebarTip.body}
          />
          <div className={styles.newListingFormColumn}>
            <form className={styles.newListingForm} onSubmit={handleSubmit} noValidate>
              <SellerListingFormFields
                formError={formError}
                getFieldValue={getFieldValue}
                setFieldValue={setFieldValue}
                editGallery={editGallery}
                onUploadClick={handleUploadClick}
                onRemoveImage={handleRemoveImage}
                imageUploadSubtitle={`(${editGallery.length}/${MAX_LISTING_IMAGES})`}
              />
              {imageUploadNote ? (
                <p className={styles.listingFormUploadNote} role="status">
                  {imageUploadNote}
                </p>
              ) : null}
              <SellerListingFileInput
                fileInputRef={fileInputRef}
                onFilesSelected={handleFilesSelected}
                accept={LISTING_IMAGE_ACCEPT}
              />

              <div className={styles.newListingFooter}>
                <Link
                  href="/seller/products"
                  className={`${styles.productModalSecondary} ${styles.newListingFooterLink} ${styles.newListingFooterCancel}`}
                >
                  Cancel
                </Link>
                <button
                  type="button"
                  className={`${styles.productModalSecondary} ${styles.newListingFooterDraft}`}
                  onClick={() => saveListing({ intent: 'draft' })}
                  disabled={saving || submitBusy}
                >
                  {saving ? 'Saving…' : 'Save as Draft'}
                </button>
                <button
                  type="button"
                  className={`${styles.productModalPrimary} ${styles.newListingFooterSubmit}`}
                  onClick={() => saveListing({ intent: 'submit' })}
                  disabled={saving || submitBusy}
                >
                  {submitBusy ? 'Submitting…' : 'Submit for review'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
