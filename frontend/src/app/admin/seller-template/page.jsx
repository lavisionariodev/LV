'use client'

import { useState, useMemo } from 'react'
import layoutStyles from '../admin.module.css'
import styles from './seller-template.module.css'
import { defaultSellerFormTemplate } from '@/data/adminSampleData'

const FIELD_TYPES = [
  { value: 'text', label: 'Short text' },
  { value: 'number', label: 'Number' },
  { value: 'textarea', label: 'Long text (paragraph)' },
  { value: 'email', label: 'Email' },
  { value: 'url', label: 'URL' },
  { value: 'select', label: 'Dropdown (select)' },
]

function newField(overrides = {}) {
  return {
    id: `f-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    order: 0,
    label: '',
    type: 'text',
    required: false,
    placeholder: '',
    options: '', // comma-separated for select, e.g. "Option A, Option B"
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

  const fieldList = useMemo(
    () => [...fields].sort((a, b) => a.order - b.order),
    [fields]
  )

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
    const index = fields.findIndex((f) => f.id === id)
    setFields((prev) => {
      const next = prev.filter((f) => f.id !== id)
      return next.map((f, i) => ({ ...f, order: i }))
    })
    if (editingId === id || (isAdding && form.id === id)) resetForm()
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
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const label = (form.label || '').trim()
    if (!label) return

    const payload = {
      ...form,
      label,
      order: typeof form.order === 'number' ? form.order : fields.length,
      options: form.type === 'select' && form.options
        ? form.options.split(',').map((s) => s.trim()).filter(Boolean)
        : undefined,
    }

    if (editingId) {
      setFields((prev) =>
        prev.map((f) => (f.id === editingId ? { ...f, ...payload, id: f.id } : f))
      )
    } else if (isAdding) {
      setFields((prev) => [...prev, { ...payload, id: form.id }])
    }
    resetForm()
  }

  return (
    <div className={layoutStyles.dashWrap}>
      <section className={layoutStyles.panel}>
        <div className={layoutStyles.panelHead}>
          <p className={layoutStyles.panelTitle}>Seller service form template</p>
        </div>

        <p className={styles.intro}>
          Configure the form that <strong>sellers</strong> see when they add their
          own service. Add, edit, remove, or reorder fields below. This template
          drives the &quot;Add service&quot; form in the seller portal.
        </p>

        <div className={styles.layout}>
          <div className={styles.builder}>
            <div className={styles.formCard}>
              <h3 className={styles.formTitle}>
                {editingId ? 'Edit field' : isAdding ? 'Add new field' : 'Template fields'}
              </h3>

              {(editingId || isAdding) ? (
                <form onSubmit={handleSubmit} className={styles.fieldForm}>
                  <label className={styles.label}>
                    <span className={styles.labelSpan}>Label (sellers will see this)</span>
                    <input
                      type="text"
                      value={form.label}
                      onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
                      placeholder="e.g. Service name"
                      className={styles.input}
                    />
                  </label>

                  <label className={styles.label}>
                    <span className={styles.labelSpan}>Field type</span>
                    <select
                      value={form.type}
                      onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
                      className={layoutStyles.smallBtn}
                    >
                      {FIELD_TYPES.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className={styles.label}>
                    <span className={styles.labelSpan}>Placeholder (optional)</span>
                    <input
                      type="text"
                      value={form.placeholder || ''}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, placeholder: e.target.value }))
                      }
                      className={styles.input}
                    />
                  </label>

                  {form.type === 'select' && (
                    <label className={styles.label}>
                      <span className={styles.labelSpan}>
                        Options (comma-separated)
                      </span>
                      <input
                        type="text"
                        value={typeof form.options === 'string' ? form.options : (form.options || []).join(', ')}
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
                    <span>Required field</span>
                  </label>

                  <div className={styles.formActions}>
                    <button type="submit" className={layoutStyles.smallBtn}>
                      {editingId ? 'Save field' : 'Add field'}
                    </button>
                    <button
                      type="button"
                      className={layoutStyles.smallBtn}
                      onClick={resetForm}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <>
                  <button
                    type="button"
                    className={`${layoutStyles.smallBtn} ${styles.addBtn}`}
                    onClick={startAdd}
                  >
                    + Add field
                  </button>

                  <ul className={styles.fieldList}>
                    {fieldList.map((field) => (
                      <li key={field.id} className={styles.fieldItem}>
                        <span className={styles.fieldLabel}>{field.label}</span>
                        <span className={styles.fieldMeta}>
                          {field.type}
                          {field.required && ' · Required'}
                        </span>
                        <div className={styles.fieldActions}>
                          <button
                            type="button"
                            className={layoutStyles.smallBtn}
                            onClick={() => moveField(field.id, 'up')}
                            disabled={fieldList.indexOf(field) === 0}
                            title="Move up"
                          >
                            ↑
                          </button>
                          <button
                            type="button"
                            className={layoutStyles.smallBtn}
                            onClick={() => moveField(field.id, 'down')}
                            disabled={fieldList.indexOf(field) === fieldList.length - 1}
                            title="Move down"
                          >
                            ↓
                          </button>
                          <button
                            type="button"
                            className={layoutStyles.smallBtn}
                            onClick={() => handleEdit(field.id)}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className={layoutStyles.smallBtn}
                            onClick={() => handleDelete(field.id)}
                          >
                            Delete
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>

                  {fieldList.length === 0 && (
                    <p className={styles.emptyHint}>
                      No fields yet. Click &quot;Add field&quot; to define the form
                      sellers will fill when adding a service.
                    </p>
                  )}
                </>
              )}
            </div>
          </div>

          <div className={styles.preview}>
            <h3 className={styles.previewTitle}>Preview (seller view)</h3>
            <p className={styles.previewDesc}>
              This is how the form will look when a seller adds their service.
            </p>
            <div className={styles.previewForm}>
              {fieldList.map((field) => (
                <label key={field.id} className={styles.previewLabel}>
                  <span className={styles.previewLabelText}>
                    {field.label}
                    {field.required && ' *'}
                  </span>
                  {field.type === 'textarea' && (
                    <textarea
                      readOnly
                      placeholder={field.placeholder || ''}
                      rows={2}
                      className={styles.previewInput}
                    />
                  )}
                  {field.type === 'select' && (
                    <select
                      readOnly
                      className={styles.previewInput}
                      defaultValue=""
                    >
                      <option value="">
                        {field.placeholder || 'Select…'}
                      </option>
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
              {fieldList.length > 0 && (
                <button type="button" className={styles.previewSubmit} disabled>
                  Submit (seller will see this)
                </button>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}