'use client'

import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Check } from 'lucide-react'
import { TbBulb, TbPhoto } from 'react-icons/tb'
import { createSellerListing, uploadListingImages } from '@/lib/seller-listings/client'
import { getSellerByUserId } from '@/lib/sellers/client'
import { supabase } from '@/lib/supabase/client'
import { fetchSellerTemplate } from '@/lib/seller-template/client'
import {
  getActiveTipSectionId,
  getDefaultSectionConfig,
  getOrderedSectionIds,
  mergeSectionConfig,
  normalizeSectionId,
  sortTemplateFieldsForDisplay,
} from '@/lib/seller-template/sections'
import styles from './products.module.css'
import NewListingLoadingState from '@/components/ui/Load/NewListingLoadingState'
import { useMediaQuery } from '@/hooks'

/** Max images per listing (toolbar + upload strip). */
export const MAX_LISTING_IMAGES = 10

// --- Shared listing helpers (payload, validation, images) -----------------------------------------

/** Default ids merged when missing from DB so sellers always get a complete form. */
export const BUILTIN_LISTING_TEMPLATE_IDS = ['listing_images', 'listing_name', 'description']

export function isBuiltinListingTemplateId(id) {
  return BUILTIN_LISTING_TEMPLATE_IDS.includes(String(id || ''))
}

/** Defaults when template JSON omits these rows (admin can override labels, sections, max length, etc.). */
export function getCoreListingFieldDefs() {
  return [
    {
      id: 'listing_name',
      label: 'Listing name',
      type: 'text',
      required: true,
      placeholder: 'e.g. Memorial package — standard',
      sublabel: '',
      maxLength: 100,
    },
    {
      id: 'description',
      label: 'Description',
      type: 'textarea',
      required: false,
      placeholder: 'Describe what this listing offers',
      sublabel: 'Shown on the shop listing',
      maxLength: 3000,
    },
  ]
}

export function getDefaultListingImagesFieldDef(firstSectionId) {
  return {
    id: 'listing_images',
    type: 'images',
    label: 'Images',
    sublabel: 'Optional · JPG, PNG, multiple files',
    placeholder: '',
    required: false,
    section: firstSectionId,
    order: -3,
    options: [],
  }
}

/**
 * Merge saved template fields with built-in rows so listing name, description, and images stay configurable
 * in admin but still exist when the template is empty or legacy.
 */
export function ensureBuiltInSellerTemplateFields(fields, orderedSectionIds) {
  const first = orderedSectionIds?.length ? orderedSectionIds[0] : 'basic'
  const list = Array.isArray(fields) ? [...fields] : []
  const byId = new Map(list.map((f) => [String(f?.id), f]))

  if (!byId.has('listing_images')) {
    list.push(getDefaultListingImagesFieldDef(first))
  }

  const nameDescDefaults = getCoreListingFieldDefs()
  nameDescDefaults.forEach((def, i) => {
    if (!byId.has(def.id)) {
      list.push({
        ...def,
        section: first,
        order: def.id === 'listing_name' ? 0 : 1,
        options: [],
      })
    }
  })

  return list
}

export function getCoreListingDefaults() {
  return { listing_name: '', description: '' }
}

/** Multi-line package options: template type `string_list`, or legacy `package_options` as textarea. */
export function isStringListField(field) {
  if (!field) return false
  const t = String(field.type || '')
  if (t === 'string_list') return true
  if (field.id === 'package_options' && t === 'textarea') return true
  return false
}

export function normalizeStringListValue(raw) {
  if (raw == null) return []
  if (Array.isArray(raw)) return raw.map((x) => String(x ?? ''))
  if (typeof raw === 'string') {
    return raw.split(/\n/).map((s) => s)
  }
  return []
}

function stringListHasContent(value) {
  return normalizeStringListValue(value).some((s) => String(s).trim() !== '')
}

