'use client'

import { useState, useMemo, useEffect } from 'react'
import layoutStyles from '../admin.module.css'
import styles from './seller-template.module.css'
import { defaultSellerFormTemplate } from '@/data/adminSampleData'
import { fetchSellerTemplate, saveSellerTemplate } from '@/lib/seller-template/client'

const FIELD_TYPES = [
  { value: 'text', label: 'Short text' },
  { value: 'number', label: 'Number' },
  { value: 'textarea', label: 'Long text (paragraph)' },
  { value: 'email', label: 'Email' },
  { value: 'url', label: 'URL' },
  { value: 'select', label: 'Dropdown (select)' },
]

const TYPE_ICONS = {
  text: 'T',
  number: '#',
  textarea: '¶',
  email: '@',
  url: '⌘',
  select: '▾',
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
    ...overrides,
  }
}

export default function AdminSellerTemplatePage() {
  const [fields, setFields] = useState(() =>
    [...defaultSellerFormTemplate].map((f, i) => ({ ...f, order: i }))
  )
  const [editingId, setEditingId] = useState(null)
  const [isAdding, setIsAdding] = useState(false)
  const [form, setForm] = useState(() => newField())
  const [deleteConfirmId, setDeleteConfirmId] = useState(null)
  const [loadingTemplate, setLoadingTemplate] = useState(true)
  const [savingTemplate, setSavingTemplate] = useState(false)
  const [templateMessage, setTemplateMessage] = useState('')

  const fieldList = useMemo(
    () => [...fields].sort((a, b) => a.order - b.order),
    [fields]
  )

  useEffect(() => {
    let mounted = true

    const loadTemplate = async () => {
      setLoadingTemplate(true)
      const { data, error } = await fetchSellerTemplate()
      if (!mounted) return

      if (error) {
        setTemplateMessage(error)
      } else if (data?.fields?.length) {
        setFields(data.fields.map((f, i) => ({ ...f, order: i })))
        setTemplateMessage('')
      } else {
        setTemplateMessage('No saved template yet. Default fields are shown.')
      }

      setLoadingTemplate(false)
    }

    loadTemplate()
    return () => {
      mounted = false
    }
  }, [])

  const persistFields = async (nextFields) => {
    setSavingTemplate(true)
    const { error } = await saveSellerTemplate(nextFields)
    setSavingTemplate(false)
    setTemplateMessage(error || 'Template saved.')
  }

  const resetForm = () => {
    setEditingId(null)
    setIsAdding(false)
    setForm(newField())
  }

  const startAdd = () => {
    resetForm()
    setIsAdding(true)
    setForm(newField({ order: fields.length }))
  }

  const handleEdit = (id) => {
    const field = fields.find((f) => f.id === id)
    if (!field) return
    setEditingId(id)
    setIsAdding(false)
    setForm({
      ...field,
      options: Array.isArray(field.options)
        ? field.options.join(', ')
        : (field.options || ''),
    })
  }

  const handleDelete = (id) => {
    setFields((prev) => {
      const next = prev.filter((f) => f.id !== id)
      const normalized = next.map((f, i) => ({ ...f, order: i }))
      persistFields(normalized)
      return normalized
    })
    if (editingId === id || (isAdding && form.id === id)) resetForm()
    setDeleteConfirmId(null)
  }

  const moveField = (id, direction) => {
    const idx = fieldList.findIndex((f) => f.id === id)
    if (idx < 0) return
    const swap = direction === 'up' ? idx - 1 : idx + 1
    if (swap < 0 || swap >= fieldList.length) return
    const reordered = [...fieldList].map((f, i) => ({ ...f, order: i }))
    ;[reordered[idx].order, reordered[swap].order] = [
      reordered[swap].order,
      reordered[idx].order,
    ]
    reordered.sort((a, b) => a.order - b.order)
    reordered.forEach((f, i) => (f.order = i))
    setFields(reordered)
    persistFields(reordered)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const label = (form.label || '').trim()
    if (!label) return

    const payload = {
      ...form,
      label,
      order: typeof form.order === 'number' ? form.order : fields.length,
      options:
        form.type === 'select' && form.options
          ? form.options.split(',').map((s) => s.trim()).filter(Boolean)
          : undefined,
    }

    if (editingId) {
      setFields((prev) => {
        const next = prev.map((f) => (f.id === editingId ? { ...f, ...payload, id: f.id } : f))
        persistFields(next)
        return next
      })
    } else if (isAdding) {
      setFields((prev) => {
        const next = [...prev, { ...payload, id: form.id }]
        persistFields(next)
        return next
      })
    }
    resetForm()
  }

  const isEditorOpen = editingId || isAdding

  return (
    <div className={layoutStyles.dashWrap}>
      <section className={layoutStyles.panel}>
        <div className={layoutStyles.panelHead}>
          <p className={layoutStyles.panelTitle}>Seller service form template</p>
        </div>

        <p className={styles.intro}>
          Configure the form that <strong>sellers</strong> see when adding a service.
          Add, edit, reorder, or remove fields — changes reflect instantly in the preview.
        </p>
        <p className={styles.intro}>
          {loadingTemplate
            ? 'Loading saved template...'
            : savingTemplate
              ? 'Saving template...'
              : templateMessage}
        </p>

        <div className={styles.layout}>
          {/* ── Builder ── */}
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

                    <label className={`${styles.label} ${styles.rowFlex}`}>
                      <span className={styles.labelSpan}>Placeholder</span>
                      <input
                        type="text"
                        value={form.placeholder || ''}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, placeholder: e.target.value }))
                        }
                        placeholder="Optional hint text"
                        className={styles.input}
                      />
                    </label>
                  </div>

                  {form.type === 'select' && (
                    <label className={styles.label}>
                      <span className={styles.labelSpan}>Options <span className={styles.labelHint}>(comma-separated)</span></span>
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
                    <button
                      type="button"
                      className={styles.btnGhost}
                      onClick={resetForm}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <>
                  <div className={styles.listHeader}>
                    <span className={styles.fieldCount}>
                      {fieldList.length} {fieldList.length === 1 ? 'field' : 'fields'}
                    </span>
                    <button
                      type="button"
                      className={styles.btnPrimary}
                      onClick={startAdd}
                    >
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
                    <ul className={styles.fieldList}>
                      {fieldList.map((field, idx) => (
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
                              {field.required && <span className={styles.requiredDot}>Required</span>}
                            </span>
                          </div>

                          <div className={styles.fieldActions}>
                            <div className={styles.moveGroup}>
                              <button
                                type="button"
                                className={styles.iconBtn}
                                onClick={() => moveField(field.id, 'up')}
                                disabled={idx === 0}
                                title="Move up"
                              >
                                ↑
                              </button>
                              <button
                                type="button"
                                className={styles.iconBtn}
                                onClick={() => moveField(field.id, 'down')}
                                disabled={idx === fieldList.length - 1}
                                title="Move down"
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
                      ))}
                    </ul>
                  )}
                </>
              )}
            </div>
          </div>

          {/* ── Preview ── */}
          <div className={styles.preview}>
            <div className={styles.previewHeader}>
              <span className={styles.previewBadge}>Live preview</span>
            </div>
            <p className={styles.previewDesc}>
              Seller-facing view — updates as you edit.
            </p>

            <div className={styles.previewForm}>
              {fieldList.length === 0 ? (
                <p className={styles.previewEmpty}>
                  Fields you add will appear here.
                </p>
              ) : (
                <>
                  {fieldList.map((field) => (
                    <label key={field.id} className={styles.previewLabel}>
                      <span className={styles.previewLabelText}>
                        {field.label}
                        {field.required && <span className={styles.previewRequired}> *</span>}
                      </span>
                      {field.type === 'textarea' && (
                        <textarea
                          readOnly
                          placeholder={field.placeholder || ''}
                          rows={3}
                          className={styles.previewInput}
                        />
                      )}
                      {field.type === 'select' && (
                        <select
                          readOnly
                          className={styles.previewInput}
                          defaultValue=""
                        >
                          <option value="">{field.placeholder || 'Select…'}</option>
                          {(Array.isArray(field.options) ? field.options : []).map(
                            (opt, i) => (
                              <option key={i} value={opt}>
                                {opt}
                              </option>
                            )
                          )}
                        </select>
                      )}
                      {field.type !== 'textarea' && field.type !== 'select' && (
                        <input
                          type={field.type}
                          readOnly
                          placeholder={field.placeholder || ''}
                          className={styles.previewInput}
                        />
                      )}
                    </label>
                  ))}
                  <button type="button" className={styles.previewSubmit} disabled>
                    Submit
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}