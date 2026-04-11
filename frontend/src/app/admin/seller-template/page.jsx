'use client'

import { useState, useMemo, useEffect, useCallback, useRef } from 'react'
import layoutStyles from '../admin.module.css'
import styles from './seller-template.module.css'
import { ensureBuiltInSellerTemplateFields } from '@/app/seller/products/SellerListingForm'
import { fetchSellerTemplate, saveSellerTemplate } from '@/lib/seller-template/client'
import {
  getDefaultSectionConfig,
  getOrderedSectionIds,
  mergeSectionConfig,
  normalizeSectionId,
  sanitizeSectionId,
  SHOP_FIELD_GUIDE_BY_ID,
  sortTemplateFieldsForDisplay,
  uniqueSectionId,
} from '@/lib/seller-template/sections'

const FIELD_TYPES = [
  { value: 'text', label: 'Short text' },
  { value: 'number', label: 'Number' },
  { value: 'textarea', label: 'Long text' },
  { value: 'email', label: 'Email' },
  { value: 'url', label: 'URL' },
  { value: 'select', label: 'Dropdown' },
  { value: 'images', label: 'Images' },
  { value: 'string_list', label: 'Text options' },
]

function newField(overrides = {}) {
  return {
    id: `f-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    order: 0,
    label: '',
    type: 'text',
    required: false,
    placeholder: '',
    options: '',
    section: 'basic',
    sublabel: '',
    maxLength: '',
    ...overrides,
  }
}

function parseMaxLengthInput(raw) {
  if (raw === '' || raw == null) return undefined
  const n = Math.floor(Number(raw))
  if (!Number.isFinite(n) || n <= 0) return undefined
  return Math.min(n, 100000)
}

/* ── Reusable modal ── */
function Modal({ open, onClose, title, children, size = 'md' }) {
  const overlayRef = useRef(null)

  useEffect(() => {
    if (!open) return
    const handleKey = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handleKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      ref={overlayRef}
      className={styles.modalOverlay}
      onClick={(e) => { if (e.target === overlayRef.current) onClose() }}
    >
      <div
        className={`${styles.modalPanel} ${styles[`modalPanel--${size}`]}`}
        role="dialog"
        aria-modal="true"
      >
        <div className={styles.modalHeader}>
          <span className={styles.modalHeaderSpacer} aria-hidden />
          <span className={styles.modalTitle}>{title}</span>
          <button type="button" className={styles.modalClose} onClick={onClose} aria-label="Close">✕</button>
        </div>
        <div className={styles.modalBody}>
          {children}
        </div>
      </div>
    </div>
  )
}

export default function AdminSellerTemplatePage() {
  const [fields, setFields] = useState(() => [])
  const [sectionConfig, setSectionConfig] = useState(() => getDefaultSectionConfig())
  const [editingId, setEditingId] = useState(null)
  const [isAdding, setIsAdding] = useState(false)
  const [form, setForm] = useState(() => newField())
  const [deleteConfirmId, setDeleteConfirmId] = useState(null)
  const [loadingTemplate, setLoadingTemplate] = useState(true)
  const [savingTemplate, setSavingTemplate] = useState(false)
  const [templateMessage, setTemplateMessage] = useState('')
  const [templateMessageType, setTemplateMessageType] = useState('info')
  const [addSectionOpen, setAddSectionOpen] = useState(false)
  const [newSectionLabel, setNewSectionLabel] = useState('')
  const [newSectionIdDraft, setNewSectionIdDraft] = useState('')

  // Modal state
  const [guidanceModalSectionId, setGuidanceModalSectionId] = useState(null)
  const [fieldModalOpen, setFieldModalOpen] = useState(false)

  const sectionIds = useMemo(() => getOrderedSectionIds(sectionConfig), [sectionConfig])

  const fieldList = useMemo(
    () => sortTemplateFieldsForDisplay(fields, sectionIds),
    [fields, sectionIds],
  )

  const previewMaxLength = (field) => {
    if (field?.maxLength == null) return undefined
    const n = Math.floor(Number(field.maxLength))
    if (!Number.isFinite(n) || n <= 0) return undefined
    return Math.min(n, 100000)
  }

  const persistTemplate = useCallback(
    async (nextFields, nextSectionConfig) => {
      setSavingTemplate(true)
      const { error } = await saveSellerTemplate({
        fields: nextFields,
        sectionConfig: nextSectionConfig ?? sectionConfig,
      })
      setSavingTemplate(false)
      if (error) {
        setTemplateMessage(error)
        setTemplateMessageType('error')
      } else {
        setTemplateMessage('Saved')
        setTemplateMessageType('success')
        setTimeout(() => setTemplateMessage(''), 2500)
      }
    },
    [sectionConfig],
  )

  useEffect(() => {
    let mounted = true
    const loadTemplate = async () => {
      setLoadingTemplate(true)
      const { data, error } = await fetchSellerTemplate()
      if (!mounted) return

      if (error) {
        setTemplateMessage(error)
        setTemplateMessageType('error')
      } else if (data) {
        const mergedSections = data.sectionConfig || mergeSectionConfig(data.section_config)
        setSectionConfig(mergedSections)
        const ids = getOrderedSectionIds(mergedSections)
        const merged = ensureBuiltInSellerTemplateFields(data.fields || [], ids).map((f, i) => ({
          ...f,
          order: i,
        }))
        setFields(merged)
        if (!data.fields?.length) {
          setTemplateMessage('Using defaults — save to publish changes')
          setTemplateMessageType('info')
        }
      } else {
        const mergedSections = getDefaultSectionConfig()
        setSectionConfig(mergedSections)
        const ids = getOrderedSectionIds(mergedSections)
        setFields(
          ensureBuiltInSellerTemplateFields([], ids).map((f, i) => ({ ...f, order: i })),
        )
        setTemplateMessage('No saved template — defaults shown')
        setTemplateMessageType('info')
      }
      setLoadingTemplate(false)
    }
    loadTemplate()
    return () => { mounted = false }
  }, [])

  const updateSectionRow = (sectionId, key, value) => {
    setSectionConfig((prev) =>
      prev.map((row) => (row.id === sectionId ? { ...row, [key]: value } : row)),
    )
  }

  const handleSaveSectionGuidance = () => {
    persistTemplate(fields, sectionConfig)
  }

  const handleAddSection = () => {
    const label = newSectionLabel.trim() || 'New section'
    const baseId = newSectionIdDraft.trim() || sanitizeSectionId(label)
    const id = uniqueSectionId(baseId, sectionIds)
    const row = {
      id,
      label,
      tipTitle: 'Tips for this section',
      tipBody: 'Add guidance for sellers completing this part of the form.',
      shopGuide: 'Describe how answers here appear to buyers on the shop.',
    }
    const next = [...sectionConfig, row]
    setSectionConfig(next)
    setNewSectionLabel('')
    setNewSectionIdDraft('')
    setAddSectionOpen(false)
    persistTemplate(fields, next)
  }

  const handleDeleteSection = (sectionId) => {
    if (sectionConfig.length <= 1) {
      setTemplateMessage('Keep at least one section.')
      setTemplateMessageType('error')
      return
    }
    const ids = getOrderedSectionIds(sectionConfig)
    const idx = ids.indexOf(sectionId)
    const fallback = ids[idx > 0 ? idx - 1 : idx + 1]
    const nextFields = fields.map((f) =>
      normalizeSectionId(f.section, ids) === sectionId ? { ...f, section: fallback } : f,
    )
    const nextConfig = sectionConfig.filter((s) => s.id !== sectionId)
    setFields(nextFields)
    setSectionConfig(nextConfig)
    setGuidanceModalSectionId(null)
    persistTemplate(nextFields, nextConfig)
  }

  const moveSection = (sectionId, direction) => {
    const i = sectionConfig.findIndex((s) => s.id === sectionId)
    if (i < 0) return
    const j = direction === 'up' ? i - 1 : i + 1
    if (j < 0 || j >= sectionConfig.length) return
    const next = [...sectionConfig]
    ;[next[i], next[j]] = [next[j], next[i]]
    setSectionConfig(next)
    persistTemplate(fields, next)
  }

  const resetForm = () => {
    setEditingId(null)
    setIsAdding(false)
    setFieldModalOpen(false)
    setForm(newField({ section: sectionIds[0] || 'basic' }))
  }

  const startAdd = () => {
    setEditingId(null)
    setIsAdding(true)
    setForm(newField({ order: fields.length, section: sectionIds[0] || 'basic' }))
    setFieldModalOpen(true)
  }

  const handleEdit = (id) => {
    const field = fields.find((f) => f.id === id)
    if (!field) return
    setEditingId(id)
    setIsAdding(false)
    setForm({
      ...field,
      section: normalizeSectionId(field.section, sectionIds),
      sublabel: field.sublabel || '',
      options: Array.isArray(field.options)
        ? field.options.join(', ')
        : field.options || '',
      maxLength: field.maxLength != null && field.maxLength !== '' ? String(field.maxLength) : '',
    })
    setFieldModalOpen(true)
  }

  const handleDelete = (id) => {
    setFields((prev) => {
      const next = prev.filter((f) => f.id !== id)
      const normalized = next.map((f, i) => ({ ...f, order: i }))
      persistTemplate(normalized, sectionConfig)
      return normalized
    })
    if (editingId === id) resetForm()
    setDeleteConfirmId(null)
  }

  const moveField = (id, direction) => {
    const sorted = sortTemplateFieldsForDisplay(fields, sectionIds)
    const idx = sorted.findIndex((f) => f.id === id)
    if (idx < 0) return
    const swap = direction === 'up' ? idx - 1 : idx + 1
    if (swap < 0 || swap >= sorted.length) return
    const next = [...sorted]
    ;[next[idx], next[swap]] = [next[swap], next[idx]]
    const reindexed = next.map((f, i) => ({ ...f, order: i }))
    setFields(reindexed)
    persistTemplate(reindexed, sectionConfig)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const label = (form.label || '').trim()
    if (!label) return

    const ml = parseMaxLengthInput(form.maxLength)
    const payload = {
      ...form,
      label,
      section: normalizeSectionId(form.section, sectionIds),
      sublabel: String(form.sublabel || '').trim(),
      order: typeof form.order === 'number' ? form.order : fields.length,
      options:
        form.type === 'select' && form.options
          ? form.options.split(',').map((s) => s.trim()).filter(Boolean)
          : undefined,
    }
    if (form.type === 'images' || form.type === 'string_list') {
      delete payload.maxLength
      payload.options = []
      if (form.type === 'images') payload.placeholder = ''
    } else if (ml !== undefined) payload.maxLength = ml
    else delete payload.maxLength

    if (editingId) {
      setFields((prev) => {
        const next = prev.map((f) =>
          f.id === editingId ? { ...f, ...payload, id: f.id } : f,
        )
        persistTemplate(next, sectionConfig)
        return next
      })
    } else if (isAdding) {
      setFields((prev) => {
        const next = [...prev, { ...payload, id: form.id }]
        persistTemplate(next, sectionConfig)
        return next
      })
    }
    resetForm()
  }

  const shopHintForForm = SHOP_FIELD_GUIDE_BY_ID[form.id]
  const guidanceSection = sectionConfig.find((s) => s.id === guidanceModalSectionId)

  const statusIndicator = loadingTemplate
    ? { label: 'Loading…', type: 'loading' }
    : savingTemplate
      ? { label: 'Saving…', type: 'saving' }
      : templateMessage
        ? { label: templateMessage, type: templateMessageType }
        : null

  return (
    <div className={`${layoutStyles.dashWrap} ${styles.pageBleed} ${styles.templatePage}`}>
      <section className={layoutStyles.panel}>

        {/* ── Page header ── */}
        <div className={`${layoutStyles.panelHead} ${styles.pageHeader}`}>
          <div className={styles.pageHeaderLeft}>
            <p className={layoutStyles.panelTitle}>Listing form template</p>
            <span className={styles.pageHeaderSub}>Seller · Add new listing &amp; edit modal</span>
          </div>
          {statusIndicator && (
            <span className={`${styles.statusPill} ${styles[`statusPill--${statusIndicator.type}`]}`}>
              {statusIndicator.type === 'loading' || statusIndicator.type === 'saving'
                ? <span className={styles.statusSpinner} />
                : statusIndicator.type === 'success' ? '✓ '
                : statusIndicator.type === 'error' ? '⚠ ' : null}
              {statusIndicator.label}
            </span>
          )}
        </div>

        {/* ── Sections ── */}
        <div className={styles.sectionGuidance}>
          <div className={styles.sectionGuidanceHead}>
            <div className={styles.sectionGuidanceHeadLeft}>
              <h2 className={styles.sectionGuidanceTitle}>Sections</h2>
              <span className={styles.sectionCount}>{sectionConfig.length} section{sectionConfig.length !== 1 ? 's' : ''}</span>
            </div>
            <div className={styles.sectionGuidanceHeadRight}>
              <button
                type="button"
                className={styles.btnSectionAdd}
                onClick={() => setAddSectionOpen((o) => !o)}
                disabled={savingTemplate || loadingTemplate}
              >
                {addSectionOpen ? '✕ Cancel' : '+ Add section'}
              </button>
              <button
                type="button"
                className={styles.btnSaveGuidance}
                onClick={handleSaveSectionGuidance}
                disabled={savingTemplate || loadingTemplate}
              >
                Save sections
              </button>
            </div>
          </div>

          {addSectionOpen && (
            <div className={styles.addSectionInline}>
              <label className={styles.label}>
                <span className={styles.labelSpan}>Title</span>
                <input
                  type="text"
                  value={newSectionLabel}
                  onChange={(e) => setNewSectionLabel(e.target.value)}
                  className={styles.input}
                  placeholder="e.g. Compliance"
                  autoFocus
                />
              </label>
              <label className={styles.label}>
                <span className={styles.labelSpan}>ID <span className={styles.labelHint}>(optional)</span></span>
                <input
                  type="text"
                  value={newSectionIdDraft}
                  onChange={(e) => setNewSectionIdDraft(e.target.value)}
                  className={styles.input}
                  placeholder="Auto from title"
                />
              </label>
              <button
                type="button"
                className={styles.btnSaveGuidance}
                onClick={handleAddSection}
                disabled={savingTemplate || loadingTemplate}
              >
                Create
              </button>
            </div>
          )}

          <div className={styles.sectionGuidanceGrid}>
            {sectionConfig.map((sec, si) => (
              <div key={sec.id} className={styles.sectionGuidanceCard}>
                <div className={styles.sectionCardTop}>
                  <div className={styles.sectionCardTopLeft}>
                    <div className={styles.sectionCardOrder}>{si + 1}</div>
                    <input
                      type="text"
                      value={sec.label}
                      onChange={(e) => updateSectionRow(sec.id, 'label', e.target.value)}
                      className={styles.sectionTitleInput}
                      aria-label="Section title"
                    />
                  </div>
                  <div className={styles.sectionCardTopRight}>
                    <div className={styles.moveGroup}>
                      <button
                        type="button"
                        className={styles.iconBtn}
                        onClick={() => moveSection(sec.id, 'up')}
                        disabled={si === 0}
                        title="Move up"
                      >↑</button>
                      <button
                        type="button"
                        className={styles.iconBtn}
                        onClick={() => moveSection(sec.id, 'down')}
                        disabled={si >= sectionConfig.length - 1}
                        title="Move down"
                      >↓</button>
                    </div>
                    <button
                      type="button"
                      className={styles.btnExpandGuidance}
                      onClick={() => setGuidanceModalSectionId(sec.id)}
                    >
                      Guidance
                    </button>
                    <button
                      type="button"
                      className={styles.iconBtnDanger}
                      onClick={() => handleDeleteSection(sec.id)}
                      disabled={sectionConfig.length <= 1}
                      title="Remove section"
                    >✕</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Builder + Preview ── */}
        <div className={styles.layout}>
          <div className={styles.builder}>
            <div className={styles.formCard}>
              <div className={styles.listHeader}>
                <span className={styles.fieldCount}>
                  {fieldList.length} {fieldList.length === 1 ? 'field' : 'fields'}
                </span>
                <button type="button" className={styles.btnPrimary} onClick={startAdd}>
                  + Add field
                </button>
              </div>

              {fieldList.length === 0 ? (
                <div className={styles.emptyState}>
                  <span className={styles.emptyIcon}>⊞</span>
                  <p className={styles.emptyTitle}>No fields yet</p>
                  <p className={styles.emptyHint}>Add fields to build the seller form.</p>
                </div>
              ) : (
                <div className={styles.groupedLists}>
                  {sectionIds.map((secId) => {
                    const inSec = fieldList.filter(
                      (f) => normalizeSectionId(f.section, sectionIds) === secId,
                    )
                    if (!inSec.length) {
                      return (
                        <div key={secId} className={styles.sectionBlock}>
                          <h3 className={styles.sectionBlockTitle}>
                            {sectionConfig.find((s) => s.id === secId)?.label || 'Untitled'}
                          </h3>
                          <p className={styles.sectionBlockEmpty}>No fields in this section.</p>
                        </div>
                      )
                    }
                    return (
                      <div key={secId} className={styles.sectionBlock}>
                        <h3 className={styles.sectionBlockTitle}>
                          {sectionConfig.find((s) => s.id === secId)?.label || 'Untitled'}
                        </h3>
                        <ul className={styles.fieldList}>
                          {inSec.map((field) => {
                            const globalIdx = fieldList.findIndex((f) => f.id === field.id)
                            return (
                              <li key={field.id} className={styles.fieldItem}>
                                <div className={styles.fieldInfo}>
                                  <span className={styles.fieldLabel}>{field.label}</span>
                                  <span className={styles.fieldMeta}>
                                    {FIELD_TYPES.find((t) => t.value === field.type)?.label}
                                    {field.maxLength ? (
                                      <span className={styles.fieldMaxLen}>· {field.maxLength} chars</span>
                                    ) : null}
                                    {field.required && (
                                      <span className={styles.requiredDot}>Required</span>
                                    )}
                                  </span>
                                </div>
                                <div className={styles.fieldActions}>
                                  <div className={styles.moveGroup}>
                                    <button
                                      type="button"
                                      className={styles.iconBtn}
                                      onClick={() => moveField(field.id, 'up')}
                                      disabled={globalIdx === 0}
                                      title="Move up"
                                    >↑</button>
                                    <button
                                      type="button"
                                      className={styles.iconBtn}
                                      onClick={() => moveField(field.id, 'down')}
                                      disabled={globalIdx === fieldList.length - 1}
                                      title="Move down"
                                    >↓</button>
                                  </div>
                                  <button
                                    type="button"
                                    className={styles.iconBtnEdit}
                                    onClick={() => handleEdit(field.id)}
                                  >
                                    Edit
                                  </button>
                                  {deleteConfirmId === field.id ? (
                                    <span className={styles.deleteConfirm}>
                                      <button
                                        type="button"
                                        className={styles.iconBtnDanger}
                                        onClick={() => handleDelete(field.id)}
                                      >
                                        Confirm
                                      </button>
                                      <button
                                        type="button"
                                        className={styles.iconBtn}
                                        onClick={() => setDeleteConfirmId(null)}
                                      >
                                        ✕
                                      </button>
                                    </span>
                                  ) : (
                                    <button
                                      type="button"
                                      className={styles.iconBtnDanger}
                                      onClick={() => setDeleteConfirmId(field.id)}
                                      title="Delete field"
                                    >
                                      ✕
                                    </button>
                                  )}
                                </div>
                              </li>
                            )
                          })}
                        </ul>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* ── Preview ── */}
          <div className={styles.preview}>
            <div className={styles.previewHeader}>
              <span className={styles.previewBadge}>Preview</span>
            </div>

            <div className={styles.previewStepper} aria-hidden>
              {sectionConfig.map((s, i) => (
                <span key={s.id} className={styles.previewStepItem}>
                  <span className={styles.previewStepDot} />
                  <span className={styles.previewStepLabel}>{s.label}</span>
                  {i < sectionConfig.length - 1 ? <span className={styles.previewStepLine} /> : null}
                </span>
              ))}
            </div>

            <div className={styles.previewForm}>
              {fieldList.length === 0 ? (
                <p className={styles.previewEmpty}>Add fields to see a preview.</p>
              ) : null}
              <>
                {sectionIds.map((secId) => {
                  const inSec = fieldList.filter(
                    (f) => normalizeSectionId(f.section, sectionIds) === secId,
                  )
                  if (!inSec.length) return null
                  const title = sectionConfig.find((s) => s.id === secId)?.label || 'Untitled'
                  return (
                    <div key={`pv-${secId}`} className={styles.previewSection}>
                      <h4 className={styles.previewSectionTitle}>{title}</h4>
                      {inSec.map((field) =>
                        field.type === 'images' ? (
                          <div key={field.id} className={styles.previewImagesStub}>
                            <span className={styles.previewImagesStubLabel}>{field.label || 'Images'}</span>
                            <span className={styles.previewImagesStubHint}>{field.sublabel || 'Upload strip'}</span>
                          </div>
                        ) : field.type === 'string_list' ? (
                          <div key={field.id} className={styles.previewStringList}>
                            <span className={styles.previewLabelText}>
                              {field.label}
                              {field.required ? <span className={styles.previewRequired}> *</span> : null}
                            </span>
                            {field.sublabel ? <span className={styles.previewSublabel}>{field.sublabel}</span> : null}
                            <div className={styles.previewStringListRows}>
                              <input readOnly className={styles.previewInput} placeholder={field.placeholder || 'Option 1'} />
                              <input readOnly className={styles.previewInput} placeholder={field.placeholder || 'Option 2'} />
                            </div>
                            <button type="button" className={styles.previewStringListAdd} disabled>+ Add option</button>
                          </div>
                        ) : (
                          <label key={field.id} className={styles.previewLabel}>
                            <span className={styles.previewLabelText}>
                              {field.label}
                              {field.required && <span className={styles.previewRequired}> *</span>}
                            </span>
                            {field.sublabel ? <span className={styles.previewSublabel}>{field.sublabel}</span> : null}
                            {field.type === 'textarea' && (
                              <textarea readOnly placeholder={field.placeholder || ''} rows={3} maxLength={previewMaxLength(field)} className={styles.previewInput} />
                            )}
                            {field.type === 'select' && (
                              <select readOnly className={styles.previewInput} defaultValue="">
                                <option value="">{field.placeholder || 'Select…'}</option>
                                {(Array.isArray(field.options) ? field.options : []).map((opt, i) => (
                                  <option key={i} value={opt}>{opt}</option>
                                ))}
                              </select>
                            )}
                            {field.type !== 'textarea' && field.type !== 'select' && field.type !== 'images' && field.type !== 'string_list' && (
                              <input type={field.type} readOnly placeholder={field.placeholder || ''} maxLength={previewMaxLength(field)} className={styles.previewInput} />
                            )}
                          </label>
                        ),
                      )}
                    </div>
                  )
                })}
                <button type="button" className={styles.previewSubmit} disabled>Save listing</button>
              </>
            </div>
          </div>
        </div>
      </section>

      {/* ── Guidance modal ── */}
      <Modal
        open={!!guidanceSection}
        onClose={() => setGuidanceModalSectionId(null)}
        title={`Guidance — ${guidanceSection?.label || ''}`}
        size="md"
      >
        {guidanceSection && (
          <div className={styles.guidanceModalBody}>
            <label className={styles.label}>
              <span className={styles.labelSpan}>Tip title</span>
              <input
                type="text"
                value={guidanceSection.tipTitle}
                onChange={(e) => updateSectionRow(guidanceSection.id, 'tipTitle', e.target.value)}
                className={styles.input}
                autoFocus
              />
            </label>
            <label className={styles.label}>
              <span className={styles.labelSpan}>Tip body</span>
              <textarea
                value={guidanceSection.tipBody}
                onChange={(e) => updateSectionRow(guidanceSection.id, 'tipBody', e.target.value)}
                className={styles.textareaSm}
                rows={4}
              />
            </label>
            <label className={styles.label}>
              <span className={styles.labelSpan}>Shop mapping note</span>
              <textarea
                value={guidanceSection.shopGuide}
                onChange={(e) => updateSectionRow(guidanceSection.id, 'shopGuide', e.target.value)}
                className={styles.textareaSm}
                rows={3}
              />
            </label>
            <div className={styles.modalFooter}>
              <button
                type="button"
                className={styles.btnGhost}
                onClick={() => setGuidanceModalSectionId(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className={styles.btnPrimary}
                onClick={() => {
                  handleSaveSectionGuidance()
                  setGuidanceModalSectionId(null)
                }}
                disabled={savingTemplate}
              >
                Save guidance
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* ── Add / Edit field modal ── */}
      <Modal
        open={fieldModalOpen}
        onClose={resetForm}
        title={editingId ? 'Edit field' : 'New field'}
        size="md"
      >
        <form onSubmit={handleSubmit} className={styles.fieldForm}>
          <label className={styles.label}>
            <span className={styles.labelSpan}>Label</span>
            <input
              type="text"
              value={form.label}
              onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
              placeholder="e.g. Service name"
              className={styles.input}
              autoFocus
            />
          </label>

          <div className={styles.row}>
            <label className={`${styles.label} ${styles.rowFlex}`}>
              <span className={styles.labelSpan}>Section</span>
              <select
                value={normalizeSectionId(form.section, sectionIds)}
                onChange={(e) => setForm((f) => ({ ...f, section: e.target.value }))}
                className={styles.select}
              >
                {sectionConfig.map((sec) => (
                  <option key={sec.id} value={sec.id}>{sec.label}</option>
                ))}
              </select>
            </label>
            <label className={`${styles.label} ${styles.rowFlex}`}>
              <span className={styles.labelSpan}>Type</span>
              <select
                value={form.type}
                onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
                className={styles.select}
              >
                {FIELD_TYPES.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </label>
          </div>

          <label className={styles.label}>
            <span className={styles.labelSpan}>Sublabel <span className={styles.labelHint}>(optional)</span></span>
            <input
              type="text"
              value={form.sublabel || ''}
              onChange={(e) => setForm((f) => ({ ...f, sublabel: e.target.value }))}
              placeholder="Helper text shown below the label"
              className={styles.input}
            />
          </label>

          {form.type !== 'images' && form.type !== 'string_list' ? (
            <div className={styles.row}>
              <label className={`${styles.label} ${styles.rowFlex}`}>
                <span className={styles.labelSpan}>Placeholder</span>
                <input
                  type="text"
                  value={form.placeholder || ''}
                  onChange={(e) => setForm((f) => ({ ...f, placeholder: e.target.value }))}
                  placeholder="e.g. Add details…"
                  className={styles.input}
                />
              </label>
              <label className={`${styles.label} ${styles.rowFlex}`}>
                <span className={styles.labelSpan}>Max characters <span className={styles.labelHint}>(optional)</span></span>
                <input
                  type="number"
                  min={1}
                  max={100000}
                  value={form.maxLength === '' || form.maxLength == null ? '' : form.maxLength}
                  onChange={(e) => setForm((f) => ({ ...f, maxLength: e.target.value }))}
                  placeholder="No limit"
                  className={styles.input}
                />
              </label>
            </div>
          ) : null}

          {form.type === 'string_list' ? (
            <label className={styles.label}>
              <span className={styles.labelSpan}>Placeholder</span>
              <input
                type="text"
                value={form.placeholder || ''}
                onChange={(e) => setForm((f) => ({ ...f, placeholder: e.target.value }))}
                placeholder="e.g. Buyer-facing label"
                className={styles.input}
              />
            </label>
          ) : null}

          {form.type === 'select' && (
            <label className={styles.label}>
              <span className={styles.labelSpan}>Options <span className={styles.labelHint}>comma-separated</span></span>
              <input
                type="text"
                value={typeof form.options === 'string' ? form.options : (form.options || []).join(', ')}
                onChange={(e) => setForm((f) => ({ ...f, options: e.target.value }))}
                placeholder="Option A, Option B, Option C"
                className={styles.input}
              />
            </label>
          )}

          {shopHintForForm ? (
            <p className={styles.shopFieldHint}>
              <strong>Shop:</strong> {shopHintForForm}
            </p>
          ) : null}

          <label className={styles.checkLabel}>
            <input
              type="checkbox"
              checked={!!form.required}
              onChange={(e) => setForm((f) => ({ ...f, required: e.target.checked }))}
            />
            <span>Required field</span>
          </label>

          <div className={styles.modalFooter}>
            <button type="button" className={styles.btnGhost} onClick={resetForm}>
              Cancel
            </button>
            <button type="submit" className={styles.btnPrimary}>
              {editingId ? 'Save changes' : 'Add field'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}