export const FALLBACK_IMAGE =
  'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 640 420%22%3E%3Crect width=%22640%22 height=%22420%22 fill=%22%23d1d5db%22/%3E%3Cpath d=%22M230 160h180a22 22 0 0 1 22 22v56a22 22 0 0 1-22 22H230a22 22 0 0 1-22-22v-56a22 22 0 0 1 22-22Zm18 28a16 16 0 1 0 0.1 0Zm-8 56 38-34 35 30 44-40 55 44H240Z%22 fill=%22%239ca3af%22/%3E%3C/svg%3E'

/** True when the gallery has at least one real image (local preview or remote URL), not the gray placeholder. */
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

/**
 * Step completion for sidebar: each section is complete when all required fields in that section have values.
 * Required `images` fields are checked against `listingGallery` (not `formValues`).
 */
export function computeTemplateSectionCompletion(
  formValues,
  templateFields,
  orderedSectionIds,
  listingGallery = [],
) {
  if (!Array.isArray(orderedSectionIds) || !orderedSectionIds.length) return {}
  const sorted = sortTemplateFieldsForDisplay(templateFields, orderedSectionIds)
  const completed = {}
  for (const secId of orderedSectionIds) {
    const fieldsInSec = sorted.filter(
      (f) => normalizeSectionId(f.section, orderedSectionIds) === secId,
    )
    const done = fieldsInSec.every((f) => {
      if (f.type === 'images') {
        if (!f.required) return true
        return listingGalleryHasUserImages(listingGallery)
      }
      if (!f.required) return true
      const v = formValues[f.id]
      if (isStringListField(f)) return stringListHasContent(v)
      return String(v ?? '').trim() !== ''
    })
    completed[secId] = done
  }
  return completed
}

export const STATUS_FIELD_DEFAULT = {
  id: 'status',
  label: 'Status',
  type: 'select',
  required: false,
  placeholder: 'Select status',
  options: ['draft', 'active', 'inactive', 'archived'],
  order: 999,
  section: 'others',
  sublabel: '',
}

export function asInputValue(value) {
  if (value == null) return ''
  if (typeof value === 'number') return String(value)
  return String(value)
}

export function getTemplateDefaults(fields) {
  return (fields || []).reduce((acc, field) => {
    if (field.type === 'images') return acc
    if (isStringListField(field)) {
      acc[field.id] = []
      return acc
    }
    if (field.type === 'select') {
      const first = Array.isArray(field.options) ? field.options[0] : ''
      acc[field.id] = first || ''
    } else {
      acc[field.id] = ''
    }
    return acc
  }, {})
}

export function ensureStatusField(fields) {
  const list = Array.isArray(fields) ? [...fields] : []
  const hasStatus = list.some((field) => field?.id === 'status')
  if (hasStatus) return list
  return [...list, { ...STATUS_FIELD_DEFAULT, order: list.length }]
}

export function dynamicValuesToFormState(dynamicValues, templateFields) {
  const dv = dynamicValues && typeof dynamicValues === 'object' ? { ...dynamicValues } : {}
  if (Array.isArray(dv.inclusions)) {
    dv.inclusions = dv.inclusions.join('\n')
  }
  const merged = {
    ...getCoreListingDefaults(),
    ...getTemplateDefaults(templateFields),
    ...dv,
  }
  ;(templateFields || []).forEach((field) => {
    if (!isStringListField(field)) return
    merged[field.id] = normalizeStringListValue(merged[field.id])
  })
  return merged
}

function coerceStringListDynamicValues(dynamicValues, templateFields) {
  const dv = dynamicValues
  for (const field of templateFields || []) {
    if (!isStringListField(field)) continue
    const id = field.id
    const raw = dv[id]
    if (Array.isArray(raw)) {
      dv[id] = raw.map((s) => String(s).trim()).filter(Boolean)
    } else if (typeof raw === 'string') {
      dv[id] = raw
        .split(/\n/)
        .map((s) => s.trim())
        .filter(Boolean)
    } else {
      dv[id] = []
    }
  }
}

