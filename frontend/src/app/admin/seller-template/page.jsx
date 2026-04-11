'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
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
  { value: 'textarea', label: 'Long text (paragraph)' },
  { value: 'email', label: 'Email' },
  { value: 'url', label: 'URL' },
  { value: 'select', label: 'Dropdown (select)' },
  { value: 'images', label: 'Images (upload strip)' },
  { value: 'string_list', label: 'Text options (add row per option)' },
]

const TYPE_ICONS = {
  text: 'T',
  number: '#',
  textarea: '¶',
  email: '@',
  url: '⌘',
  select: '▾',
  images: '🖼',
  string_list: '+',
}

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

/** Align with seller-template client cap; empty = no limit in UI */
function parseMaxLengthInput(raw) {
  if (raw === '' || raw == null) return undefined
  const n = Math.floor(Number(raw))
  if (!Number.isFinite(n) || n <= 0) return undefined
  return Math.min(n, 100000)
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
  const [addSectionOpen, setAddSectionOpen] = useState(false)
  const [newSectionLabel, setNewSectionLabel] = useState('')
  const [newSectionIdDraft, setNewSectionIdDraft] = useState('')

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
      setTemplateMessage(error || 'Template saved.')
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
      } else if (data) {
        const mergedSections = data.sectionConfig || mergeSectionConfig(data.section_config)
        setSectionConfig(mergedSections)
        const ids = getOrderedSectionIds(mergedSections)
        const merged = ensureBuiltInSellerTemplateFields(data.fields || [], ids).map((f, i) => ({
          ...f,
          order: i,
        }))
        setFields(merged)
        setTemplateMessage(
          data.fields?.length ? '' : 'No saved fields yet — defaults for name, description, and images are shown; edit and save.',
        )
      } else {
        const mergedSections = getDefaultSectionConfig()
        setSectionConfig(mergedSections)
        const ids = getOrderedSectionIds(mergedSections)
        setFields(
          ensureBuiltInSellerTemplateFields([], ids).map((f, i) => ({ ...f, order: i })),
        )
        setTemplateMessage(
          'No saved template yet. Defaults are shown — adjust fields and save to publish.',
        )
      }

      setLoadingTemplate(false)
    }

    loadTemplate()
    return () => {
      mounted = false
    }
  }, [])

  const persistFields = (nextFields) => {
    setFields(nextFields)
    persistTemplate(nextFields, sectionConfig)
  }

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
    persistTemplate(nextFields, nextConfig)
  }

  const moveSection = (sectionId, direction) => {
    const i = sectionConfig.findIndex((s) => s.id === sectionId)
    if (i < 0) return
    const j = direction === 'up' ? i - 1 : i + 1
    if (j < 0 || j >= sectionConfig.length) return
    const next = [...sectionConfig]
    const tmp = next[i]
    next[i] = next[j]
    next[j] = tmp
    setSectionConfig(next)
    persistTemplate(fields, next)
  }

  const resetForm = () => {
    setEditingId(null)
    setIsAdding(false)
    setForm(newField({ section: sectionIds[0] || 'basic' }))
  }

  const startAdd = () => {
    resetForm()
    setIsAdding(true)
    setForm(newField({ order: fields.length, section: sectionIds[0] || 'basic' }))
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
  }

  const handleDelete = (id) => {
    setFields((prev) => {
      const next = prev.filter((f) => f.id !== id)
      const normalized = next.map((f, i) => ({ ...f, order: i }))
      persistTemplate(normalized, sectionConfig)
      return normalized
    })
    if (editingId === id || (isAdding && form.id === id)) resetForm()
    setDeleteConfirmId(null)
  }

  const moveField = (id, direction) => {
    const sorted = sortTemplateFieldsForDisplay(fields, sectionIds)
    const idx = sorted.findIndex((f) => f.id === id)
    if (idx < 0) return
    const swap = direction === 'up' ? idx - 1 : idx + 1
    if (swap < 0 || swap >= sorted.length) return
    const next = [...sorted]
    const tmp = next[idx]
    next[idx] = next[swap]
    next[swap] = tmp
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

  const isEditorOpen = editingId || isAdding

  const shopHintForForm = SHOP_FIELD_GUIDE_BY_ID[form.id]

  return (
    <div className={layoutStyles.dashWrap}>
      <section className={layoutStyles.panel}>
        <div className={layoutStyles.panelHead}>
          <p className={layoutStyles.panelTitle}>Seller new listing form template</p>
        </div>

        <p className={styles.intro}>
          <span className={styles.introLong}>
            Configure sections and fields for the seller <strong>Add new listing</strong> flow and the edit
            modal on <code className={styles.introCode}>/seller/products</code>.{' '}
            <strong>Listing name</strong>, <strong>description</strong>, and <strong>images</strong> are part of
            the saved template (defaults appear if none are stored)—edit labels, sections, and requirements like
            any other field. Set <strong>Max characters</strong> (optional) on text fields to cap input. Status
            is appended automatically for listing lifecycle in the seller modal.
          </span>
          <span className={styles.introShort}>
            Sections, tips, and fields aligned with the seller listing wizard and shop.
          </span>
        </p>
        <p className={styles.intro}>
          {loadingTemplate
            ? 'Loading saved template...'
            : savingTemplate
              ? 'Saving template...'
              : templateMessage}
        </p>

        <div className={styles.sectionGuidance}>
          <div className={styles.sectionGuidanceHead}>
            <h2 className={styles.sectionGuidanceTitle}>Sections</h2>
            <p className={styles.sectionGuidanceDesc}>
              Titles appear on the seller form; tips mirror the sidebar on the new listing page; shop notes
              remind admins how fields surface publicly. Reorder with ↑ ↓; delete moves fields to an adjacent
              section.
            </p>
            <button
              type="button"
              className={styles.btnSaveGuidance}
              onClick={handleSaveSectionGuidance}
              disabled={savingTemplate || loadingTemplate}
            >
              Save section guidance
            </button>
          </div>

          <div className={styles.sectionGuidanceToolbar}>
            <button
              type="button"
              className={styles.btnSectionAdd}
              onClick={() => setAddSectionOpen((o) => !o)}
              disabled={savingTemplate || loadingTemplate}
            >
              {addSectionOpen ? 'Cancel' : '+ Add section'}
            </button>
            {addSectionOpen ? (
              <div className={styles.sectionGuidanceToolbarFields}>
                <label className={styles.label}>
                  <span className={styles.labelSpan}>Section title</span>
                  <input
                    type="text"
                    value={newSectionLabel}
                    onChange={(e) => setNewSectionLabel(e.target.value)}
                    className={styles.input}
                    placeholder="e.g. Compliance"
                  />
                </label>
                <label className={styles.label}>
                  <span className={styles.labelSpan}>Section id (optional)</span>
                  <input
                    type="text"
                    value={newSectionIdDraft}
                    onChange={(e) => setNewSectionIdDraft(e.target.value)}
                    className={styles.input}
                    placeholder="auto from title if empty"
                  />
                </label>
                <button
                  type="button"
                  className={styles.btnSaveGuidance}
                  onClick={handleAddSection}
                  disabled={savingTemplate || loadingTemplate}
                >
                  Create section
                </button>
              </div>
            ) : null}
          </div>

          <div className={styles.sectionGuidanceGrid}>
            {sectionConfig.map((sec, si) => (
              <div key={sec.id} className={styles.sectionGuidanceCard}>
                  <div className={styles.sectionCardActions}>
                  <button
                    type="button"
                    className={styles.btnSectionGhost}
                    onClick={() => moveSection(sec.id, 'up')}
                    disabled={si === 0}
                    title="Move section up"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    className={styles.btnSectionGhost}
                    onClick={() => moveSection(sec.id, 'down')}
                    disabled={si >= sectionConfig.length - 1}
                    title="Move section down"
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    className={styles.btnSectionGhost}
                    onClick={() => handleDeleteSection(sec.id)}
                    disabled={sectionConfig.length <= 1}
                    title="Remove section"
                  >
                    Remove
                  </button>
                </div>
                <label className={styles.label}>
                  <span className={styles.labelSpan}>Section title</span>
                  <input
                    type="text"
                    value={sec.label}
                    onChange={(e) => updateSectionRow(sec.id, 'label', e.target.value)}
                    className={styles.input}
                  />
                </label>
                <label className={styles.label}>
                  <span className={styles.labelSpan}>Tip title</span>
                  <input
                    type="text"
                    value={sec.tipTitle}
                    onChange={(e) => updateSectionRow(sec.id, 'tipTitle', e.target.value)}
                    className={styles.input}
                  />
                </label>
                <label className={styles.label}>
                  <span className={styles.labelSpan}>Tip body</span>
                  <textarea
                    value={sec.tipBody}
                    onChange={(e) => updateSectionRow(sec.id, 'tipBody', e.target.value)}
                    className={styles.textareaSm}
                    rows={3}
                  />
                </label>
                <label className={styles.label}>
                  <span className={styles.labelSpan}>Shop mapping note</span>
                  <textarea
                    value={sec.shopGuide}
                    onChange={(e) => updateSectionRow(sec.id, 'shopGuide', e.target.value)}
                    className={styles.textareaSm}
                    rows={2}
                  />
                </label>
              </div>
            ))}
          </div>
        </div>

        <div className={styles.layout}>
          <div className={styles.builder}>
            <div className={`${styles.formCard} ${isEditorOpen ? styles.formCardActive : ''}`}>
              {isEditorOpen ? (
                <form onSubmit={handleSubmit} className={styles.fieldForm}>
                  <div className={styles.formCardHeader}>
                    <span className={styles.formCardBadge}>
                      {editingId ? 'Editing field' : 'New field'}
                    </span>
                  </div>

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
                        onChange={(e) =>
                          setForm((f) => ({ ...f, section: e.target.value }))
                        }
                        className={styles.select}
                      >
                        {sectionConfig.map((sec) => (
                          <option key={sec.id} value={sec.id}>
                            {sec.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className={`${styles.label} ${styles.rowFlex}`}>
                      <span className={styles.labelSpan}>Field type</span>
                      <select
                        value={form.type}
                        onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
                        className={styles.select}
                      >
                        {FIELD_TYPES.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>

                  <label className={styles.label}>
                    <span className={styles.labelSpan}>Sublabel</span>
                    <input
                      type="text"
                      value={form.sublabel || ''}
                      onChange={(e) => setForm((f) => ({ ...f, sublabel: e.target.value }))}
                      placeholder="Optional — under the label (e.g. Shown on the shop listing)"
                      className={styles.input}
                    />
                  </label>

                  {form.type !== 'images' && form.type !== 'string_list' ? (
                    <div className={styles.row}>
                      <label className={`${styles.label} ${styles.rowFlex}`}>
                        <span className={styles.labelSpan}>
                          Placeholder{' '}
                          <span className={styles.labelHint}>
                            (grey text inside inputs; first option label for selects)
                          </span>
                        </span>
                        <input
                          type="text"
                          value={form.placeholder || ''}
                          onChange={(e) =>
                            setForm((f) => ({ ...f, placeholder: e.target.value }))
                          }
                          placeholder="e.g. Add details…"
                          className={styles.input}
                        />
                      </label>
                      <label className={`${styles.label} ${styles.rowFlex}`}>
                        <span className={styles.labelSpan}>
                          Max characters{' '}
                          <span className={styles.labelHint}>
                            (optional — empty = no limit; text, textarea, email, URL)
                          </span>
                        </span>
                        <input
                          type="number"
                          min={1}
                          max={100000}
                          value={form.maxLength === '' || form.maxLength == null ? '' : form.maxLength}
                          onChange={(e) =>
                            setForm((f) => ({ ...f, maxLength: e.target.value }))
                          }
                          placeholder="No limit if empty"
                          className={styles.input}
                        />
                      </label>
                    </div>
                  ) : null}

                  {form.type === 'string_list' ? (
                    <label className={styles.label}>
                      <span className={styles.labelSpan}>
                        Placeholder{' '}
                        <span className={styles.labelHint}>(grey hint inside each option field)</span>
                      </span>
                      <input
                        type="text"
                        value={form.placeholder || ''}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, placeholder: e.target.value }))
                        }
                        placeholder="e.g. Buyer-facing label"
                        className={styles.input}
                      />
                    </label>
                  ) : null}

                  {form.type === 'select' && (
                    <label className={styles.label}>
                      <span className={styles.labelSpan}>
                        Options <span className={styles.labelHint}>(comma-separated)</span>
                      </span>
                      <input
                        type="text"
                        value={
                          typeof form.options === 'string'
                            ? form.options
                            : (form.options || []).join(', ')
                        }
                        onChange={(e) =>
                          setForm((f) => ({ ...f, options: e.target.value }))
                        }
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
                      onChange={(e) =>
                        setForm((f) => ({ ...f, required: e.target.checked }))
                      }
                    />
                    <span>Mark as required</span>
                  </label>

                  <div className={styles.formActions}>
                    <button type="submit" className={styles.btnPrimary}>
                      {editingId ? 'Save changes' : 'Add field'}
                    </button>
                    <button type="button" className={styles.btnGhost} onClick={resetForm}>
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <>
                  <div className={styles.listHeader}>
                    <span className={styles.fieldCount}>
                      {fieldList.length} {fieldList.length === 1 ? 'field' : 'fields'} · grouped by section
                    </span>
                    <button type="button" className={styles.btnPrimary} onClick={startAdd}>
                      + Add field
                    </button>
                  </div>

                  {fieldList.length === 0 ? (
                    <div className={styles.emptyState}>
                      <span className={styles.emptyIcon}>⊞</span>
                      <p className={styles.emptyTitle}>No fields yet</p>
                      <p className={styles.emptyHint}>
                        Click &quot;Add field&quot; to start building the seller form.
                      </p>
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
                                {sectionConfig.find((s) => s.id === secId)?.label || 'Untitled section'}
                              </h3>
                              <p className={styles.sectionBlockEmpty}>No fields in this section.</p>
                            </div>
                          )
                        }
                        return (
                          <div key={secId} className={styles.sectionBlock}>
                            <h3 className={styles.sectionBlockTitle}>
                              {sectionConfig.find((s) => s.id === secId)?.label || 'Untitled section'}
                            </h3>
                            <ul className={styles.fieldList}>
                              {inSec.map((field) => {
                                const globalIdx = fieldList.findIndex((f) => f.id === field.id)
                                return (
                                  <li
                                    key={field.id}
                                    className={`${styles.fieldItem} ${editingId === field.id ? styles.fieldItemActive : ''}`}
                                  >
                                    <span className={styles.typeIcon}>
                                      {TYPE_ICONS[field.type] || 'T'}
                                    </span>
                                    <div className={styles.fieldInfo}>
                                      <span className={styles.fieldLabel}>{field.label}</span>
                                      <span className={styles.fieldMeta}>
                                        {FIELD_TYPES.find((t) => t.value === field.type)?.label}
                                        {field.maxLength ? (
                                          <span className={styles.fieldMaxLen}>max {field.maxLength}</span>
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
                                          title="Move up in form order"
                                        >
                                          ↑
                                        </button>
                                        <button
                                          type="button"
                                          className={styles.iconBtn}
                                          onClick={() => moveField(field.id, 'down')}
                                          disabled={globalIdx === fieldList.length - 1}
                                          title="Move down in form order"
                                        >
                                          ↓
                                        </button>
                                      </div>
                                      <button
                                        type="button"
                                        className={styles.iconBtnEdit}
                                        onClick={() => handleEdit(field.id)}
                                        title="Edit field"
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
                                          Delete
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
                </>
              )}
            </div>
          </div>

          <div className={styles.preview}>
            <div className={styles.previewHeader}>
              <span className={styles.previewBadge}>Live preview</span>
            </div>
            <p className={styles.previewDesc}>
              Grouped like the seller listing wizard. Fields follow your template order, including listing name,
              description, and images when those rows are present.
            </p>

            <div className={styles.previewStepper} aria-hidden>
              {sectionConfig.map((s, i) => (
                <span key={s.id} className={styles.previewStepItem}>
                  <span className={styles.previewStepDot} />
                  <span className={styles.previewStepLabel}>{s.label}</span>
                  {i < sectionConfig.length - 1 ? (
                    <span className={styles.previewStepLine} />
                  ) : null}
                </span>
              ))}
            </div>

            <div className={styles.previewForm}>
              {fieldList.length === 0 ? (
                <p className={styles.previewEmpty}>
                  No fields to preview — load the template or add fields on the left.
                </p>
              ) : null}
              <>
                {sectionIds.map((secId) => {
                  const inSec = fieldList.filter(
                    (f) => normalizeSectionId(f.section, sectionIds) === secId,
                  )
                  if (!inSec.length) return null
                  const title =
                    sectionConfig.find((s) => s.id === secId)?.label || 'Untitled section'
                  return (
                    <div key={`pv-${secId}`} className={styles.previewSection}>
                      <h4 className={styles.previewSectionTitle}>{title}</h4>
                      {inSec.map((field) =>
                        field.type === 'images' ? (
                          <div key={field.id} className={styles.previewImagesStub}>
                            <span className={styles.previewImagesStubLabel}>
                              {field.label || 'Images'}
                            </span>
                            {field.sublabel ? (
                              <span className={styles.previewImagesStubHint}>{field.sublabel}</span>
                            ) : (
                              <span className={styles.previewImagesStubHint}>
                                Upload strip (matches new listing page)
                              </span>
                            )}
                          </div>
                        ) : field.type === 'string_list' ? (
                          <div key={field.id} className={styles.previewStringList}>
                            <span className={styles.previewLabelText}>
                              {field.label}
                              {field.required ? (
                                <span className={styles.previewRequired}> *</span>
                              ) : null}
                            </span>
                            {field.sublabel ? (
                              <span className={styles.previewSublabel}>{field.sublabel}</span>
                            ) : null}
                            <div className={styles.previewStringListRows}>
                              <input
                                readOnly
                                className={styles.previewInput}
                                placeholder={field.placeholder || 'Option 1'}
                              />
                              <input
                                readOnly
                                className={styles.previewInput}
                                placeholder={field.placeholder || 'Option 2'}
                              />
                            </div>
                            <button type="button" className={styles.previewStringListAdd} disabled>
                              Add option
                            </button>
                          </div>
                        ) : (
                          <label key={field.id} className={styles.previewLabel}>
                            <span className={styles.previewLabelText}>
                              {field.label}
                              {field.required && (
                                <span className={styles.previewRequired}> *</span>
                              )}
                            </span>
                            {field.sublabel ? (
                              <span className={styles.previewSublabel}>{field.sublabel}</span>
                            ) : null}
                            {field.type === 'textarea' && (
                              <textarea
                                readOnly
                                placeholder={field.placeholder || ''}
                                rows={3}
                                maxLength={previewMaxLength(field)}
                                className={styles.previewInput}
                              />
                            )}
                            {field.type === 'select' && (
                              <select readOnly className={styles.previewInput} defaultValue="">
                                <option value="">{field.placeholder || 'Select…'}</option>
                                {(Array.isArray(field.options) ? field.options : []).map(
                                  (opt, i) => (
                                    <option key={i} value={opt}>
                                      {opt}
                                    </option>
                                  ),
                                )}
                              </select>
                            )}
                            {field.type !== 'textarea' &&
                              field.type !== 'select' &&
                              field.type !== 'images' &&
                              field.type !== 'string_list' && (
                                <input
                                  type={field.type}
                                  readOnly
                                  placeholder={field.placeholder || ''}
                                  maxLength={previewMaxLength(field)}
                                  className={styles.previewInput}
                                />
                              )}
                          </label>
                        ),
                      )}
                    </div>
                  )
                })}
                <button type="button" className={styles.previewSubmit} disabled>
                  Save listing
                </button>
              </>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
