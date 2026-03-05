'use client'

import { useMemo, useState } from 'react'
import { sellerProducts } from '@/data/adminSampleData'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faTrashCan } from '@fortawesome/free-solid-svg-icons'

const SELLER_ID = 'SEL-001'

export default function SellerMyServicesPage() {
  const initial = useMemo(
    () => sellerProducts.filter((p) => p.sellerId === SELLER_ID),
    []
  )
  const [services, setServices] = useState(initial)
  const [draft, setDraft] = useState({
    name: '',
    category: '',
    price: '',
    status: 'draft',
    description: '',
  })

  const handleChange = (field, value) => {
    setDraft((prev) => ({ ...prev, [field]: value }))
  }

  const handleAdd = () => {
    if (!draft.name.trim() || !draft.category.trim()) return
    const price = Number(draft.price) || 0
    setServices((prev) => [
      ...prev,
      {
        id: `LOCAL-${prev.length + 1}`,
        sellerId: SELLER_ID,
        name: draft.name.trim(),
        category: draft.category.trim(),
        price,
        status: draft.status || 'draft',
        description: draft.description.trim(),
      },
    ])
    setDraft({
      name: '',
      category: '',
      price: '',
      status: 'draft',
      description: '',
    })
  }

  const handleDelete = (id) => {
    setServices((prev) => prev.filter((s) => s.id !== id))
  }

  const handleStatusChange = (id, status) => {
    setServices((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status } : s))
    )
  }

  return (
    <main
      style={{
        padding: '2.5rem 1.5rem 3rem',
        maxWidth: 1120,
        margin: '0 auto',
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      }}
    >
      <header
        style={{
          marginBottom: '1.85rem',
          paddingBottom: '1.25rem',
          borderBottom: '1px solid rgba(168, 137, 74, 0.22)',
        }}
      >
        <p
          style={{
            fontSize: '0.78rem',
            textTransform: 'uppercase',
            letterSpacing: '0.14em',
            color: 'var(--color-gold-bright)',
            fontWeight: 700,
            marginBottom: '0.3rem',
          }}
        >
          Listings overview
        </p>
        <h1
          style={{
            fontSize: '1.6rem',
            fontWeight: 650,
            marginBottom: '0.35rem',
            color: '#102820',
          }}
        >
          My Services
        </h1>
        <p
          style={{
            fontSize: '0.95rem',
            color: '#4D2D18',
            maxWidth: 560,
            lineHeight: 1.6,
          }}
        >
          Manage the funeral services and packages you offer on La Visionario.
        </p>
      </header>

      <section
        style={{
          borderRadius: '0.9rem',
          border: '1px solid rgba(168, 137, 74, 0.25)',
          padding: '1.4rem 1.6rem',
          backgroundColor: '#ffffff',
          boxShadow: '0 18px 40px rgba(0, 0, 0, 0.06)',
          marginBottom: '1.7rem',
        }}
      >
        <h2
          style={{
            fontSize: '1rem',
            fontWeight: 600,
            marginBottom: '0.75rem',
            color: '#102820',
          }}
        >
          Add Service
        </h2>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '0.75rem',
            marginBottom: '0.75rem',
          }}
        >
          <input
            type="text"
            placeholder="Service name"
            style={inputStyle}
            value={draft.name}
            onChange={(e) => handleChange('name', e.target.value)}
            onFocus={handleFieldFocus}
            onBlur={handleFieldBlur}
          />
          <input
            type="text"
            placeholder="Category"
            style={inputStyle}
            value={draft.category}
            onChange={(e) => handleChange('category', e.target.value)}
            onFocus={handleFieldFocus}
            onBlur={handleFieldBlur}
          />
          <input
            type="number"
            placeholder="Price (₱)"
            style={inputStyle}
            value={draft.price}
            onChange={(e) => handleChange('price', e.target.value)}
            onFocus={handleFieldFocus}
            onBlur={handleFieldBlur}
          />
          <select
            style={statusSelectStyle(draft.status)}
            value={draft.status}
            onChange={(e) => handleChange('status', e.target.value)}
            onFocus={handleFieldFocus}
            onBlur={handleFieldBlur}
          >
            <option value="draft">Draft</option>
            <option value="active">Active</option>
            <option value="archived">Archived</option>
          </select>
        </div>
        <textarea
          placeholder="Description"
          rows={3}
          style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' }}
          value={draft.description}
          onChange={(e) => handleChange('description', e.target.value)}
          onFocus={handleFieldFocus}
          onBlur={handleFieldBlur}
        />
        <div style={{ marginTop: '0.75rem', textAlign: 'right' }}>
          <button
            type="button"
            onClick={handleAdd}
            style={primaryButtonStyle}
          >
            Add Service
          </button>
        </div>
      </section>

      <section
        style={{
          borderRadius: '0.9rem',
          border: '1px solid rgba(168, 137, 74, 0.25)',
          padding: '1.35rem 1.6rem',
          backgroundColor: '#ffffff',
          boxShadow: '0 18px 40px rgba(0, 0, 0, 0.06)',
        }}
      >
        <h2
          style={{
            fontSize: '1rem',
            fontWeight: 600,
            marginBottom: '0.75rem',
            color: '#102820',
          }}
        >
          Service list
        </h2>
        {services.length === 0 ? (
          <p style={{ fontSize: '0.9rem', color: '#6b7280' }}>
            You haven&apos;t added any services yet. Start by creating your first listing above.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {services.map((service) => (
              <div
                key={service.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: '1rem',
                  padding: '0.9rem 0',
                  borderTop: '1px solid #f3f4f6',
                }}
              >
                <div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 500, color: '#102820' }}>{service.name}</div>
                  <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>
                    {service.category} • ₱{Number(service.price).toLocaleString('en-PH')}
                  </div>
                  {service.description && (
                    <div style={{ fontSize: '0.8rem', color: '#4b5563', marginTop: '0.25rem' }}>
                      {service.description}
                    </div>
                  )}
                </div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-end',
                    gap: '0.5rem',
                    minWidth: 220,
                  }}
                >
                  <select
                    value={service.status}
                    onChange={(e) => handleStatusChange(service.id, e.target.value)}
                    style={statusSelectStyle(service.status, {
                      padding: '0.35rem 0.75rem',
                      fontSize: '0.8rem',
                    })}
                    onFocus={handleFieldFocus}
                    onBlur={handleFieldBlur}
                  >
                    <option value="draft">Draft</option>
                    <option value="active">Active</option>
                    <option value="archived">Archived</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => handleDelete(service.id)}
                    style={deletePillStyle}
                    aria-label="Delete service"
                  >
                    <FontAwesomeIcon icon={faTrashCan} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  )
}