export function buildSellerListingPayload({ template, formValues, selectedProduct, persistedImageUrls }) {
  const dynamicValues = { ...formValues }
  coerceStringListDynamicValues(dynamicValues, template?.fields || [])

  const incRaw = dynamicValues.inclusions
  if (typeof incRaw === 'string') {
    dynamicValues.inclusions = incRaw
      .split(/\n/)
      .map((s) => s.trim())
      .filter(Boolean)
  }

  const pkgOptRaw = dynamicValues.package_options
  if (!Array.isArray(pkgOptRaw)) {
    dynamicValues.package_options =
      typeof pkgOptRaw === 'string'
        ? pkgOptRaw
            .split(/\n/)
            .map((s) => s.trim())
            .filter(Boolean)
        : []
  }

  delete dynamicValues.featured
  delete dynamicValues.popular

  const safeName =
    String(dynamicValues.listing_name || selectedProduct?.name || '').trim() || 'Untitled listing'
  const safeCategory =
    String(dynamicValues.category || selectedProduct?.category || '').trim() || 'Service'
  const area = String(
    dynamicValues.coverage ?? dynamicValues.location ?? selectedProduct?.city ?? '',
  ).trim()
  const safeLocation = area || 'N/A'
  const safeStatus = String(dynamicValues.status || selectedProduct?.status || 'draft')
  const safePrice = Number(dynamicValues.base_price ?? selectedProduct?.startingPrice ?? 0) || 0

  return {
    template_id: template?.id || null,
    listing_name: safeName,
    category: safeCategory,
    base_price: safePrice,
    location: safeLocation,
    status: safeStatus,
    dynamic_values: dynamicValues,
    image_urls: persistedImageUrls,
  }
}

export function findFirstMissingRequiredField(
  templateFields,
  getFieldValue,
  orderedSectionIds,
  listingGallery = [],
) {
  const order =
    Array.isArray(orderedSectionIds) && orderedSectionIds.length
      ? orderedSectionIds
      : getOrderedSectionIds(mergeSectionConfig(null))
  const sorted = sortTemplateFieldsForDisplay(
    Array.isArray(templateFields) ? templateFields : [],
    order,
  )
  return sorted.find((field) => {
    if (field.type === 'images') {
      if (!field.required) return false
      return !listingGalleryHasUserImages(listingGallery)
    }
    if (!field.required) return false
    if (isStringListField(field)) {
      return !stringListHasContent(getFieldValue(field.id))
    }
    return String(getFieldValue(field.id) ?? '').trim() === ''
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

// --- ListingImageUploadTile ----------------------------------------------------------------------

/** Dashed “Add” tile — used by new listing + edit modal. */
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

/**
 * Native <select> popups are drawn by the OS and often render wider than the field on mobile.
 * On narrow viewports, use a bottom sheet so options stay full-width and aligned with the form.
 */
function ListingFormSelectControl({ field, getFieldValue, setFieldValue }) {
  const isNarrow = useMediaQuery('(max-width: 640px)')
  const [sheetOpen, setSheetOpen] = useState(false)
  const [desktopOpen, setDesktopOpen] = useState(false)
  const desktopDropdownRef = useRef(null)
  const rawValue = asInputValue(getFieldValue(field.id))
  const placeholderText = field.placeholder || `Select ${String(field.label || '').toLowerCase()}`
  const opts = Array.isArray(field.options) ? field.options : []

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
    const selectedLabel = opts.find((option) => option === rawValue) || placeholderText
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
          aria-label={field.label}
        >
          <span className={styles.filterDropdownLabel}>{selectedLabel}</span>
          <span className={styles.filterDropdownChevron} aria-hidden>
            ▾
          </span>
        </button>
        {desktopOpen && (
          <div className={styles.filterDropdownPanel} role="listbox" aria-label={`${field.label} options`}>
            {opts.map((option) => (
              <button
                key={option}
                type="button"
                role="option"
                aria-selected={rawValue === option}
                className={`${styles.filterDropdownOption} ${
                  rawValue === option ? styles.filterDropdownOptionSelected : ''
                }`}
                onClick={() => {
                  setFieldValue(field.id, option)
                  setDesktopOpen(false)
                }}
              >
                {option}
              </button>
            ))}
          </div>
        )}
      </div>
    )
  }

  const display = rawValue || placeholderText
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
        aria-label={field.label}
      >
        <div className={styles.listingFormSelectSheetHeader}>
          <span className={styles.listingFormSelectSheetTitle}>{field.label}</span>
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
              key={opt}
              type="button"
              role="option"
              aria-selected={rawValue === opt}
              className={`${styles.listingFormSelectSheetRow} ${
                rawValue === opt ? styles.listingFormSelectSheetRowActive : ''
              }`}
              onClick={() => {
                setFieldValue(field.id, opt)
                setSheetOpen(false)
              }}
            >
              {opt}
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
        aria-label={field.label}
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

// --- SellerListingFormFields + file input --------------------------------------------------------

export function SellerListingFormFields({
  templateFields,
  sectionConfig,
  formError,
  getFieldValue,
  setFieldValue,
  editGallery,
  onUploadClick,
  onRemoveImage,
  /** e.g. "(3)" or "(3/10)" for new listing max images */
  imageUploadSubtitle,
}) {
  const sections = sectionConfig?.length ? sectionConfig : mergeSectionConfig(null)
  const orderedSectionIds = getOrderedSectionIds(sections)
  const firstSectionId = sections[0]?.id
  const labelById = Object.fromEntries(sections.map((s) => [s.id, s.label]))
  const mergedFields = useMemo(
    () => ensureBuiltInSellerTemplateFields(templateFields, orderedSectionIds),
    [templateFields, orderedSectionIds],
  )
  const sorted = sortTemplateFieldsForDisplay(mergedFields, orderedSectionIds)
  const subtitle =
    imageUploadSubtitle != null && imageUploadSubtitle !== ''
      ? imageUploadSubtitle
      : `(${editGallery.length})`

  const renderImagesRow = (field) => {
    const labelText = String(field.label || 'Images').trim() || 'Images'
    const sub = String(field.sublabel || '').trim()
    return (
      <div key={field.id} className={styles.listingFormRow}>
        <div className={styles.listingFormLabelCol}>
          <div className={styles.listingFormLabelText}>
            {field.required ? <span className={styles.listingFormRequired}>*</span> : null}
            {labelText}
          </div>
          {sub ? <div className={styles.listingFormSublabel}>{sub}</div> : null}
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
    )
  }

  const renderStringListRow = (field) => {
    const sublabelText = String(field.sublabel || '').trim()
    const ph = String(field.placeholder || '').trim()
    const items = normalizeStringListValue(getFieldValue(field.id))

    const updateAt = (index, value) => {
      const next = [...items]
      next[index] = value
      setFieldValue(field.id, next)
    }

    const removeAt = (index) => {
      setFieldValue(
        field.id,
        items.filter((_, i) => i !== index),
      )
    }

    const addRow = () => {
      setFieldValue(field.id, [...items, ''])
    }

    return (
      <div key={field.id} className={styles.listingFormRow}>
        <div className={styles.listingFormLabelCol}>
          <div className={styles.listingFormLabelText}>
            {field.required ? <span className={styles.listingFormRequired}>*</span> : null}
            {field.label}
          </div>
          {sublabelText ? <div className={styles.listingFormSublabel}>{sublabelText}</div> : null}
        </div>
        <div className={styles.listingFormControlCol}>
          <div className={styles.listingFormStringList}>
            {items.map((val, idx) => (
              <div key={idx} className={styles.listingFormStringListRow}>
                <input
                  type="text"
                  className={styles.listingFormInput}
                  value={val}
                  placeholder={ph || 'Option label'}
                  onChange={(e) => updateAt(idx, e.target.value)}
                  aria-label={`${field.label} option ${idx + 1}`}
                />
                <button
                  type="button"
                  className={styles.listingFormStringListRemove}
                  onClick={() => removeAt(idx)}
                  aria-label={`Remove option ${idx + 1}`}
                >
                  Remove
                </button>
              </div>
            ))}
            <button
              type="button"
              className={styles.listingFormStringListAdd}
              onClick={addRow}
            >
              Add option
            </button>
          </div>
        </div>
      </div>
    )
  }

  const renderFieldRow = (field) => {
    const sublabelText = String(field.sublabel || '').trim()
    const controlPlaceholder = String(field.placeholder || '').trim()
    const maxLen =
      field.maxLength != null &&
      Number.isFinite(Number(field.maxLength)) &&
      Number(field.maxLength) > 0
        ? Math.min(Math.floor(Number(field.maxLength)), 100000)
        : undefined
    const rawValue = asInputValue(getFieldValue(field.id))
    const charCount = rawValue.length
    const shellTextareaPlaceholder =
      field.id === 'description'
        ? controlPlaceholder || 'Please enter a product description'
        : controlPlaceholder

    return (
      <div key={field.id} className={styles.listingFormRow}>
        <div className={styles.listingFormLabelCol}>
          <div className={styles.listingFormLabelText}>
            {field.required ? <span className={styles.listingFormRequired}>*</span> : null}
            {field.label}
          </div>
          {sublabelText ? <div className={styles.listingFormSublabel}>{sublabelText}</div> : null}
        </div>
        <div className={styles.listingFormControlCol}>
          {field.type === 'textarea' && maxLen ? (
            <div className={styles.listingFormTextareaShell}>
              <div className={styles.listingFormTextareaToolbar}>
                <div className={styles.listingFormTextareaToolbarLeft}>
                  <span className={styles.listingFormTextareaToolbarHint}>
                    Up to {maxLen.toLocaleString()} characters
                  </span>
                </div>
                <span className={styles.listingFormTextareaToolbarCount} aria-live="polite">
                  {charCount}/{maxLen}
                </span>
              </div>
              <textarea
                className={styles.listingFormTextareaInShell}
                value={rawValue}
                placeholder={shellTextareaPlaceholder}
                onChange={(e) => setFieldValue(field.id, e.target.value)}
                aria-label={field.label}
                maxLength={maxLen}
              />
            </div>
          ) : field.type === 'textarea' ? (
            <textarea
              className={styles.listingFormTextarea}
              value={rawValue}
              placeholder={controlPlaceholder}
              onChange={(e) => setFieldValue(field.id, e.target.value)}
              aria-label={field.label}
              maxLength={maxLen}
            />
          ) : field.type === 'select' ? (
            <ListingFormSelectControl
              field={field}
              getFieldValue={getFieldValue}
              setFieldValue={setFieldValue}
            />
          ) : maxLen ? (
            <div
              className={`${styles.listingFormFieldWithCount} ${styles.listingFormFieldWithCountSingle}`}
            >
              <input
                type={field.type || 'text'}
                className={styles.listingFormInput}
                value={rawValue}
                placeholder={controlPlaceholder}
                onChange={(e) => setFieldValue(field.id, e.target.value)}
                aria-label={field.label}
                maxLength={maxLen}
              />
              <span className={styles.listingFormCharCount} aria-hidden>
                {charCount}/{maxLen}
              </span>
            </div>
          ) : (
            <input
              type={field.type || 'text'}
              className={styles.listingFormInput}
              value={rawValue}
              placeholder={controlPlaceholder}
              onChange={(e) => setFieldValue(field.id, e.target.value)}
              aria-label={field.label}
              maxLength={maxLen}
            />
          )}
        </div>
      </div>
    )
  }

  return (
    <div className={styles.listingFormFieldsRoot}>
      {formError ? <p className={styles.listingFormError}>{formError}</p> : null}
      {templateFields.filter(
        (f) => !['listing_name', 'description', 'listing_images', 'status'].includes(String(f?.id)),
      ).length === 0 ? (
        <p className={styles.listingFormEmpty}>
          No extra fields yet — add more in Admin → Seller template. Name, description, and images
          can be edited there too.
        </p>
      ) : null}
      <div className={styles.listingFormSectionStack}>
        {sections.map((sec) => {
          const secId = sec.id
          const inSection = sorted.filter(
            (f) => normalizeSectionId(f.section, orderedSectionIds) === secId,
          )
          if (!inSection.length && secId !== firstSectionId) return null

          return (
            <div key={secId} className={styles.newListingCard}>
              <div className={styles.listingFormSection}>
                <h3 className={styles.listingFormSectionTitle}>
                  {labelById[secId] || 'Untitled section'}
                </h3>
                <div className={styles.listingFormSectionCard}>
                  {inSection.map((field) =>
                    field.type === 'images'
                      ? renderImagesRow(field)
                      : isStringListField(field)
                        ? renderStringListRow(field)
                        : renderFieldRow(field),
                  )}
                </div>
              </div>
            </div>
          )
        })}
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

// --- New listing page (route /seller/products/new-listing) -----------------------------------------------

const ALLOWED_IMAGE_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])

const LISTING_IMAGE_ACCEPT = 'image/jpeg,image/png,image/webp,image/gif'

const FALLBACK_SECTION_TIPS = {
  basic: {
    title: 'Listing basics',
    body: 'Use clear photos and a descriptive name so buyers know what they get. Category, duration, and coverage help them compare options and find you in search.',
  },
  sales: {
    title: 'Pricing & options',
    body: 'Set a starting price buyers can trust. Use price notes for caveats. Package options are great for tiers or add-ons.',
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
          {sections.map((s, index) => {
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

  const [formValues, setFormValues] = useState({})
  const [template, setTemplate] = useState(null)
  const [templateFields, setTemplateFields] = useState([])
  const [sectionRows, setSectionRows] = useState(() => getDefaultSectionConfig())
  const [editGallery, setEditGallery] = useState([])
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)
  const [loadingTemplate, setLoadingTemplate] = useState(true)
  const [loadingSeller, setLoadingSeller] = useState(true)
  const [sellerAccountStatus, setSellerAccountStatus] = useState(null)
  const [imageUploadNote, setImageUploadNote] = useState(null)
  const [toastMessage, setToastMessage] = useState('')
  const [toastType, setToastType] = useState('error')

  const orderedSectionIds = useMemo(() => getOrderedSectionIds(sectionRows), [sectionRows])

  const listingSections = useMemo(
    () => sectionRows.map((s) => ({ id: s.id, label: s.label })),
    [sectionRows],
  )

  const sectionConfigById = useMemo(
    () => Object.fromEntries(sectionRows.map((s) => [s.id, s])),
    [sectionRows],
  )

  const sectionCompletion = useMemo(
    () =>
      computeTemplateSectionCompletion(formValues, templateFields, orderedSectionIds, editGallery),
    [formValues, templateFields, orderedSectionIds, editGallery],
  )

  const activeTipSectionId = useMemo(
    () => getActiveTipSectionId(sectionCompletion, orderedSectionIds),
    [sectionCompletion, orderedSectionIds],
  )

  const sidebarTip = useMemo(() => {
    const row = sectionConfigById[activeTipSectionId]
    const fb = FALLBACK_SECTION_TIPS[activeTipSectionId] || FALLBACK_SECTION_TIPS.basic
    const title = (row?.tipTitle && String(row.tipTitle).trim()) || fb.title
    const body = (row?.tipBody && String(row.tipBody).trim()) || fb.body
    return { title, body }
  }, [sectionConfigById, activeTipSectionId])

  useEffect(() => {
    let mounted = true
    ;(async () => {
      setLoadingTemplate(true)
      const { data, error } = await fetchSellerTemplate()
      if (!mounted) return

      if (!error && data) {
        const mergedSec = data.sectionConfig || mergeSectionConfig(data.section_config)
        setSectionRows(mergedSec)
        setTemplate(data)
        const orderIds = getOrderedSectionIds(mergedSec)
        const rawFields = Array.isArray(data.fields) ? data.fields : []
        const withBuiltins = ensureBuiltInSellerTemplateFields(rawFields, orderIds)
        const sorted = sortTemplateFieldsForDisplay(withBuiltins, orderIds)
        const fields = ensureStatusField(sorted)
        setTemplateFields(fields)
        setFormValues(dynamicValuesToFormState({}, fields))
      } else {
        const defSec = getDefaultSectionConfig()
        setSectionRows(defSec)
        setTemplate(null)
        const orderIds = getOrderedSectionIds(defSec)
        const withBuiltins = ensureBuiltInSellerTemplateFields([], orderIds)
        const sorted = sortTemplateFieldsForDisplay(withBuiltins, orderIds)
        const fallbackFields = ensureStatusField(sorted)
        setTemplateFields(fallbackFields)
        setFormValues(dynamicValuesToFormState({}, fallbackFields))
      }

      setLoadingTemplate(false)
    })()
    return () => {
      mounted = false
    }
  }, [])

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
      setImageUploadNote(
        `Maximum ${MAX_LISTING_IMAGES} images. Remove one to add more.`,
      )
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

  const templateSectionConfig = useMemo(() => {
    if (template?.sectionConfig?.length) return template.sectionConfig
    if (template?.section_config) return mergeSectionConfig(template.section_config)
    return sectionRows
  }, [template, sectionRows])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setFormError('')
    setToastMessage('')
    setToastType('error')

    const missingRequired = findFirstMissingRequiredField(
      templateFields,
      getFieldValue,
      orderedSectionIds,
      editGallery,
    )
    if (missingRequired) {
      const msg = `${missingRequired.label} is required. Please complete the info.`
      setFormError(msg)
      setToastType('error')
      setToastMessage(msg)
      return
    }

    const rawPrice = String(formValues.base_price ?? '').trim().replace(/,/g, '')
    if (rawPrice !== '' && Number.isFinite(Number(rawPrice)) && Number(rawPrice) < 0) {
      const msg = 'Starting price cannot be negative.'
      setFormError(msg)
      setToastType('error')
      setToastMessage(msg)
      return
    }

    setSaving(true)
    const { error: uploadErr, persistedImageUrls } = await resolvePersistedImageUrls(editGallery, [])
    if (uploadErr) {
      setFormError(uploadErr)
      setToastType('error')
      setToastMessage(uploadErr)
      setSaving(false)
      return
    }

    const payload = buildSellerListingPayload({
      template,
      formValues,
      selectedProduct: null,
      persistedImageUrls,
    })

    const { data, error } = await createSellerListing(payload)
    setSaving(false)

    if (error || !data) {
      const msg = error || 'Failed to save listing.'
      setFormError(msg)
      setToastType('error')
      setToastMessage(msg)
      return
    }

    setToastType('success')
    setToastMessage('Listing saved successfully.')
    await new Promise((resolve) => window.setTimeout(resolve, 950))
    router.push('/seller/products')
  }

  const loading = loadingSeller || loadingTemplate

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
            sections={listingSections}
            completed={sectionCompletion}
            activeId={activeTipSectionId}
            tipTitle={sidebarTip.title}
            tipBody={sidebarTip.body}
          />
          <div className={styles.newListingFormColumn}>
            <form className={styles.newListingForm} onSubmit={handleSubmit} noValidate>
              <SellerListingFormFields
                templateFields={templateFields}
                sectionConfig={templateSectionConfig}
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
                  className={`${styles.productModalSecondary} ${styles.newListingFooterLink}`}
                >
                  Cancel
                </Link>
                <button
                  type="submit"
                  className={styles.productModalPrimary}
                  disabled={saving}
                >
                  {saving ? 'Saving…' : 'Save listing'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