const getStatusPillColors = (status) => {
  if (status === 'active') {
    return {
      backgroundColor: 'rgb(232 250 241 / 70%)',
      borderColor: 'rgb(111 191 143 / 45%)',
      color: '#204F38',
    }
  }
  if (status === 'draft') {
    return {
      backgroundColor: 'rgb(254 226 226 / 70%)',
      borderColor: 'rgb(243 180 180 / 50%)',
      color: '#7F1D1D',
    }
  }
  if (status === 'archived') {
    return {
      backgroundColor: 'rgb(254 243 199 / 35%)',
      borderColor: 'rgb(242 201 122 / 25%)',
      color: '#92400E',
    }
  }
  return {
    backgroundColor: 'rgb(245 240 230 / 70%)',
    borderColor: 'rgb(190 160 110 / 45%)',
    color: '#463C32',
  }
}

const handleFieldFocus = (event) => {
  const el = event.currentTarget
  el.style.borderColor = '#3D683A'
  el.style.boxShadow = '0 0 0 1px #3D683A, 0 0 0 4px rgba(61, 104, 58, 0.09)'
  el.style.backgroundColor = '#FFFFFF'
}

const handleFieldBlur = (event) => {
  const el = event.currentTarget
  const isPill = el.tagName === 'SELECT'
  el.style.boxShadow = 'none'
  if (isPill) {
    const { backgroundColor, borderColor, color } = getStatusPillColors(el.value)
    el.style.borderColor = borderColor
    el.style.backgroundColor = backgroundColor
    el.style.color = color
  } else {
    el.style.borderColor = '#e5e7eb'
    el.style.backgroundColor = '#F9FAFB'
  }
}

const statusSelectStyle = (status, overrides = {}) => {
  const { backgroundColor, borderColor, color } = getStatusPillColors(status)
  return {
    width: '100%',
    borderRadius: '999px',
    border: `1px solid ${borderColor}`,
    padding: '0.5rem 0.85rem',
    fontSize: '0.85rem',
    outline: 'none',
    backgroundColor,
    color,
    fontWeight: 500,
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    cursor: 'pointer',
    ...overrides,
  }
}

const deletePillStyle = {
  borderRadius: '999px',
  border: 'none',
  padding: '0.35rem 0.75rem',
  fontSize: '0.9rem',
  fontWeight: 500,
  backgroundColor: 'transparent',
  color: '#b91c1c',
  cursor: 'pointer',
}

const inputStyle = {
  width: '100%',
  borderRadius: '0.55rem',
  border: '1px solid #e5e7eb',
  padding: '0.5rem 0.7rem',
  fontSize: '0.85rem',
  outline: 'none',
  backgroundColor: '#F9FAFB',
}

const primaryButtonStyle = {
  borderRadius: '999px',
  border: 'none',
  padding: '0.45rem 1.3rem',
  fontSize: '0.85rem',
  fontWeight: 600,
  backgroundColor: '#204F38',
  color: '#ffffff',
  cursor: 'pointer',
  boxShadow: '0 10px 30px rgba(32, 79, 56, 0.35)',
}

